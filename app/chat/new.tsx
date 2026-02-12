import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewChatScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { imageUri, forwardId } = useLocalSearchParams<{ imageUri: string; forwardId: string }>();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial load of all users
    useEffect(() => {
        handleSearch('');
    }, []);

    const handleSearch = async (text: string) => {
        setSearch(text);

        try {
            const token = await AsyncStorage.getItem('userToken');

            // Fetch users
            const userResponse = await fetch(`${API_BASE_URL}/api/user?search=${text}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const users = await userResponse.json();

            // Fetch groups (chats where user is a member)
            const chatResponse = await fetch(`${API_BASE_URL}/api/chat`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const chats = await chatResponse.json();

            // Filter only group chats and apply search filter
            const groups = chats
                .filter((chat: any) => chat.isGroupChat)
                .filter((chat: any) =>
                    !text || chat.chatName.toLowerCase().includes(text.toLowerCase())
                )
                .map((chat: any) => ({ ...chat, isGroup: true }));

            // Combine users and groups
            const combined = [...groups, ...users.map((u: any) => ({ ...u, isGroup: false }))];
            setResults(combined);
        } catch (error) {
            console.error(error);
        }
    };

    const accessChat = async (userId: string, userName: string, isGroup?: boolean, chatId?: string) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');

            // If it's a group, use the chatId directly
            let chat;
            if (isGroup && chatId) {
                chat = { _id: chatId };
            } else {
                // 1. Get/Create Chat for user
                const response = await fetch(`${API_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ userId })
                });
                chat = await response.json();
            }

            // 2. If Forwarding, Send the message
            if (forwardId) {
                // Fetch original message info
                const msgRes = await fetch(`${API_BASE_URL}/api/message/info/${forwardId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const msgData = await msgRes.json();

                const content = msgData.type === 'text' ? msgData.content : msgData.fileUrl || msgData.content;
                const type = msgData.type;

                await fetch(`${API_BASE_URL}/api/message`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        content: content,
                        chatId: chat._id,
                        type: type,
                        fileName: msgData.fileName,
                        fileUrl: msgData.fileUrl,
                        duration: msgData.duration,
                        fileMetadata: msgData.fileMetadata
                    }),
                });
            }

            // Redirect to chat screen
            router.replace({
                pathname: '/chat/[id]',
                params: {
                    id: chat._id,
                    name: userName,
                    imageUri,
                    otherUserId: isGroup ? undefined : userId
                }
            });
        } catch (error) {
            console.error(error);
            alert("Failed to start chat or forward message");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: forwardId ? '#008069' : theme.background }]}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 10 }}>
                    <IconSymbol name="arrow.left" size={24} color={forwardId ? "#fff" : theme.text} />
                </Pressable>
                <View>
                    <Text style={[styles.title, { color: forwardId ? "#fff" : theme.text }]}>
                        {forwardId ? "Forward to..." : "Select Contact"}
                    </Text>
                    {forwardId && <Text style={{ color: '#fff', fontSize: 12 }}>Choose a contact to forward the message</Text>}
                </View>
                {forwardId && (
                    <Pressable onPress={() => router.back()} style={{ marginLeft: 'auto' }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                    </Pressable>
                )}
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colorScheme === 'dark' ? '#202C33' : '#f0f2f5' }]}>
                <IconSymbol name="magnifyingglass" size={20} color={theme.icon} style={{ marginRight: 10 }} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Search name or number..."
                    placeholderTextColor={theme.icon}
                    value={search}
                    onChangeText={handleSearch}
                    autoFocus
                />
            </View>

            {loading && <ActivityIndicator size="large" color="#008069" style={{ marginTop: 20 }} />}

            <Pressable onPress={() => router.push('/chat/create_group' as any)} style={styles.userItem}>
                <View style={[styles.avatar, { backgroundColor: '#008069' }]}>
                    <IconSymbol name="person.2.fill" size={24} color="#fff" />
                </View>
                <View>
                    <Text style={[styles.userName, { color: theme.text }]}>New Group</Text>
                </View>
            </Pressable>

            <FlatList
                data={results}
                keyExtractor={(item: any) => item._id}
                renderItem={({ item }: { item: any }) => (
                    <Pressable
                        onPress={() => accessChat(
                            item.isGroup ? '' : item._id,
                            item.isGroup ? item.chatName : item.name,
                            item.isGroup,
                            item.isGroup ? item._id : undefined
                        )}
                        style={styles.userItem}
                    >
                        <View style={styles.avatar}>
                            {item.isGroup ? (
                                <IconSymbol name="person.2.fill" size={24} color="#fff" />
                            ) : item.profilePic ? (
                                <IconSymbol name="person.fill" size={24} color="#fff" />
                            ) : (
                                <IconSymbol name="person.fill" size={24} color="#fff" />
                            )}
                        </View>
                        <View>
                            <Text style={[styles.userName, { color: theme.text }]}>{item.isGroup ? item.chatName : item.name}</Text>
                            <Text style={[styles.userPhone, { color: theme.icon }]}>
                                {item.isGroup ? `Group · ${item.users?.length || 0} members` : (item.about || item.phone)}
                            </Text>
                        </View>
                    </Pressable>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        margin: 10,
        padding: 10,
        borderRadius: 20,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        ...Platform.select({
            web: { outlineStyle: 'none' } as any
        })
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userPhone: {
        color: '#666',
    }
});
