import messaging from '@react-native-firebase/messaging';
import { handleBackgroundMessage } from './services/BackgroundCallService';
import { Platform } from 'react-native';

// 1. MUST register background handler at the very top level for Killed-State (Headless JS) support on Android
if (Platform.OS !== 'web') {
    try {
        messaging().setBackgroundMessageHandler(handleBackgroundMessage);
        console.log('[Root-Entry] 🚀 Firebase background message handler registered');
    } catch (e) {
        console.error('[Root-Entry] ❌ Background handler registration failed:', e);
    }
}

// 2. Delegate to the standard Expo Router entry point
// This handles require.context and registerRootComponent correctly for Metro
import 'expo-router/entry';
