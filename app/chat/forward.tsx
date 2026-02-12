import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image as RNImage, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForwardScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const params = useLocalSearchParams();

    // Parse the message data to forward
    const messageToForward = params.message ? JSON.parse(params.message as string) : null;

    const [chats, setChats] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<any[]>([]); // Can be chat objects or user objects
    const [loading, setLoading] = useState(false);
    const [forwarding, setForwarding] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const userInfo = await AsyncStorage.getItem("userInfo");
            if (userInfo) {
                const user = JSON.parse(userInfo);
                setCurrentUserId(user._id);
            }

            const token = await AsyncStorage.getItem('userToken');

            // Fetch Chats
            const chatsRes = await fetch(`${API_BASE_URL}/api/chat`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const chatsData = await chatsRes.json();

            // Fetch All Users
            const usersRes = await fetch(`${API_BASE_URL}/api/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const usersData = await usersRes.json();

            if (Array.isArray(chatsData)) setChats(chatsData);
            if (Array.isArray(usersData)) setUsers(usersData);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (item: any, type: 'chat' | 'user') => {
        const itemId = item._id;
        const exists = selectedItems.find(i => i._id === itemId);

        if (exists) {
            setSelectedItems(prev => prev.filter(i => i._id !== itemId));
        } else {
            setSelectedItems(prev => [...prev, { ...item, _forwardType: type }]);
        }
    };

    const handleForward = async () => {
        if (selectedItems.length === 0 || !messageToForward) return;

        setForwarding(true);
        try {
            const token = await AsyncStorage.getItem('userToken');

            for (const item of selectedItems) {
                let chatId = item._id;

                // If it's a user, we must first get/create the chat
                if (item._forwardType === 'user') {
                    const chatAccessRes = await fetch(`${API_BASE_URL}/api/chat`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ userId: item._id })
                    });
                    const chatData = await chatAccessRes.json();
                    chatId = chatData._id;
                }

                // Send the message to this chat
                await fetch(`${API_BASE_URL}/api/message`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        content: messageToForward.content,
                        chatId: chatId,
                        type: messageToForward.type,
                        fileUrl: messageToForward.fileUrl,
                        duration: messageToForward.duration,
                        fileMetadata: messageToForward.fileMetadata,
                    })
                });
            }

            router.back();
        } catch (error) {
            console.error("Forwarding failed:", error);
            alert("Failed to forward message");
        } finally {
            setForwarding(false);
        }
    };

    const getChatName = (chat: any) => {
        if (chat.isGroupChat) return chat.chatName;
        const otherUser = chat.users.find((u: any) => u._id !== currentUserId);
        return otherUser ? otherUser.name : "Unknown User";
    };

    // Filter logic
    const filteredChats = chats.filter(chat =>
        getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUsers = users.filter(user => {
        // Don't show me
        if (user._id === currentUserId) return false;
        // Don't show if already in chats (to avoid duplicates)
        const inChats = chats.some(c => !c.isGroupChat && c.users.some((u: any) => u._id === user._id));
        if (inChats) return false;

        return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.phone.includes(searchQuery);
    });

    const sections = [
        { title: 'Recent Chats', data: filteredChats, type: 'chat' },
        { title: 'Contacts', data: filteredUsers, type: 'user' }
    ].filter(s => s.data.length > 0);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
            <View style={[styles.header, { backgroundColor: Colors[colorScheme].headerBackground }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <IconSymbol name="arrow.left" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Forward to...</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, { backgroundColor: colorScheme === 'dark' ? '#202C33' : '#f0f2f5', color: Colors[colorScheme].text }]}
                    placeholder="Search name or number"
                    placeholderTextColor="#888"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#008069" style={{ marginTop: 20 }} />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item._id}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={[styles.sectionHeader, { backgroundColor: colorScheme === 'dark' ? '#121b22' : '#f0f2f5' }]}>
                            <Text style={styles.sectionTitle}>{title}</Text>
                        </View>
                    )}
                    renderItem={({ item, section }) => {
                        const isSelected = selectedItems.some(i => i._id === item._id);
                        const name = section.type === 'chat' ? getChatName(item) : item.name;
                        const subtext = section.type === 'chat' ? (item.isGroupChat ? `${item.users.length} members` : item.users.find((u: any) => u._id !== currentUserId)?.phone) : item.phone;
                        const avatar = section.type === 'chat' ?
                            (item.isGroupChat ? null : item.users.find((u: any) => u._id !== currentUserId)?.profilePic) :
                            item.profilePic;

                        return (
                            <TouchableOpacity
                                style={styles.chatItem}
                                onPress={() => toggleSelect(item, section.type as 'chat' | 'user')}
                            >
                                <View style={styles.avatar}>
                                    {item.isGroupChat ? (
                                        <IconSymbol name="person.2.fill" size={30} color="#fff" />
                                    ) : (
                                        avatar ? (
                                            <RNImage
                                                source={{ uri: avatar }}
                                                style={{ width: 50, height: 50, borderRadius: 25 }}
                                            />
                                        ) : (
                                            <IconSymbol name="person.fill" size={30} color="#fff" />
                                        )
                                    )}
                                </View>
                                <View style={styles.chatInfo}>
                                    <Text style={[styles.name, { color: Colors[colorScheme].text }]}>{name}</Text>
                                    <Text style={styles.status} numberOfLines={1}>{subtext}</Text>
                                </View>
                                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                                    {isSelected && <IconSymbol name="checkmark" size={16} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {selectedItems.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: Colors[colorScheme].tint }]}
                    onPress={handleForward}
                    disabled={forwarding}
                >
                    {forwarding ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <IconSymbol name="paperplane.fill" size={24} color="#fff" />
                    )}
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 4
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    searchContainer: { padding: 10 },
    searchInput: {
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        fontSize: 16
    },
    sectionHeader: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#008069',
        textTransform: 'uppercase'
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    chatInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold' },
    status: { fontSize: 13, color: '#666' },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxActive: {
        borderColor: '#008069',
        backgroundColor: '#008069'
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5
    }
});
