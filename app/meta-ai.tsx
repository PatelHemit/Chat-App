import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    time: string;
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
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = async () => {
        if (!inputText.trim()) return;

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
        flatListRef.current?.scrollToEnd({ animated: true });
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
                                { backgroundColor: item.sender === 'user' ? '#E7FFDB' : (colorScheme === 'dark' ? '#1F2C34' : '#FFFFFF') }
                            ]}
                        >
                            <Text style={[styles.messageText, { color: colorScheme === 'dark' && item.sender === 'ai' ? '#fff' : '#000' }]}>{item.text}</Text>
                            <Text style={[styles.messageTime, { color: colorScheme === 'dark' && item.sender === 'ai' ? '#ccc' : '#555' }]}>{item.time}</Text>
                        </View>
                    )}
                />
            </ImageBackground>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputContainer, { backgroundColor: Colors[colorScheme].background }]}>
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
                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                        <View style={styles.sendButtonCircle}>
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
        backgroundColor: '#5110f5ff', // WhatsApp green
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    }
});
