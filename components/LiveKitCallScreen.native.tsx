import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
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
import { ActivityIndicator, Alert, LogBox, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    const { socket, otherUserId } = useCall();
    const fetchedForRoom = useRef<string | null>(null);

    // Fetch a fresh token whenever the call becomes visible with a new roomName
    useEffect(() => {
        if (!visible || !roomName) {
            if (!visible) {
                // Graceful unmount: wait a bit before clearing token to let SDK cleanup
                const timer = setTimeout(() => {
                    setToken(null);
                    fetchedForRoom.current = null;
                }, 1000);
                return () => clearTimeout(timer);
            }
            return;
        }

        // Avoid re-fetching for the same room
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

    const hasEverConnectedRef = React.useRef(false);

    const handleDisconnected = () => {
        console.log("[LiveKit] Room disconnected (hasEverConnected:", hasEverConnectedRef.current, ")");
        if (!hasEverConnectedRef.current) {
            // SDK is retrying a region or doing internal reconnect — don't close the call
            console.log("[LiveKit] Ignoring disconnect — room hasn't fully connected yet (region retry?)");
            return;
        }
        // Room was previously fully connected and now disconnected — treat as true end of call
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
                                // LiveKit on Android can emit a raw Event object as an error which causes 'Uncaught in promise' if stringified naively
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
                            <CallContent onClose={onClose} isVideoCall={isVideoCall} />
                        </LiveKitRoom>
                    </ErrorBoundary>
                ) : (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: '#fff', marginTop: 20 }}>
                            {fetching ? "Connecting to call..." : "Preparing..."}
                        </Text>
                        <TouchableOpacity
                            style={[styles.controlButton, styles.endButton, { marginTop: 40 }]}
                            onPress={onClose}
                        >
                            <IconSymbol name="phone.down.fill" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal >
    );
};

const OverlayError = ({ onClose }: { onClose: () => void }) => (
    <View style={styles.centerContainer}>
        <Text style={{ color: '#fff', marginBottom: 20 }}>Connection interrupted.</Text>
        <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onClose}>
            <IconSymbol name="phone.down.fill" size={24} color="#fff" />
        </TouchableOpacity>
    </View>
);

const CallContent = ({ onClose, isVideoCall }: { onClose: () => void; isVideoCall: boolean }) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();

    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
    const localTrack = tracks.find(t => t.participant.isLocal);
    const remoteTrack = tracks.find(t => !t.participant.isLocal);

    const isCameraEnabled = localParticipant?.isCameraEnabled ?? isVideoCall;
    const isMicEnabled = localParticipant?.isMicrophoneEnabled ?? true;

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

    if (room.state === ConnectionState.Connecting) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: '#fff', marginTop: 20 }}>Connecting...</Text>
            </View>
        );
    }

    if (room.state === ConnectionState.Reconnecting) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: '#fff', marginTop: 20 }}>Reconnecting...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Remote Video */}
            <View style={styles.remoteView}>
                {remoteTrack?.publication?.track && remoteTrack?.participant?.sid ? (
                    <VideoView style={styles.fullVideo} videoTrack={remoteTrack.publication.track as any} />
                ) : (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="small" color="#555" />
                        <Text style={{ color: '#fff', marginTop: 10 }}>Waiting for other user...</Text>
                    </View>
                )}
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
                    style={[styles.controlButton, !isMicEnabled && styles.disabledButton]}
                    onPress={toggleMic}
                >
                    <IconSymbol name={isMicEnabled ? "mic.fill" : "mic.slash.fill"} size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onClose}>
                    <IconSymbol name="phone.down.fill" size={32} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.controlButton, !isCameraEnabled && styles.disabledButton]}
                    onPress={toggleCamera}
                >
                    <IconSymbol name={isCameraEnabled ? "video.fill" : "video.slash.fill"} size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ErrorBoundary to catch SDK crashes
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
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
    controlButton: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    disabledButton: { backgroundColor: 'rgba(255,255,255,0.1)' },
    endButton: { backgroundColor: '#FF3B30', width: 70, height: 70, borderRadius: 35 },
});
