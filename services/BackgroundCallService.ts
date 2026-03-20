import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import CallKeepService from './CallKeepService';
import logger from './PersistentLogger';

// Helper to convert MongoID (24 chars) to a valid UUID (32 chars with hyphens)
export const toUUID = (mongoId: any) => {
    if (!mongoId || typeof mongoId !== 'string') {
        return '00000000-0000-0000-0000-000000000000';
    }
    const clean = mongoId.replace(/[^a-f0-9]/gi, '');
    const padded = clean.padEnd(32, '0').toLowerCase();
    return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
};

// Helper to robustly parse isVideoCall from any source
export const parseCallType = (val: any): boolean => {
    if (val === true || val === 1 || val === '1' || val === 'true') return true;
    if (val === false || val === 0 || val === '0' || val === 'false' || val == null) return false;
    return !!val;
};

/**
 * Handle incoming call from background/killed state via FCM
 */
export const handleBackgroundMessage = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    await logger.info('[FCM-Background] 🔔 Background Message Received', { id: remoteMessage.messageId });

    try {
        if (remoteMessage.data?.type === 'incoming-call') {
            const { roomName, callId, uuid, isVideoCall, sender, callerName, callerId: rawCallerId } = remoteMessage.data as any;

            // 1. Check for self-call suppression
            const senderInfo = typeof sender === 'string' ? JSON.parse(sender) : sender;
            const callerId = rawCallerId || senderInfo?._id || senderInfo;
            const userInfoStr = await AsyncStorage.getItem('userInfo');
            
            if (userInfoStr) {
                try {
                    const userInfo = JSON.parse(userInfoStr);
                    if (userInfo?._id && callerId && String(userInfo._id) === String(callerId)) {
                        await logger.info('[FCM-Background] 🛡️ Suppression: This is a self-call. Ignoring.');
                        return;
                    }
                } catch (e) {
                    // ignore parse error
                }
            }

            const realCallId = (callId || uuid) as string;
            const callUUID = toUUID(realCallId);

            await logger.info('[FCM-Background] 📞 Incoming call detected', { callerName, callId: realCallId });

            const meta = {
                roomName,
                callId: realCallId,
                from: senderInfo,
                isVideoCall: parseCallType(isVideoCall),
                callerName
            };

            // Persist call metadata for the main app to pickup on launch
            await AsyncStorage.setItem(`call_meta_${callUUID}`, JSON.stringify(meta));
            await AsyncStorage.setItem('pending_call_uuid', callUUID);
            await logger.info('[FCM-Background] 💾 Metadata persisted', { uuid: callUUID });

            // Ensure CallKeep is initialized and display the native UI
            try {
                await CallKeepService.setup();
                await CallKeepService.displayIncomingCall(
                    callUUID,
                    (callerName || 'Unknown') as string,
                    (callerName || 'Unknown') as string
                );
                await logger.info('[FCM-Background] ✅ CallKeep triggered successfully');
            } catch (ckErr: any) {
                await logger.error('[FCM-Background] ❌ CallKeep display FAILED', { error: ckErr.message });
                
                // Fallback to local notification with buttons
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: `Incoming ${meta.isVideoCall ? 'Video' : 'Voice'} Call`,
                        body: meta.callerName,
                        data: { type: 'incoming-call', callId: realCallId, uuid: callUUID },
                        categoryIdentifier: 'incoming-call', // Trigger Accept/Decline buttons
                        sound: 'default',
                        priority: Notifications.AndroidNotificationPriority.MAX,
                    },
                    trigger: null,
                });
            }

            // Bring app to foreground on Android if possible
            if (Platform.OS === 'android') {
                CallKeepService.backToForeground();
            }
        }
    } catch (err: any) {
        await logger.error('[FCM-Background] ❌ Critical Processing Error', { error: err.message });
    }
};
