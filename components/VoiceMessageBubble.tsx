import { IconSymbol } from '@/components/ui/icon-symbol';
import { getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useEffect, useState } from 'react';
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
    const [waveform] = useState([...Array(60)].map(() => Math.random() * 14 + 4));


    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const playSound = async () => {
        try {
            // Ensure audio mode is correct for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                interruptionModeIOS: InterruptionModeIOS.DuckOthers,
            });

            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await sound.pauseAsync();
                    } else {
                        if (status.positionMillis === status.durationMillis) {
                            await sound.replayAsync();
                        } else {
                            await sound.playAsync();
                        }
                    }
                }
                return;
            }

            setLoading(true);
            const finalUri = getInternalUri(uri);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: finalUri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setLoading(false);
        } catch (error: any) {
            console.error('[VOICE ERROR] Playback failed:', error);
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
                setPosition(status.durationMillis);
            }
        }
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={styles.container}>
            {/* Avatar with Mic Badge */}
            <View style={styles.avatarContainer}>
                <View style={[styles.avatarCircle, { backgroundColor: '#667781' }]}>
                    {profilePic ? (
                        <Image source={{ uri: getInternalUri(profilePic) }} style={styles.avatarImage} />
                    ) : (
                        <IconSymbol name="person.fill" size={28} color="#fff" />
                    )}
                </View>
                {/* Mic Badge - Always green in Chatzy */}
                <View style={[styles.micBadge, { backgroundColor: '#00A884' }]}>
                    <IconSymbol name="mic.fill" size={9} color={'#fff'} />
                </View>
            </View>

            {/* Controls */}
            <TouchableOpacity onPress={playSound} style={styles.playButton} activeOpacity={0.7}>
                {loading ? (
                    <ActivityIndicator size="small" color="#8696a0" />
                ) : (
                    <IconSymbol
                        name={isPlaying ? 'pause.fill' : 'play.fill'}
                        size={28}
                        color={'#8696a0'}
                    />
                )}
            </TouchableOpacity>

            <View style={styles.contentContainer}>
                {/* Waveform / Progress */}
                <View style={styles.waveformContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', height: 20 }}>
                        {waveform.map((h, i) => {
                            const isPlayed = (position / (totalDuration || 1)) * 100 > (i / waveform.length) * 100;
                            return (
                                <View
                                    key={i}
                                    style={{
                                        width: 1.2,
                                        height: h,
                                        backgroundColor: isPlayed ? '#34B7F1' : '#8696a044',
                                        marginHorizontal: 0.5,
                                        borderRadius: 0.6,
                                    }}
                                />
                            );
                        })}
                    </View>
                    {/* Progress Dot */}
                    <View style={[styles.progressDot, {
                        left: `${totalDuration > 0 ? (position / totalDuration) * 100 : 0}%`,
                    }]} />
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
        paddingVertical: 4,
        paddingHorizontal: 4,
        minWidth: 200,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 6,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
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
        right: -1,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    playButton: {
        padding: 0,
        marginRight: 4,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    waveformContainer: {
        height: 24,
        justifyContent: 'center',
    },
    progressDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#34B7F1',
        top: 7,
        zIndex: 10,
        marginLeft: -5,
    },
    durationText: {
        fontSize: 10.5,
        color: '#667781',
        marginTop: 0,
    },
});
