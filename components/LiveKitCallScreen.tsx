import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { useCall } from '@/context/CallContext';
import {
    ControlBar,
    GridLayout,
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useConnectionState,
    useTracks
} from '@livekit/components-react';
import '@livekit/components-styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectionState, Track } from 'livekit-client';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const LIVEKIT_URL = "wss://chat-app-ig9ab99z.livekit.cloud";

export const LiveKitCallScreen = ({
    visible,
    roomName,
    onClose,
    isVideoCall: initialIsVideoCall = true,
    callConnected = false
}: {
    visible: boolean;
    roomName: string;
    onClose: () => void;
    isVideoCall?: boolean;
    callConnected?: boolean;
}) => {
    const [token, setToken] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [readyToConnect, setReadyToConnect] = useState(false);
    const [duration, setDuration] = useState(0);
    const { socket, otherUserId, videoSwitchRequest, requestVideoSwitch, respondToVideoSwitch, isVideoCall: contextIsVideo } = useCall();
    const isVideoCall = contextIsVideo ?? initialIsVideoCall;
    const fetchedForRoom = useRef<string | null>(null);


    console.log(`[LiveKit-Web] Render - visible: ${visible}, roomName: ${roomName}, token: ${!!token}, callConnected: ${callConnected}, readyToConnect: ${readyToConnect}`);

    useEffect(() => {
        console.log(`[LiveKit-Web] Prop change - visible: ${visible}, callConnected: ${callConnected}, hasToken: ${!!token}`);
        if (Platform.OS === 'web' && visible) {
            console.log("[LiveKit-Web] VIISIBLE prop is TRUE. Checking token/connection status...");
        }
    }, [visible, callConnected, token]);

    // Delay before showing <LiveKitRoom> to let React Strict Mode's double-mount
    // cycle finish BEFORE LiveKit starts connecting. Without this, Strict Mode
    // unmounts LiveKitRoom during setup → room.disconnect() → second mount fails.
    useEffect(() => {
        if (token && callConnected) {
            console.log("[LiveKit-Web] token & callConnected met. Starting ready timer.");
            const timer = setTimeout(() => {
                setReadyToConnect(true);
            }, 150);
            return () => { clearTimeout(timer); setReadyToConnect(false); };
        } else {
            setReadyToConnect(false);
        }
    }, [token, callConnected, visible]);

    // Call Timer Logic
    useEffect(() => {
        let interval: any;
        if (callConnected && readyToConnect) {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [callConnected, readyToConnect]);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        // Only fetch token and connect when the call is actually accepted
        if (!visible || !roomName || !callConnected) {
            if (!visible) {
                const timer = setTimeout(() => {
                    setToken(null);
                    setError(null);
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
            setError(null);
            console.log(`[LiveKit-Web] Starting token fetch for room: ${roomName}, API: ${API_BASE_URL}`);

            try {
                const userInfoStr = await AsyncStorage.getItem("userInfo");
                if (!userInfoStr) throw new Error("User info not found in storage");
                const userInfo = JSON.parse(userInfoStr);
                const participantName = `${userInfo.name || userInfo.phone || "User"} (${userInfo._id?.slice(-4) || Math.random()})`;
                const participantIdentity = userInfo._id || `user-${Math.random()}`;

                const userToken = await AsyncStorage.getItem("userToken");
                if (!userToken) throw new Error("User token not found");

                const url = `${API_BASE_URL}/api/message/livekit/token`;
                console.log(`[LiveKit-Web] Fetching from: ${url}`);

                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({ roomName, participantName, participantIdentity })
                });

                console.log(`[LiveKit-Web] Token fetch response status: ${res.status}`);

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || `Server error: ${res.status}`);
                }

                const data = await res.json();
                console.log(`[LiveKit-Web] Token received successfully (length: ${data.token?.length})`);

                if (!cancelled) {
                    setToken(data.token);
                    fetchedForRoom.current = roomName;
                }
            } catch (err: any) {
                console.error("[LiveKit-Web] Token fetch failure:", err.message);
                if (!cancelled) {
                    setError(`Connection Error: ${err.message}`);
                }
            } finally {
                if (!cancelled) setFetching(false);
            }
        };

        getToken();
        return () => { cancelled = true; };
    }, [visible, roomName, callConnected]);


    // Render as a fixed div on web to ensure it's always on top of everything
    if (Platform.OS === 'web') {
        const renderWebState = () => {
            if (error) {
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', color: '#fff', width: '100%', height: '100%' }}>
                        <span style={{ fontSize: 48, marginBottom: 20 }}>⚠️</span>
                        <span style={{ fontSize: 24, fontWeight: 'bold' }}>Call Failed</span>
                        <span style={{ color: '#ccc', marginTop: 10, textAlign: 'center', padding: '0 40px' }}>{error}</span>
                        <button onClick={onClose} style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#FF3B30', border: 'none', cursor: 'pointer', marginTop: 40, color: 'white', fontSize: 24 }}>✕</button>
                    </div>
                );
            }

            if (token && callConnected && readyToConnect) {
                console.log("[LiveKit-Web] Rendering LiveKitRoom (Connect mode)");
                return (
                    <div key="livekit-active-room" className="lk-root-container" style={{
                        height: '100%',
                        width: '100%',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#111'
                    }}>
                        <ErrorBoundary fallback={<OverlayError onClose={onClose} />}>
                            <LiveKitRoom
                                serverUrl={LIVEKIT_URL}
                                token={token!}
                                connect={true}
                                audio={true}
                                video={isVideoCall}
                                onError={(err) => {
                                    const errMsg = err.message || "";
                                    if (
                                        errMsg.includes("remote description was null") ||
                                        errMsg.includes("PC manager") ||
                                        errMsg.includes("'client' of undefined") ||
                                        errMsg.includes('Client initiated disconnect')
                                    ) {
                                        console.log("[LiveKit-Web] Ignoring transient room error:", errMsg);
                                        return;
                                    }
                                    setError(`Call error: ${err.message}`);
                                }}
                                data-lk-theme="default"
                                style={{ height: '100%' }}
                            >
                                <RoomStatusGuard isVideoCall={isVideoCall} onLeave={onClose} durationText={formatDuration(duration)} />
                            </LiveKitRoom>
                        </ErrorBoundary>

                        {/* Web-specific Request Overlay */}
                        {videoSwitchRequest && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                backgroundColor: '#1c1c1c', padding: '30px', borderRadius: '20px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10001,
                                textAlign: 'center', minWidth: '300px', border: '1px solid #333'
                            }}>
                                <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', display: 'block', marginBottom: '20px' }}>
                                    {videoSwitchRequest.fromName} wants to turn on video
                                </span>
                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                    <button 
                                        onClick={() => respondToVideoSwitch(false)}
                                        style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
                                    >Decline</button>
                                    <button 
                                        onClick={() => respondToVideoSwitch(true)}
                                        style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#25D366', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                                    >Accept</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            // Ringing / Connecting state
            return (
                <div key="ringing-overlay" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#075E54', // Chatzy Teal to verify it's NOT black
                    color: '#fff',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0, left: 0,
                    zIndex: 999
                }}>
                    <div style={{ width: 80, height: 80, border: '6px solid rgba(255, 255, 255, 0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'lk-rotate-wide 1.5s ease-in-out infinite', marginBottom: 30 }}></div>
                    <style>{` 
                        @keyframes lk-rotate-wide { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } 
                    `}</style>
                    <span style={{ fontSize: 32, fontWeight: '800', marginBottom: 15 }}>
                        Ringing...
                    </span>
                    <span style={{ fontSize: 18, opacity: 0.9, marginBottom: 40 }}>
                        {isVideoCall ? "Video Call" : "Voice Call"}
                    </span>

                    <button onClick={onClose} style={{
                        width: 80, height: 80, borderRadius: '50%',
                        backgroundColor: '#FF3B30', border: 'none',
                        cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                        fontSize: 36, color: 'white',
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>✕</button>

                    {/* Debug Info Overlay */}
                    <div style={{ position: 'absolute', bottom: 20, left: 20, pointerEvents: 'none', textAlign: 'left', zIndex: 1000 }}>
                        <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: 5, fontSize: 10, color: '#0f0', border: '1px solid #333' }}>
                            STATUS: vis={String(visible)} conn={String(callConnected)} tok={!!token ? 'YES' : 'NO'}<br />
                            ROOM: {roomName?.slice(-15)}<br />
                            READY: {String(readyToConnect)}
                        </div>
                    </div>

                    <span style={{ marginTop: 40, fontSize: 14, opacity: 0.7 }}>Waiting for answer...</span>
                </div>
            );
        };

        return (
            <div id="livekit-web-root-overlay" className={visible ? "show-call" : "hide-call"}>
                <style>{`
                    #livekit-web-root-overlay {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        z-index: 2147483647 !important;
                        background-color: #000 !important;
                        flex-direction: column !important;
                        box-sizing: border-box !important;
                    }
                    #livekit-web-root-overlay.show-call { display: flex !important; }
                    #livekit-web-root-overlay.hide-call { display: none !important; }
                    
                    .active-call-header {
                        background: rgba(7, 94, 84, 0.9);
                        padding: 10px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        z-index: 10;
                    }
                    .voice-call-container {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: radial-gradient(circle, #1a1a1a 0%, #000 100%);
                    }
                    .pulsing-avatar {
                        width: 150px;
                        height: 150px;
                        border-radius: 75px;
                        background: #075E54;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin-bottom: 30px;
                        box-shadow: 0 0 0 0 rgba(7, 94, 84, 0.7);
                        animation: lk-pulse 2s infinite;
                    }
                    @keyframes lk-pulse {
                        0% { box-shadow: 0 0 0 0 rgba(7, 94, 84, 0.7); }
                        70% { box-shadow: 0 0 0 30px rgba(7, 94, 84, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(7, 94, 84, 0); }
                    }
                `}</style>
                {renderWebState()}
            </div>
        );
    }

    // Native implementation
    const Content = (
        <View style={styles.container}>
            {error ? (
                <View style={styles.centerContainer}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#FF3B30" />
                    <Text style={{ color: '#fff', marginTop: 20, fontSize: 18, fontWeight: 'bold' }}>Call Failed</Text>
                    <Text style={{ color: '#ccc', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }}>{error}</Text>
                    <TouchableOpacity style={[styles.controlButton, styles.endButton, { marginTop: 40 }]} onPress={onClose}>
                        <IconSymbol name="xmark" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>
            ) : readyToConnect ? (
                <View style={{ flex: 1 }}>
                    {/* For Native we'd use the old logic if needed, but this file is shared now */}
                    <Text style={{ color: '#fff' }}>Connecting to LiveKit (Native)...</Text>
                </View>
            ) : (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#00A884" />
                    <Text style={{ color: '#fff', marginTop: 20, fontSize: 16 }}>
                        {!callConnected ? "Ringing..." : "Connecting..."}
                    </Text>
                    <TouchableOpacity style={[styles.controlButton, styles.endButton, { marginTop: 40 }]} onPress={onClose}>
                        <IconSymbol name="phone.down.fill" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
            {Content}
        </Modal>
    );
};

const OverlayError = ({ onClose }: { onClose: () => void }) => (
    <View style={styles.centerContainer}>
        <Text style={{ color: '#fff', marginBottom: 20 }}>Call session interrupted.</Text>
        <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={onClose}>
            <IconSymbol name="phone.down.fill" size={24} color="#fff" />
        </TouchableOpacity>
    </View>
);

const RoomStatusGuard = ({ isVideoCall, onLeave, durationText }: { isVideoCall: boolean; onLeave: () => void; durationText: string }) => {
    const connectionState = useConnectionState();

    useEffect(() => {
        if (Platform.OS === 'web') {
            console.log("[LiveKit-Web] Reactive State Changed ->", connectionState);
        }
    }, [connectionState]);

    if (connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting || connectionState === ConnectionState.Disconnected) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#111',
                color: '#fff',
                width: '100%',
                height: '100%'
            }}>
                <div style={{ width: 80, height: 80, border: '6px solid rgba(255, 255, 255, 0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'lk-rotate-wide 1.5s ease-in-out infinite', marginBottom: 30 }}></div>
                <span style={{ fontSize: 24, fontWeight: 'bold' }}>
                    {connectionState === ConnectionState.Disconnected ? "Initializing Connection..." : "Connecting to Call..."}
                </span>
                <span style={{ marginTop: 10, opacity: 0.8 }}>Current State: {connectionState}</span>

                <button onClick={onLeave} style={{
                    width: 70, height: 70, borderRadius: 35,
                    backgroundColor: '#FF3B30', border: 'none',
                    cursor: 'pointer', marginTop: 40, color: 'white', fontSize: 24
                }}>✕</button>
            </div>
        );
    }

    return <WebCallContent isVideoCall={isVideoCall} onLeave={onLeave} durationText={durationText} />;
};

const WebCallContent = ({ isVideoCall, onLeave, durationText }: { isVideoCall: boolean; onLeave: () => void; durationText: string }) => {
    const { 
        videoSwitchRequest, respondToVideoSwitch, requestVideoSwitch, 
        voiceSwitchRequest, respondToVoiceSwitch, requestVoiceSwitch 
    } = useCall();
    const [isSwitching, setIsSwitching] = useState(false);

    useEffect(() => {
        if (isVideoCall && isSwitching) {
            setIsSwitching(false);
        }
        if (!isVideoCall && isSwitching) {
            setIsSwitching(false);
        }
    }, [isVideoCall, isSwitching]);

    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: true },
        { source: Track.Source.ScreenShare, withPlaceholder: false },
    ], { onlySubscribed: false });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Call Active Header */}
            <div className="active-call-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80', animation: 'opacity-pulse 1s infinite alternate' }}></div>
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: '1px' }}>
                        CALL ACTIVE • {isVideoCall ? "VIDEO" : "VOICE"} • {durationText}
                    </span>
                    <style>{` @keyframes opacity-pulse { from { opacity: 0.3; } to { opacity: 1; } } `}</style>
                </div>
            </div>

            {isVideoCall ? (
                <div style={{ flex: 1, position: 'relative' }}>
                    <GridLayout tracks={tracks} style={{ height: '100%' }}>
                        <ParticipantTile />
                    </GridLayout>
                </div>
            ) : (
                <div className="voice-call-container">
                    <div className="pulsing-avatar">
                        <IconSymbol name="person.fill" size={80} color="#fff" />
                    </div>
                    <span style={{ color: '#fff', fontSize: 24, fontWeight: '500', marginBottom: 10 }}>{durationText}</span>
                    <span style={{ color: '#075E54', fontSize: 16 }}>Secure Connection Active</span>
                </div>
            )}

            {/* Controls Overlay - Positioned at the bottom using absolute to stay on top of the grid */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '15px',
                padding: '20px 20px 30px 20px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                zIndex: 1000,
                pointerEvents: 'none'
            }}>
                <div style={{ pointerEvents: 'auto' }}>
                    <ControlBar
                        variation="minimal"
                        controls={{ leave: false, camera: isVideoCall, microphone: true, screenShare: false, settings: false }}
                    />
                </div>

                <div style={{ pointerEvents: 'auto', display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {!isVideoCall && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <button
                                onClick={() => {
                                    if (!isSwitching) {
                                        console.log("[LiveKit-Web] Requesting video switch...");
                                        setIsSwitching(true);
                                        requestVideoSwitch();
                                        setTimeout(() => setIsSwitching(false), 20000);
                                    }
                                }}
                                style={{
                                    width: 64, height: 64, borderRadius: 32,
                                    backgroundColor: isSwitching ? 'rgba(7, 94, 84, 0.4)' : '#075E54', 
                                    border: 'none',
                                    cursor: isSwitching ? 'default' : 'pointer', 
                                    fontSize: 28, color: '#fff',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                }}
                                title="Switch to Video"
                            >
                                {isSwitching ? "⏳" : "📹"}
                            </button>
                            <span style={{ color: '#fff', fontSize: '12px', opacity: 0.8 }}>
                                {isSwitching ? "Pending..." : "Video"}
                            </span>
                        </div>
                    )}
                    {isVideoCall && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <button
                                onClick={() => {
                                    if (!isSwitching) {
                                        console.log("[LiveKit-Web] Requesting voice switch...");
                                        setIsSwitching(true);
                                        requestVoiceSwitch();
                                        setTimeout(() => setIsSwitching(false), 20000);
                                    }
                                }}
                                style={{
                                    width: 64, height: 64, borderRadius: 32,
                                    backgroundColor: isSwitching ? 'rgba(7, 94, 84, 0.4)' : '#075E54', 
                                    border: 'none',
                                    cursor: isSwitching ? 'default' : 'pointer', 
                                    fontSize: 28, color: '#fff',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                }}
                                title="Switch to Voice"
                            >
                                {isSwitching ? "⏳" : "📞"}
                            </button>
                            <span style={{ color: '#fff', fontSize: '12px', opacity: 0.8 }}>
                                {isSwitching ? "Pending..." : "Voice"}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={onLeave}
                        style={{
                            width: 64, height: 64, borderRadius: 32,
                            backgroundColor: '#FF3B30', border: 'none',
                            cursor: 'pointer', fontSize: 28, color: '#fff',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            transition: 'transform 0.1s'
                        }}
                        title="End Call"
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        ✕
                    </button>
                </div>
            </div>
            <RoomAudioRenderer />

            {/* Video Switch Request Overlay */}
            {videoSwitchRequest && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#222', padding: '30px', borderRadius: '15px',
                        textAlign: 'center', maxWidth: '400px', border: '1px solid #333'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#25D366' }}>Video Switch Request</h3>
                        <p style={{ margin: '0 0 25px 0' }}>{videoSwitchRequest.fromName} wants to turn on video. Accept?</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => respondToVideoSwitch(false)} style={{
                                padding: '10px 25px', borderRadius: '20px', border: '1px solid #E53935',
                                backgroundColor: 'transparent', color: '#E53935', cursor: 'pointer'
                            }}>Decline</button>
                            <button onClick={() => respondToVideoSwitch(true)} style={{
                                padding: '10px 25px', borderRadius: '20px', border: 'none',
                                backgroundColor: '#25D366', color: 'white', cursor: 'pointer', fontWeight: 'bold'
                            }}>Accept</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Voice Switch Request Overlay */}
            {voiceSwitchRequest && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        backgroundColor: '#222', padding: '30px', borderRadius: '15px',
                        textAlign: 'center', maxWidth: '400px', border: '1px solid #333'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#25D366' }}>Voice Switch Request</h3>
                        <p style={{ margin: '0 0 25px 0' }}>{voiceSwitchRequest.fromName} wants to switch to voice. Accept?</p>
                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                            <button onClick={() => respondToVoiceSwitch(false)} style={{
                                padding: '10px 25px', borderRadius: '20px', border: '1px solid #E53935',
                                backgroundColor: 'transparent', color: '#E53935', cursor: 'pointer'
                            }}>Decline</button>
                            <button onClick={() => respondToVoiceSwitch(true)} style={{
                                padding: '10px 25px', borderRadius: '20px', border: 'none',
                                backgroundColor: '#25D366', color: 'white', cursor: 'pointer', fontWeight: 'bold'
                            }}>Accept</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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
        console.error("[Call-ErrorBoundary] Caught crash:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
    controlButton: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    endButton: { backgroundColor: '#FF3B30', width: 70, height: 70, borderRadius: 35 },
});
