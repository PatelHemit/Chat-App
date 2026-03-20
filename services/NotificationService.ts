import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import logger from './PersistentLogger';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => {
        let soundOn = true;
        try {
            const userInfoStr = await AsyncStorage.getItem('userInfo');
            if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                if (userInfo.notificationsMuted) soundOn = false;
            }
        } catch (e) {
            console.log("Error in notification handler:", e);
        }

        return {
            shouldShowAlert: true,  // ✅ Show banner even in foreground
            shouldPlaySound: soundOn,
            shouldSetBadge: true,
            shouldShowBanner: true, // ✅ Show banner
            shouldShowList: true,
        };
    },
});

class NotificationService {
    private expoPushToken: string | null = null;
    private isRegistering = false;
    private retryCount = 0;
    private maxRetries = 5;

    /**
     * Register for push notifications and get the Expo push token
     */
    async registerForPushNotifications(): Promise<string | null> {
        if (!Device.isDevice) {
            await logger.info('[PushNotif] Skipped: Not a physical device');
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                await logger.warn('[PushNotif] Permission NOT granted');
                console.log('Failed to get push token for push notification!');
                return null;
            }

            // Get the Expo push token
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;

            if (!projectId) {
                console.error('Project ID not found in app config');
                alert('Error: Project ID not found for notifications.');
                return null;
            }

            const token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            this.expoPushToken = token.data;
            await logger.info('[PushNotif] Generated Expo Push Token', { token: this.expoPushToken });
            console.log('Expo Push Token:', this.expoPushToken);
            // alert(`Push Token Generated: ${this.expoPushToken}`); // Debugging

            // Android-specific channel setup
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('chat-messages', {
                    name: 'Chat Messages',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });

                await Notifications.setNotificationChannelAsync('incoming-calls', {
                    name: 'Incoming Calls',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 500, 500, 500, 500, 500, 500, 500], // Longer vibration for calls
                    lightColor: '#FF231F7C',
                    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                    bypassDnd: true,
                    sound: 'default', // Using default sound for now
                });
            }

            // Define Global Notification Categories (Buttons for Heads-up)
            await Notifications.setNotificationCategoryAsync('incoming-call', [
                {
                    identifier: 'ACCEPT_CALL',
                    buttonTitle: 'Accept',
                    options: { opensAppToForeground: true },
                },
                {
                    identifier: 'DECLINE_CALL',
                    buttonTitle: 'Decline',
                    options: { isDestructive: true },
                },
            ]);

            return this.expoPushToken;
        } catch (error: any) {
            await logger.error('[PushNotif] Registration Error', { error: error.message });
            console.error('Error registering for push notifications:', error);
            return null;
        }
    }

    /**
     * Get the current push token
     */
    getToken(): string | null {
        return this.expoPushToken;
    }

    /**
     * Add listener for when notification is received while app is foregrounded
     */
    addNotificationReceivedListener(
        callback: (notification: Notifications.Notification) => void
    ) {
        return Notifications.addNotificationReceivedListener(callback);
    }

    /**
     * Add listener for when user taps on notification
     */
    addNotificationResponseReceivedListener(
        callback: (response: Notifications.NotificationResponse) => void
    ) {
        return Notifications.addNotificationResponseReceivedListener(callback);
    }

    /**
     * Get the notification that triggered the app launch (if any)
     */
    async getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
        return await Notifications.getLastNotificationResponseAsync();
    }

    /**
     * Register for Firebase Cloud Messaging token
     */
    async registerFCMToken(): Promise<string | null> {
        if (Platform.OS === 'web') return null;
        
        // Emulators sometimes return !Device.isDevice but can still receive FCM if Play Services exist.
        // We'll allow it for Android even if it claims not to be a physical device for dev ease.
        if (Platform.OS === 'ios' && !Device.isDevice) {
            await logger.info('[FCM] Skipped: Not a physical iOS device');
            return null;
        }

        try {
            // Request permission for iOS (Android is managed via Manifest/User prompt)
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                // Force a fresh token check if possible to catch re-installs
                const token = await messaging().getToken();
                await logger.info('[FCM] Token obtained', { token: token.substring(0, 10) + '...' });
                return token;
            }
            await logger.warn('[FCM] Permission NOT enabled');
            return null;
        } catch (error: any) {
            await logger.error('[FCM] Token Error', { error: error.message });
            return null;
        }
    }

    /**
     * Start listening for token refreshes
     */
    listenToTokenRefresh(userToken: string, apiUrl: string) {
        if (Platform.OS === 'web') return () => {};

        return messaging().onTokenRefresh(async (newToken) => {
            await logger.info('[FCM] Token refreshed automatically', { token: newToken.substring(0, 10) + '...' });
            await this.sendFCMTokenToBackend(newToken, userToken, apiUrl);
        });
    }

    /**
     * Send the push token to backend
     */
    async sendTokenToBackend(token: string, userToken: string, apiUrl: string) {
        if (this.isRegistering) {
            await logger.info('[PushToken] Registration already in progress, skipping...');
            return;
        }

        const url = `${apiUrl}/api/user/register-push-token`;
        this.isRegistering = true;

        await logger.info('[PushToken] Attempting backend registration', { url, tokenSnippet: token.substring(0, 10) });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ pushToken: token }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                await logger.error('[PushToken] Backend Error', { status: response.status, error: errorText });
                throw new Error(`Failed to register push token: ${response.status} ${errorText}`);
            }

            await logger.info('[PushToken] SUCCESS: Token registered with backend');
            this.isRegistering = false;
        } catch (error: any) {
            await logger.error('[PushToken] Network Error', { error: error.message });
            this.isRegistering = false;
        }
    }

    /**
     * Send the FCM token to backend
     */
    async sendFCMTokenToBackend(token: string, userToken: string, apiUrl: string) {
        const url = `${apiUrl}/api/user/register-fcm-token`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({ fcmToken: token }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                await logger.error('[FCM] Backend Error', { status: response.status, error: errorText });
            } else {
                await logger.info('[FCM] SUCCESS: Token registered with backend');
            }
        } catch (error: any) {
            await logger.error('[FCM] Network Error', { error: error.message });
        }
    }

    /**
     * Show a local notification (useful for foreground state)
     */
    async showLocalNotification(title: string, body: string, data: any = {}) {
        if (Platform.OS === 'web') {
            this.sendWebNotification(title, body, data);
            return;
        }

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
            },
            trigger: null, // show immediately
        });
    }

    /**
     * Request permissions for Web Notifications
     */
    async requestWebPermissions(): Promise<boolean> {
        if (Platform.OS !== 'web') return false;

        console.log("[Web-Permissions] Checking status...");
        if (!('Notification' in window)) {
            console.log("[Web-Permissions] Browser does not support notifications");
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log("[Web-Permissions] Already granted");
            return true;
        }

        console.log("[Web-Permissions] Requesting from user...");
        const permission = await Notification.requestPermission();
        console.log("[Web-Permissions] Result:", permission);

        if (permission === 'denied') {
            console.warn("[Web-Permissions] Permission denied by user");
        }
        return permission === 'granted';
    }

    /**
     * Send a notification on Web
     */
    async sendWebNotification(title: string, body: string, data: any = {}) {
        if (Platform.OS !== 'web') return;

        if (!('Notification' in window)) {
            console.warn("[Web-Notif] ❌ NOT SUPPORTED: Browser does NOT support notifications (might be due to insecure origin/non-HTTPS)");
            return;
        }

        console.log("[Web-Notif] Attempting to show notification. Current permission:", Notification.permission);

        // If permission not granted, request it
        if (Notification.permission !== 'granted') {
            console.log("[Web-Notif] Permission not granted, requesting...");
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                console.warn("[Web-Notif] Permission denied by user");
                return;
            }
        }

        // Now permission is granted, show notification
        try {
            const notification = new Notification(title, {
                body: body,
                tag: 'chat-message',
                requireInteraction: true, // Force notification to stay visible
                silent: false,
                data: data
            });

            notification.onshow = () => {
                console.log("[Web-Notif] 🎉 Notification SHOWING!");
            };

            notification.onerror = (error) => {
                console.error("[Web-Notif] ❌ Error:", error);
            };

            notification.onclick = () => {
                window.focus();
                notification.close();
                if (this.onWebNotificationClick) {
                    this.onWebNotificationClick(data);
                }
            };

            console.log("[Web-Notif] ✅ Notification created successfully");
        } catch (error) {
            console.error("[Web-Notif] Error creating notification object:", error);
        }
    }

    // Callback for web notification clicks
    public onWebNotificationClick: ((data: any) => void) | null = null;
}

export default new NotificationService();
