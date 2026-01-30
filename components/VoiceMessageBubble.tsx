import { IconSymbol } from '@/components/ui/icon-symbol';
import { getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
            // Ensure audio mode is correct for playback
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            if (sound) {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await sound.pauseAsync();
                        setIsPlaying(false);
                    } else {
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
            const finalUri = getInternalUri(uri);
            console.log('Voice Playback URI:', finalUri);

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: finalUri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setIsPlaying(true);
            setLoading(false);
        } catch (error: any) {
            console.error('[VOICE ERROR] Playback failed:', error);
            setLoading(false);
            const finalUri = getInternalUri(uri);
            Alert.alert(
                "Playback Error",
                `Could not load audio.\n\nURL: ${finalUri}\n\nError: ${error.message || "Unknown error"}`
            );
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
                <View style={[styles.avatarCircle, { backgroundColor: isMyMessage ? '#00A884' : '#667781' }]}>
                    {profilePic ? (
                        <Image source={{ uri: getInternalUri(profilePic) }} style={styles.avatarImage} />
                    ) : (
                        <IconSymbol name="person.fill" size={30} color="#fff" />
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
                        size={32}
                        color={'#8696a0'}
                    />
                )}
            </TouchableOpacity>

            <View style={styles.contentContainer}>
                {/* Waveform / Progress */}
                <View style={styles.waveformContainer}>
                    <View style={[styles.progressDot, { left: `${totalDuration > 0 ? (position / totalDuration) * 100 : 0}%`, backgroundColor: isMyMessage ? '#34B7F1' : '#34B7F1' }]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {waveform.map((h, i) => (
                            <View
                                key={i}
                                style={{
                                    width: 2.5,
                                    height: h,
                                    backgroundColor: (position / totalDuration) * 100 > (i / waveform.length) * 100 ? '#34B7F1' : '#8696a0',
                                    marginHorizontal: 1,
                                    borderRadius: 1.25,
                                }}
                            />
                        ))}
                    </View>
                </View>
                <Text style={[styles.durationText, { color: '#8696a0' }]}>
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
