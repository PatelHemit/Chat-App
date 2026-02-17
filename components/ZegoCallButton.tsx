import React from 'react';
import { Alert, Platform, TouchableOpacity } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

// This file is used on Web where ZegoCloud native modules are not available.
// The native implementation is in ZegoCallButton.native.tsx

interface Props {
    inviteeId: string;
    inviteeName: string;
    isVideo: boolean;
    theme: any;
}

export const ZegoCallButton: React.FC<Props> = ({ isVideo, theme }) => {
    const handlePress = () => {
        if (Platform.OS === 'web') {
            alert("Calling feature is only available on Mobile app (Android/iOS).");
        } else {
            Alert.alert("Feature Not Supported", "Calling is not supported on this platform version.");
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
