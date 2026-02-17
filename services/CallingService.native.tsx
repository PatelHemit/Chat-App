import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';


// Removed top-level imports of ZegoCloud packages to prevent bundling/resolution errors.
// --- ZEGO CLOUD CONFIG ---
export const ZEGO_APP_ID = 540771903;
export const ZEGO_APP_SIGN = 'e729a912d74a28b05557787347588f85dac2351866487d80c6d4206421af8641';

import ZegoUIKitPrebuiltCallService from '@zegocloud/zego-uikit-prebuilt-call-rn';
import * as ZegoExpressEngine from 'zego-express-engine-reactnative';
import * as ZIM from 'zego-zim-react-native';

export const onUserLogin = async (userId: string, userName: string) => {
    console.log(`[CallingService] Initializing ZegoCloud for ${userName} (${userId})`);
    try {
        console.log('[CallingService] Plugins loaded:', {
            ZIM: !!ZIM,
            Express: !!ZegoExpressEngine,
            ZIM_Proto: ZIM?.prototype,
            Express_Proto: ZegoExpressEngine?.prototype
        });

        return ZegoUIKitPrebuiltCallService.init(
            ZEGO_APP_ID,
            ZEGO_APP_SIGN,
            userId,
            userName,
            [ZIM, ZegoExpressEngine],
            {
                ringtoneConfig: {
                    incomingCallFileName: 'zego_incoming.mp3',
                    outgoingCallFileName: 'zego_outgoing.mp3',
                },
                notifyWhenAppRunningInBackgroundOrQuit: true,
                isAndroidStartupSelfEnabled: true,
                androidNotificationConfig: {
                    channelID: "ZegoUIKit",
                    channelName: "ZegoUIKit",
                },
                onCallInvitationEnded: (callID: string, reason: string, duration: number, role: string) => {
                    console.log(`[CallingService] Call Ended. ID: ${callID}, Reason: ${reason}, Duration: ${duration}`);
                }
            }
        );
    } catch (error) {
        console.error('[CallingService] Init failed:', error);
    }
};

export const onUserLogout = async () => {
    console.log('[CallingService] Uninitializing ZegoCloud');
    try {
        const ZegoUIKitPrebuiltCallService = require('@zegocloud/zego-uikit-prebuilt-call-rn').default;
        ZegoUIKitPrebuiltCallService.uninit();
    } catch (error) {
        console.error('[CallingService] Logout failed:', error);
    }
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
