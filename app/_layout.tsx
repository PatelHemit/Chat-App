import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import NotificationService from '@/services/NotificationService';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

import { SOCKET_URL } from '@/config/api';
import { useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { io } from 'socket.io-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Update ref whenever pathname changes
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for navigation state to be ready
      if (!navigationState?.key) return;

      try {
        const userToken = await AsyncStorage.getItem('userToken');

        if (!userToken) {
          if (Platform.OS === 'web') {
            router.replace('/auth/qr-login');
          } else {
            router.replace('/auth/welcome');
          }
        } else {
          // User is logged in - register for push notifications
          const pushToken = await NotificationService.registerForPushNotifications();
          if (pushToken) {
            const { API_BASE_URL } = require('@/config/api');
            await NotificationService.sendTokenToBackend(pushToken, userToken, API_BASE_URL);
          }

          if (Platform.OS === 'web') {
            const granted = await NotificationService.requestWebPermissions();
            if (granted) {
              console.log("Web notifications granted");
            }
          }

          // Initialize ZegoCloud calling service
          if (Platform.OS !== 'web') {
            try {
              const userInfo = await AsyncStorage.getItem('userInfo');
              if (userInfo) {
                const user = JSON.parse(userInfo);
                const { onUserLogin } = require('@/services/CallingService.native');
                await onUserLogin(user._id, user.name || user.phone);
              }
            } catch (error) {
              console.error('[RootLayout] Failed to initialize calling service:', error);
            }
          }
        }
        setIsReady(true);
      } catch (e) {
        console.error('Error checking auth:', e);
        setIsReady(true);
      }
    };

    checkAuth();
  }, [navigationState?.key, router]);

  // Set up notification listeners
  useEffect(() => {
    const notificationListener = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    const responseListener = NotificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        const data = response.notification.request.content.data;

        // Navigate to chat if notification contains chatId
        if (data.chatId) {
          router.push(`/chat/${data.chatId}`);
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [router]);

  // Socket for Web Notifications
  useEffect(() => {
    if (!isReady) return;

    let socket: any;

    const setupSocket = async () => {
      const userToken = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (!userToken || !userInfoStr) return;

      const userInfo = JSON.parse(userInfoStr);

      console.log("[Web-Notif] Setting up socket for user:", userInfo._id);
      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        query: { token: userToken }
      });

      socket.on('connect', () => {
        console.log("[Web-Notif] Socket connected");
        socket.emit('setup', userInfo);
      });

      socket.on('message received', async (newMessageReceived: any) => {
        console.log("[Web-Notif] New message received:", newMessageReceived._id);

        try {
          const currentPath = pathnameRef.current;
          const chat = newMessageReceived.chat;
          if (!chat) return;

          // FETCH LATEST INFO ALWAYS TO BE SAFE
          const latestUserStr = await AsyncStorage.getItem('userInfo');
          if (!latestUserStr) return;
          const latestUser = JSON.parse(latestUserStr);
          const myId = latestUser._id;

          // 0. Check Global Mute Setting
          if (latestUser.notificationsMuted) {
            console.log("[Web-Notif] GLOBAL MUTE IS ON - Skipping for", myId);
            return;
          }

          // 1. Check if we are ALREADY in this chat screen
          if (currentPath === `/chat/${chat._id}`) {
            console.log("[Web-Notif] Already in chat, skipping");
            return;
          }

          // 2. Check if Chat is muted for me
          const isMuted = chat.mutedBy?.some((m: any) => {
            const mutedUserId = m.user._id || m.user;
            const match = String(mutedUserId) === String(myId) &&
              (!m.mutedUntil || new Date(m.mutedUntil) > new Date());
            if (match) console.log("[Web-Notif] CHAT IS MUTED - Skipping");
            return match;
          });

          if (isMuted) return;

          NotificationService.showLocalNotification(
            newMessageReceived.sender.name,
            newMessageReceived.content || (newMessageReceived.fileUrl ? "Media" : ""),
            { chatId: chat._id }
          );
        } catch (e) {
          console.error("Error in foreground notification check:", e);
        }
      });
    };

    setupSocket();

    return () => {
      if (socket) {
        console.log("[Web-Notif] Cleaning up socket");
        socket.disconnect();
      }
    };
  }, [isReady]); // Re-run when auth is checked


  const Content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
          <Stack.Screen name="chat/forward" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="chat/message-info" options={{ headerShown: true, title: 'Message Info' }} />
          <Stack.Screen name="chat/shared-media" options={{ headerShown: true, title: 'Media, links and docs' }} />
          <Stack.Screen name="qrcode" options={{ presentation: 'modal', title: 'My Code' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webMobileWrapper}>
          {Content}
        </View>
      </View>
    );
  }

  return Content;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5', // WhatsApp web-like background
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%', // Ensure full height on web
  },
  webMobileWrapper: {
    width: '100%',
    maxWidth: 480, // Typical mobile width
    height: '100%',
    maxHeight: '100%', // Or fixed height like 850 for a phone look, but 100% is better for responsiveness
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)', // Subtle shadow
        overflow: 'hidden', // Clip content
      } as any,
    }),
  },
});
