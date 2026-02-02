import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import NotificationService from '@/services/NotificationService';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { Platform, StyleSheet, View } from 'react-native';

// ... imports

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

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
          const API_URL = Platform.OS === 'web'
            ? 'http://localhost:3000'
            : 'http://192.168.1.36:3000';

          const pushToken = await NotificationService.registerForPushNotifications();
          if (pushToken) {
            await NotificationService.sendTokenToBackend(pushToken, userToken, API_URL);
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

  // We no longer return null here because the navigator needs to mount
  // to initialize the navigation state.


  const Content = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="qrcode" options={{ presentation: 'modal', title: 'My Code' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
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
