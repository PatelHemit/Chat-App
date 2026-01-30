import Constants from 'expo-constants';
import { Platform } from 'react-native';

const MANUAL_LAN_IP = '10.102.43.64';

// Use manual IP if provided, otherwise try to detect
const debuggerHost = Constants.expoConfig?.hostUri;
const localhostIp = debuggerHost ? debuggerHost.split(':')[0] : MANUAL_LAN_IP;

const LOCALHOST = Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
});

const LAN_IP = `http://${localhostIp}:3000`;

// Force manual override if detection is tricky or switching networks
const RENDER_URL = 'https://chat-app-3-avn4.onrender.com';

// export const API_BASE_URL = LAN_IP; 
export const API_BASE_URL = RENDER_URL;

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
