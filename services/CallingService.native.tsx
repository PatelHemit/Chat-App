import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ZegoUIKitPrebuiltCallService from '@zegocloud/zego-uikit-prebuilt-call-rn';
import ZIM from 'zego-zim-react-native';
import ZPNs from 'zego-zpns-react-native';

// --- ZEGO CLOUD CONFIG ---
// NOTE: These should ideally be in a secure config file or env variables.
// Users can get these from https://console.zegocloud.com/
export const ZEGO_APP_ID = 540771903;
export const ZEGO_APP_SIGN = 'e729a912d74a28b05557787347588f85dac2351866487d80c6d4206421af8641';

export const onUserLogin = async (userId: string, userName: string) => {
    try {
        ZegoUIKitPrebuiltCallService.init(
            ZEGO_APP_ID,
            ZEGO_APP_SIGN,
            userId,
            userName,
            [ZIM, ZPNs],
            {
                ringtoneConfig: {
                    incomingCallRingtone: 'ringtone.mp3',
                    outgoingCallRingtone: 'ringtone.mp3',
                },
                notifyWhenAppRunningInBackgroundOrQuit: true,
                isAndroidIndependentProcess: true,
                androidNotificationConfig: {
                    channelID: "ZegoUIKit",
                    channelName: "ZegoUIKit",
                },
            }
        );
        console.log("[CallingService] Initialized for user:", userId);
    } catch (error) {
        console.error("[CallingService] Initialization failed:", error);
    }
};

export const onUserLogout = async () => {
    ZegoUIKitPrebuiltCallService.uninit();
};

export const startCall = async (receiverId: string, receiverName: string, isVideo: boolean) => {
    // This function will be called from the UI buttons
    // However, the ZegoSendCallInvitationButton is the standard way to trigger calls in the UI kit
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
