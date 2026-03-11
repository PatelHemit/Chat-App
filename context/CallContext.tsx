import React, { createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';

interface CallContextType {
    incomingCall: any;
    isReceivingCall: boolean;
    callVisible: boolean;
    callConnected: boolean;
    isVideoCall: boolean;
    activeRoomName: string | null;
    activeCallId: string | null;
    otherUserId: string | null;
    otherUserName: string | null;
    otherUserPic: string | null;
    userInfo: any;
    socket: any;
    setUserInfo: (info: any) => void;
    setIncomingCall: (call: any) => void;
    setIsReceivingCall: (status: boolean) => void;
    setCallVisible: (status: boolean) => void;
    setCallConnected: (status: boolean) => void;
    setIsVideoCall: (status: boolean) => void;
    setActiveRoomName: (name: string | null) => void;
    setActiveCallId: (id: string | null) => void;
    setOtherUserId: (id: string | null) => void;
    setOtherUserName: (name: string | null) => void;
    setOtherUserPic: (pic: string | null) => void;
    setSocket: (socket: any) => void;
    initiateCall: (to: string, from: any, isVideo: boolean, toName?: string, toPic?: string) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [isReceivingCall, setIsReceivingCall] = useState(false);
    const [callVisible, setCallVisible] = useState(false);
    const [callConnected, setCallConnected] = useState(false);
    const [isVideoCall, setIsVideoCall] = useState(true);
    const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [otherUserId, setOtherUserId] = useState<string | null>(null);
    const [otherUserName, setOtherUserName] = useState<string | null>(null);
    const [otherUserPic, setOtherUserPic] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);

    const initiateCall = (to: string, from: any, isVideo: boolean, toName?: string, toPic?: string) => {
        const roomName = `room-${to}-${Date.now()}`;
        console.log(`[CallContext] initiateCall START - to: ${to}, isVideo: ${isVideo}, room: ${roomName}`);
        console.log(`[CallContext] initiator info (from):`, JSON.stringify(from));

        // 1. Validate inputs
        if (!to) {
            console.error("[CallContext] initiateCall FAILED - 'to' userId is missing");
            if (Platform.OS === 'web') alert("Calling Error: Recipient ID missing.");
            return;
        }

        if (!from?._id) {
            console.error("[CallContext] initiateCall FAILED - 'from._id' is missing", from);
            if (Platform.OS === 'web') alert("Calling Error: Your user ID is not loaded. Please refresh.");
            return;
        }

        setIsVideoCall(isVideo);
        setActiveRoomName(roomName);
        setOtherUserId(to);
        setOtherUserName(toName || null);
        setOtherUserPic(toPic || null);
        setCallConnected(false); // Always reset — don't carry over state from a previous call
        setCallVisible(true); // Show "Calling..." UI immediately

        const socketAvailable = !!socket;
        console.log(`[CallContext] initiateCall STATE SET - callVisible: true, socketAvailable: ${socketAvailable}`);

        if (socket) {
            console.log(`[CallContext] Emitting call-user to: ${to}`);
            socket.emit("call-user", {
                to,
                from,
                roomName,
                isVideoCall: isVideo
            });
        } else {
            console.error("[CallContext] initiateCall FAILED - socket is null");
            if (Platform.OS === 'web') alert("Calling Error: Not connected to server. Please wait a moment.");
        }
    };

    return (
        <CallContext.Provider value={{
            incomingCall,
            isReceivingCall,
            callVisible,
            callConnected,
            isVideoCall,
            activeRoomName,
            activeCallId,
            otherUserId,
            otherUserName,
            otherUserPic,
            userInfo,
            socket,
            setUserInfo,
            setIncomingCall,
            setIsReceivingCall,
            setCallVisible,
            setCallConnected,
            setIsVideoCall,
            setActiveRoomName,
            setActiveCallId,
            setOtherUserId,
            setOtherUserName,
            setOtherUserPic,
            setSocket,
            initiateCall
        }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (context === undefined) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
