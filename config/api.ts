import Constants from 'expo-constants';
import { Platform } from 'react-native';

const MANUAL_LAN_IP = '192.168.1.36';

// Use manual IP if provided, otherwise try to detect
const debuggerHost = Constants.expoConfig?.hostUri;
const localhostIp = debuggerHost ? debuggerHost.split(':')[0] : MANUAL_LAN_IP;

const LOCALHOST = Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
});

const LAN_IP = `http://${localhostIp}:3000`;

// Force manual override if detection is tricky or switching networks
// export const API_BASE_URL = `http://${MANUAL_LAN_IP}:3000`; 
export const API_BASE_URL = LAN_IP;
export const SOCKET_URL = LAN_IP;


