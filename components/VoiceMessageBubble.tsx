import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VoiceMessageBubbleProps {
    uri: string;
    duration?: number; // Duration in milliseconds
    isMyMessage: boolean;
    profilePic: string;
}

export const VoiceMessageBubble = ({ uri, duration, isMyMessage, profilePic }: VoiceMessageBubbleProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [totalDuration, setTotalDuration] = useState(duration || 0);
    const [loading, setLoading] = useState(false);
    const [waveform] = useState([...Array(15)].map(() => Math.random() * 15 + 5));

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
            {/* Avatar with Mic Badge */}
            <View style={styles.avatarContainer}>
                {/* Profile Pic */}
                <View style={styles.avatarCircle}>
                    {profilePic ? (
                        <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                    ) : (
                        <IconSymbol name="person.fill" size={30} color="#ccc" />
                    )}
                </View>
                {/* Mic Badge */}
                <View style={[styles.micBadge, { backgroundColor: isMyMessage ? '#008069' : '#fff' }]}>
                    <IconSymbol name="mic" size={12} color={isMyMessage ? '#fff' : '#008069'} />
                </View>
            </View>

            {/* Controls */}
            <TouchableOpacity onPress={playSound} style={styles.playButton}>
                {loading ? (
                    <ActivityIndicator size="small" color={isMyMessage ? '#005c4b' : '#008069'} />
                ) : (
                    <IconSymbol
                        name={isPlaying ? 'pause.fill' : 'play.fill'}
                        size={32} // Large play button
                        color={'#667781'}
                    />
                )}
            </TouchableOpacity>

            <View style={styles.contentContainer}>
                {/* Waveform / Progress */}
                <View style={styles.waveformContainer}>
                    <View style={[styles.progressDot, { left: `${totalDuration > 0 ? (position / totalDuration) * 100 : 0}%` }]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
                        {waveform.map((height, i) => (
                            <View
                                key={i}
                                style={{
                                    width: 3,
                                    height: height,
                                    backgroundColor: '#667781',
                                    marginHorizontal: 1,
                                    borderRadius: 1.5,
                                    opacity: (position / totalDuration) * 100 > (i / waveform.length) * 100 ? 1 : 0.4
                                }}
                            />
                        ))}
                    </View>
                </View>
                <Text style={styles.durationText}>
                    {formatTime(isPlaying ? position : totalDuration)}
                </Text>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 5,
        minWidth: 200,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 10,
    },
    avatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    micBadge: {
        position: 'absolute',
        bottom: 0,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    playButton: {
        padding: 0,
        marginRight: 8,
    },
    contentContainer: {
        flex: 1,
    },
    waveformContainer: {
        height: 30, // Area for waveform
        justifyContent: 'center',
    },
    progressDot: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#34B7F1', // Blue dot
        top: 9, // Centered vertically roughly
        zIndex: 10,
        marginLeft: -6, // Center anchor
    },
    durationText: {
        fontSize: 11,
        color: '#667781',
        marginTop: -5,
    },
});
