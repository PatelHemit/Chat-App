import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DUMMY_MESSAGES = [
    { id: '1', text: 'Hello!', sender: 'them', time: '10:00 AM' },
    { id: '2', text: 'Hi! How are you?', sender: 'me', time: '10:01 AM' },
    { id: '3', text: 'I am doing great, thanks for asking. How about you?', sender: 'them', time: '10:02 AM' },
    { id: '4', text: 'Same here!', sender: 'me', time: '10:02 AM' },
];

export default function ChatScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState(DUMMY_MESSAGES);
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const sendMessage = () => {
        if (message.trim().length === 0) return;
        setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), text: message, sender: 'me', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
        setMessage('');
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
                                <IconSymbol name="person.fill" size={20} color="#fff" />
                            </View>
                            <Text style={[styles.headerName, { color: theme.headerTintColor }]}>{name || id}</Text>
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
            <FlatList
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View
                        style={[
                            styles.messageBubble,
                            item.sender === 'me'
                                ? [styles.myMessage, { backgroundColor: theme.messageSent }]
                                : [styles.theirMessage, { backgroundColor: theme.messageReceived }],
                        ]}>
                        <Text style={[styles.messageText, { color: theme.text }]}>{item.text}</Text>
                        <Text style={styles.messageTime}>{item.time}</Text>
                    </View>
                )}
                contentContainerStyle={styles.messagesList}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.inputContainer}>

                <TouchableOpacity style={styles.inputButton}>
                    <IconSymbol name="plus" size={24} color={theme.text} />
                </TouchableOpacity>

                <View style={[styles.inputWrapper, { backgroundColor: colorScheme === 'dark' ? '#2A3942' : '#fff' }]}>
                    <TouchableOpacity style={styles.iconInsideInput}>
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
                </View>

                {message.length === 0 ? (
                    <TouchableOpacity style={styles.inputButton}>
                        <IconSymbol name="mic" size={24} color={theme.text} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                        <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                    </TouchableOpacity>
                )}
            </KeyboardAvoidingView>
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
