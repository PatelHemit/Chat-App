import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { SOCKET_URL } from '@/config/api';
// Global error/rejection suppression logic is initialized after imports to ensure Platform availability.

import { CallProvider, useCall } from '@/context/CallContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import CallKeepService from '@/services/CallKeepService';
import { registerLiveKitGlobals } from '@/services/LiveKitService';
import NotificationService from '@/services/NotificationService';
import logger from '@/services/PersistentLogger';
import messaging from '@react-native-firebase/messaging';
import { AppState, LogBox, Modal, Platform, Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { io } from 'socket.io-client';

// Silence transient library rejections globally on Native (Hardened)
if (Platform.OS !== 'web') {
  (global as any).onunhandledrejection = (e: any) => {
    const reason = e?.reason;
    let msg = '';

    if (reason && typeof reason === 'object') {
      // Filter for Event objects (like WebSocket 1006 errors) which lack a .message field
      const isEventError = reason._type === 'error' ||
        reason.constructor?.name === 'Event' ||
        (reason.target && reason.target.constructor?.name === 'WebSocket');

      if (isEventError) {
        msg = `[WebSocket/Event Error] status=${reason.target?.readyState || 'unknown'}`;
      } else {
        msg = reason.message || String(reason);
      }
    } else {
      msg = String(reason || '');
    }

    if (
      msg.includes('Connection reset') ||
      msg.includes('WebSocket') ||
      msg.includes('PC manager') ||
      msg.includes('Event Error') ||
      msg.includes('1006')
    ) {
      console.log('[Global-Suppress] Silenced transient Native rejection:', msg);
      return;
    }
    console.warn('[Global-Rejection]', msg);
  };
}

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Import LiveKitCallScreen only for native to avoid web crashes
// Import LiveKitCallScreen for all platforms now
const LiveKitCallScreen = require('@/components/LiveKitCallScreen').LiveKitCallScreen;

// Polyfill WebRTC for native
registerLiveKitGlobals();

// Helper to convert MongoID (24 chars) to a valid UUID (32 chars with hyphens)
// Android CallKeep/Telecom requires a proper UUID string.
const toUUID = (mongoId: any) => {
  if (!mongoId || typeof mongoId !== 'string') {
    console.warn('[toUUID] Invalid ID provided:', mongoId);
    return '00000000-0000-0000-0000-000000000000';
  }
  const clean = mongoId.replace(/[^a-f0-9]/gi, '');
  const padded = clean.padEnd(32, '0').toLowerCase();
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
};

// Handle background messages
if (Platform.OS !== 'web') {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    await logger.info('[FCM-Background] 🔔 Background Message Received', { id: remoteMessage.messageId });

    try {
      if (remoteMessage.data?.type === 'incoming-call') {
        const { roomName, callId, uuid, isVideoCall, sender, callerName, callerId: rawCallerId } = remoteMessage.data as any;

        // 1. Check for self-call suppression in background
        const senderInfo = typeof sender === 'string' ? JSON.parse(sender) : sender;
        const callerId = rawCallerId || senderInfo?._id || senderInfo;
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          try {
            const userInfo = JSON.parse(userInfoStr);
            if (userInfo?._id && callerId && String(userInfo._id) === String(callerId)) {
              await logger.info('[FCM-Background] 🛡️ Suppression: This is a self-call. Ignoring.');
              return;
            }
          } catch (e) {
            // ignore parse error here
          }
        }

        const realCallId = (callId || uuid) as string;
        const callUUID = toUUID(realCallId);

        await logger.info('[FCM-Background] 📞 Incoming call detected', { callerName, callId: realCallId });

        const meta = {
          roomName,
          callId: realCallId,
          from: senderInfo,
          isVideoCall: isVideoCall === 'true' || isVideoCall === true,
          callerName
        };

        await AsyncStorage.setItem(`call_meta_${callUUID}`, JSON.stringify(meta));
        await AsyncStorage.setItem('pending_call_uuid', callUUID);
        await logger.info('[FCM-Background] 💾 Metadata persisted', { uuid: callUUID });

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Incoming ${meta.isVideoCall ? 'Video' : 'Voice'} Call`,
            body: meta.callerName,
            data: { type: 'incoming-call', callId: realCallId, uuid: callUUID },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            channelId: 'incoming-calls',
          } as any,
        });

        await CallKeepService.setup();
        await CallKeepService.displayIncomingCall(
          callUUID,
          (callerName || 'Unknown') as string,
          (callerName || 'Unknown') as string
        );

        // Attempt to bring app to foreground if overlay permission is granted
        if (Platform.OS === 'android') {
          console.log('[FCM-Background] 🚀 Attempting backToForeground...');
          await logger.info('[FCM-Background] 🚀 Attempting backToForeground...');
          CallKeepService.backToForeground();
        }

        await logger.info('[FCM-Background] ✅ CallKeep triggered');
      }
    } catch (err: any) {
      await logger.error('[FCM-Background] ❌ Error', { error: err.message });
    }
  });
}

SplashScreen.preventAutoHideAsync();

// Permanently suppress NegotiationError from livekit-client library.
// This is a known non-fatal library-level error where server signals (onMediaSectionsRequirement)
// arrive while the PCManager is closing. It does not affect call functionality.
if (Platform.OS !== 'web' && (global as any).ErrorUtils) {
  const _originalHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const errMsg = error?.message || String(error);
    if (
      errMsg.includes('PC manager') ||
      errMsg.includes('NegotiationError') ||
      errMsg.includes("'client' of undefined") ||
      errMsg.includes("reading 'client'") ||
      errMsg.includes("Participant that's not present") ||
      errMsg.includes("remote description was null")
    ) {
      console.log('[LiveKit-Global] Suppressed non-fatal SDK error:', errMsg);
      return;
    }
    _originalHandler(error, isFatal);
  });
}

// Global log suppression for development overlay
if (__DEV__) {
  LogBox.ignoreLogs([
    "'client' of undefined",
    "reading 'client'",
    "PC manager",
    "remote description was null",
    "Participant that's not present"
  ]);
}

// Global error/rejection handlers for Web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const isSDKError = (errMsg: string) => {
    return (
      errMsg.includes("'client' of undefined") ||
      errMsg.includes("reading 'client'") ||
      errMsg.includes("Participant that's not present") ||
      errMsg.includes('PC manager') ||
      errMsg.includes("remote description was null")
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const errMsg = event.reason?.message || String(event.reason);
    if (isSDKError(errMsg)) {
      console.log('[LiveKit-Web-Global] Suppressed transient SDK rejection:', errMsg);
      event.preventDefault();
    }
  });

  // Fallback for non-promise errors
  window.onerror = (message) => {
    const errMsg = String(message);
    if (isSDKError(errMsg)) {
      console.log('[LiveKit-Web-Global] Suppressed standard SDK error:', errMsg);
      return true; // Prevents the error from bubbling up
    }
  };
}

// Helper to robustly parse isVideoCall from any source (Socket, Push, Storage)
const parseCallType = (val: any): boolean => {
  if (val === true || val === 1 || val === '1' || val === 'true') return true;
  if (val === false || val === 0 || val === '0' || val === 'false' || val == null) return false;
  return !!val; // fallback to truthiness
};

const GlobalCallHandlers = ({ isReady }: { isReady: boolean }) => {
  const {
    incomingCall, setIncomingCall,
    isReceivingCall, setIsReceivingCall,
    callVisible, setCallVisible,
    callConnected, setCallConnected,
    isVideoCall, setIsVideoCall,
    activeRoomName, setActiveRoomName,
    activeCallId, setActiveCallId,
    otherUserId, setOtherUserId,
    userInfo, setUserInfo,
    socket, setSocket
  } = useCall();

  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log(`[GlobalCallHandlers] Mounted on Web. isReady: ${isReady}, userInfo present: ${!!userInfo}`);
      console.log(`[GlobalCallHandlers] LiveKitCallScreen component status: ${LiveKitCallScreen ? 'DEFINED' : 'UNDEFINED'}`);
      if (userInfo) console.log(`[GlobalCallHandlers] currentUserId: ${userInfo._id}`);
    }
  }, [isReady, userInfo]);

  console.log(`[Global-Call] Rendering GlobalCallHandlers. isReceivingCall: ${isReceivingCall}, hasIncomingCall: ${!!incomingCall}`);

  useEffect(() => {
    console.log(`[Global-Call] State Change - isReceivingCall: ${isReceivingCall}, incomingCall:`, incomingCall);
    if (Platform.OS === 'web') {
      console.log(`[Global-Call] Web Environment Check - isReady: ${isReady}, callVisible: ${callVisible}`);
    }
  }, [isReceivingCall, incomingCall, isReady, callVisible]);

  const router = useRouter();
  const callStartTimeRef = useRef<number | null>(null);
  const pathname = usePathname();
  const userInfoRef = useRef<any>(userInfo);

  // Helper to robustly extract ID for comparison
  const extractId = (user: any): string | null => {
    if (!user) return null;
    if (typeof user === 'string') return user;
    const id = user._id || user.id || user;
    if (id && typeof id === 'object' && id.$oid) return String(id.$oid);
    return id ? String(id) : null;
  };

  // Keep ref in sync
  useEffect(() => {
    userInfoRef.current = userInfo;
    if (userInfo && Platform.OS === 'web') {
      console.log("[Global-Call] userInfoRef synced:", extractId(userInfo));
    }
  }, [userInfo]);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isReady) return;

    let appStateListener: any;

    const checkPendingCall = async () => {
      const pendingUUID = await AsyncStorage.getItem('pending_call_uuid');
      if (pendingUUID) {
        console.log('[Global-Call] 🔍 Found pending call UUID:', pendingUUID);
        const metaStr = await AsyncStorage.getItem(`call_meta_${pendingUUID}`);
        if (metaStr) {
          try {
            const meta = JSON.parse(metaStr);
            console.log('[Global-Call] 🚀 Resuming pending call from storage:', meta);
            setIncomingCall(meta);
            setIsReceivingCall(true);
            setIsVideoCall(parseCallType(meta.isVideoCall));
            setActiveRoomName(meta.roomName);
            setActiveCallId(meta.callId);
            setOtherUserId(meta.from._id);

            // Cleanup to avoid showing it again on next restart
            await AsyncStorage.removeItem('pending_call_uuid');
          } catch (e) {
            console.error('[Global-Call] Error parsing pending call meta:', e);
          }
        }
      }
    };

    const setupSocketAndListeners = async () => {
      const userToken = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');

      // Use the 'socket' from context to check if we already have a connection
      if (socket) {
        // Skip setup only if connected and matching current token
        // For simplicity, if socket exists, we consider it setup unless it's disconnected
        if (socket.connected) {
          console.log("[Global-Call] Socket already connected, skipping setup.");
          return;
        }
      }

      await logger.info('[Global-Call] setupSocketAndListeners START', {
        hasToken: !!userToken,
        hasUserInfo: !!userInfoStr
      });

      if (!userToken || !userInfoStr) {
        console.log("[Global-Call] No user credentials found in storage, skipping socket setup.");
        // If we have a socket but no credentials, it means the user logged out. Disconnect.
        if (socket) {
          console.log("[Global-Call] Credentials missing but socket exists. Disconnecting...");
          socket.disconnect();
          setSocket(null);
        }
        return;
      }

      const parsedUserInfo = JSON.parse(userInfoStr);
      setUserInfo(parsedUserInfo);
      userInfoRef.current = parsedUserInfo;
      console.log("[Global-Call] Initializing signaling socket for user:", parsedUserInfo._id);

      try {
        const socketInstance = io(SOCKET_URL, {
          query: { token: userToken },
          transports: ['websocket', 'polling'],
          forceNew: true // Ensure a fresh connection for the call system
        });

        // 1. Initial Socket Events
        socketInstance.on('connect', async () => {
          console.log("[Global-Call] Socket connected");
          await logger.info('[Socket] Connected');
          socketInstance.emit('setup', parsedUserInfo);
        });

        socketInstance.on('connect_error', async (error: any) => {
          console.warn("[Global-Call] Socket connection error:", error.message || error);
        });

        // 2. Calling Listeners
        socketInstance.on('incoming-call', async ({ to, from, roomName, isVideoCall, callId }: any) => {
          console.log("[Global-Call] incoming-call RECEIVED:", { to, from, roomName, isVideoCall, callId });

          let callerInfo = from;
          if (typeof from === 'string') {
            try { callerInfo = JSON.parse(from); } catch (e) { callerInfo = { name: from, _id: null }; }
          }

          const callerId = extractId(callerInfo);
          const currentUserId = extractId(userInfoRef.current);

          // --- VERIFICATION DEFENSE ---
          // Check if the current user ID matches the target 'to' ID from the signal.
          // This prevents devices ringing if they are still connected to an old user's room.
          if (to && currentUserId && to.toString() !== currentUserId.toString()) {
            console.warn(`[Global-Call] 🛑 SUPPRESSION: Call intended for ${to} but current user is ${currentUserId}. Ignoring.`);
            return;
          }

          if (currentUserId && callerId && currentUserId === callerId) {
            console.log("[Global-Call] Ignoring self-call signal.");
            return;
          }

          setIncomingCall({ from: callerInfo, roomName, isVideoCall: parseCallType(isVideoCall), callId });
          setIsReceivingCall(true);
          setIsVideoCall(parseCallType(isVideoCall));
          setActiveRoomName(roomName);
          setActiveCallId(callId);
          setOtherUserId(callerId || null);
        });

        socketInstance.on('call-initiated', ({ callId }: any) => setActiveCallId(callId));

        socketInstance.on('call-answered', async ({ accepted, roomName, isVideoCall: confirmedIsVideo }: any) => {
          console.log(`[Global-Call] call-answered RECEIVED: accepted=${accepted}`);
          if (accepted) {
            if (confirmedIsVideo !== undefined) setIsVideoCall(parseCallType(confirmedIsVideo));
            setCallVisible(true);
            setCallConnected(true);
            setActiveRoomName(roomName);
          } else {
            setTimeout(() => {
              setCallVisible(false);
              setCallConnected(false);
              setIncomingCall(null);
              setIsReceivingCall(false);
            }, 2500);
          }
        });

        socketInstance.on('call-ended', async () => {
          setCallVisible(false);
          setCallConnected(false);
          setIsReceivingCall(false);
          setIncomingCall(null);
        });

        // Update context
        setSocket(socketInstance);

      } catch (ioErr: any) {
        await logger.error('[Global-Call] Socket IO Init Error', { error: ioErr.message });
      }
    };

    const setupCallKeep = async () => {
      if (Platform.OS === 'web') return;
      try {
        await CallKeepService.setup();
        // Answer/End listeners are already registered in CallKeepService usually, 
        // but here we map them to context state
      } catch (ckErr) {
        console.error('[CallKeep] Setup failed:', ckErr);
      }
    };

    setupSocketAndListeners();
    checkPendingCall();
    setupCallKeep();

    const appStateListenerInst = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPendingCall();
        setupSocketAndListeners(); // Re-verify socket on wake
      }
    });

    const notificationListener = NotificationService.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data.type === 'incoming-call') {
        AsyncStorage.getItem(`call_meta_${data.uuid}`).then(metaStr => {
          const finalData = metaStr ? { ...data, ...JSON.parse(metaStr) } : data;
          setIncomingCall(finalData as any);
          setIsReceivingCall(true);
          setIsVideoCall(parseCallType(finalData.isVideoCall));
          setActiveRoomName(finalData.roomName as string);
          setActiveCallId(finalData.callId as string);
        });
      }
    });

    const responseListener = NotificationService.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data.type === 'incoming-call') {
        AsyncStorage.getItem(`call_meta_${data.uuid}`).then(metaStr => {
          const finalData = metaStr ? { ...data, ...JSON.parse(metaStr) } : data;
          setIncomingCall(finalData as any);
          setIsReceivingCall(true);
          setIsVideoCall(parseCallType(finalData.isVideoCall));
          setActiveRoomName(finalData.roomName as string);
          setActiveCallId(finalData.callId as string);
        });
      } else if (data.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
      appStateListenerInst.remove();
    };
  }, [isReady, pathname, !!socket]);

  const handleAcceptCall = async () => {
    if (incomingCall) {
      console.log("[Global-Call] handleAcceptCall", { callId: incomingCall.callId });
      setIsVideoCall(incomingCall.isVideoCall);
      setActiveRoomName(incomingCall.roomName);
      setActiveCallId(incomingCall.callId);

      const recipientId = incomingCall.from?._id || incomingCall.from;
      if (recipientId) setOtherUserId(typeof recipientId === 'string' ? recipientId : recipientId?._id);

      // Update status to answered on server
      if (incomingCall.callId) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          await fetch(`${SOCKET_URL}/api/call/${incomingCall.callId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'answered' })
          });
        } catch (err) {
          console.error("[Global-Call] Error updating status to answered:", err);
        }
      }

      const toId = typeof recipientId === 'string' ? recipientId : recipientId?._id;

      if (toId && socket) {
        socket.emit("answer-call", {
          to: toId,
          accepted: true,
          roomName: incomingCall.roomName,
          isVideoCall: incomingCall.isVideoCall  // relay call type back to initiator
        });
      }

      console.log(`[Global-Call] Transitioning to Active Room - visible: true, connected: true, room: ${incomingCall.roomName}`);

      // ORDER MATTERS: Set room states BEFORE hiding the incoming overlay
      setCallVisible(true);
      setCallConnected(true);

      setIsReceivingCall(false); // Hide the modal AFTER setting visibility for the next screen

      if (Platform.OS !== 'web') {
        CallKeepService.backToForeground();
        CallKeepService.answerCall(toUUID(incomingCall.callId));
      }
      callStartTimeRef.current = Date.now();
    } else {
      console.warn("[Global-Call] handleAcceptCall: No incomingCall found in state!");
      setIsReceivingCall(false);
    }
  };

  const handleRejectCall = async () => {
    console.log("[Global-Call] handleRejectCall triggered by UI button");
    setIsReceivingCall(false);
    if (incomingCall) {
      console.log("[Global-Call] handleRejectCall: rejecting incoming call:", incomingCall.callId);
      // Update status to rejected on server
      if (incomingCall.callId) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          await fetch(`${SOCKET_URL}/api/call/${incomingCall.callId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'rejected' })
          });
        } catch (err) {
          console.error("[Global-Call] Error updating status to rejected:", err);
        }
      }

      const recipientId = incomingCall.from?._id || incomingCall.from;
      if (recipientId && socket) {
        console.log("[Global-Call] Signaling 'call-rejected' to:", recipientId);
        socket.emit("answer-call", {
          to: recipientId,
          accepted: false,
          roomName: incomingCall.roomName
        });
      }
      if (Platform.OS !== 'web' && incomingCall.callId) {
        CallKeepService.endCall(toUUID(incomingCall.callId));
      }
    }
    setIncomingCall(null);
    setActiveRoomName(null);
    setActiveCallId(null);
    setOtherUserId(null);
  };

  return (
    <>
      {isReceivingCall && (
        Platform.OS === 'web' ? (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 2147483647, // Max z-index for absolute safety
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box'
          }}>
            <View style={[styles.incomingCallContainer, { minWidth: 280, maxWidth: 400 }]}>
              <View style={styles.callerInfo}>
                {incomingCall?.from?.profilePic ? (
                  <RNImage source={{ uri: incomingCall.from.profilePic }} style={styles.callerAvatar} />
                ) : (
                  <View style={styles.callerAvatarPlaceholder}>
                    <IconSymbol name="person.fill" size={40} color="#fff" />
                  </View>
                )}
                <Text style={styles.callerName}>{incomingCall?.from?.name}</Text>
                <Text style={styles.callType}>Incoming {incomingCall?.isVideoCall ? 'Video' : 'Voice'} Call...</Text>
              </View>

              <View style={styles.callActions}>
                <TouchableOpacity
                  style={[styles.callBtn, styles.rejectBtn]}
                  onPress={handleRejectCall}
                >
                  <IconSymbol name="phone.down.fill" size={30} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.callBtn, styles.acceptBtn]}
                  onPress={handleAcceptCall}
                >
                  <IconSymbol name="phone.fill" size={30} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </div>
        ) : (
          <Modal
            visible={isReceivingCall}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsReceivingCall(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.incomingCallContainer}>
                <View style={styles.callerInfo}>
                  {incomingCall?.from?.profilePic ? (
                    <RNImage source={{ uri: incomingCall.from.profilePic }} style={styles.callerAvatar} />
                  ) : (
                    <View style={styles.callerAvatarPlaceholder}>
                      <IconSymbol name="person.fill" size={40} color="#fff" />
                    </View>
                  )}
                  <Text style={styles.callerName}>{incomingCall?.from?.name}</Text>
                  <Text style={styles.callType}>Incoming {incomingCall?.isVideoCall ? 'Video' : 'Voice'} Call...</Text>
                </View>

                <View style={styles.callActions}>
                  <TouchableOpacity
                    style={[styles.callBtn, styles.rejectBtn]}
                    onPress={handleRejectCall}
                  >
                    <IconSymbol name="phone.down.fill" size={30} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.callBtn, styles.acceptBtn]}
                    onPress={handleAcceptCall}
                  >
                    <IconSymbol name="phone.fill" size={30} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )
      )}

      {/* Global Calling UI - Rendered LAST to be on TOP */}
      {LiveKitCallScreen && (
        <LiveKitCallScreen
          visible={callVisible}
          roomName={activeRoomName || ""}
          isVideoCall={isVideoCall}
          callConnected={callConnected}
          onClose={() => {
            console.log("[Global-Call] LiveKitCallScreen onClose triggered (Manual End)");
            if (socket && otherUserId) {
              console.log("[Global-Call] Signaling 'end-call' to:", otherUserId);
              socket.emit("end-call", { to: otherUserId });
            }
            setCallVisible(false);
            setCallConnected(false);
            setActiveRoomName(null);

            // Hangup Signaling: Ensure we notify the other party
            const recipientId = incomingCall?.from?._id || otherUserId;
            if (recipientId && socket) {
              console.log("[Global-Call] Signaling 'end-call' to:", recipientId);
              socket.emit("end-call", { to: recipientId });
            }

            setIncomingCall(null);
          }}
        />
      )}
    </>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Load fonts first
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialIcons.font,
  });

  const [isReady, setIsReady] = useState(false);

  // Update ref whenever pathname changes
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for navigation state to be ready
      if (!navigationState?.key) return;
      if (!fontsLoaded) return; // Wait for fonts

      try {
        console.log("[RootLayout] checkAuth started");
        const userToken = await AsyncStorage.getItem('userToken');
        console.log("[RootLayout] checkAuth: token is", userToken ? 'PRESENT' : 'MISSING');

        if (!userToken) {
          if (Platform.OS === 'web') {
            router.replace('/auth/qr-login');
          } else {
            router.replace('/auth/welcome');
          }
        } else {
          // User is logged in - Register both tokens
          try {
            const { API_BASE_URL } = require('@/config/api');

            // 1. Expo Push Token
            const pushToken = await NotificationService.registerForPushNotifications();
            if (pushToken) {
              console.log('[Token] Expo Push Token registered with backend');
              await NotificationService.sendTokenToBackend(pushToken, userToken, API_BASE_URL);
            }

            // 2. FCM Token (Android CallKeep)
            if (Platform.OS !== 'web') {
              const fcmToken = await NotificationService.registerFCMToken();
              if (fcmToken) {
                console.log('[Token] FCM Token registered with backend');
                await NotificationService.sendFCMTokenToBackend(fcmToken, userToken, API_BASE_URL);
              }
            }
          } catch (tokenErr) {
            console.error('[Token] Registration process failed:', tokenErr);
          }

          if (Platform.OS === 'web') {
            const granted = await NotificationService.requestWebPermissions();
            if (granted) {
              console.log("Web notifications granted");
            }
          }
        }
        setIsReady(true);
        await SplashScreen.hideAsync();
      } catch (e) {
        console.error('Error checking auth:', e);
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    };

    if (fontsLoaded) {
      console.log("[RootLayout] Fonts loaded, starting checkAuth");
      checkAuth();
    } else {
      console.log("[RootLayout] Waiting for fonts...");
    }
  }, [navigationState?.key, router, fontsLoaded]);



  // Authentication and initialization logic

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const Content = (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="chat/forward" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="chat/message-info" options={{ headerShown: true, title: 'Message Info' }} />
        <Stack.Screen name="chat/shared-media" options={{ headerShown: true, title: 'Media, links and docs' }} />
        <Stack.Screen name="qrcode" options={{ presentation: 'modal', title: 'My Code' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );

  return (
    <CallProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <View style={styles.webContainer}>
            <View style={styles.webMobileWrapper}>
              {Content}
            </View>
            {/* Call handlers live in the true root z-index on web */}
            <GlobalCallHandlers isReady={isReady} />
          </View>
        ) : (
          <>
            {Content}
            <GlobalCallHandlers isReady={isReady} />
          </>
        )}
      </GestureHandlerRootView>
    </CallProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomingCallContainer: {
    width: '85%',
    backgroundColor: '#1c1c1c',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  callerAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  callerAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callType: {
    color: '#bbb',
    fontSize: 16,
  },
  callActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  callBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#25D366',
  },
  rejectBtn: {
    backgroundColor: '#FF3B30',
  },
  webMobileWrapper: {
    width: '100%',
    maxWidth: 480, // Typical mobile width
    height: '100%',
    maxHeight: '100%', // Or fixed height like 850 for a phone look, but 100% is better for responsiveness
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)', // Subtle shadow
        overflow: 'hidden', // Clip content
      } as any,
    }),
  },
});
