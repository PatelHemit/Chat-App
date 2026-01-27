import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GroupInfoScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [chat, setChat] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    // Add Member State
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Group Pic State
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchChatDetails();
    }, [id]);

    const fetchChatDetails = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const userInfo = await AsyncStorage.getItem("userInfo");
            if (userInfo) {
                const user = JSON.parse(userInfo);
                setCurrentUserId(user._id);
            }

            // We need a route to fetch single chat details fully populated
            // Since our fetchChats returns all, let's filter or create a new endpoint. 
            // Reuse fetchChats logic or just find from list? 
            // Ideally backend should have GET /api/chat/:id
            // For now let's use the one we have or assume we passed data?
            // Passing data via params is limited. Let's fetch.
            // Wait, existing backend `fetchChats` gets ALL chats. `accessChat` (POST /) gets one but meant for creation.
            // Let's rely on `accessChat` or just filter from `fetchChats` if needed, 
            // OR better: Assume we can get it. 
            // Actually `accessChat` POST /api/chat/ returns the chat full object if exists.

            // However, `accessChat` is for 1-on-1 mostly in current implementation logic 
            // (it checks for 1-1). 
            // BUT, looking at `chatControllers.js`, `accessChat` is explicitly for 1-on-1.
            // Use `fetchChats` and find locally? Inefficient but works for now without backend change.
            // Optimization: Add GET /api/chat/:id in backend?
            // To be safe and quick without backend mod for retrieval:
            // Actually, let's implement a quick GET /api/chat/:id in backend? 
            // No, avoid extra backend steps if possible. 
            // Let's try `fetchChats` and filter.

            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const chats = await response.json();
            const currentChat = chats.find((c: any) => c._id === id);

            if (currentChat) {
                setChat(currentChat);
                if (userInfo) {
                    const user = JSON.parse(userInfo);
                    // Check admin
                    if (currentChat.groupAdmin?._id === user._id) {
                        setIsAdmin(true);
                    }
                }
            }

        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (text: string) => {
        setSearch(text);
        if (!text) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/user?search=${text}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            // Filter out existing members
            const members = chat?.users.map((u: any) => u._id) || [];
            const filtered = data.filter((u: any) => !members.includes(u._id));
            setSearchResults(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchLoading(false);
        }
    };

    const addMember = async (userId: string) => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${API_BASE_URL}/api/chat/groupadd`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatId: id,
                    userId: userId,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setChat(data);
                setAddModalVisible(false);
                setSearch("");
                setSearchResults([]);
                Alert.alert("Success", "Member added");
            } else {
                Alert.alert("Error", data.message || "Failed to add member");
            }
        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Failed to add member");
        }
    };

    const pickImage = async () => {
        // Allow any member to upload pic as per user request
        // if (!isAdmin) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadGroupPic(result.assets[0].uri);
        }
    };

    const uploadGroupPic = async (uri: string) => {
        setUploading(true);
        try {
            const token = await AsyncStorage.getItem("userToken");

            // 1. Upload to ImageKit/Server
            const formData = new FormData();
            const filename = `group-${id}-${Date.now()}.jpg`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, filename);
            } else {
                // @ts-ignore
                formData.append('file', { uri, name: filename, type: 'image/jpeg' });
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) throw new Error("Upload failed");

            // 2. Update Chat Model
            const response = await fetch(`${API_BASE_URL}/api/chat/groupPic`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    chatId: id,
                    pic: uploadData.imageUrl,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setChat(data);
                Alert.alert("Success", "Group icon updated");
            } else {
                Alert.alert("Error", data.message);
            }

        } catch (error) {
            console.log(error);
            Alert.alert("Error", "Failed to update group icon");
        } finally {
            setUploading(false);
        }
    };

    const removeMember = async (userId: string, userName: string) => {
        Alert.alert(
            "Remove Member",
            `Are you sure you want to remove ${userName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("userToken");
                            const response = await fetch(`${API_BASE_URL}/api/chat/groupremove`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    chatId: id,
                                    userId: userId,
                                }),
                            });
                            const data = await response.json();
                            if (response.ok) {
                                // Refresh chat details immediately
                                fetchChatDetails();
                                Alert.alert("Success", "Member removed");
                            } else {
                                Alert.alert("Error", data.message);
                            }
                        } catch (error) {
                            console.log(error);
                            Alert.alert("Error", "Failed to remove member");
                        }
                    }
                }
            ]
        );
    };

    const exitGroup = async () => {
        Alert.alert(
            "Exit Group",
            "Are you sure you want to exit this group?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Exit",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("userToken");
                            // Ensure currentUserId is set
                            if (!currentUserId) {
                                Alert.alert("Error", "User session invalid. Please relogin.");
                                return;
                            }

                            const response = await fetch(`${API_BASE_URL}/api/chat/groupremove`, {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    chatId: id,
                                    userId: currentUserId,
                                }),
                            });

                            if (response.ok) {
                                router.dismissAll();
                                router.replace('/');
                            } else {
                                const data = await response.json();
                                Alert.alert("Error", data.message);
                            }
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#008069" />
            </View>
        );
    }

    if (!chat) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text }}>Chat not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
            <Stack.Screen options={{ title: "Group Info", headerBackTitle: "Back" }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerSection}>
                    <View style={styles.avatarLarge}>
                        {chat.groupPic && chat.groupPic !== "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" ? (
                            <Image source={{ uri: chat.groupPic }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                        ) : (
                            <IconSymbol name="person.3.fill" size={50} color="#fff" />
                        )}

                        <TouchableOpacity onPress={pickImage} style={styles.cameraIcon}>
                            {uploading ? <ActivityIndicator size="small" color="#008069" /> : <IconSymbol name="camera.fill" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.groupName, { color: theme.text }]}>{chat.chatName}</Text>
                    <Text style={styles.groupCount}>Group · {chat.users.length} members</Text>
                </View>

                {/* Add Member - Admin Only */}
                {isAdmin && (
                    <TouchableOpacity style={styles.actionRow} onPress={() => setAddModalVisible(true)}>
                        <View style={styles.iconCircle}>
                            <IconSymbol name="person.badge.plus" size={20} color="#008069" />
                        </View>
                        <Text style={[styles.actionText, { color: '#008069' }]}>Add Participants</Text>
                    </TouchableOpacity>
                )}

                <Text style={[styles.sectionTitle, { color: theme.text }]}>{chat.users.length} participants</Text>

                {chat.users.sort((a: any, b: any) => {
                    const adminId = chat.groupAdmin?._id || chat.groupAdmin;
                    if (a._id === adminId) return -1;
                    if (b._id === adminId) return 1;
                    return 0;
                }).map((user: any) => (
                    <View key={user._id} style={styles.userRow}>
                        <View style={styles.avatarSmall}>
                            {user.profilePic ? (
                                <Image source={{ uri: user.profilePic }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                            ) : (
                                <IconSymbol name="person.fill" size={24} color="#fff" />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.userName, { color: theme.text }]}>
                                {user._id === currentUserId ? "You" : user.name}
                                {chat.groupAdmin?._id === user._id && <Text style={{ color: '#008069', fontSize: 12 }}> (Group Admin)</Text>}
                            </Text>
                            <Text style={styles.userStatus}>{user.email || user.phone}</Text>
                        </View>

                        {/* Admin Actions: Remove Member (only if not self) */}
                        {isAdmin && user._id !== currentUserId && (
                            <TouchableOpacity onPress={() => removeMember(user._id, user.name)}>
                                <Text style={{ color: 'red', fontSize: 13 }}>Remove</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}

                <TouchableOpacity style={[styles.exitButton, { borderTopColor: '#ddd' }]} onPress={exitGroup}>
                    <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="red" />
                    <Text style={styles.exitText}>Exit Group</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Add Member Modal */}
            <Modal
                visible={addModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Add Participants</Text>
                        <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                            <Text style={{ color: '#008069', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[styles.searchInput, { color: theme.text, backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f2f5' }]}
                        placeholder="Search users..."
                        placeholderTextColor="#888"
                        value={search}
                        onChangeText={handleSearch}
                    />

                    {searchLoading && <ActivityIndicator color="#008069" style={{ margin: 20 }} />}

                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.userRow} onPress={() => addMember(item._id)}>
                                <View style={styles.avatarSmall}>
                                    {item.profilePic ? (
                                        <Image source={{ uri: item.profilePic }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                    ) : (
                                        <IconSymbol name="person.fill" size={24} color="#fff" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                                    <Text style={styles.userStatus}>{item.email}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },
    headerSection: { alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    groupName: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    groupCount: { color: '#888', fontSize: 14 },
    actionRow: { flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: 10 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6fffa', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    actionText: { fontSize: 16, fontWeight: '600' },
    sectionTitle: { padding: 15, paddingBottom: 5, fontSize: 14, fontWeight: '600', opacity: 0.7 },
    userRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    userName: { fontSize: 16, fontWeight: '500' },
    userStatus: { fontSize: 12, color: '#888' },
    exitButton: { flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: 20, borderTopWidth: 1 },
    exitText: { color: 'red', fontSize: 16, fontWeight: '600', marginLeft: 15 },
    modalContainer: { flex: 1, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    searchInput: { padding: 12, borderRadius: 10, fontSize: 16, marginBottom: 15 },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#008069',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    }
});
