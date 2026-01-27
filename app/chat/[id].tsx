import { CustomEmojiPicker } from '@/components/CustomEmojiPicker';
import { VoiceMessageBubble } from '@/components/VoiceMessageBubble';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Image as RNImage,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

export default function ChatScreen() {
    const { id, name, profilePic, otherUserId } = useLocalSearchParams<{ id: string; name: string; profilePic: string; otherUserId: string }>();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState("");
    const [currentUserProfilePic, setCurrentUserProfilePic] = useState("");
    const [chatPic, setChatPic] = useState(profilePic);
    const flatListRef = useRef<FlatList>(null);

    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Message Actions State
    const [selectedMessage, setSelectedMessage] = useState<any>(null);
    const [contextMenuVisible, setContextMenuVisible] = useState(false);

    // Recording State
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingDurationRef = useRef(0);
    const recordingInterval = useRef<any>(null);
    const blinkAnim = useRef(new Animated.Value(1)).current;

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
                } else {
                    // Start of logic for 1-1 chat pic if needed, but 'profilePic' param handles it usually
                    // For group, 'profilePic' param might be stale if updated
                }
            }
        } catch (error) {
            console.log("Error fetching chat details", error);
        }
    };

    const socket = useRef<any>(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [isUserOnline, setIsUserOnline] = useState(false);

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
                socket.current.disconnect();
            }
        };
    }, [id, currentUserId]);

    // Audio Recording Logic
    const startRecording = async () => {
        try {
            console.log('Requesting permissions..');
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                console.log('Starting recording..');
                // Haptics already handled in previous block
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
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

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) throw new Error("Upload failed");

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

    const handleLongPress = (msg: any) => {
        setSelectedMessage(msg);
        setContextMenuVisible(true);
    };

    const handleDeleteMessage = async () => {
        if (!selectedMessage) return;
        try {
            const token = await AsyncStorage.getItem("userToken");
            await fetch(`${API_BASE_URL}/api/message/${selectedMessage._id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistic update
            setMessages((prev) => prev.filter((m) => m._id !== selectedMessage._id));
            setContextMenuVisible(false);

            // Notify others
            if (socket.current) {
                // Ideally backend emits this, but we can emit client side too if setup
                // For now backend deletion is source of truth, but socket event "message-deleted" 
                // should be emitted by backend OR we just remove locally. 
                // Let's remove locally for now.
            }

        } catch (error) {
            console.log("Error deleting message", error);
            Alert.alert("Error", "Failed to delete message");
        }
    };

    const handleCopyMessage = async () => {
        if (!selectedMessage) return;
        if (selectedMessage.type === 'text') {
            await Clipboard.setStringAsync(selectedMessage.content);
        }
        setContextMenuVisible(false);
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
                    headerStyle: { backgroundColor: theme.headerBackground },
                    headerTintColor: theme.headerTintColor,
                    headerTitleAlign: 'left',
                    headerTitle: () => (
                        <TouchableOpacity
                            style={styles.headerTitleContainer}
                            onPress={() => router.push({ pathname: '/chat/info', params: { id } })}
                        >
                            <View style={styles.avatar}>
                                {chatPic ? (
                                    <RNImage
                                        source={{ uri: chatPic }}
                                        style={{ width: 32, height: 32, borderRadius: 16 }}
                                    />
                                ) : (
                                    <IconSymbol name="person.fill" size={20} color="#fff" />
                                )}
                            </View>
                            <View>
                                <Text style={[styles.headerName, { color: theme.headerTintColor }]}>{name || id}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: isUserOnline ? '#25D366' : 'transparent',
                                        marginRight: 4,
                                        display: isUserOnline ? 'flex' : 'none'
                                    }} />
                                    <Text style={{ fontSize: 10, color: theme.headerTintColor, opacity: 0.8 }}>
                                        {isUserOnline ? "Online" : "Tap for info"}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <IconSymbol name="video" size={24} color={theme.headerTintColor} style={styles.headerIcon} />
                            <IconSymbol name="phone" size={24} color={theme.headerTintColor} style={styles.headerIcon} />
                            <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.headerIcon} />
                        </View>
                    ),
                }}
            />
            {loading && <ActivityIndicator size="large" color="#008069" />}
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputContainer}>

                <TouchableOpacity style={styles.inputButton}>
                    <IconSymbol name="plus" size={24} color={theme.text} />
                </TouchableOpacity>

                <View style={[styles.inputWrapper, { backgroundColor: colorScheme === 'dark' ? '#2A3942' : '#fff' }]}>
                    {isRecording ? (
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={cancelRecording} style={{ padding: 10 }}>
                                <IconSymbol name="trash" size={24} color="red" />
                            </TouchableOpacity>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                                <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', marginRight: 10, opacity: blinkAnim }} />
                                <Text style={{ color: theme.text, fontSize: 16, minWidth: 45 }}>{formatDuration(recordingDuration)}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, flex: 1, overflow: 'hidden', opacity: 0.5 }}>
                                    {[...Array(15)].map((_, i) => (
                                        <View
                                            key={i}
                                            style={{
                                                width: 3,
                                                height: Math.random() * 15 + 5,
                                                backgroundColor: theme.text,
                                                marginHorizontal: 1,
                                                borderRadius: 1.5
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => setIsEmojiOpen(true)} style={styles.iconInsideInput}>
                                <IconSymbol name="face.smiling" size={22} color="#888" />
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.textInput, { color: theme.text }]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Type a message"
                                placeholderTextColor="#888"
                                multiline
                            />
                            <TouchableOpacity style={styles.iconInsideInput}>
                                <IconSymbol name="camera" size={18} color={theme.text} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {message.length > 0 ? (
                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                        <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    isRecording ? (
                        <TouchableOpacity onPress={stopRecording} style={styles.sendButton}>
                            <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={startRecording} style={styles.inputButton}>
                            <IconSymbol name="mic" size={24} color={theme.text} />
                        </TouchableOpacity>
                    )
                )}
            </KeyboardAvoidingView>
            <CustomEmojiPicker
                open={isEmojiOpen}
                onClose={() => setIsEmojiOpen(false)}
                onEmojiSelected={(emoji: any) => {
                    setMessage(prev => prev + emoji.emoji);
                }}
            />

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
                                <TouchableOpacity key={index} style={styles.reactionItem} onPress={() => setContextMenuVisible(false)}>
                                    <Text style={styles.reactionText}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.reactionItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="plus" size={20} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {/* Menu Actions */}
                        <View style={styles.menuList}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="info.circle" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Message info</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="arrow.turn.up.left" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Reply</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={handleCopyMessage}>
                                <IconSymbol name="doc.on.doc" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Copy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="arrow.turn.up.right" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Forward</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="pin" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Pin</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.menuItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="star" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Star</Text>
                            </TouchableOpacity>

                            <View style={[styles.separator, { backgroundColor: colorScheme === 'dark' ? '#3d3d3d' : '#f0f0f0' }]} />

                            <TouchableOpacity style={styles.menuItem} onPress={() => setContextMenuVisible(false)}>
                                <IconSymbol name="checkmark.circle" size={22} color={theme.text} />
                                <Text style={[styles.menuItemText, { color: theme.text }]}>Select</Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -10, // Adjust for back button gap
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginLeft: 20,
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
        alignItems: 'center',
    },
    inputButton: {
        padding: 10,
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginHorizontal: 5,
        minHeight: 40,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 30,
        paddingVertical: 8,
        textAlignVertical: 'center',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            } as any,
        }),
    },
    iconInsideInput: {
        marginHorizontal: 5,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#008069',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    contextMenu: {
        width: '80%',
        borderRadius: 10,
        padding: 10,
        elevation: 5,
    },
    contextMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    contextMenuText: {
        fontSize: 16,
        marginLeft: 15,
    },
    menuContainer: {
        width: '65%', // Match web-like width
        borderRadius: 12, // Slightly more rounded
        elevation: 5,
        paddingVertical: 10,
        backgroundColor: '#fff', // Fallback, will be overridden by theme
        alignSelf: 'center', // Center it
    },
    reactionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee', // Separator below reactions
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
        fontSize: 14.5, // WhatsApp web font size look
        marginLeft: 15,
        fontWeight: '400',
    },
    separator: {
        height: 1,
        width: '100%',
        marginVertical: 5,
    }
});
