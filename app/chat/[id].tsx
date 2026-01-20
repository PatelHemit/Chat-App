import { CustomEmojiPicker } from '@/components/CustomEmojiPicker';
import { VoiceMessageBubble } from '@/components/VoiceMessageBubble';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
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
    const flatListRef = useRef<FlatList>(null);
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Recording State
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingInterval = useRef<any>(null);

    useEffect(() => {
        const fetchUserAndMessages = async () => {
            try {
                const userInfo = await AsyncStorage.getItem("userInfo");
                const token = await AsyncStorage.getItem("userToken");

                if (userInfo) {
                    const user = JSON.parse(userInfo);
                    setCurrentUserId(user._id);
                }

                if (token && id) {
                    fetchMessages(token);
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
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                console.log('Starting recording..');
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
                setRecordingDuration(0);

                recordingInterval.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);

                console.log('Recording started');
            } else {
                Alert.alert("Permission required", "Please grant microphone permission to record voice messages.");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        console.log('Stopping recording..');
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
            uploadAndSendAudio(uri);
        }

        setRecording(null);
    };

    const cancelRecording = async () => {
        if (!recording) return;
        setIsRecording(false);
        if (recordingInterval.current) {
            clearInterval(recordingInterval.current);
            recordingInterval.current = null;
        }
        await recording.stopAndUnloadAsync();
        setRecording(null);
        setRecordingDuration(0);
    };

    const uploadAndSendAudio = async (uri: string) => {
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
                    type: 'audio' // Ensure backend supports this or you updated schema
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
                        <View style={styles.headerTitleContainer}>
                            <View style={styles.avatar}>
                                {profilePic ? (
                                    <RNImage
                                        source={{ uri: profilePic }}
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
                                        {isUserOnline ? "Online" : ""}
                                    </Text>
                                </View>
                            </View>
                        </View>
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
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', marginRight: 10 }} />
                                <Text style={{ color: theme.text, fontSize: 16 }}>{formatDuration(recordingDuration)}</Text>
                            </View>
                            <TouchableOpacity onPress={cancelRecording}>
                                <Text style={{ color: 'red', fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
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
                onEmojiSelected={(emojiInfo) => {
                    setMessage((prev) => prev + emojiInfo.emoji);
                }}
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message"
                onSend={sendMessage}
            />
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
});
