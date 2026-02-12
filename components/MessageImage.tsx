import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

interface MessageImageProps {
    uri: string;
    onPress: () => void;
    style?: any;
}

export const MessageImage = ({ uri, onPress, style }: MessageImageProps) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <View style={[style, styles.errorContainer]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#888" />
            </View>
        );
    }

    return (
        <TouchableOpacity onPress={onPress}>
            <Image
                source={{ uri }}
                style={style}
                resizeMode="cover"
                onError={() => setHasError(true)}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
});
