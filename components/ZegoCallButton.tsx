import React from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

interface Props {
    inviteeId: string;
    inviteeName: string;
    isVideo: boolean;
    theme: any;
}

export const ZegoCallButton: React.FC<Props> = ({ inviteeId, inviteeName, isVideo, theme }) => {
    const handlePress = () => {
        if (Platform.OS === 'web') {
            alert("Calling feature is only available on Mobile app (Android/iOS).");
        }
    };

    return (
        <TouchableOpacity onPress={handlePress} style={{ padding: 4, marginRight: 8 }}>
            <IconSymbol
                name={isVideo ? "video" : "phone"}
                size={22}
                color={theme.headerTintColor}
            />
        </TouchableOpacity>
    );
};
