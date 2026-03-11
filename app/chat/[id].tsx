import { CustomEmojiPicker } from '@/components/CustomEmojiPicker';
import { VoiceMessageBubble } from '@/components/VoiceMessageBubble';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useCall } from '@/context/CallContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import * as WebBrowser from 'expo-web-browser';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Platform.OS === 'android' ? 8 : 4,
        paddingRight: 15,
        paddingTop: Platform.OS === 'android' ? 5 : 4,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        marginLeft: 0,
        overflow: 'hidden',
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
        elevation: 10,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    documentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        minWidth: 200,
        marginBottom: 4,
    },
    documentIconContainer: {
        width: 40,
        height: 48,
        justifyContent: 'center',
    },
    docTypeFolder: {
        width: 32,
        height: 40,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1,
    },
    docTypeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    documentName: {
        fontSize: 14,
        fontWeight: '500',
    },
    documentMeta: {
        fontSize: 11,
        color: '#8696A0',
        marginTop: 2,
    },
    downloadIcon: {
        padding: 5,
        marginLeft: 5,
    }
});


export default function ChatScreen() {
    const { id, name, profilePic, otherUserId } = useLocalSearchParams<{ id: string; name: string; profilePic: string; otherUserId: string }>();
    const { initiateCall } = useCall();
    const [message, setMessage] = useState('');
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserName, setCurrentUserName] = useState("");
    const [currentUserProfilePic, setCurrentUserProfilePic] = useState("");
    const [chatPic, setChatPic] = useState(profilePic);
    const [chatName, setChatName] = useState(name);
    const [isMuted, setIsMuted] = useState(false); // Chat notification sounds
    const [isBlocked, setIsBlocked] = useState(false);
    const [isBlockingMe, setIsBlockingMe] = useState(false);
    const [isUserOnline, setIsUserOnline] = useState(false);
    const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
    const [muteModalVisible, setMuteModalVisible] = useState(false);
    const [clearChatModalVisible, setClearChatModalVisible] = useState(false);
    const [deleteMedia, setDeleteMedia] = useState(false);
    const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
    const [fullImageVisible, setFullImageVisible] = useState(false);
    const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
    const [activeMediaType, setActiveMediaType] = useState<'image' | 'video'>('image');
    const [isVideoMuted, setIsVideoMuted] = useState(false); // Default to unmuted
    const [isVideoLoaded, setIsVideoLoaded] = useState(false); // New state to track if video is ready
    const [selectedMedia, setSelectedMedia] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<number[]>([]);
    const [searchResultIndex, setSearchResultIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [contextMenuVisible, setContextMenuVisible] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [isLatestMessageMyOwn, setIsLatestMessageMyOwn] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const { socket } = useCall();

    const flatListRef = useRef<FlatList>(null);
    const recordingDurationRef = useRef(0);
    const recordingInterval = useRef<any>(null);
    const blinkAnim = useRef(new Animated.Value(1)).current;
    const scrollViewRef = useRef<any>(null);
    // Video ref removed as we use expo-video now

    const progressAnim = useRef(new Animated.Value(0)).current;

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

    useEffect(() => {
        // Configure audio mode to prevent focus issues
        const configureAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
                    shouldDuckAndroid: true,
                    staysActiveInBackground: false,
                    playThroughEarpieceAndroid: false,
                });
            } catch (err) {
                console.log("Error configuring audio mode:", err);
            }
        };
        configureAudio();
    }, []);

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
                    setCurrentUserName(user.name);
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
                } else {
                    // For 1-on-1 chats, get the fresh profile pic of the other user
                    const userInfoStr = await AsyncStorage.getItem("userInfo");
                    if (userInfoStr) {
                        const myInfo = JSON.parse(userInfoStr);
                        const otherUser = currentChat.users?.find((u: any) => u._id !== myInfo._id);
                        if (otherUser?.profilePic) {
                            setChatPic(otherUser.profilePic);
                        }
                        if (otherUser?.name) {
                            setChatName(otherUser.name);
                        }
                    }
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

                // Block status check
                if (otherUserId) {
                    const blockRes = await fetch(`${API_BASE_URL}/api/user/block-status/${otherUserId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const blockData = await blockRes.json();
                    setIsBlocked(blockData.isBlockedByMe);
                    setIsBlockingMe(blockData.isBlockingMe);
                }
            }
        } catch (error) {
            console.log("Error fetching chat details", error);
        }
    };



    // Initialize Socket Listeners
    useEffect(() => {
        if (!socket || !currentUserId || !id) return;

        console.log(`[Chat] Using global socket. Joining chat: ${id}`);
        socket.emit("join chat", id);
        socket.emit("mark-chat-read", { chatId: id, userId: currentUserId });

        const handleUserOnline = (userId: string) => {
            if (userId === otherUserId) setIsUserOnline(true);
        };

        const handleUserOffline = (userId: string) => {
            if (userId === otherUserId) setIsUserOnline(false);
        };

        const handleMessageDeleted = (messageId: string) => {
            setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        };

        const handleMessageDeletedEveryone = (messageId: string) => {
            setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        };

        const handleReactionUpdated = ({ messageId, reactions }: any) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, reactions } : msg
                )
            );
        };

        const handleMessageReceived = (newMessageRecieved: any) => {
            console.log("[Chat] Message detected via global socket:", newMessageRecieved);
            if (!newMessageRecieved || !newMessageRecieved.chat || !newMessageRecieved.sender) return;

            if (id === newMessageRecieved.chat._id && newMessageRecieved.sender._id !== currentUserId) {
                console.log("[Chat] Appending new message to list");
                setMessages((prev) => [...prev, newMessageRecieved]);

                socket.emit("mark-as-read", {
                    messageId: newMessageRecieved._id,
                    senderId: newMessageRecieved.sender._id
                });

                if (flatListRef.current) {
                    setTimeout(() => {
                        flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                }
            }
        };

        const handleMessageStatusUpdated = ({ messageId, status }: any) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId ? { ...msg, status } : msg
                )
            );
        };

        const handleMessagesRead = ({ chatId, userId }: any) => {
            if (chatId === id && userId !== currentUserId) {
                setMessages((prev) =>
                    prev.map((msg) => ({ ...msg, status: "read" }))
                );
            }
        };

        const handleTyping = (chatId: string) => {
            if (chatId === id) setIsTyping(true);
        };

        const handleStopTyping = (chatId: string) => {
            if (chatId === id) setIsTyping(false);
        };

        // Attach listeners
        socket.on("user-online", handleUserOnline);
        socket.on("user-offline", handleUserOffline);
        socket.on("message-deleted", handleMessageDeleted);
        socket.on("message-deleted-everyone", handleMessageDeletedEveryone);
        socket.on("reaction-updated", handleReactionUpdated);
        socket.on("message received", handleMessageReceived);
        socket.on("message-status-updated", handleMessageStatusUpdated);
        socket.on("messages-read", handleMessagesRead);
        socket.on("typing", handleTyping);
        socket.on("stop typing", handleStopTyping);

        // Check online status initially
        if (otherUserId) {
            socket.emit("check-online", otherUserId, (isOnline: boolean) => {
                setIsUserOnline(isOnline);
            });
        }

        return () => {
            console.log(`[Chat] Leaving room: ${id}`);
            socket.emit("leave chat", id);

            // Cleanup listeners
            socket.off("user-online", handleUserOnline);
            socket.off("user-offline", handleUserOffline);
            socket.off("message-deleted", handleMessageDeleted);
            socket.off("message-deleted-everyone", handleMessageDeletedEveryone);
            socket.off("reaction-updated", handleReactionUpdated);
            socket.off("message received", handleMessageReceived);
            socket.off("message-status-updated", handleMessageStatusUpdated);
            socket.off("messages-read", handleMessagesRead);
            socket.off("typing", handleTyping);
            socket.off("stop typing", handleStopTyping);
        };
    }, [socket, id, currentUserId, otherUserId]);

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
                    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
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
                uploadAndSendMedia(asset.uri, 'document', asset.name, asset.size, asset.mimeType);
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

    const uploadAndSendMedia = async (uri: string, type: 'image' | 'video' | 'document', fileName?: string, fileSize?: number, mimeType?: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');

            // 1. Upload file
            const formData = new FormData();

            // Detect actual extension from URI to avoid hardcoding mp4/jpeg
            const uriExtension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
            const defaultExt = type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'bin';
            const actualExt = uriExtension || defaultExt;
            const name = fileName || `${type}-${Date.now()}.${actualExt}`;

            // Detect mimeType from extension if not provided
            const getMimeType = (ext: string, fileType: string) => {
                if (fileType === 'image') {
                    const imageMimes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
                    return imageMimes[ext] || 'image/jpeg';
                }
                if (fileType === 'video') {
                    const videoMimes: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska', webm: 'video/webm', '3gp': 'video/3gpp' };
                    return videoMimes[ext] || 'video/mp4';
                }
                return mimeType || 'application/octet-stream';
            };
            const resolvedMimeType = mimeType || getMimeType(actualExt, type);

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, name);
            } else {
                // @ts-ignore
                formData.append('file', {
                    uri,
                    name,
                    type: resolvedMimeType,
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
                    fileMetadata: {
                        fileName: fileName,
                        fileSize: fileSize,
                        fileExtension: fileName?.split('.').pop()?.toUpperCase(),
                        mimeType: mimeType
                    }
                }),
            });

            const newMessage = await response.json();
            newMessage.status = newMessage.status || 'sent';

            if (socket) {
                socket.emit('new message', newMessage);
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

            if (response.status === 403) {
                const errorData = await response.json();
                Alert.alert("Action Required", errorData.message || "You cannot send messages to this contact.");
                return;
            }

            const newMessage = await response.json();
            if (!response.ok) {
                Alert.alert("Error", newMessage.message || "Failed to send message");
                return;
            }

            // Default status is sent
            newMessage.status = newMessage.status || 'sent';

            // Emit socket message using global socket
            if (socket) {
                socket.emit("new message", newMessage);
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
            const endpoint = isBlocked ? 'unblock' : 'block';
            const res = await fetch(`${API_BASE_URL}/api/user/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId: otherUserId })
            });
            const data = await res.json();
            if (data.success) {
                setIsBlocked(data.isBlocked);
                if (Platform.OS === 'android') ToastAndroid.show(data.isBlocked ? "Contact blocked" : "Contact unblocked", ToastAndroid.SHORT);
                setHeaderMenuVisible(false);
            } else {
                Alert.alert("Error", data.message || "Failed to update block status");
            }
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

    // Cleanup: stop video and reset state when modal closes
    useEffect(() => {
        if (!fullImageVisible) {
            setIsVideoLoaded(false);
            // Player stops automatically when unmounted
        }
    }, [fullImageVisible]);

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
        if (!uri) {
            Alert.alert("Error", "Invalid document link");
            return;
        }

        try {
            if (Platform.OS === 'web') {
                await WebBrowser.openBrowserAsync(uri);
                return;
            }

            const metadata = msg.fileMetadata || {};
            const fileName = metadata.fileName || msg.fileName || 'document';
            // Robust extension extraction: get last part of path, then last part after dot
            const pathParts = uri.split('?')[0].split('/');
            const nameFromUrl = pathParts[pathParts.length - 1];
            const fileExt = metadata.fileExtension?.toLowerCase() || nameFromUrl.split('.').pop()?.toLowerCase() || 'bin';

            // Infer mimeType if missing
            const getMimeFromExt = (ext: string) => {
                const map: Record<string, string> = {
                    pdf: 'application/pdf',
                    doc: 'application/msword',
                    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    xls: 'application/vnd.ms-excel',
                    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    txt: 'text/plain',
                    jpg: 'image/jpeg',
                    jpeg: 'image/jpeg',
                    png: 'image/png'
                };
                return map[ext] || 'application/octet-stream';
            };
            const mimeType = metadata.mimeType || getMimeFromExt(fileExt);

            if ((Platform.OS as any) === 'web') {
                window.open(uri, '_blank');
                return;
            }

            const localUri = `${FileSystem.cacheDirectory}${msg._id}.${fileExt}`;

            // 1. Check if already downloaded
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            let finalLocalUri = localUri;

            if (!fileInfo.exists) {
                if (Platform.OS === 'android') ToastAndroid.show("Downloading document...", ToastAndroid.SHORT);
                const downloadResult = await FileSystem.downloadAsync(uri, localUri);

                if (downloadResult.status !== 200) {
                    throw new Error(`Download failed with status ${downloadResult.status}`);
                }
                finalLocalUri = downloadResult.uri;
            }

            // 2. Prepare for sharing/opening
            if (Platform.OS === 'android') ToastAndroid.show("Opening...", ToastAndroid.SHORT);

            if (Sharing && typeof Sharing.shareAsync === 'function') {
                await Sharing.shareAsync(finalLocalUri, {
                    mimeType: mimeType,
                    UTI: mimeType,
                    dialogTitle: fileName
                });
            } else {
                await WebBrowser.openBrowserAsync(uri);
            }
        } catch (error: any) {
            console.error("handleOpenDocument Error:", error);
            const errorMsg = error?.message || String(error);
            Alert.alert(
                "Cannot Open Document",
                `Error: ${errorMsg}\n\nWould you like to open it in your browser instead?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Open in Browser", onPress: () => WebBrowser.openBrowserAsync(uri) }
                ]
            );
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

                const pathParts = uri.split('?')[0].split('/');
                const nameFromUrl = pathParts[pathParts.length - 1];
                const fileExt = nameFromUrl.split('.').pop() || 'bin';

                if ((Platform.OS as any) === 'web') {
                    // Browser security prevents direct image buffer copy from URL without canvas
                    // we fallback to copying the link
                    if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
                        await Clipboard.setStringAsync(uri);
                        // console.log("Web: Link copied to clipboard");
                    }
                    return;
                }

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

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const getDocColor = (ext?: string) => {
        switch (ext?.toUpperCase()) {
            case 'PDF': return '#F44336';
            case 'DOC':
            case 'DOCX': return '#2196F3';
            case 'XLS':
            case 'XLSX': return '#4CAF50';
            case 'PPT':
            case 'PPTX': return '#FF5722';
            default: return '#9E9E9E';
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.chatBackground }]} edges={['top', 'left', 'right', 'bottom']}>
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

                            <TouchableOpacity style={styles.headerIconTouch} onPress={() => {
                                console.log(`[ChatScreen] Video Call pressed. otherUserId: ${otherUserId}, currentUserId: ${currentUserId}`);
                                if (!otherUserId || !currentUserId) {
                                    if (Platform.OS === 'web') alert("Call failed: User information not yet synchronized.");
                                    return;
                                }
                                initiateCall(otherUserId, {
                                    _id: currentUserId,
                                    name: currentUserName || "User",
                                    profilePic: currentUserProfilePic
                                }, true, chatName, chatPic);
                            }}>
                                <IconSymbol name="video.fill" size={22} color={theme.headerTintColor} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerIconTouch} onPress={() => {
                                console.log(`[ChatScreen] Voice Call pressed. otherUserId: ${otherUserId}, currentUserId: ${currentUserId}`);
                                if (!otherUserId || !currentUserId) {
                                    if (Platform.OS === 'web') alert("Call failed: User information not yet synchronized.");
                                    return;
                                }
                                initiateCall(otherUserId, {
                                    _id: currentUserId,
                                    name: currentUserName || "User",
                                    profilePic: currentUserProfilePic
                                }, false, chatName, chatPic);
                            }}>
                                <IconSymbol name="phone.fill" size={22} color={theme.headerTintColor} />
                            </TouchableOpacity>
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

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 98}
                style={{ flex: 1 }}
            >
                {/* Blocked Banners */}
                {isBlocked && (
                    <View style={{ padding: 10, backgroundColor: 'rgba(255,0,0,0.1)', alignItems: 'center', zIndex: 10 }}>
                        <Text style={{ color: 'red', fontSize: 13, textAlign: 'center' }}>
                            You blocked this contact. Tap to unblock.
                        </Text>
                        <TouchableOpacity onPress={handleBlockToggle} style={{ marginTop: 5 }}>
                            <Text style={{ color: 'red', fontWeight: 'bold' }}>UNBLOCK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isBlockingMe && (
                    <View style={{ padding: 10, backgroundColor: 'rgba(128,128,128,0.1)', alignItems: 'center', zIndex: 10 }}>
                        <Text style={{ color: '#666', fontSize: 13, textAlign: 'center' }}>
                            You are blocked by this contact. You cannot send messages.
                        </Text>
                    </View>
                )}

                <FlatList
                    style={{ flex: 1 }}
                    data={messages}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item, index }) => {
                        const isMyMessage = (item.sender?._id || item.sender) === currentUserId;
                        const hasReactions = item.reactions && item.reactions.length > 0;
                        if (!item.sender) {
                            return (
                                <View style={[styles.messageBubble, styles.myMessage, { backgroundColor: theme.messageSent }]}>
                                    <Text style={[styles.messageText, { color: theme.text }]}>{item.content}</Text>
                                    <Text style={styles.messageTime}>Error: Orphaned message</Text>
                                </View>
                            );
                        }
                        return (
                            <Pressable
                                onLongPress={() => handleLongPress(item)}
                                delayLongPress={300}
                                style={{ zIndex: messages.length - index }}
                            >
                                <View
                                    style={[
                                        styles.messageBubble,
                                        isMyMessage
                                            ? [styles.myMessage, { backgroundColor: theme.messageSent }]
                                            : [styles.theirMessage, { backgroundColor: theme.messageReceived }],
                                        hasReactions && { marginBottom: 18 }
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
                                        <TouchableOpacity onPress={async () => {
                                            // Pre-warm: forcefully take exclusive audio focus BEFORE modal opens
                                            try {
                                                await Audio.setAudioModeAsync({
                                                    allowsRecordingIOS: false,
                                                    playsInSilentModeIOS: true,
                                                    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
                                                    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
                                                    shouldDuckAndroid: false,
                                                    staysActiveInBackground: true,
                                                });
                                            } catch (e) {
                                                console.log("[VIDEO] Pre-warm audio mode failed:", e);
                                            }
                                            setIsVideoLoaded(false);
                                            setIsVideoMuted(false);
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
                                            style={[
                                                styles.documentCard,
                                                { backgroundColor: isMyMessage ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)' }
                                            ]}
                                            onPress={() => handleOpenDocument(item)}
                                        >
                                            <View style={styles.documentIconContainer}>
                                                <View style={[
                                                    styles.docTypeFolder,
                                                    { backgroundColor: getDocColor(item.fileMetadata?.fileExtension) }
                                                ]}>
                                                    <Text style={styles.docTypeText}>
                                                        {item.fileMetadata?.fileExtension?.charAt(0) || 'D'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={[styles.documentName, { color: theme.text }]} numberOfLines={1}>
                                                    {item.fileMetadata?.fileName || item.fileName || 'Document'}
                                                </Text>
                                                <Text style={styles.documentMeta}>
                                                    {formatFileSize(item.fileMetadata?.fileSize || item.fileSize)} • {item.fileMetadata?.fileExtension || 'FILE'}
                                                </Text>
                                            </View>
                                            <View style={styles.downloadIcon}>
                                                <IconSymbol name="arrow.down.to.line" size={18} color="#8696A0" />
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
                            </Pressable>
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

                <View
                    style={styles.inputContainer}>

                    {isBlocked || isBlockingMe ? (
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.05)', padding: 15, borderRadius: 10, alignItems: 'center' }}>
                            <Text style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>
                                {isBlocked ? "You blocked this contact. Tap to unblock." : "You are blocked. You cannot send messages."}
                            </Text>
                            {isBlocked && (
                                <TouchableOpacity onPress={handleBlockToggle} style={{ marginTop: 8 }}>
                                    <Text style={{ color: '#00A884', fontWeight: 'bold' }}>UNBLOCK</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <>
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
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
            <CustomEmojiPicker
                open={isEmojiOpen}
                onClose={() => setIsEmojiOpen(false)}
                onEmojiSelected={(emoji: any) => {
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
                        <FullScreenVideoPlayer
                            url={getInternalUri(activeImageUrl!)}
                            isMuted={isVideoMuted}
                            onError={() => {
                                console.log("[VIDEO] expo-video focus error muted fallback");
                                setIsVideoMuted(true);
                                if (Platform.OS === 'android') ToastAndroid.show("Playing muted (sound blocked).", ToastAndroid.SHORT);
                            }}
                        />
                    )}
                    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 15, borderRadius: 30 }}
                            onPress={async () => {
                                if (activeImageUrl) {
                                    const uri = getInternalUri(activeImageUrl);
                                    if (uri) {
                                        const pathParts = uri.split('?')[0].split('/');
                                        const nameFromUrl = pathParts[pathParts.length - 1];
                                        const fileExt = nameFromUrl.split('.').pop() || 'bin';

                                        if ((Platform.OS as any) === 'web') {
                                            if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
                                                await Clipboard.setStringAsync(uri);
                                                // if (Platform.OS === 'android') ToastAndroid.show("Link copied", ToastAndroid.SHORT);
                                            }
                                            return;
                                        }

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

                        {activeMediaType === 'video' && isVideoMuted && (
                            <TouchableOpacity
                                style={{ backgroundColor: 'rgba(255,200,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 15 }}
                                onPress={() => {
                                    setIsVideoMuted(false);
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Tap to Unmute</Text>
                            </TouchableOpacity>
                        )}
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
        </SafeAreaView >
    );
}

const incomingStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#075E54', // WhatsApp Green
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 100,
    },
    info: {
        alignItems: 'center',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    name: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    status: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.8)',
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
    },
    button: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    decline: {
        backgroundColor: '#FF3B30',
    },
    accept: {
        backgroundColor: '#4CD964',
    },
});

const FullScreenVideoPlayer = ({ url, isMuted, onError }: { url: string, isMuted: boolean, onError: (e: any) => void }) => {
    const player = useVideoPlayer(url, player => {
        player.loop = true;
        player.muted = isMuted;
        player.play();
    });

    useEffect(() => {
        if (player) {
            player.muted = isMuted;
        }
    }, [isMuted, player]);

    return (
        <VideoView
            style={{ width: '100%', height: '80%' }}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
        />
    );
};
