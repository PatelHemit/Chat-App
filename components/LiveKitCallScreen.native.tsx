import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { useCall } from '@/context/CallContext';
import {
    AudioSession,
    LiveKitRoom,
    VideoView,
    useLocalParticipant,
    useRoomContext,
    useTracks
} from '@livekit/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectionState, Track } from 'livekit-client';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, LogBox, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Suppress transient LiveKit race condition warnings in development
LogBox.ignoreLogs(['Tried to add a track for a participant']);

const LIVEKIT_URL = "wss://chat-app-ig9ab99z.livekit.cloud";

export const LiveKitCallScreen = ({
    visible,
    roomName,
    onClose,
    isVideoCall = true
}: {
    visible: boolean;
    roomName: string;
    onClose: () => void;
    isVideoCall?: boolean;
}) => {
    const [token, setToken] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const [duration, setDuration] = useState(0);
    const { socket, otherUserId, callConnected, otherUserName, otherUserPic, incomingCall } = useCall();
    const fetchedForRoom = useRef<string | null>(null);

    // Resolve display info - from incomingCall (callee) or from context (caller)
    const displayName = otherUserName || incomingCall?.from?.name || 'Unknown';
    const displayPic = otherUserPic || incomingCall?.from?.profilePic || null;

    // Fetch a fresh token whenever the call becomes visible with a new roomName
    useEffect(() => {
        if (!visible || !roomName) {
            if (!visible) {
                const timer = setTimeout(() => {
                    setToken(null);
                    fetchedForRoom.current = null;
                }, 1000);
                return () => clearTimeout(timer);
            }
            return;
        }

        if (fetchedForRoom.current === roomName) return;

        let cancelled = false;
        const getToken = async () => {
            setFetching(true);
            try {
                const userInfoStr = await AsyncStorage.getItem("userInfo");
                if (!userInfoStr) throw new Error("User not logged in");
                const userInfo = JSON.parse(userInfoStr);
                const participantName = `${userInfo.name || userInfo.phone || "User"} (${userInfo._id?.slice(-4) || Math.random()})`;
                const participantIdentity = userInfo._id || `user-${Math.random()}`;

                const userToken = await AsyncStorage.getItem("userToken");
                const res = await fetch(`${API_BASE_URL}/api/message/livekit/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({ roomName, participantName, participantIdentity })
                });

                if (!res.ok) throw new Error("Failed to get token");
                const data = await res.json();

                if (!cancelled) {
                    setToken(data.token);
                    fetchedForRoom.current = roomName;
                }
            } catch (err) {
                console.error("[LiveKit] Token error:", err);
                if (!cancelled) {
                    Alert.alert("Error", "Could not connect to call service.");
                    onClose();
                }
            } finally {
                if (!cancelled) setFetching(false);
            }
        };

        getToken();
        return () => { cancelled = true; };
    }, [visible, roomName]);

    // Call Timer Logic
    useEffect(() => {
        let interval: any;
        if (visible && callConnected && token) {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [visible, callConnected, token]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const hasEverConnectedRef = React.useRef(false);

    const handleDisconnected = () => {
        console.log("[LiveKit] Room disconnected (hasEverConnected:", hasEverConnectedRef.current, ")");
        if (!hasEverConnectedRef.current) {
            console.log("[LiveKit] Ignoring disconnect — room hasn't fully connected yet (region retry?)");
            return;
        }
        hasEverConnectedRef.current = false;
        if (socket && otherUserId) {
            socket.emit("end-call", { to: otherUserId });
        }
        onClose();
    };

    const handleConnected = () => {
        console.log("[LiveKit] Room connected successfully!");
        hasEverConnectedRef.current = true;
    };

    if (!visible && !token) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                {token ? (
                    <ErrorBoundary fallback={<OverlayError onClose={onClose} />}>
                        <LiveKitRoom
                            serverUrl={LIVEKIT_URL}
                            token={token}
                            connect={true}
                            audio={true}
                            video={isVideoCall}
                            onDisconnected={handleDisconnected}
                            onConnected={handleConnected}
                            onError={(err) => {
                                let errMsg = "";
                                if (err && typeof err === 'object') {
                                    if (err.message) errMsg = err.message;
                                    else if ((err as any)._type === 'error') errMsg = "WebSocket Error (Event)";
                                    else errMsg = JSON.stringify(err);
                                } else {
                                    errMsg = String(err);
                                }

                                if (
                                    errMsg.includes('PC manager') ||
                                    errMsg.includes('Client initiated disconnect') ||
                                    errMsg.includes('Tried to add a track') ||
                                    errMsg.includes('Negotiation failed') ||
                                    errMsg.includes("'client' of undefined") ||
                                    errMsg.includes("reading 'client'") ||
                                    errMsg.includes("remote description was null") ||
                                    errMsg.includes('engine not connected') ||
                                    errMsg.includes('PublishTrackError') ||
                                    errMsg.includes('could not establish pc connection') ||
                                    errMsg.includes('WebSocket') ||
                                    errMsg.includes('Connection reset')
                                ) {
                                    console.log("[LiveKit] Ignored transient error:", errMsg);
                                    return;
                                }
                                console.error("[LiveKit] Critical Room error:", errMsg);
                            }}
                        >
                            <CallContent
                                onClose={onClose}
                                isVideoCall={isVideoCall}
                                durationText={formatDuration(duration)}
                                displayName={displayName}
                                displayPic={displayPic}
                                callConnected={callConnected}
                            />
                        </LiveKitRoom>
                    </ErrorBoundary>
                ) : (
                    // Loading screen (fetching token)
                    <View style={styles.voiceBg}>
                        <View style={styles.centerContainer}>
                            <AvatarCircle name={displayName} pic={displayPic} size={110} pulse={false} />
                            <Text style={styles.callerName}>{displayName}</Text>
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{ marginTop: 12 }} />
                            <Text style={styles.statusText}>{fetching ? "Connecting..." : "Preparing..."}</Text>
                            <TouchableOpacity
                                style={[styles.controlButton, styles.endButton, { marginTop: 60 }]}
                                onPress={onClose}
                            >
                                <IconSymbol name="phone.down.fill" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
};

// ── Avatar helper ──────────────────────────────────────────────────────────────
const AvatarCircle = ({ name, pic, size = 110, pulse = true }: { name: string; pic: string | null; size?: number; pulse?: boolean }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim2 = useRef(new Animated.Value(1)).current;
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        // Reset image error when pic changes
        setImgError(false);
    }, [pic]);

    useEffect(() => {
        if (!pulse) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        const loop2 = Animated.loop(
            Animated.sequence([
                Animated.delay(450),
                Animated.timing(pulseAnim2, { toValue: 1.32, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim2, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        loop2.start();
        return () => { loop.stop(); loop2.stop(); };
    }, [pulse]);

    const initials = name ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const resolvedPic = pic ? getInternalUri(pic) : null;
    const showImage = !!resolvedPic && !imgError;

    console.log(`[AvatarCircle] name=${name}, pic=${pic}, resolvedPic=${resolvedPic}, imgError=${imgError}`);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', width: size * 1.4, height: size * 1.4 }}>
            {pulse && (
                <>
                    <Animated.View style={[styles.pulseRing, {
                        width: size * 1.4, height: size * 1.4, borderRadius: size * 0.7,
                        transform: [{ scale: pulseAnim2 }], opacity: 0.15
                    }]} />
                    <Animated.View style={[styles.pulseRing, {
                        width: size * 1.2, height: size * 1.2, borderRadius: size * 0.6,
                        transform: [{ scale: pulseAnim }], opacity: 0.25,
                        position: 'absolute',
                    }]} />
                </>
            )}
            <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, position: 'absolute' }]}>
                {showImage ? (
                    <Image
                        source={{ uri: resolvedPic! }}
                        style={{ width: size, height: size, borderRadius: size / 2 }}
                        resizeMode="cover"
                        onError={(e) => {
                            console.warn(`[AvatarCircle] Image failed to load: ${resolvedPic}`, e.nativeEvent.error);
                            setImgError(true);
                        }}
                    />
                ) : (
                    <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>{initials}</Text>
                )}
            </View>
        </View>
    );
};

// ── Call Content ───────────────────────────────────────────────────────────────
const CallContent = ({
    onClose, isVideoCall, durationText, displayName, displayPic, callConnected
}: {
    onClose: () => void;
    isVideoCall: boolean;
    durationText: string;
    displayName: string;
    displayPic: string | null;
    callConnected: boolean;
}) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();

    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
    const localTrack = tracks.find(t => t.participant.isLocal);
    const remoteTrack = tracks.find(t => !t.participant.isLocal);

    const isCameraEnabled = localParticipant?.isCameraEnabled ?? isVideoCall;
    const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? true;
    const hasRemoteVideo = !!(remoteTrack?.publication?.track && remoteTrack?.participant?.sid);

    useEffect(() => {
        AudioSession.startAudioSession();
        return () => { AudioSession.stopAudioSession(); };
    }, []);

    const toggleCamera = async () => {
        try { await localParticipant?.setCameraEnabled(!isCameraEnabled); }
        catch (e) { console.warn("toggleCamera:", e); }
    };

    const toggleMic = async () => {
        try { await localParticipant?.setMicrophoneEnabled(!isMicEnabled); }
        catch (e) { console.warn("toggleMic:", e); }
    };

    if (room.state === ConnectionState.Connecting || room.state === ConnectionState.Reconnecting) {
        return (
            <View style={styles.voiceBg}>
                <View style={styles.centerContainer}>
                    <AvatarCircle name={displayName} pic={displayPic} size={110} pulse={true} />
                    <Text style={styles.callerName}>{displayName}</Text>
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={{ marginTop: 12 }} />
                    <Text style={styles.statusText}>
                        {room.state === ConnectionState.Reconnecting ? 'Reconnecting...' : 'Connecting...'}
                    </Text>
                    <TouchableOpacity style={[styles.controlButton, styles.endButton, { marginTop: 60 }]} onPress={onClose}>
                        <IconSymbol name="phone.down.fill" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ── Voice call layout ──────────────────────────────────────────────────────
    if (!isVideoCall || !hasRemoteVideo) {
        // For voice calls: waiting only until callConnected (no video track to wait for)
        // For video calls: waiting until both connected AND remote video arrives
        const isWaiting = isVideoCall ? (!callConnected || !hasRemoteVideo) : !callConnected;
        return (
            <SafeAreaView style={styles.voiceBg}>
                {/* Top area - caller info */}
                <View style={styles.voiceTopSection}>
                    <AvatarCircle name={displayName} pic={displayPic} size={110} pulse={isWaiting} />
                    <Text style={styles.callerName}>{displayName}</Text>
                    <Text style={styles.statusText}>
                        {isWaiting ? (isVideoCall ? 'Ringing...' : 'Voice Call') : durationText}
                    </Text>
                    {!isWaiting && (
                        <View style={styles.connectedBadge}>
                            <IconSymbol name="lock.fill" size={10} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.connectedBadgeText}>End-to-end encrypted</Text>
                        </View>
                    )}
                </View>

                {/* Bottom controls */}
                <View style={styles.voiceControlsRow}>
                    {/* Mute */}
                    <View style={styles.controlItem}>
                        <TouchableOpacity
                            style={[styles.controlButton, !isMicEnabled && styles.controlButtonActive]}
                            onPress={toggleMic}
                        >
                            <IconSymbol name={isMicEnabled ? "mic.fill" : "mic.slash.fill"} size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.controlLabel}>{isMicEnabled ? 'Mute' : 'Unmute'}</Text>
                    </View>

                    {/* End Call */}
                    <View style={styles.controlItem}>
                        <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onClose}>
                            <IconSymbol name="phone.down.fill" size={30} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.controlLabel}>End</Text>
                    </View>

                    {/* Speaker - placeholder for future use */}
                    <View style={styles.controlItem}>
                        <TouchableOpacity style={styles.controlButton}>
                            <IconSymbol name="speaker.wave.2.fill" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.controlLabel}>Speaker</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // ── Video call layout ──────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            {/* Remote Video */}
            <View style={styles.remoteView}>
                {hasRemoteVideo ? (
                    <VideoView style={styles.fullVideo} videoTrack={remoteTrack.publication.track as any} />
                ) : (
                    <View style={styles.voiceBg}>
                        <View style={styles.centerContainer}>
                            <AvatarCircle name={displayName} pic={displayPic} size={110} pulse={true} />
                            <Text style={styles.callerName}>{displayName}</Text>
                            <Text style={styles.statusText}>Waiting for video...</Text>
                        </View>
                    </View>
                )}
                {/* Timer Overlay */}
                <View style={styles.timerHeader}>
                    <Text style={styles.timerText}>{durationText}</Text>
                    <Text style={styles.callTypeText}>Video Call</Text>
                </View>
            </View>

            {/* Local Video (floating) */}
            {isCameraEnabled && localTrack?.publication?.track && (
                <View style={styles.localView}>
                    <VideoView
                        style={styles.fullVideo}
                        videoTrack={localTrack.publication.track as any}
                        zOrder={1}
                    />
                </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={[styles.controlButton, !isMicEnabled && styles.controlButtonActive]}
                    onPress={toggleMic}
                >
                    <IconSymbol name={isMicEnabled ? "mic.fill" : "mic.slash.fill"} size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onClose}>
                    <IconSymbol name="phone.down.fill" size={32} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, !isCameraEnabled && styles.controlButtonActive]}
                    onPress={toggleCamera}
                >
                    <IconSymbol name={isCameraEnabled ? "video.fill" : "video.slash.fill"} size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ── Error Overlay ─────────────────────────────────────────────────────────────
const OverlayError = ({ onClose }: { onClose: () => void }) => (
    <View style={[styles.voiceBg, styles.centerContainer]}>
        <IconSymbol name="phone.down.fill" size={40} color="rgba(255,255,255,0.4)" />
        <Text style={[styles.statusText, { marginTop: 16 }]}>Connection interrupted.</Text>
        <TouchableOpacity style={[styles.controlButton, styles.endButton, { marginTop: 30 }]} onPress={onClose}>
            <IconSymbol name="phone.down.fill" size={24} color="#fff" />
        </TouchableOpacity>
    </View>
);

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("[Call-ErrorBoundary-Native] Caught crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    voiceBg: {
        flex: 1,
        backgroundColor: '#1a2a1a',  // Deep dark green base
        backgroundImage: undefined,
    },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Voice call top section
    voiceTopSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 20,
    },

    // Avatar
    avatarCircle: {
        backgroundColor: '#2d5a2d',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarInitials: {
        color: '#fff',
        fontWeight: 'bold',
    },
    pulseRing: {
        position: 'absolute',
        backgroundColor: '#25D366',
    },

    // Text
    callerName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
        marginTop: 24,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    statusText: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 15,
        marginTop: 8,
        textAlign: 'center',
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    connectedBadgeText: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 11,
        marginLeft: 4,
    },

    // Voice Controls
    voiceControlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 24,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    controlItem: {
        alignItems: 'center',
        gap: 8,
    },
    controlLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 6,
    },

    // Shared controls
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    endButton: {
        backgroundColor: '#FF3B30',
        width: 70,
        height: 70,
        borderRadius: 35,
    },

    // Video call specific
    remoteView: { flex: 1 },
    fullVideo: { width: '100%', height: '100%' },
    localView: {
        position: 'absolute', top: 50, right: 20,
        width: 100, height: 150,
        backgroundColor: '#333', borderRadius: 10,
        overflow: 'hidden', borderWidth: 1, borderColor: '#fff',
    },
    controlsContainer: {
        position: 'absolute', bottom: 40, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-evenly',
        alignItems: 'center', paddingHorizontal: 20,
    },
    timerHeader: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    timerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    callTypeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 2,
    },
});
