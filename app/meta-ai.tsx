import { VoiceMessageBubble } from '@/components/VoiceMessageBubble';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    time: string;
    type?: 'text' | 'audio';
    duration?: number;
};

export default function MetaAIScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Hi! I\'m Meta AI. How can I help you today?',
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingDurationRef = useRef(0);
    const recordingInterval = useRef<any>(null);

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
        fetchHistory();
        return () => {
            if (recordingInterval.current) clearInterval(recordingInterval.current);
            if (recording) {
                recording.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, [recording]); // Added recording to deps to ensure cleanup function has current recording


    const fetchHistory = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const userInfo = await AsyncStorage.getItem('userInfo');
            const user = userInfo ? JSON.parse(userInfo) : null;
            const currentUserId = user?._id;

            if (!token || !currentUserId) return;

            const response = await fetch(`${API_BASE_URL}/api/ai/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (Array.isArray(data)) {
                const historyMessages: Message[] = data.map((msg: any) => ({
                    id: msg._id,
                    text: msg.content,
                    sender: msg.sender, // Backend now stores 'user' or 'ai' string directly
                    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                }));

                // If we have history, show it. Otherwise keep the default greeting.
                if (historyMessages.length > 0) {
                    setMessages(historyMessages);
                }
            }
        } catch (error) {
            console.error("Error fetching AI history:", error);
        } finally {
            setLoading(false);
        }
    };

    // Audio Recording Logic
    const startRecording = async () => {
        try {
            // Cleanup any existing recording first
            if (recording) {
                try {
                    await recording.stopAndUnloadAsync();
                } catch (e) {
                    // Ignore unload errors
                }
                setRecording(null);
            }

            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const permission = await Audio.requestPermissionsAsync();

            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

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
            } else {
                Alert.alert("Permission required", "Allow microphone access to send voice messages.");
            }
        } catch (err) {
            console.error('Failed to start recording', err);
            // If it failed because of "Only one Recording object", try to force cleanup once
            setRecording(null);
        }
    };

    const stopRecording = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!recording) return;

        setIsRecording(false);
        if (recordingInterval.current) {
            clearInterval(recordingInterval.current);
            recordingInterval.current = null;
        }

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

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

            const fileUrl = uploadData.imageUrl;

            // 2. Add locally
            const userMsg: Message = {
                id: Date.now().toString(),
                text: fileUrl,
                sender: 'user',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'audio',
                duration: duration * 1000 // UI Expects ms
            };
            setMessages(prev => [...prev, userMsg]);

            // 3. Send to AI
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetchWithRetry(`${API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'audio',
                    prompt: fileUrl, // Backend can use URL as prompt for now
                    duration: duration
                })
            });
            if (!response || !response.ok) throw new Error("AI Chat request failed");
            const data = await response.json();

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply || "I received your voice message!",
                sender: 'ai',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: 'text'
            };
            setMessages((prev) => [...prev, aiResponse]);

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to send voice message");
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        const prompt = inputText;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: inputText })
            });
            const data = await response.json();

            // The backend now returns the saved message objects, but for UI responsiveness
            // and consistent formatting with local 'userMessage', we can just use the reply string
            // or we could map data.aiMessage if we wanted exact DB time.

            const aiResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: data.reply || "I couldn't process that.",
                sender: 'ai',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, aiResponse]);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]} edges={['top', 'left', 'right']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: Colors[colorScheme].headerBackground }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <IconSymbol name="arrow.left" size={24} color={Colors[colorScheme].headerTintColor} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: Colors[colorScheme].headerTintColor }]}>Meta AI</Text>
                        <Text style={styles.headerSubtitle}>with Llama 3</Text>
                    </View>
                </View>
            </View>

            <ImageBackground
                source={{ uri: 'https://i.pinimg.com/originals/97/c0/07/97c00759d90d786d9b6096d274ad3e07.png' }}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messageList}
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.messageBubble,
                                item.sender === 'user' ? styles.userBubble : styles.aiBubble,
                                { backgroundColor: item.sender === 'user' ? (item.type === 'audio' ? 'transparent' : '#E7FFDB') : (colorScheme === 'dark' ? '#1F2C34' : '#FFFFFF') },
                                item.type === 'audio' && { padding: 0 }
                            ]}
                        >
                            {item.type === 'audio' ? (
                                <VoiceMessageBubble
                                    uri={item.text}
                                    duration={item.duration}
                                    isMyMessage={item.sender === 'user'}
                                    profilePic={''}
                                />
                            ) : (
                                <Text style={[styles.messageText, { color: colorScheme === 'dark' && item.sender === 'ai' ? '#fff' : '#000' }]}>{item.text}</Text>
                            )}
                            <Text style={[styles.messageTime, { color: colorScheme === 'dark' && item.sender === 'ai' ? '#ccc' : '#555' }]}>{item.time}</Text>
                        </View>
                    )}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            </ImageBackground>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputContainer, { backgroundColor: Colors[colorScheme].background }]}>
                    {isRecording ? (
                        <View style={styles.recordingOverlay}>
                            <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
                                <IconSymbol name="trash" size={24} color="#ff3b30" />
                            </TouchableOpacity>
                            <View style={styles.recordingTimerContainer}>
                                <View style={styles.recordingDot} />
                                <Text style={[styles.recordingTimer, { color: Colors[colorScheme].text }]}>
                                    {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                                </Text>
                            </View>
                            <Text style={styles.slideCancelText}>Slide to cancel</Text>
                        </View>
                    ) : (
                        <View style={[styles.inputFieldContainer, { backgroundColor: colorScheme === 'dark' ? '#2A3942' : '#f0f0f0' }]}>
                            <IconSymbol name="face.smiling" size={24} color="#888" style={{ marginLeft: 10 }} />
                            <TextInput
                                style={[styles.input, { color: Colors[colorScheme].text }]}
                                placeholder="Message"
                                placeholderTextColor="#888"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                underlineColorAndroid="transparent"
                            />
                        </View>
                    )}
                    <TouchableOpacity
                        onPress={inputText ? sendMessage : undefined}
                        onPressIn={!inputText ? startRecording : undefined}
                        onPressOut={!inputText ? stopRecording : undefined}
                        style={styles.sendButton}
                    >
                        <View style={[styles.sendButtonCircle, !inputText && isRecording && { transform: [{ scale: 1.2 }], backgroundColor: '#ff3b30' }]}>
                            <IconSymbol name={inputText ? "paperplane.fill" : "mic"} size={22} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        elevation: 4,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginRight: 10,
    },
    headerTitleContainer: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#ccc', // Lighter color for subtitle
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    messageList: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 0,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0,
    },
    messageText: {
        fontSize: 16,
    },
    messageTime: {
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    },
    inputFieldContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 25,
        marginRight: 8,
        paddingVertical: 4,
    },
    input: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 30,
        borderWidth: 0,
        borderColor: 'transparent',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            } as any
        }),
    },
    sendButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#5110f5ff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    recordingOverlay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 10,
    },
    recordingTimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 15,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ff3b30',
        marginRight: 8,
    },
    recordingTimer: {
        fontSize: 18,
        fontWeight: '500',
    },
    cancelButton: {
        padding: 5,
    },
    slideCancelText: {
        marginLeft: 'auto',
        color: '#8696a0',
        fontSize: 14,
        marginRight: 10,
    }
});
