import { Platform } from 'react-native';

const LOCALHOST = Platform.select({
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
});

// You can change this to your LAN IP for physical device testing
const LAN_IP = 'http://192.168.1.5:3000';

export const API_BASE_URL = LOCALHOST;
export const SOCKET_URL = LAN_IP;


