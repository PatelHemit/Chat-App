import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

import { Platform, StyleSheet, View } from 'react-native';

// ... imports

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');

        // We set ready first so the router tree can mount
        setIsReady(true);

        // Then we decide if we need to redirect
        if (!userToken) {
          // Small delay to ensure the router is fully initialized
          setTimeout(() => {
            if (Platform.OS === 'web') {
              router.replace('/auth/qr-login');
            } else {
              router.replace('/auth/welcome');
            }
          }, 0);
        }
      } catch (e) {
        console.error('Error checking auth:', e);
        setIsReady(true);
      }
    };

    checkAuth();
  }, [router]);

  if (!isReady) return null;

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
