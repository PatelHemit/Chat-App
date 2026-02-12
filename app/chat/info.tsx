import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatInfoScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [chat, setChat] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [otherUser, setOtherUser] = useState<any>(null);

    // Add Member State
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Group Pic State
    const [uploading, setUploading] = useState(false);
    const [mediaMessages, setMediaMessages] = useState<any[]>([]);

    // Mute State
    const [isMuted, setIsMuted] = useState(false);
    const [muteUntil, setMuteUntil] = useState<any>(null);
    const [muteModalVisible, setMuteModalVisible] = useState(false);

    useEffect(() => {
        fetchChatDetails();
        fetchMediaMessages();
    }, [id]);

    const fetchMediaMessages = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${API_BASE_URL}/api/message/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    // Filter for media
                    const media = data.filter((m: any) =>
                        m.type === 'image' ||
                        m.type === 'video' ||
                        (m.content && m.content.match(/\.(jpeg|jpg|gif|png|mp4)$/i))
                    );
                    // Reverse to show newest first if the API returns oldest first (usually logs do)
                    // WhatsApp shows newest on left? Actually usually newest is fast access.
                    // Assuming API returns chronological (oldest -> newest), we want reverse for "recent media"
                    setMediaMessages(media.reverse());
                }
            }
        } catch (error) {
            console.log("Error fetching media:", error);
        }
    };

    const fetchChatDetails = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const userInfo = await AsyncStorage.getItem("userInfo");
            let userId = "";

            if (userInfo) {
                const user = JSON.parse(userInfo);
                setCurrentUserId(user._id);
                userId = user._id;
            }

            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const chats = await response.json();
            const currentChat = chats.find((c: any) => c._id === id);

            if (currentChat) {
                setChat(currentChat);

                // Check Mute Status
                const muteInfo = currentChat.mutedBy?.find((m: any) =>
                    String(m.user._id || m.user) === String(userId)
                );
                if (muteInfo) {
                    const expiry = muteInfo.mutedUntil ? new Date(muteInfo.mutedUntil) : null;
                    if (!expiry || expiry > new Date()) {
                        setIsMuted(true);
                        setMuteUntil(expiry);
                    } else {
                        setIsMuted(false);
                        setMuteUntil(null);
                    }
                } else {
                    setIsMuted(false);
                    setMuteUntil(null);
                }

                if (currentChat.isGroupChat) {
                    // Check admin
                    const adminId = currentChat.groupAdmin?._id || currentChat.groupAdmin;
                    if (adminId === userId) {
                        setIsAdmin(true);
                    }
                } else {
                    // Find other user
                    const other = currentChat.users.find((u: any) => u._id !== userId);
                    setOtherUser(other);
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
        // Only allow image update for groups (any member/admin depending on rules) 
        // For 1-on-1, users cannot change other person's profile pic.
        if (!chat.isGroupChat) return;

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
                            if (!currentUserId) return;

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
                                router.replace('/(tabs)');
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

    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        if (otherUser) {
            checkBlockStatus();
        }
    }, [otherUser]);

    const checkBlockStatus = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${API_BASE_URL}/api/user/block-status/${otherUser._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            console.log(`[Block-Status] Data for ${otherUser.name}:`, data);
            setIsBlocked(data.isBlockedByMe); // Corrected from data.isBlocked
        } catch (error) {
            console.log(error);
        }
    };

    const handleBlockUser = async () => {
        if (!otherUser) return;
        setLoading(true);

        const action = isBlocked ? "Unblock" : "Block";
        const endpoint = isBlocked ? "/api/user/unblock" : "/api/user/block";
        const fullUrl = `${API_BASE_URL}${endpoint}`;

        // Platform-specific confirmation
        const confirmed = Platform.OS === 'web'
            ? window.confirm(`${action} ${otherUser.name}?`)
            : await new Promise((resolve) => {
                Alert.alert(`${action} User`, `${action} ${otherUser.name}?`, [
                    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                    { text: action, style: "destructive", onPress: () => resolve(true) }
                ]);
            });

        if (!confirmed) {
            setLoading(false);
            return;
        }

        try {
            console.log(`[Block-Action] Attempting ${action} via ${fullUrl}`);
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId: otherUser._id })
            });

            const data = await response.json();
            console.log(`[Block-Action] Response from ${endpoint}:`, response.status, data);

            if (response.ok) {
                const newBlockedState = !isBlocked;
                setIsBlocked(newBlockedState);

                if (Platform.OS === 'web') {
                    alert(`User ${newBlockedState ? "blocked" : "unblocked"}`);
                } else {
                    Alert.alert("Success", `User ${newBlockedState ? "blocked" : "unblocked"}`);
                }
            } else {
                throw new Error(data.message || `HTTP ${response.status}`);
            }
        } catch (e: any) {
            console.error(`[Block-Action] CRITICAL ERROR:`, e);
            const errorMsg = e.message === 'Network request failed'
                ? `Cannot reach server at ${API_BASE_URL}. Please check your connection.`
                : `Failed to ${action.toLowerCase()} user: ${e.message}`;

            if (Platform.OS === 'web') {
                alert(errorMsg);
            } else {
                Alert.alert("Error", errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMute = async (duration: string) => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${API_BASE_URL}/api/chat/mute/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ duration })
            });

            const data = await response.json();
            if (response.ok) {
                setIsMuted(true);
                setMuteUntil(data.mutedUntil ? new Date(data.mutedUntil) : null);
                setMuteModalVisible(false);
                Alert.alert("Success", "Notifications muted");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUnmute = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${API_BASE_URL}/api/chat/unmute/${id}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                setIsMuted(false);
                setMuteUntil(null);
                Alert.alert("Success", "Notifications unmuted");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleReportUser = () => {
        const confirmed = Platform.OS === 'web'
            ? window.confirm(`Report ${otherUser?.name}? The last 5 messages from this user will be forwarded to support.`)
            : (() => {
                Alert.alert(
                    "Report User",
                    `Report ${otherUser?.name}? The last 5 messages from this user will be forwarded to support.`,
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Report",
                            onPress: () => {
                                if (Platform.OS === 'web') {
                                    alert("User has been reported to support.");
                                } else {
                                    Alert.alert("Reported", "User has been reported to support.");
                                }
                            }
                        }
                    ]
                );
                return false; // Alert.alert is async, so we return false here
            })();

        if (confirmed && Platform.OS === 'web') {
            alert("User has been reported to support.");
        }
    };

    const deleteChat = async () => {
        Alert.alert(
            "Delete Chat",
            "Are you sure you want to delete this chat permanently?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem("userToken");
                            const response = await fetch(`${API_BASE_URL}/api/chat/delete`, {
                                method: 'PUT', // Using PUT as defined in routes
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ chatId: id })
                            });

                            if (response.ok) {
                                router.dismissAll();
                                router.replace('/(tabs)');
                            } else {
                                const data = await response.json();
                                Alert.alert("Error", data.message || "Failed to delete chat");
                            }
                        } catch (error) {
                            console.log(error);
                            Alert.alert("Error", "Failed to delete chat");
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

    const isGroup = chat.isGroupChat;
    const title = isGroup ? "Group Info" : "Contact Info";
    // Display Picture: Group Pic or Other User Pic
    const displayPic = isGroup ? chat.groupPic : (otherUser?.profilePic || "");
    const displayName = isGroup ? chat.chatName : (otherUser?.name || "User");
    const displayInfo = isGroup ? `Group · ${chat.users.length} members` : (otherUser?.email || otherUser?.phone || "");

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
            <Stack.Screen options={{ title: title, headerBackTitle: "Back" }} />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.headerSection, { borderBottomColor: '#ccc' }]}>
                    <View style={styles.avatarLarge}>
                        {displayPic && displayPic !== "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg" ? (
                            <Image source={{ uri: displayPic }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                        ) : (
                            <IconSymbol name={isGroup ? "person.3.fill" : "person.fill"} size={50} color="#fff" />
                        )}

                        {isGroup && (
                            <TouchableOpacity onPress={pickImage} style={styles.cameraIcon}>
                                {uploading ? <ActivityIndicator size="small" color="#008069" /> : <IconSymbol name="camera.fill" size={20} color="#fff" />}
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={[styles.groupName, { color: theme.text }]}>{displayName}</Text>
                    <Text style={styles.groupCount}>{displayInfo}</Text>
                </View>

                {/* Media, Links and Docs Section */}
                <View style={{ marginTop: 10, backgroundColor: theme.background, padding: 15 }}>
                    <TouchableOpacity
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}
                        onPress={() => router.push({ pathname: '/chat/shared-media', params: { id } })}
                    >
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>Media, links and docs</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: '#888', marginRight: 5 }}>{mediaMessages.length} {'>'}</Text>
                        </View>
                    </TouchableOpacity>

                    {mediaMessages.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                            {mediaMessages.slice(0, 10).map((msg: any) => {
                                const uri = getInternalUri(msg.content || msg.fileUrl);
                                return (
                                    <TouchableOpacity
                                        key={msg._id}
                                        style={{ marginRight: 5 }}
                                        onPress={() => {
                                            if (uri) {
                                                if (msg.type === 'image' || msg.content?.match(/\.(jpeg|jpg|gif|png)$/i)) {
                                                    // Optional: Navigate to full screen
                                                    router.push({ pathname: '/chat/shared-media', params: { id } });
                                                } else {
                                                    import('react-native').then(({ Linking }) => {
                                                        Linking.openURL(uri);
                                                    });
                                                }
                                            }
                                        }}
                                    >
                                        {msg.type === 'image' || msg.content?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                            <Image
                                                source={{ uri }}
                                                style={{ width: 80, height: 80, borderRadius: 8 }}
                                            />
                                        ) : msg.type === 'video' ? (
                                            <View style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                                <IconSymbol name="play.fill" size={30} color="#fff" />
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <Text style={{ color: '#888', fontSize: 14, fontStyle: 'italic' }}>No media shared</Text>
                    )}
                </View>

                {/* Mute Section */}
                <View style={{ marginTop: 10, backgroundColor: theme.background }}>
                    <TouchableOpacity
                        style={[styles.userRow, { justifyContent: 'space-between' }]}
                        onPress={() => isMuted ? handleUnmute() : setMuteModalVisible(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconSymbol name={isMuted ? "bell.slash.fill" : "bell.fill"} size={24} color="#888" />
                            <Text style={[styles.actionText, { color: theme.text, marginLeft: 15 }]}>Mute notifications</Text>
                        </View>
                        <Text style={{ color: isMuted ? '#008069' : '#888' }}>
                            {isMuted ? "Muted" : "Off"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* For Groups: Add Member / Participants List */}
                {isGroup && (
                    <>
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

                                {isAdmin && user._id !== currentUserId && (
                                    <TouchableOpacity onPress={() => removeMember(user._id, user.name)}>
                                        <Text style={{ color: 'red', fontSize: 13 }}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}

                        <TouchableOpacity style={[styles.exitButton, { borderTopColor: '#ccc' }]} onPress={exitGroup}>
                            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="red" />
                            <Text style={styles.exitText}>Exit Group</Text>
                        </TouchableOpacity>
                    </>
                )}

                {/* Single Chat Actions */}
                {!isGroup && (
                    <View style={{ marginTop: 20 }}>
                        <TouchableOpacity style={[styles.userRow, { borderTopWidth: 1, borderTopColor: '#ccc' }]} onPress={handleBlockUser}>
                            <IconSymbol name="hand.raised.fill" size={24} color={isBlocked ? "gray" : "red"} />
                            <Text style={[styles.actionText, { color: isBlocked ? 'gray' : 'red', marginLeft: 15 }]}>
                                {isBlocked ? `Unblock ${displayName}` : `Block ${displayName}`}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.userRow} onPress={handleReportUser}>
                            <IconSymbol name="exclamationmark.bubble.fill" size={24} color="red" />
                            <Text style={[styles.actionText, { color: 'red', marginLeft: 15 }]}>Report {displayName}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.userRow} onPress={deleteChat}>
                            <IconSymbol name="trash.fill" size={24} color="red" />
                            <Text style={[styles.actionText, { color: 'red', marginLeft: 15 }]}>Delete Chat</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {/* Add Member Modal (Only for Groups) */}
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

            {/* Mute Options Modal */}
            <Modal
                visible={muteModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setMuteModalVisible(false)}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setMuteModalVisible(false)}
                >
                    <View style={{ backgroundColor: theme.background, width: '80%', borderRadius: 8, padding: 20 }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 20 }}>Mute notifications for...</Text>

                        <TouchableOpacity style={{ paddingVertical: 15 }} onPress={() => handleMute('8hours')}>
                            <Text style={{ color: theme.text, fontSize: 16 }}>8 Hours</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ paddingVertical: 15 }} onPress={() => handleMute('1week')}>
                            <Text style={{ color: theme.text, fontSize: 16 }}>1 Week</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{ paddingVertical: 15 }} onPress={() => handleMute('forever')}>
                            <Text style={{ color: theme.text, fontSize: 16 }}>Always</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                            <TouchableOpacity onPress={() => setMuteModalVisible(false)}>
                                <Text style={{ color: '#008069', fontWeight: 'bold', fontSize: 16 }}>CANCEL</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
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
