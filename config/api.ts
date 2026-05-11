import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const MANUAL_LAN_IP = '192.168.1.2';

// Use manual IP if provided, otherwise try to detect
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
// Use manual IP if provided, otherwise try to detect from Expo
const localhostIp = MANUAL_LAN_IP || debuggerHost || '127.0.0.1';

console.log(`[API-Config] Detected debuggerHost: ${debuggerHost}`);
console.log(`[API-Config] Manual IP Set: ${MANUAL_LAN_IP}`);
console.log(`[API-Config] Effective Local IP: ${localhostIp}`);

const getApiBaseUrl = () => {
    // Android emulator bridge
    if (Platform.OS === 'android' && !Device.isDevice) {
        return 'http://10.0.2.2:3000';
    }
    // Web localhost
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:3000';
    }
    // Default to LAN IP
    return `http://${localhostIp}:3000`;
};

// Production URL (Render)
const RENDER_URL = 'https://chat-app-3-avn4.onrender.com';

// Use local for development, Render URL for production (Switch manually when needed)
// export const API_BASE_URL = getApiBaseUrl(); // <-- Local dev (192.168.1.2)
export const API_BASE_URL = RENDER_URL; // <-- Production (Render) - uncomment for APK build
console.log(`[API-Config] ****************************************`);
console.log(`[API-Config] * FINAL API_BASE_URL: ${API_BASE_URL}`);
console.log(`[API-Config] ****************************************`);

export const SOCKET_URL = API_BASE_URL;

/**
 * Ensures that a given URI is accessible from the current device.
 * Remaps localhost/local IPs to the current API_BASE_URL while preserving public Render URLs.
 */
export const getInternalUri = (rawUri: string): string => {
    if (!rawUri) return rawUri;

    // 1. If it's a known non-local asset (like ImageKit), leave it alone.
    if (rawUri.includes('ik.imagekit.io')) {
        return rawUri;
    }

    // NEW ROBUST LOGIC:
    // Any URI that contains '/uploads/' should be rebased to the current API_BASE_URL.
    // This handles cases where the DB has 'localhost' or 'onrender.com' links 
    // but the app is currently running in a different environment.
    if (rawUri.includes('/uploads/')) {
        const parts = rawUri.split('/uploads/');
        const filename = parts[1];
        const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        return `${cleanBase}/uploads/${filename}`;
    }

    // 2. Fallback for relative paths that don't have /uploads/ yet
    if (!rawUri.startsWith('http')) {
        const cleanPath = rawUri.startsWith('/') ? rawUri : `/${rawUri}`;
        const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        return `${cleanBase}/uploads${cleanPath}`;
    }

    return rawUri;
};
