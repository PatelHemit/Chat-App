import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
      const isEventError = reason._type === 'error' ||
        reason.constructor?.name === 'Event' ||
        (reason.target && reason.target.constructor?.name === 'WebSocket');

      if (isEventError) msg = `[WebSocket/Event Error] status=${reason.target?.readyState || 'unknown'}`;
      else msg = reason.message || String(reason);
    } else msg = String(reason || '');

    if (
      msg.includes('Connection reset') || msg.includes('WebSocket') ||
      msg.includes('PC manager') || msg.includes('NegotiationError') ||
      msg.includes('Negotiation failed') || msg.includes('Event Error') ||
      msg.includes('1006') || msg.includes('closed')
    ) {
      console.log('[Global-Suppress] Silenced transient Native rejection:', msg);
      return;
    }
    console.warn('[Global-Rejection]', msg);
  };
}

export const unstable_settings = { initialRouteName: '(tabs)' };

const LiveKitCallScreen = require('@/components/LiveKitCallScreen').LiveKitCallScreen;
registerLiveKitGlobals();

import { toUUID, parseCallType } from '@/services/BackgroundCallService';
SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web' && (global as any).ErrorUtils) {
  const _originalHandler = (global as any).ErrorUtils.getGlobalHandler();
  (global as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const errMsg = error?.message || String(error);
    if (
      errMsg.includes('PC manager') || errMsg.includes('NegotiationError') ||
      errMsg.includes('Negotiation failed') || errMsg.includes('Connection closed') ||
      errMsg.includes("'client' of undefined") || errMsg.includes("reading 'client'") ||
      errMsg.includes("Participant that's not present") || errMsg.includes("remote description was null")
    ) {
      console.log('[LiveKit-Global-Suppressed] Silenced SDK race condition:', errMsg);
      return;
    }
    _originalHandler(error, isFatal);
  });
}

if (__DEV__) {
  LogBox.ignoreLogs([
    "'client' of undefined", "reading 'client'", "PC manager is closed",
    "NegotiationError", "Negotiation failed", "remote description was null",
    "PC manager", "Participant that's not present"
  ]);
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const isSDKError = (errMsg: string) =>
    errMsg.includes("'client' of undefined") || errMsg.includes("reading 'client'") ||
    errMsg.includes("Participant that's not present") || errMsg.includes('PC manager') ||
    errMsg.includes("remote description was null") || errMsg.includes('Client initiated disconnect');

  window.addEventListener('unhandledrejection', (event) => {
    if (isSDKError(event.reason?.message || String(event.reason))) {
      console.log('[LiveKit-Web-Global] Suppressed transient SDK rejection');
      event.preventDefault();
    }
  });
  window.onerror = (message) => {
    if (isSDKError(String(message))) return true;
  };
}

const styles = StyleSheet.create({
  webContainer: { flex: 1, backgroundColor: '#f0f2f5', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  incomingCallContainer: { width: '85%', backgroundColor: '#1c1c1c', borderRadius: 25, padding: 30, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  callerInfo: { alignItems: 'center', marginBottom: 40 },
  callerAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  callerAvatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  callerName: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  callType: { color: '#bbb', fontSize: 16 },
  controlLabel: { fontSize: 12, fontWeight: '500' },
  callActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 },
  callBtn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#25D366' },
  rejectBtn: { backgroundColor: '#FF3B30' },
  webMobileWrapper: {
    width: '100%', maxWidth: 480, height: '100%', maxHeight: '100%', backgroundColor: '#fff',
    ...Platform.select({ web: { boxShadow: '0 4px 10px rgba(0,0,0,0.1)', overflow: 'hidden' } as any })
  },
});

const GlobalCallHandlers = ({ isReady }: { isReady: boolean }): React.ReactElement | null => {
  const {
    incomingCall, setIncomingCall, isReceivingCall, setIsReceivingCall,
    callVisible, setCallVisible, callConnected, setCallConnected,
    isVideoCall, setIsVideoCall, activeRoomName, setActiveRoomName,
    activeCallId, setActiveCallId, otherUserId, setOtherUserId,
    otherUserName, setOtherUserName, setOtherUserPic,
    userInfo, setUserInfo, socket, setSocket,
    videoSwitchRequest, setVideoSwitchRequest, voiceSwitchRequest, setVoiceSwitchRequest
  } = useCall();

  const router = useRouter();
  const callStartTimeRef = useRef<number | null>(null);
  const pathname = usePathname();
  const userInfoRef = useRef<any>(userInfo);
  const listenersRegistered = useRef(false);

  const extractId = (user: any): string | null => {
    if (!user) return null;
    if (typeof user === 'string') return user;
    const id = user._id || user.id || user;
    if (id && typeof id === 'object' && id.$oid) return String(id.$oid);
    return id ? String(id) : null;
  };

  useEffect(() => { userInfoRef.current = userInfo; }, [userInfo]);

  const handleAcceptCall = useCallback(async (callData?: any) => {
    const targetCall = callData || incomingCall;
    if (targetCall) {
      console.log("[Global-Call] handleAcceptCall", { callId: targetCall.callId });
      setIsVideoCall(targetCall.isVideoCall); setActiveRoomName(targetCall.roomName); setActiveCallId(targetCall.callId);
      const recipientId = targetCall.from?._id || targetCall.from;
      if (recipientId) setOtherUserId(typeof recipientId === 'string' ? recipientId : recipientId?._id);

      if (targetCall.callId) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          await fetch(`${SOCKET_URL}/api/call/${targetCall.callId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'answered' })
          });
        } catch (err) {}
      }

      const toId = typeof recipientId === 'string' ? recipientId : recipientId?._id;
      if (toId) {
        let attempts = 0;
        const tryEmit = () => {
          if (socket && socket.connected) socket.emit("answer-call", { to: toId, accepted: true, roomName: targetCall.roomName, isVideoCall: targetCall.isVideoCall });
          else if (attempts < 5) { attempts++; setTimeout(tryEmit, 1000); }
        };
        tryEmit();
      }

      setCallVisible(true); setCallConnected(true); setIsReceivingCall(false); 
      if (Platform.OS !== 'web') { CallKeepService.backToForeground(); CallKeepService.answerCall(toUUID(targetCall.callId)); }
      callStartTimeRef.current = Date.now();
    } else { setIsReceivingCall(false); }
  }, [incomingCall, socket, setIsVideoCall, setActiveRoomName, setActiveCallId, setOtherUserId, setCallVisible, setCallConnected, setIsReceivingCall]);

  const handleRejectCall = useCallback(async (callData?: any) => {
    const targetCall = callData || incomingCall;
    setIsReceivingCall(false);
    if (targetCall) {
      if (targetCall.callId) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          await fetch(`${SOCKET_URL}/api/call/${targetCall.callId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'rejected' })
          });
        } catch (err) {}
      }
      const recipientId = targetCall.from?._id || targetCall.from;
      if (recipientId && socket) socket.emit("answer-call", { to: recipientId, accepted: false, roomName: targetCall.roomName });
      if (Platform.OS !== 'web' && targetCall.callId) CallKeepService.endCall(toUUID(targetCall.callId));
    }
    setIncomingCall(null); setActiveRoomName(null); setActiveCallId(null);
  }, [incomingCall, socket, setIsReceivingCall, setIncomingCall, setActiveRoomName, setActiveCallId]);

  useEffect(() => {
    if (!isReady) return;
    const setupSocket = async () => {
      const userToken = await AsyncStorage.getItem('userToken');
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (!userToken || !userInfoStr) { if (socket) { socket.disconnect(); setSocket(null); } return; }
      const parsedUserInfo = JSON.parse(userInfoStr); setUserInfo(parsedUserInfo);
      if (socket) { if (socket.connected) { socket.emit('setup', parsedUserInfo); return; } }
      else {
        try {
          const socketInstance = io(SOCKET_URL, { query: { token: userToken }, transports: ['websocket', 'polling'], forceNew: true });
          socketInstance.on('connect', () => socketInstance.emit('setup', parsedUserInfo));
          socketInstance.on('reconnect', () => socketInstance.emit('setup', parsedUserInfo));
          setSocket(socketInstance);
        } catch (err) {}
      }
    };
    setupSocket();
  }, [isReady, userInfo?._id]);

  useEffect(() => {
    if (!socket) return;
    const onIncomingCall = async ({ to, from, roomName, isVideoCall, callId }: any) => {
      let callerInfo = from;
      if (typeof from === 'string') { try { callerInfo = JSON.parse(from); } catch (e) { callerInfo = { name: from, _id: null }; } }
      const callerId = extractId(callerInfo); const currentUserId = extractId(userInfoRef.current);
      if (to && currentUserId && to.toString() !== currentUserId.toString()) return;
      if (currentUserId && callerId && currentUserId === callerId) return;
      setIncomingCall({ from: callerInfo, roomName, isVideoCall: parseCallType(isVideoCall), callId });
      setIsReceivingCall(true); setIsVideoCall(parseCallType(isVideoCall)); setActiveRoomName(roomName); setActiveCallId(callId);
      setOtherUserId(callerId || null); setOtherUserName(callerInfo?.name || null); setOtherUserPic(callerInfo?.profilePic || null);
    };
    const onCallAnswered = ({ accepted, roomName, isVideoCall: confirmedIsVideo }: any) => {
      if (accepted) {
        if (confirmedIsVideo !== undefined) setIsVideoCall(parseCallType(confirmedIsVideo));
        setCallVisible(true); setCallConnected(true); setActiveRoomName(roomName);
      } else {
        setTimeout(() => { setCallVisible(false); setCallConnected(false); setIncomingCall(null); setIsReceivingCall(false); }, 2500);
      }
    };
    const onCallEnded = () => {
      setCallVisible(false); setCallConnected(false); setIsReceivingCall(false); setIncomingCall(null);
      setVideoSwitchRequest(null); setVoiceSwitchRequest(null);
    };
    const onVideoRequest = ({ fromId, fromName }: any) => setVideoSwitchRequest({ fromId, fromName });
    const onVideoResponse = ({ accepted }: any) => { if (accepted) setIsVideoCall(true); };
    const onVoiceRequest = ({ fromId, fromName }: any) => setVoiceSwitchRequest({ fromId, fromName });
    const onVoiceResponse = ({ accepted }: any) => { if (accepted) setIsVideoCall(false); };

    socket.on('incoming-call', onIncomingCall); socket.on('call-answered', onCallAnswered); socket.on('call-ended', onCallEnded);
    socket.on('video-switch-request', onVideoRequest); socket.on('video-switch-response', onVideoResponse);
    socket.on('voice-switch-request', onVoiceRequest); socket.on('voice-switch-response', onVoiceResponse);

    return () => {
      socket.off('incoming-call', onIncomingCall); socket.off('call-answered', onCallAnswered); socket.off('call-ended', onCallEnded);
      socket.off('video-switch-request', onVideoRequest); socket.off('video-switch-response', onVideoResponse);
      socket.off('voice-switch-request', onVoiceRequest); socket.off('voice-switch-response', onVoiceResponse);
    };
  }, [socket, setIsVideoCall, setIncomingCall, setIsReceivingCall, setActiveRoomName, setActiveCallId, setCallVisible, setCallConnected, setVideoSwitchRequest, setVoiceSwitchRequest]);

  useEffect(() => {
    if (!isReady) return;
    const checkPendingCall = async () => {
      const pendingUUID = await AsyncStorage.getItem('pending_call_uuid');
      if (pendingUUID) {
        const metaStr = await AsyncStorage.getItem(`call_meta_${pendingUUID}`);
        if (metaStr) {
          try {
            const meta = JSON.parse(metaStr);
            setIncomingCall(meta); setIsReceivingCall(true);
            setIsVideoCall(parseCallType(meta.isVideoCall)); setActiveRoomName(meta.roomName);
            setActiveCallId(meta.callId); setOtherUserId(meta.from._id);
            await AsyncStorage.removeItem('pending_call_uuid');
          } catch (e) {}
        }
      }
    };
    const setupCallKeep = async () => {
      if (Platform.OS === 'web' || listenersRegistered.current) return;
      try {
        await CallKeepService.setup();
        CallKeepService.addEventListener('answerCall', () => handleAcceptCall());
        CallKeepService.addEventListener('endCall', () => handleRejectCall());
        listenersRegistered.current = true;
      } catch (err) {}
    };
    checkPendingCall(); setupCallKeep();
    const appStateListener = AppState.addEventListener('change', (next) => { if (next === 'active') checkPendingCall(); });
    const notificationListener = NotificationService.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data.type === 'incoming-call') {
        AsyncStorage.getItem(`call_meta_${data.uuid}`).then(metaStr => {
          const finalData = metaStr ? { ...data, ...JSON.parse(metaStr) } : data;
          setIncomingCall(finalData as any); setIsReceivingCall(true);
          setIsVideoCall(parseCallType(finalData.isVideoCall)); setActiveRoomName(finalData.roomName as string);
          setActiveCallId(finalData.callId as string);
        });
      }
    });
    const responseListener = NotificationService.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const actionId = response.actionIdentifier;
      if (data.type === 'incoming-call') {
        AsyncStorage.getItem(`call_meta_${data.uuid}`).then(metaStr => {
          const finalData = metaStr ? { ...data, ...JSON.parse(metaStr) } : data;
          setIncomingCall(finalData); setIsReceivingCall(true);
          setIsVideoCall(parseCallType(finalData.isVideoCall)); setActiveRoomName(finalData.roomName as string);
          setActiveCallId(finalData.callId as string);
          if (actionId === 'ACCEPT_CALL') setTimeout(() => handleAcceptCall(finalData), 200);
          else if (actionId === 'DECLINE_CALL') setTimeout(() => handleRejectCall(finalData), 200);
        });
      } else if (data.chatId) router.push(`/chat/${data.chatId}`);
    });
    return () => { appStateListener.remove(); notificationListener.remove(); responseListener.remove(); };
  }, [isReady, handleAcceptCall, handleRejectCall, setIncomingCall, setIsReceivingCall, setIsVideoCall, setActiveRoomName, setActiveCallId]);

  return (
    <>
      {isReceivingCall && (
        Platform.OS === 'web' ? (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 2147483647, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <View style={[styles.incomingCallContainer, { minWidth: 280, maxWidth: 400 }]}>
              <View style={styles.callerInfo}>
                {incomingCall?.from?.profilePic ? <RNImage source={{ uri: incomingCall.from.profilePic }} style={styles.callerAvatar} /> : <View style={styles.callerAvatarPlaceholder}><IconSymbol name="person.fill" size={40} color="#fff" /></View>}
                <Text style={styles.callerName}>{incomingCall?.from?.name}</Text>
                <Text style={styles.callType}>Incoming {incomingCall?.isVideoCall ? 'Video' : 'Voice'} Call...</Text>
              </View>
              <View style={styles.callActions}>
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity style={[styles.callBtn, styles.rejectBtn]} onPress={() => handleRejectCall()}><IconSymbol name="phone.down.fill" size={30} color="#fff" /></TouchableOpacity>
                  <Text style={[styles.controlLabel, { color: '#fff', marginTop: 8 }]}>Decline</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={() => handleAcceptCall()}><IconSymbol name="phone.fill" size={30} color="#fff" /></TouchableOpacity>
                  <Text style={[styles.controlLabel, { color: '#fff', marginTop: 8 }]}>Receive</Text>
                </View>
              </View>
            </View>
          </div>
        ) : (
          <Modal visible={isReceivingCall} transparent animationType="slide" onRequestClose={() => setIsReceivingCall(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.incomingCallContainer}>
                <View style={styles.callerInfo}>
                  {incomingCall?.from?.profilePic ? <RNImage source={{ uri: incomingCall.from.profilePic }} style={styles.callerAvatar} /> : <View style={styles.callerAvatarPlaceholder}><IconSymbol name="person.fill" size={40} color="#fff" /></View>}
                  <Text style={styles.callerName}>{incomingCall?.from?.name}</Text>
                  <Text style={styles.callType}>Incoming {incomingCall?.isVideoCall ? 'Video' : 'Voice'} Call...</Text>
                </View>
                <View style={styles.callActions}>
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity style={[styles.callBtn, styles.rejectBtn]} onPress={() => handleRejectCall()}><IconSymbol name="phone.down.fill" size={30} color="#fff" /></TouchableOpacity>
                    <Text style={[styles.controlLabel, { color: '#fff', marginTop: 8 }]}>Decline</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity style={[styles.callBtn, styles.acceptBtn]} onPress={() => handleAcceptCall()}><IconSymbol name="phone.fill" size={30} color="#fff" /></TouchableOpacity>
                    <Text style={[styles.controlLabel, { color: '#fff', marginTop: 8 }]}>Receive</Text>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        )
      )}
      {LiveKitCallScreen && (
        <LiveKitCallScreen
          visible={callVisible} roomName={activeRoomName || ""} isVideoCall={isVideoCall} callConnected={callConnected}
          onClose={() => {
            if (socket && otherUserId) socket.emit("end-call", { to: otherUserId });
            setCallVisible(false); setCallConnected(false); setActiveRoomName(null);
            const rId = incomingCall?.from?._id || otherUserId;
            if (rId && socket) socket.emit("end-call", { to: rId });
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
  const [fontsLoaded, fontError] = useFonts({ 'MaterialIcons': require('../assets/fonts/MaterialIcons.ttf') });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => { if (fontError) console.warn('[RootLayout] Font loading failed:', fontError.message); }, [fontError]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!navigationState?.key || !fontsLoaded) return;
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        if (!userToken) { if (Platform.OS === 'web') router.replace('/auth/qr-login'); else router.replace('/auth/welcome'); }
        else {
          try {
            const { API_BASE_URL } = require('@/config/api');
            const pushToken = await NotificationService.registerForPushNotifications();
            if (pushToken) await NotificationService.sendTokenToBackend(pushToken, userToken, API_BASE_URL);
            const fcmToken = await NotificationService.registerFCMToken();
            if (fcmToken) await NotificationService.sendFCMTokenToBackend(fcmToken, userToken, API_BASE_URL);
          } catch (err) {}
          setIsReady(true); SplashScreen.hideAsync();
        }
      } catch (err) { setIsReady(true); SplashScreen.hideAsync(); }
    };
    checkAuth();
  }, [navigationState?.key, fontsLoaded]);

  const Content = (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );

  return (
    <CallProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {Platform.OS === 'web' ? (
            <View style={styles.webContainer}>
              <View style={styles.webMobileWrapper}>{Content}</View>
              <GlobalCallHandlers isReady={isReady} />
            </View>
          ) : (
            <>
              {Content}
              <GlobalCallHandlers isReady={isReady} />
            </>
          )}
        </GestureHandlerRootView>
      </ThemeProvider>
      <StatusBar style="light" />
    </CallProvider>
  );
}
