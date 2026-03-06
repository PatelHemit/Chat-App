import { PermissionsAndroid, Platform } from 'react-native';
import logger from './PersistentLogger';

// Robust import for RNCallKeep to handle ESM/CJS differences in Metro
const RNCallKeep = Platform.OS !== 'web'
    ? (require('react-native-callkeep').default || require('react-native-callkeep'))
    : null;

const options = {
    ios: {
        appName: 'ChatApp',
    },
    android: {
        alertTitle: 'Permissions required',
        alertDescription: 'This application needs to access your phone accounts',
        cancelButton: 'Cancel',
        okButton: 'ok',
        imageName: 'phone_account_icon',
        additionalPermissions: [PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS],
        selfManaged: true,
        foregroundService: {
            channelId: 'incoming-calls',
            channelName: 'Incoming Calls',
            notificationTitle: 'Incoming Call',
            notificationIcon: 'ic_launcher',
        },
    }
};

class CallKeepService {
    private isInitialized = false;

    async setup() {
        console.log('[CallKeep] setup() called');
        if (this.isInitialized || Platform.OS === 'web' || !RNCallKeep) {
            console.log('[CallKeep] setup() skipped. isInit:', this.isInitialized, 'hasModule:', !!RNCallKeep);
            return;
        }

        try {
            // Manual check for Android 11+ required permission
            if (Platform.OS === 'android' && Platform.Version >= 30) {
                try {
                    const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);
                    if (!hasPermission) {
                        console.log('[CallKeep] READ_PHONE_NUMBERS not granted, requesting...');
                        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);
                    }
                } catch (pErr) {
                    console.warn('[CallKeep] Manual permission check failed (swallowed):', pErr);
                }
            }

            console.log('[CallKeep] Setup starting native call...');
            await RNCallKeep.setup(options);
            try {
                RNCallKeep.registerPhoneAccount(options as any); // Required for Android 8+
                console.log('[CallKeep] PhoneAccount registration successful');
            } catch (regErr) {
                console.warn('[CallKeep] PhoneAccount registration failed (swallowed):', regErr);
            }
            RNCallKeep.setAvailable(true);
            this.isInitialized = true;
            console.log('[CallKeep] Setup successful');
        } catch (err) {
            console.error('[CallKeep] Setup error:', err);
        }
    }

    async displayIncomingCall(uuid: string, handle: string, localizedCallerName: string) {
        if (Platform.OS === 'web' || !RNCallKeep) {
            console.log('[CallKeep] displayIncomingCall skipped. hasModule:', !!RNCallKeep);
            return;
        }

        console.log('[CallKeep] displayIncomingCall requested', { uuid, handle });
        await logger.info('[CallKeep] displayIncomingCall requested', { uuid, handle });
        try {
            RNCallKeep.displayIncomingCall(uuid, handle, localizedCallerName, 'generic', true);
            console.log('[CallKeep] displayIncomingCall executed');
            await logger.info('[CallKeep] displayIncomingCall executed');
        } catch (err: any) {
            console.error('[CallKeep] displayIncomingCall FAILED:', err.message);
            await logger.error('[CallKeep] displayIncomingCall FAILED', { error: err.message });
        }
    }

    answerCall(uuid: string) {
        if (Platform.OS === 'web' || !RNCallKeep) return;
        try {
            if (typeof RNCallKeep.answerCall === 'function') {
                RNCallKeep.answerCall(uuid);
            } else if (typeof RNCallKeep.answerIncomingCall === 'function') {
                // Fallback for some Android versions/builds
                RNCallKeep.answerIncomingCall(uuid);
            } else {
                console.warn('[CallKeep] Neither answerCall nor answerIncomingCall found');
            }
        } catch (err) {
            console.error('[CallKeep] answerCall error:', err);
        }
    }

    endCall(uuid: string) {
        if (Platform.OS === 'web' || !RNCallKeep) return;
        try {
            if (typeof RNCallKeep.endCall === 'function') {
                RNCallKeep.endCall(uuid);
            } else if (typeof RNCallKeep.rejectCall === 'function') {
                RNCallKeep.rejectCall(uuid);
            }
        } catch (err) {
            console.error('[CallKeep] endCall error:', err);
        }
    }

    backToForeground() {
        if (Platform.OS === 'web' || !RNCallKeep) return;
        try {
            if (typeof RNCallKeep.backToForeground === 'function') {
                RNCallKeep.backToForeground();
            } else {
                console.warn('[CallKeep] backToForeground method not available on this build');
            }
        } catch (err) {
            console.error('[CallKeep] backToForeground error:', err);
        }
    }

    addEventListener(type: any, handler: any) {
        if (Platform.OS === 'web' || !RNCallKeep) return;
        try {
            RNCallKeep.addEventListener(type, handler);
        } catch (err) {
            console.error('[CallKeep] addEventListener error:', err);
        }
    }

    removeEventListener(type: any, handler: any) {
        if (Platform.OS === 'web' || !RNCallKeep) return;
    }
}

export default new CallKeepService();
