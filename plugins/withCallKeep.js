const { withAndroidManifest, withPlugins } = require('@expo/config-plugins');

/**
 * Custom plugin to add react-native-callkeep requirements to AndroidManifest.xml
 */
const withCallKeepManifest = (config) => {
    return withAndroidManifest(config, (config) => {
        const mainApplication = config.modResults.manifest.application[0];

        // 1. Add ConnectionService
        if (!mainApplication.service) {
            mainApplication.service = [];
        }

        const hasConnectionService = mainApplication.service.some(
            (s) => s.$['android:name'] === 'io.wazo.callkeep.VoiceConnectionService'
        );

        if (!hasConnectionService) {
            mainApplication.service.push({
                $: {
                    'android:name': 'io.wazo.callkeep.VoiceConnectionService',
                    'android:label': 'ChatApp',
                    'android:permission': 'android.permission.BIND_TELECOM_CONNECTION_SERVICE',
                    'android:exported': 'true',
                    'android:foregroundServiceType': 'phoneCall',
                },
                'intent-filter': [
                    {
                        action: [
                            {
                                $: { 'android:name': 'android.telecom.ConnectionService' },
                            },
                        ],
                    },
                ],
            });
        }

        // 2. Add BackgroundMessagingService
        const hasBackgroundService = mainApplication.service.some(
            (s) => s.$['android:name'] === 'io.wazo.callkeep.RNCallKeepBackgroundMessagingService'
        );

        if (!hasBackgroundService) {
            mainApplication.service.push({
                $: {
                    'android:name': 'io.wazo.callkeep.RNCallKeepBackgroundMessagingService',
                    'android:exported': 'false',
                },
            });
        }

        // 3. Add USE_FULL_SCREEN_INTENT permission to manifest
        if (!config.modResults.manifest['uses-permission']) {
            config.modResults.manifest['uses-permission'] = [];
        }

        const hasFullScreenIntent = config.modResults.manifest['uses-permission'].some(
            (p) => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT'
        );

        if (!hasFullScreenIntent) {
            config.modResults.manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' }
            });
        }

        const hasManageCalls = config.modResults.manifest['uses-permission'].some(
            (p) => p.$['android:name'] === 'android.permission.MANAGE_OWN_CALLS'
        );

        if (!hasManageCalls) {
            config.modResults.manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.MANAGE_OWN_CALLS' }
            });
        }

        const hasReadNumbers = config.modResults.manifest['uses-permission']?.some(
            (p) => p.$['android:name'] === 'android.permission.READ_PHONE_NUMBERS'
        );

        if (!hasReadNumbers) {
            config.modResults.manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.READ_PHONE_NUMBERS' }
            });
        }

        // Add Android 14 Foreground Service Type Permission
        const hasFgsPhoneCall = config.modResults.manifest['uses-permission']?.some(
            (p) => p.$['android:name'] === 'android.permission.FOREGROUND_SERVICE_PHONE_CALL'
        );
        if (!hasFgsPhoneCall) {
            config.modResults.manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_PHONE_CALL' }
            });
        }

        // Add Android 13 Post Notifications Permission
        const hasPostNotif = config.modResults.manifest['uses-permission']?.some(
            (p) => p.$['android:name'] === 'android.permission.POST_NOTIFICATIONS'
        );
        if (!hasPostNotif) {
            config.modResults.manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' }
            });
        }

        // Add Wake Lock Permission
        const hasWakeLock = config.modResults.manifest['uses-permission']?.some(
            (p) => p.$['android:name'] === 'android.permission.WAKE_LOCK'
        );
        if (!hasWakeLock) {
            config.modResults.manifest['uses-permission'].push({
                $: { 'android:name': 'android.permission.WAKE_LOCK' }
            });
        }

        // 4. Update MainActivity to show on lock screen
        if (mainApplication.activity) {
            const mainActivity = mainApplication.activity.find(
                (a) => a.$['android:name'] === '.MainActivity' || a.$['android:name']?.endsWith('.MainActivity')
            );

            if (mainActivity && mainActivity.$) {
                mainActivity.$['android:showWhenLocked'] = 'true';
                mainActivity.$['android:turnScreenOn'] = 'true';
                // Remove launchMode override - let Expo manage it
            }
        }

        return config;
    });
};

module.exports = (config) => {
    return withPlugins(config, [withCallKeepManifest]);
};
