import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VoiceMessageBubbleProps {
    uri: string;
    duration?: number; // Duration in milliseconds
    isMyMessage: boolean;
}

export const VoiceMessageBubble = ({ uri, duration, isMyMessage }: VoiceMessageBubbleProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const playSound = async () => {
        try {
            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        // If finished, replay from start
                        if (status.positionMillis === status.durationMillis) {
                            await sound.replayAsync();
                        } else {
                            await sound.playAsync();
                        }
                        setIsPlaying(true);
                    }
                }
                return;
            }

            setLoading(true);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setIsPlaying(true);
            setLoading(false);
        } catch (error) {
            console.log('Error playing sound:', error);
            setLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            if (status.durationMillis) {
                setTotalDuration(status.durationMillis);
            }
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(status.durationMillis); // Show full progress at end
            }
        }
    };

    const formatTime = (millis: number) => {
        const minutes = Math.floor(millis / 60000);
        const seconds = ((millis % 60000) / 1000).toFixed(0);
        return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={playSound} style={styles.playButton}>
                {loading ? (
                    <ActivityIndicator size="small" color={isMyMessage ? '#fff' : '#008069'} />
                ) : (
                    <IconSymbol
                        name={isPlaying ? 'pause.fill' : 'play.fill'}
                        size={24}
                        color={isMyMessage ? '#fff' : '#888'}
                    />
                )}
            </TouchableOpacity>
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${totalDuration > 0 ? (position / totalDuration) * 100 : 0}%`,
                                backgroundColor: isMyMessage ? 'rgba(255,255,255,0.7)' : '#008069'
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.durationText, { color: isMyMessage ? 'rgba(255,255,255,0.8)' : '#888' }]}>
                    {formatTime(isPlaying ? position : totalDuration)}
                </Text>
            </View>
            <View style={styles.avatarContainer}>
                <IconSymbol name="mic.fill" size={20} color={isMyMessage ? 'rgba(255,255,255,0.5)' : '#ccc'} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        minWidth: 150,
    },
    playButton: {
        padding: 5,
    },
    progressContainer: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10,
    },
    progressBar: {
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        marginBottom: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    durationText: {
        fontSize: 10,
    },
    avatarContainer: {
        marginLeft: 5,
    }
});
