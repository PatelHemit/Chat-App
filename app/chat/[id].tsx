import { CustomEmojiPicker } from '@/components/CustomEmojiPicker';
import { VoiceMessageBubble } from '@/components/VoiceMessageBubble';
import { ZegoCallButton } from '@/components/ZegoCallButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, ResizeMode, Video } from 'expo-av';
// Lazy load native modules to prevent crashes if they are missing
let Clipboard: any = null;
let Sharing: any = null;

try {
    Clipboard = require('expo-clipboard');
} catch (e) {
    console.log("Clipboard module not found");
}

try {
    Sharing = require('expo-sharing');
} catch (e) {
    console.log("Sharing module not found");
}

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AlertButton,
    Animated,
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Image as RNImage,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Platform.OS === 'android' ? 12 : 4,
        paddingRight: 15,
        paddingTop: Platform.OS === 'android' ? 25 : 4,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginLeft: -10,
    },
    headerName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 5,
    },
    headerIconTouch: {
        padding: 8,
        marginLeft: 5,
    },
    messagesList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        padding: 8,
        borderRadius: 8,
        maxWidth: '75%',
        marginBottom: 8,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
    },
    myMessage: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 0,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0,
    },
    messageText: {
        fontSize: 16,
    },
    messageTime: {
        fontSize: 10,
        color: '#888',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 8,
        alignItems: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    },
    inputPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        paddingHorizontal: 10,
        marginRight: 5,
        minHeight: 40,
    },
    leftInPill: {
        padding: 5,
    },
    rightInPill: {
        padding: 10,
    },
    circularButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 120,
        paddingVertical: 10,
        paddingHorizontal: 10,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                height: 40,
                marginVertical: 4,
            } as any,
            android: {
                paddingVertical: 8,
            }
        }),
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: '65%',
        borderRadius: 12,
        elevation: 5,
        paddingVertical: 10,
        backgroundColor: '#fff',
        alignSelf: 'center',
    },
    reactionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    reactionItem: {
        padding: 5,
    },
    reactionText: {
        fontSize: 22,
    },
    menuList: {
        paddingTop: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    menuItemText: {
        fontSize: 14.5,
        marginLeft: 15,
        fontWeight: '400',
    },
    separator: {
        height: 1,
        width: '100%',
        marginVertical: 5,
    },
    headerTextContainer: {
        marginLeft: 10,
        justifyContent: 'center',
    },
    headerStatus: {
        fontSize: 12,
        opacity: 0.8,
    },
    headerMenuContent: {
        position: 'absolute',
        top: 60,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 5,
        paddingVertical: 5,
        width: 180,
    },
    headerMenuItem: {
        padding: 15,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    headerMenuText: {
        fontSize: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 8,
        margin: 10,
    },
    searchInput: {
        flex: 1,
        height: 40,
        paddingHorizontal: 10,
        fontSize: 16,
    },
    searchClose: {
        padding: 5,
    },
    searchNav: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reactionBubbleContainer: {
        position: 'absolute',
        bottom: -15,
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    }
});

export default function ChatScreen() {
    const { id, name, profilePic, otherUserId } = useLocalSearchParams<{ id: string; name: string; profilePic: string; otherUserId: string }>();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserProfilePic, setCurrentUserProfilePic] = useState("");
    const [chatPic, setChatPic] = useState(profilePic);
    const [chatName, setChatName] = useState(name);
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isUserOnline, setIsUserOnline] = useState(false);
    const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
    const [muteModalVisible, setMuteModalVisible] = useState(false);
    const [clearChatModalVisible, setClearChatModalVisible] = useState(false);
    const [deleteMedia, setDeleteMedia] = useState(false);
    const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
    const [fullImageVisible, setFullImageVisible] = useState(false);
    const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
    const [activeMediaType, setActiveMediaType] = useState<'image' | 'video'>('image');
    const [selectedMedia, setSelectedMedia] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<number[]>([]);
    const [searchResultIndex, setSearchResultIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isLatestMessageMyOwn, setIsLatestMessageMyOwn] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [socketConnected, setSocketConnected] = useState(false);

    const flatListRef = useRef<FlatList>(null);
    const socket = useRef<any>(null);
    const recordingDurationRef = useRef(0);
    const recordingInterval = useRef<any>(null);
    const blinkAnim = useRef(new Animated.Value(1)).current;

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(blinkAnim, {
                        toValue: 0.2,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(blinkAnim, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            blinkAnim.setValue(1);
            blinkAnim.stopAnimation();
        }
    }, [isRecording]);

    const fetchWithRetry = async (url: string, options: any, retries = 2, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                if (i === retries - 1) return res;
            } catch (err) {
                if (i === retries - 1) throw err;
                console.log(`Fetch failed, retrying (${i + 1}/${retries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };

    useEffect(() => {
        const fetchUserAndMessages = async () => {
            try {
                const userInfo = await AsyncStorage.getItem("userInfo");
                const token = await AsyncStorage.getItem("userToken");

                if (userInfo) {
                    const user = JSON.parse(userInfo);
                    setCurrentUserId(user._id);
                    setCurrentUserProfilePic(user.profilePic);
                }

                if (token && id) {
                    fetchMessages(token);
                    fetchChatDetails(token);
                }
            } catch (error) {
                console.log(error);
            }
        };
        fetchUserAndMessages();
    }, [id]);

    const fetchMessages = async (token: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/message/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setMessages(data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatDetails = async (token: string) => {
        try {
            // Ideally call a specific endpoint, but verifying with list for now or assuming we can find it
            // Optimally, if it's a group, we want fresh info.
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const chats = await response.json();
            const currentChat = chats.find((c: any) => c._id === id);

            if (currentChat) {
                if (currentChat.isGroupChat) {
                    setChatPic(currentChat.groupPic);
                    setChatName(currentChat.chatName);
                }

                // Mute status check
                const userInfoStr = await AsyncStorage.getItem("userInfo");
                if (userInfoStr) {
                    const userInfo = JSON.parse(userInfoStr);
                    const muteInfo = currentChat.mutedBy?.find((m: any) =>
                        String(m.user._id || m.user) === String(userInfo._id)
                    );
                    if (muteInfo) {
                        const expiry = muteInfo.mutedUntil ? new Date(muteInfo.mutedUntil) : null;
                        if (!expiry || expiry > new Date()) {
                            setIsMuted(true);
                        } else {
                            setIsMuted(false);
                        }
                    } else {
                        setIsMuted(false);
                    }
                }
            }
        } catch (error) {
            console.log("Error fetching chat details", error);
        }
    };



    // Initialize Socket
    useEffect(() => {
        if (!currentUserId) return;

        // Initialize socket connection
        try {
            console.log("Initializing socket for user:", currentUserId);
            // Force websocket transport
            socket.current = io(API_BASE_URL, { transports: ['websocket'] });

            socket.current.emit("setup", { _id: currentUserId });
            socket.current.on("connected", () => {
                console.log("Socket Connected");
                setSocketConnected(true);
            });

            console.log("Joining chat room:", id);
            socket.current.emit("join chat", id);
            socket.current.emit("mark-chat-read", { chatId: id, userId: currentUserId });

            // Check if other user is online
            if (otherUserId) {
                socket.current.emit("check-online", otherUserId, (isOnline: boolean) => {
                    setIsUserOnline(isOnline);
                });
            }

            socket.current.on("user-online", (userId: string) => {
                if (userId === otherUserId) {
                    setIsUserOnline(true);
                }
            });

            socket.current.on("user-offline", (userId: string) => {
                if (userId === otherUserId) {
                    setIsUserOnline(false);
                }
            });

            socket.current.on("message-deleted", (messageId: string) => {
                setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
            });

            socket.current.on("message-deleted-everyone", (messageId: string) => {
                setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
            });

            socket.current.on("reaction-updated", ({ messageId, reactions }: any) => {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg._id === messageId ? { ...msg, reactions } : msg
                    )
                );
            });

            socket.current.on("message received", (newMessageRecieved: any) => {
                console.log("Message detected via socket:", newMessageRecieved);
                if (!newMessageRecieved || !newMessageRecieved.chat || !newMessageRecieved.sender) return;

                // Check if the message belongs to this chat AND is NOT from current user
                if (id === newMessageRecieved.chat._id && newMessageRecieved.sender._id !== currentUserId) {
                    console.log("Appending new message to list");
                    setMessages((prev) => [...prev, newMessageRecieved]);

                    // Mark as read immediately since we are in the chat
                    if (socket.current) {
                        socket.current.emit("mark-as-read", { messageId: newMessageRecieved._id, senderId: newMessageRecieved.sender._id });
                    }

                    // Scroll to bottom
                    if (flatListRef.current) {
                        setTimeout(() => {
                            flatListRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                    }
                }
            });

            socket.current.on("message-status-updated", ({ messageId, status }: any) => {
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg._id === messageId ? { ...msg, status: status } : msg
                    )
                );
            });

            socket.current.on("messages-read", ({ chatId }: any) => {
                if (chatId === id) {
                    setMessages((prevMessages) =>
                        prevMessages.map((msg) =>
                            msg.status !== 'read' ? { ...msg, status: 'read' } : msg
                        )
                    );
                }
            });
        } catch (error) {
            console.log("Socket initialization error:", error);
        }

        return () => {
            if (socket.current) {
                console.log("Disconnecting socket");
                socket.current.off("message received");
                socket.current.off("message-status-updated");
                socket.current.off("reaction-updated");
                socket.current.off("message-deleted-everyone");
                socket.current.disconnect();
            }
        };
    }, [id, currentUserId]);

    // Audio Recording Logic
    const startRecording = async () => {
        try {
            // Cleanup any existing recording first
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) { }
                setRecording(null);
            }

            console.log('Requesting permissions..');
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                console.log('Starting recording..');
                const { recording: newRecording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(newRecording);
                setIsRecording(true);
                setRecordingDuration(0);
                recordingDurationRef.current = 0;

                recordingInterval.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                    recordingDurationRef.current += 1;
                }, 1000);

                console.log('Recording started');
            } else {
                Alert.alert("Permission required", "We need access to your microphone to send voice messages. Please enable it in your settings.");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
            setRecording(null);
            Alert.alert("Error", "Failed to start recording. Please try again.");
        }
    };

    const stopRecording = async () => {
        console.log('Stopping recording..');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!recording) return;

        setIsRecording(false);
        if (recordingInterval.current) {
            clearInterval(recordingInterval.current);
            recordingInterval.current = null;
        }

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);

        // Upload and Send
        if (uri) {
            uploadAndSendAudio(uri, recordingDurationRef.current);
        }

        setRecording(null);
    };

    const cancelRecording = async () => {
        if (!recording) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRecording(false);
        if (recordingInterval.current) {
            clearInterval(recordingInterval.current);
            recordingInterval.current = null;
        }
        await recording.stopAndUnloadAsync();
        setRecording(null);
        setRecordingDuration(0);
    };

    const uploadAndSendAudio = async (uri: string, duration: number) => {
        try {
            const token = await AsyncStorage.getItem("userToken");

            // 1. Upload
            const formData = new FormData();
            const filename = `voice-${Date.now()}.m4a`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, filename);
            } else {
                // @ts-ignore
                formData.append('file', { uri, name: filename, type: 'audio/m4a' });
            }

            const uploadRes = await fetchWithRetry(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!uploadRes || !uploadRes.ok) throw new Error("Upload failed");
            const uploadData = await uploadRes.json();

            const fileUrl = uploadData.imageUrl; // Generic route still returns imageUrl field in JSON, we can reuse

            // 2. Send Message
            const response = await fetch(`${API_BASE_URL}/api/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: fileUrl, // Store URL in content
                    chatId: id,
                    type: 'audio', // Ensure backend supports this or you updated schema
                    duration: duration // Send accurate duration
                }),
            });

            const newMessage = await response.json();
            newMessage.status = newMessage.status || 'sent';

            if (socket.current) {
                socket.current.emit("new message", newMessage);
            }

            setMessages((prev) => [...prev, newMessage]);

        } catch (error) {
            console.log("Error sending voice message:", error);
            Alert.alert("Error", "Failed to send voice message");
        }
    };

    // Media Picker Functions
    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                uploadAndSendMedia(asset.uri, asset.type === 'video' ? 'video' : 'image');
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                uploadAndSendMedia(asset.uri, 'document', asset.name);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const openCamera = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permission required', 'Camera permission is required to take photos');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                uploadAndSendMedia(result.assets[0].uri, 'image');
            }
        } catch (error) {
            console.error('Error opening camera:', error);
            Alert.alert('Error', 'Failed to open camera');
        }
    };

    const uploadAndSendMedia = async (uri: string, type: 'image' | 'video' | 'document', fileName?: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            // 1. Upload file
            const formData = new FormData();
            const name = fileName || `${type}-${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'pdf'}`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, name);
            } else {
                // @ts-ignore
                formData.append('file', {
                    uri,
                    name,
                    type: type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'application/pdf',
                });
            }

            const uploadRes = await fetchWithRetry(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes || !uploadRes.ok) throw new Error('Upload failed');
            const uploadData = await uploadRes.json();
            const fileUrl = uploadData.imageUrl;

            // 2. Send message
            const response = await fetch(`${API_BASE_URL}/api/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: fileUrl,
                    chatId: id,
                    type: type,
                    fileName: fileName,
                }),
            });

            const newMessage = await response.json();
            newMessage.status = newMessage.status || 'sent';

            if (socket.current) {
                socket.current.emit('new message', newMessage);
            }

            setMessages((prev) => [...prev, newMessage]);
        } catch (error) {
            console.error('Error sending media:', error);
            Alert.alert('Error', 'Failed to send media');
        }
    };

    const sendMessage = async () => {
        if (message.trim().length === 0) return;
        const currentMessage = message; // Capture current message

        try {
            const token = await AsyncStorage.getItem("userToken");
            setMessage(""); // Clear input immediately

            const response = await fetch(`${API_BASE_URL}/api/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    content: currentMessage,
                    chatId: id,
                    type: 'text'
                }),
            });

            const newMessage = await response.json();
            // Default status is sent
            newMessage.status = newMessage.status || 'sent';

            // Emit socket message using persistent socket
            if (socket.current) {
                socket.current.emit("new message", newMessage);
            }

            setMessages((prev) => [...prev, newMessage]);
        } catch (error) {
            console.log("Error sending message:", error);
            // Optionally restore message to input if failed
        }
    };

    const handleMenuOption = (option: string) => {
        setHeaderMenuVisible(false);
        switch (option) {
            case 'mute':
                if (isMuted) {
                    handleUnmute();
                } else {
                    setMuteModalVisible(true);
                }
                break;
            case 'clear':
                setClearChatModalVisible(true);
                break;
            case 'block':
                handleBlockToggle();
                break;
            case 'search':
                setIsSearching(true);
                break;
        }
    };

    const handleMute = async (duration: '8hours' | '1week' | 'forever') => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_BASE_URL}/api/chat/mute/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ duration })
            });
            if (res.ok) {
                setIsMuted(true);
                setMuteModalVisible(false);
                if (Platform.OS === 'android') ToastAndroid.show("Notifications muted", ToastAndroid.SHORT);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to mute chat");
        }
    };

    const handleUnmute = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_BASE_URL}/api/chat/unmute/${id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (res.ok) {
                setIsMuted(false);
                if (Platform.OS === 'android') ToastAndroid.show("Notifications unmuted", ToastAndroid.SHORT);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to unmute chat");
        }
    };

    const handleBlockToggle = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const res = await fetch(`${API_BASE_URL}/api/user/block/${otherUserId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setIsBlocked(data.isBlocked);
            if (Platform.OS === 'android') ToastAndroid.show(data.isBlocked ? "Contact blocked" : "Contact unblocked", ToastAndroid.SHORT);
        } catch (error) {
            Alert.alert("Error", "Failed to update block status");
        }
    };

    const handleClearChat = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/chat/clear/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                // Refetch messages to get the updated list (with deletedFor filter applied)
                await fetchMessages(token!);
                setClearChatModalVisible(false);
                if (Platform.OS === 'android') ToastAndroid.show("Chat cleared", ToastAndroid.SHORT);
            } else {
                Alert.alert("Error", "Failed to clear chat");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to clear chat");
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query) {
            setSearchResults([]);
            setSearchResultIndex(-1);
            return;
        }

        const res = messages
            .map((m, i) => (m.type === 'text' && m.content.toLowerCase().includes(query.toLowerCase()) ? i : -1))
            .filter(i => i !== -1);

        setSearchResults(res);
        if (res.length > 0) {
            setSearchResultIndex(res.length - 1);
            flatListRef.current?.scrollToIndex({ index: res[res.length - 1], animated: true });
        }
    };

    const nextSearchResult = () => {
        if (searchResults.length === 0) return;
        const nextIdx = (searchResultIndex - 1 + searchResults.length) % searchResults.length;
        setSearchResultIndex(nextIdx);
        flatListRef.current?.scrollToIndex({ index: searchResults[nextIdx], animated: true });
    };

    const handleLongPress = (msg: any) => {
        setSelectedMessage(msg);
        setContextMenuVisible(true);
    };

    const handleDeleteMessage = () => {
        if (!selectedMessage) return;

        const isMyMessage = String(selectedMessage.sender?._id || selectedMessage.sender) === String(currentUserId);

        const deleteForMe = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                await fetch(`${API_BASE_URL}/api/message/delete-for-me`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ messageId: selectedMessage._id })
                });

                setMessages((prev) => prev.filter((m) => m._id !== selectedMessage._id));
                setContextMenuVisible(false);
            } catch (error) {
                Alert.alert("Error", "Failed to delete message");
            }
        };

        const deleteForEveryone = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                await fetch(`${API_BASE_URL}/api/message/${selectedMessage._id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Locally we remove it, or we could wait for socket.
                // But for immediate feedback, filtered:
                setMessages((prev) => prev.filter((m) => m._id !== selectedMessage._id));
                setContextMenuVisible(false);
            } catch (error) {
                Alert.alert("Error", "Failed to delete message for everyone");
            }
        };

        const options: AlertButton[] = [
            { text: "Delete for me", onPress: deleteForMe },
            { text: "Cancel", style: "cancel", onPress: () => setContextMenuVisible(false) }
        ];

        if (isMyMessage) {
            options.unshift({ text: "Delete for everyone", onPress: deleteForEveryone });
        }

        Alert.alert(
            "Delete Message?",
            "Are you sure you want to delete this message?",
            options
        );
    };

    const handleAddReaction = async (emoji: string) => {
        if (!selectedMessage) return;
        setContextMenuVisible(false);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const existingReaction = selectedMessage.reactions?.find((r: any) =>
                String(r.user._id || r.user) === String(currentUserId)
            );

            if (existingReaction && existingReaction.emoji === emoji) {
                // Remove reaction
                await fetch(`${API_BASE_URL}/api/message/unreact`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ messageId: selectedMessage._id })
                });
            } else {
                // Add/Update
                await fetch(`${API_BASE_URL}/api/message/react`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ messageId: selectedMessage._id, emoji })
                });
            }
            // Logic to update local state immediately if needed, 
            // but we have socket listeners for that.
        } catch (error) {
            console.error("Reaction failed:", error);
        }
    };

    const handleReplyMessage = () => {
        setReplyingTo(selectedMessage);
        setContextMenuVisible(false);
    };

    const handleForwardMessage = () => {
        setContextMenuVisible(false);
        router.push({
            pathname: '/chat/new',
            params: { forwardId: selectedMessage._id }
        });
    };

    const handleOpenDocument = async (msg: any) => {
        const uri = getInternalUri(msg.content || msg.fileUrl);
        if (!uri) return;

        try {
            if (Platform.OS === 'web') {
                import('react-native').then(({ Linking }) => {
                    if (typeof Linking.openURL === 'function') {
                        Linking.openURL(uri);
                    }
                });
                return;
            }

            // For Mobile: Download and Share
            const fileExt = msg.fileName ? (msg.fileName.split('.').pop() || 'tmp') : (uri.split('.').pop() || 'bin');
            // @ts-ignore
            const localUri = `${FileSystem.cacheDirectory}${msg._id}.${fileExt}`;

            if (Platform.OS === 'android') ToastAndroid.show("Opening document...", ToastAndroid.SHORT);

            const downloadResult = await FileSystem.downloadAsync(uri, localUri);

            if (Sharing && typeof Sharing.shareAsync === 'function') {
                await Sharing.shareAsync(downloadResult.uri);
            } else {
                import('react-native').then(({ Linking }) => {
                    if (typeof Linking.openURL === 'function') {
                        Linking.openURL(uri);
                    }
                });
            }
        } catch (error) {
            console.error("handleOpenDocument Error:", error);
            if (Platform.OS === 'android') ToastAndroid.show("Failed to open document", ToastAndroid.SHORT);
        }
    };

    const handleMessageInfo = async () => {
        if (!selectedMessage) return;
        setContextMenuVisible(false);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/message/info/${selectedMessage._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            let infoText = `Sent: ${new Date(data.createdAt).toLocaleString()}\nStatus: ${data.status}`;

            if (data.readBy && data.readBy.length > 0) {
                infoText += `\n\nRead by:\n${data.readBy.map((r: any) => `${r.user?.name || 'User'} (${new Date(r.readAt).toLocaleTimeString()})`).join('\n')}`;
            }

            if (data.deliveredTo && data.deliveredTo.length > 0) {
                infoText += `\n\nDelivered to:\n${data.deliveredTo.map((r: any) => `${r.user?.name || 'User'} (${new Date(r.deliveredAt).toLocaleTimeString()})`).join('\n')}`;
            }

            Alert.alert("Message Info", infoText);
        } catch (error) {
            Alert.alert("Message Info", `Sent: ${new Date(selectedMessage.createdAt).toLocaleString()}\nStatus: ${selectedMessage.status}`);
        }
    };

    const handleJumpToMessage = (messageId: string) => {
        const index = messages.findIndex(m => m._id === messageId);
        if (index > -1) {
            flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.5
            });
        }
    };

    const handleCopyMessage = async () => {
        if (!selectedMessage) return;
        setContextMenuVisible(false);

        try {
            if (selectedMessage.type === 'text') {
                if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
                    await Clipboard.setStringAsync(selectedMessage.content);
                    if (Platform.OS === 'android') ToastAndroid.show("Message copied", ToastAndroid.SHORT);
                } else {
                    if (Platform.OS === 'android') ToastAndroid.show("Clickboard not available", ToastAndroid.SHORT);
                }
            } else {
                const uri = getInternalUri(selectedMessage.content || selectedMessage.fileUrl);
                if (!uri) return;

                if (Platform.OS === 'android') ToastAndroid.show("Preparing media...", ToastAndroid.SHORT);

                const fileExt = uri.split('.').pop() || 'bin';
                // @ts-ignore
                const localUri = `${FileSystem.cacheDirectory}copy_temp.${fileExt}`;

                const downloadResult = await FileSystem.downloadAsync(uri, localUri);

                if (selectedMessage.type === 'image') {
                    let imageCopied = false;
                    try {
                        // @ts-ignore
                        const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });
                        if (base64 && Clipboard && typeof Clipboard.setImageAsync === 'function') {
                            await Clipboard.setImageAsync(base64);
                            imageCopied = true;
                            if (Platform.OS === 'android') ToastAndroid.show("Image copied to clipboard", ToastAndroid.SHORT);
                        }
                    } catch (e) {
                        console.log("Native image copy failed:", e);
                        imageCopied = false;
                    }

                    if (!imageCopied) {
                        await Clipboard.setStringAsync(uri);
                        if (Platform.OS === 'android') ToastAndroid.show("Link copied (Image copy not supported)", ToastAndroid.SHORT);
                    }
                } else {
                    let shared = false;
                    try {
                        const isSharingAvailable = await (async () => {
                            try {
                                return Sharing && typeof Sharing.isAvailableAsync === 'function' && await Sharing.isAvailableAsync();
                            } catch {
                                return false;
                            }
                        })();

                        if (isSharingAvailable && Sharing) {
                            await Sharing.shareAsync(downloadResult.uri);
                            shared = true;
                        }
                    } catch (e) {
                        console.log("Native sharing failed:", e);
                        shared = false;
                    }

                    if (!shared && Clipboard) {
                        await Clipboard.setStringAsync(uri);
                        if (Platform.OS === 'android') ToastAndroid.show("Link copied (Sharing not supported)", ToastAndroid.SHORT);
                    }
                }
            }
        } catch (error) {
            console.error("handleCopyMessage Error:", error);
            if (selectedMessage?.type === 'text') {
                Alert.alert("Error", "Failed to copy text");
            } else {
                ToastAndroid.show("Failed to process media", ToastAndroid.SHORT);
            }
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.chatBackground }]} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerStyle: {
                        backgroundColor: theme.headerBackground,
                    },
                    headerTintColor: theme.headerTintColor,
                    headerTitleAlign: 'left',
                    headerTitle: () => (
                        <View style={styles.headerTitleContainer}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                onPress={() => router.push({ pathname: '/chat/info', params: { id, name, profilePic, otherUserId } })}
                            >
                                {chatPic ? (
                                    <RNImage source={{ uri: getInternalUri(chatPic) }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatar}>
                                        <IconSymbol name="person.fill" size={24} color="#fff" />
                                    </View>
                                )}
                                <View style={styles.headerTextContainer}>
                                    <Text style={[styles.headerName, { color: theme.headerTintColor }]} numberOfLines={1}>{chatName || name}</Text>
                                    <Text style={[styles.headerStatus, { color: theme.headerTintColor }]}>{isUserOnline ? "online" : "last seen recently"}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <ZegoCallButton
                                inviteeId={otherUserId}
                                inviteeName={chatName}
                                isVideo={true}
                                theme={theme}
                            />
                            <ZegoCallButton
                                inviteeId={otherUserId}
                                inviteeName={chatName}
                                isVideo={false}
                                theme={theme}
                            />
                            <TouchableOpacity style={styles.headerIconTouch} onPress={() => setHeaderMenuVisible(true)}>
                                <IconSymbol name="ellipsis.vertical" size={22} color={theme.headerTintColor} />
                            </TouchableOpacity>

                            <Modal
                                visible={headerMenuVisible}
                                transparent={true}
                                animationType="fade"
                                onRequestClose={() => setHeaderMenuVisible(false)}
                            >
                                <Pressable
                                    style={styles.modalOverlay}
                                    onPress={() => setHeaderMenuVisible(false)}
                                >
                                    <View style={[styles.headerMenuContent, { backgroundColor: theme.background }]}>
                                        <TouchableOpacity
                                            style={styles.headerMenuItem}
                                            onPress={() => handleMenuOption('search')}
                                        >
                                            <Text style={[styles.headerMenuText, { color: theme.text }]}>Search</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.headerMenuItem}
                                            onPress={() => handleMenuOption('mute')}
                                        >
                                            <Text style={[styles.headerMenuText, { color: theme.text }]}>{isMuted ? "Unmute" : "Mute notifications"}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.headerMenuItem}
                                            onPress={() => handleMenuOption('clear')}
                                        >
                                            <Text style={[styles.headerMenuText, { color: theme.text }]}>Clear chat</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.headerMenuItem}
                                            onPress={() => handleMenuOption('block')}
                                        >
                                            <Text style={[styles.headerMenuText, { color: theme.text }]}>{isBlocked ? "Unblock" : "Block"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Pressable>
                            </Modal>
                        </View>
                    ),
                }}
            />
            {loading && <ActivityIndicator size="large" color="#008069" />}

            {/* Search Bar UI */}
            {isSearching && (
                <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
                    <TouchableOpacity onPress={() => { setIsSearching(false); handleSearch(""); }} style={styles.searchClose}>
                        <IconSymbol name="chevron.left" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search messages..."
                        placeholderTextColor="#888"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {searchResults.length > 0 && (
                        <View style={styles.searchNav}>
                            <Text style={{ color: '#888', marginRight: 10 }}>
                                {searchResults.length - searchResultIndex} of {searchResults.length}
                            </Text>
                            <TouchableOpacity onPress={nextSearchResult} style={{ padding: 5 }}>
                                <IconSymbol name="chevron.up" size={20} color={theme.text} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                const next = (searchResultIndex + 1) % searchResults.length;
                                setSearchResultIndex(next);
                                flatListRef.current?.scrollToIndex({ index: searchResults[next], animated: true });
                            }} style={{ padding: 5 }}>
                                <IconSymbol name="chevron.down" size={20} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <ImageBackground
                source={{ uri: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="repeat"
                imageStyle={{ opacity: colorScheme === 'dark' ? 0.05 : 0.4 }}
            />

            <FlatList
                data={messages}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => {
                    const isMyMessage = item.sender._id === currentUserId || item.sender === currentUserId;
                    return (
                        <TouchableOpacity
                            onLongPress={() => handleLongPress(item)}
                            activeOpacity={0.8}
                        >
                            <View
                                style={[
                                    styles.messageBubble,
                                    isMyMessage
                                        ? [styles.myMessage, { backgroundColor: theme.messageSent }]
                                        : [styles.theirMessage, { backgroundColor: theme.messageReceived }],
                                ]}>


                                {item.type === 'audio' ? (
                                    <VoiceMessageBubble
                                        uri={item.content}
                                        isMyMessage={isMyMessage}
                                        profilePic={item.sender?.profilePic || (isMyMessage ? currentUserProfilePic : profilePic)}
                                        duration={item.type === 'audio' && item.duration ? item.duration * 1000 : 0}
                                    />
                                ) : item.type === 'image' ? (
                                    <TouchableOpacity onPress={() => {
                                        setActiveImageUrl(item.content);
                                        setActiveMediaType('image');
                                        setFullImageVisible(true);
                                    }}>
                                        <RNImage
                                            source={{ uri: getInternalUri(item.content) }}
                                            style={{ width: 200, height: 200, borderRadius: 8 }}
                                            resizeMode="cover"
                                        />
                                    </TouchableOpacity>
                                ) : item.type === 'video' ? (
                                    <TouchableOpacity onPress={() => {
                                        setActiveImageUrl(item.content);
                                        setActiveMediaType('video');
                                        setFullImageVisible(true);
                                    }}>
                                        <View style={{ width: 200, height: 200, backgroundColor: '#000', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                                            <IconSymbol name="play.circle.fill" size={48} color="#fff" />
                                            <Text style={{ color: '#fff', marginTop: 8 }}>Video</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : item.type === 'document' ? (
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                                        onPress={() => handleOpenDocument(item)}
                                    >
                                        <IconSymbol name="doc.fill" size={32} color="#888" />
                                        <View style={{ marginLeft: 8, flex: 1 }}>
                                            <Text style={[styles.messageText, { color: theme.text }]} numberOfLines={1}>
                                                {item.fileName || 'Document'}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#888' }}>Tap to view</Text>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <Text style={[styles.messageText, { color: theme.text }]}>{item.content}</Text>
                                )}


                                <Text style={styles.messageTime}>
                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMyMessage && (
                                        <IconSymbol
                                            name={item.status === 'sent' ? 'checkmark' : 'checkmark.double'}
                                            size={16}
                                            color={item.status === 'read' ? '#34B7F1' : '#888'}
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </Text>

                                {item.reactions && item.reactions.length > 0 && (
                                    <View style={[
                                        styles.reactionBubbleContainer,
                                        isMyMessage ? { left: -10 } : { right: -10 }
                                    ]}>
                                        {Array.from(new Set(item.reactions.map((r: any) => r.emoji))).slice(0, 3).map((emoji: any, i) => (
                                            <Text key={i} style={{ fontSize: 12 }}>{emoji}</Text>
                                        ))}
                                        {item.reactions.length > 1 && (
                                            <Text style={{ fontSize: 10, color: '#888', marginLeft: 2 }}>{item.reactions.length}</Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.messagesList}
                /* Scroll to bottom on new message */
                onContentSizeChange={() => messages.length > 0 && flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => messages.length > 0 && flatListRef.current?.scrollToEnd({ animated: true })}
                ref={flatListRef}
            />
            {replyingTo && (
                <View style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingLeft: 10, borderLeftWidth: 4, borderLeftColor: '#00A884' }}>
                        <Text style={{ fontWeight: 'bold', color: '#00A884' }}>
                            {String(replyingTo.sender?._id || replyingTo.sender) === String(currentUserId) ? "You" : (chatName || "Contact")}
                        </Text>
                        <Text numberOfLines={1} style={{ color: '#666' }}>{replyingTo.content}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 5 }}>
                        <IconSymbol name="xmark.circle.fill" size={20} color="#888" />
                    </TouchableOpacity>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputContainer}>

                <View style={[styles.inputPill, { backgroundColor: colorScheme === 'dark' ? '#2A3942' : '#fff' }]}>
                    {isRecording ? (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 40 }}>
                            <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', marginRight: 10, opacity: blinkAnim }} />
                            <Text style={{ color: theme.text, fontSize: 16, minWidth: 45 }}>{formatDuration(recordingDuration)}</Text>
                            <Text style={{ color: '#888', marginLeft: 10, flex: 1 }}>Slide to cancel</Text>
                            <TouchableOpacity onPress={cancelRecording} style={{ padding: 10 }}>
                                <IconSymbol name="trash" size={24} color="red" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => setIsEmojiOpen(true)} style={styles.leftInPill}>
                                <IconSymbol name="face.smiling" size={24} color="#888" />
                            </TouchableOpacity>

                            <TextInput
                                style={[styles.textInput, { color: theme.text }]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Message"
                                placeholderTextColor="#888"
                                multiline
                            />

                            <TouchableOpacity style={styles.rightInPill} onPress={() => setAttachmentMenuVisible(true)}>
                                <IconSymbol name="paperclip" size={22} color="#888" />
                            </TouchableOpacity>

                            {message.length === 0 && (
                                <TouchableOpacity style={styles.rightInPill} onPress={openCamera}>
                                    <IconSymbol name="camera.fill" size={22} color="#888" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.circularButton, { backgroundColor: '#00A884' }]}
                    onPress={message.length > 0 ? sendMessage : (isRecording ? stopRecording : startRecording)}
                >
                    <IconSymbol
                        name={message.length > 0 ? "paperplane.fill" : (isRecording ? "paperplane.fill" : "mic.fill")}
                        size={22}
                        color="#fff"
                    />
                </TouchableOpacity>
            </KeyboardAvoidingView>
            <CustomEmojiPicker
                open={isEmojiOpen}
                onClose={() => setIsEmojiOpen(false)}
                onEmojiSelected={(emoji: any) => {
                    setMessage(prev => prev + emoji.emoji);
                }}
            />

            {/* Mute Modal */}
            <Modal
                visible={muteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMuteModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setMuteModalVisible(false)}>
                    <View style={[styles.menuContainer, { backgroundColor: theme.background }]}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', padding: 20, color: theme.text }}>Mute notifications for...</Text>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMute("8hours")}>
                            <Text style={[styles.menuItemText, { color: theme.text }]}>8 hours</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMute("1week")}>
                            <Text style={[styles.menuItemText, { color: theme.text }]}>1 week</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleMute("forever")}>
                            <Text style={[styles.menuItemText, { color: theme.text }]}>Always</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 10 }}>
                            <TouchableOpacity onPress={() => setMuteModalVisible(false)}>
                                <Text style={{ color: '#00A884', fontWeight: 'bold', padding: 10 }}>CANCEL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Clear Chat Modal */}
            <Modal
                visible={clearChatModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setClearChatModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setClearChatModalVisible(false)}>
                    <View style={[styles.menuContainer, { backgroundColor: theme.background }]}>
                        <Text style={{ fontSize: 16, padding: 20, color: theme.text }}>Clear this chat?</Text>
                        <View style={{ paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                onPress={() => setDeleteMedia(!deleteMedia)}
                            >
                                <IconSymbol name={deleteMedia ? "checkmark.square.fill" : "square"} size={22} color="#00A884" />
                                <Text style={{ marginLeft: 10, color: theme.text }}>Also delete media received in this chat from the device gallery</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 10 }}>
                            <TouchableOpacity onPress={() => setClearChatModalVisible(false)}>
                                <Text style={{ color: '#00A884', fontWeight: 'bold', padding: 10 }}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClearChat}>
                                <Text style={{ color: '#00A884', fontWeight: 'bold', padding: 10 }}>CLEAR CHAT</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Attachment Menu */}
            <Modal
                visible={attachmentMenuVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAttachmentMenuVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setAttachmentMenuVisible(false)}>
                    <View style={{ position: 'absolute', bottom: 80, left: 10, right: 10, backgroundColor: theme.background, borderRadius: 16, padding: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
                        <TouchableOpacity style={{ alignItems: 'center', margin: 10 }} onPress={() => { setAttachmentMenuVisible(false); pickDocument(); }}>
                            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#7F66FF', justifyContent: 'center', alignItems: 'center' }}>
                                <IconSymbol name="doc.fill" size={24} color="#fff" />
                            </View>
                            <Text style={{ marginTop: 5, color: theme.text, fontSize: 12 }}>Document</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ alignItems: 'center', margin: 10 }} onPress={() => { setAttachmentMenuVisible(false); openCamera(); }}>
                            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF2E74', justifyContent: 'center', alignItems: 'center' }}>
                                <IconSymbol name="camera.fill" size={24} color="#fff" />
                            </View>
                            <Text style={{ marginTop: 5, color: theme.text, fontSize: 12 }}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{ alignItems: 'center', margin: 10 }} onPress={() => { setAttachmentMenuVisible(false); pickImage(); }}>
                            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#C159FF', justifyContent: 'center', alignItems: 'center' }}>
                                <IconSymbol name="photo.fill" size={24} color="#fff" />
                            </View>
                            <Text style={{ marginTop: 5, color: theme.text, fontSize: 12 }}>Gallery</Text>
                        </TouchableOpacity>
                        {/* Add more as needed: Audio, Location, Contact */}
                    </View>
                </Pressable>
            </Modal>

            {/* Full Screen Media Viewer */}
            <Modal
                visible={fullImageVisible}
                transparent={false}
                animationType="fade"
                onRequestClose={() => setFullImageVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 10 }}
                        onPress={() => setFullImageVisible(false)}
                    >
                        <IconSymbol name="xmark" size={30} color="#fff" />
                    </TouchableOpacity>

                    {activeMediaType === 'image' ? (
                        <RNImage
                            source={{ uri: getInternalUri(activeImageUrl!) }}
                            style={{ width: '100%', height: '80%' }}
                            resizeMode="contain"
                        />
                    ) : (
                        <Video
                            source={{ uri: getInternalUri(activeImageUrl!) }}
                            style={{ width: '100%', height: '80%' }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            isLooping
                            shouldPlay
                        />
                    )}

                    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 15, borderRadius: 30 }}
                            onPress={async () => {
                                if (activeImageUrl) {
                                    const uri = getInternalUri(activeImageUrl);
                                    if (uri) {
                                        const fileExt = uri.split('.').pop() || 'bin';
                                        // @ts-ignore
                                        const localUri = `${FileSystem.cacheDirectory}share_temp.${fileExt}`;
                                        await FileSystem.downloadAsync(uri, localUri);

                                        if (Sharing && typeof Sharing.shareAsync === 'function') {
                                            await Sharing.shareAsync(localUri);
                                        } else if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
                                            await Clipboard.setStringAsync(uri);
                                            if (Platform.OS === 'android') ToastAndroid.show("Link copied (Sharing not available)", ToastAndroid.SHORT);
                                        }
                                    }
                                }
                            }}
                        >
                            <IconSymbol name="square.and.arrow.up" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={contextMenuVisible}
                onRequestClose={() => setContextMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setContextMenuVisible(false)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: theme.background }]}>
                        {/* Reactions Bar */}
                        <View style={styles.reactionContainer}>
                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji, index) => (
                                <TouchableOpacity key={index} style={styles.reactionItem} onPress={() => handleAddReaction(emoji)}>
                                    <Text style={styles.reactionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.reactionItem} onPress={() => {
                                setContextMenuVisible(false);
                                // Future: more emojis
                            }}>
                                <IconSymbol name="plus" size={20} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Actions */}
                        <View style={styles.menuList}>
                            <TouchableOpacity style={styles.menuItem} onPress={handleMessageInfo}>
                                <IconSymbol name="info.circle" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Message info</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleCopyMessage}>
                                <IconSymbol name="doc.on.doc" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Copy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleForwardMessage}>
                                <IconSymbol name="arrow.turn.up.right" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Forward</Text>
                            </TouchableOpacity>

                            <View style={[styles.separator, { backgroundColor: colorScheme === 'dark' ? '#3d3d3d' : '#f0f0f0' }]} />

                            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteMessage}>
                                <IconSymbol name="trash" size={22} color="red" />
                                <Text style={[styles.menuItemText, { color: 'red' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}
