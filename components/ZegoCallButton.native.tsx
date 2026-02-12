import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';

interface Props {
    inviteeId: string;
    inviteeName: string;
    isVideo: boolean;
    theme: any;
}

export const ZegoCallButton: React.FC<Props> = ({ inviteeId, inviteeName, isVideo, theme }) => {
    if (!inviteeId || !inviteeName) {
        return null;
    }

    return (
        <TouchableOpacity
            onPress={() => Alert.alert(
                "Development Build Required",
                "Calling features require a custom development build with ZegoCloud SDK. Install the EAS build APK to use calling."
            )}
            style={{ padding: 8 }}
        >
            <MaterialIcons
                name={isVideo ? "videocam" : "call"}
                size={24}
                color={theme.headerTintColor}
            />
        </TouchableOpacity>
    );
};
