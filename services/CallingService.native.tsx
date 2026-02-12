import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- ZEGO CLOUD CONFIG ---
export const ZEGO_APP_ID = 540771903;
export const ZEGO_APP_SIGN = 'e729a912d74a28b05557787347588f85dac2351866487d80c6d4206421af8641';

export const onUserLogin = async (userId: string, userName: string) => {
    console.log('[CallingService] Mock login (ZegoCloud will be available in development build)');
};

export const onUserLogout = async () => {
    console.log('[CallingService] Mock logout');
};

export const logCallToBackend = async (receiverId: string, type: 'audio' | 'video', status: string, duration: number = 0) => {
    try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        await fetch(`${API_BASE_URL}/api/call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                receiverId,
                type,
                status,
                duration
            })
        });
    } catch (error) {
        console.error("[CallingService] Failed to log call:", error);
    }
};
