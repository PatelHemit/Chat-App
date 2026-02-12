import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
            shouldShowAlert: false, // Don't show system banner in foreground, we handle it via socket/local logic
            shouldPlaySound: soundOn,
            shouldSetBadge: true,
            shouldShowBanner: false,
            shouldShowList: true,
        };
    },
});

class NotificationService {
    private expoPushToken: string | null = null;
    private isRegistering = false;

    /**
     * Register for push notifications and get the Expo push token
     */
    async registerForPushNotifications(): Promise<string | null> {
        if (!Device.isDevice) {
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
                console.log('Failed to get push token for push notification!');
                return null;
            }

            // Get the Expo push token
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;

            if (!projectId) {
                console.error('Project ID not found in app config');
                return null;
            }

            const token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            this.expoPushToken = token.data;
            console.log('Expo Push Token:', this.expoPushToken);

            // Android-specific channel setup
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('chat-messages', {
                    name: 'Chat Messages',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            return this.expoPushToken;
        } catch (error) {
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
     * Send the push token to backend
     */
    async sendTokenToBackend(token: string, userToken: string, apiUrl: string) {
        if (this.isRegistering) {
            console.log('[PushToken] Registration already in progress, skipping...');
            return;
        }

        const url = `${apiUrl}/api/user/register-push-token`;
        this.isRegistering = true;

        console.log(`[PushToken] Attempting to register token with URL: ${url}`);
        console.log(`[PushToken] Token: ${token.substring(0, 10)}... UserToken present: ${!!userToken}`);

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
                console.error(`[PushToken] Backend Error (${response.status}):`, errorText);
                throw new Error(`Failed to register push token: ${response.status} ${errorText}`);
            }

            console.log('[PushToken] SUCCESS: Token registered with backend');
        } catch (error: any) {
            console.error('[PushToken] CRITICAL ERROR:', error);
            // More detailed error checking
            if (error?.message === 'Network request failed') {
                console.warn('[PushToken] Check if the server is accessible at:', url);
            }
        } finally {
            this.isRegistering = false;
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
        if (Platform.OS !== 'web' || !('Notification' in window)) {
            console.log("[Web-Notif] Notifications not supported or not on web");
            return;
        }

        console.log("[Web-Notif] Attempting to show notification. Permission:", Notification.permission);

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
