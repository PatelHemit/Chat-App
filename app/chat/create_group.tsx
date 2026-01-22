import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreateGroupScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [groupName, setGroupName] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Initial load of all users
    useEffect(() => {
        handleSearch('');
    }, []);

    const handleSearch = async (text: string) => {
        setSearch(text);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/user?search=${text}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error(error);
        }
    };

    const toggleUser = (user: any) => {
        if (selectedUsers.some(u => u._id === user._id)) {
            setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const createGroup = async () => {
        if (!groupName || selectedUsers.length < 2) {
            Alert.alert("Error", "Please enter a group name and select at least 2 users.");
            alert("Please enter a group name and select at least 2 users."); // Fallback for web
            return;
        }

        setCreating(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/chat/group`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: groupName,
                    users: JSON.stringify(selectedUsers.map(u => u._id))
                })
            });

            const chat = await response.json();
            if (response.ok) {
                // Redirect to chat screen
                router.replace({ pathname: '/chat/[id]', params: { id: chat._id, name: chat.chatName } });
            } else {
                alert("Failed to create group: " + chat.message);
            }

        } catch (error) {
            alert("Failed to create group");
            console.log(error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 10 }}>
                    <IconSymbol name="arrow.left" size={24} color={theme.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]}>New Group</Text>
                    <Text style={{ color: theme.text, fontSize: 12 }}>{selectedUsers.length} selected</Text>
                </View>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, { color: theme.text, fontSize: 18 }]}
                    placeholder="Group Subject"
                    placeholderTextColor="#999"
                    value={groupName}
                    onChangeText={setGroupName}
                />
            </View>

            <View style={styles.searchContainer}>
                <IconSymbol name="magnifyingglass" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                    style={StyleSheet.flatten([styles.searchInput, { color: theme.text }])}
                    placeholder="Search name or number..."
                    placeholderTextColor="#999"
                    value={search}
                    onChangeText={handleSearch}
                />
            </View>

            <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                <FlatList
                    data={selectedUsers}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <Pressable onPress={() => toggleUser(item)} style={styles.selectedChip}>
                            <Text style={{ fontSize: 12, marginRight: 5 }}>{item.name.split(' ')[0]}</Text>
                            <IconSymbol name="xmark.circle.fill" size={16} color="#666" />
                        </Pressable>
                    )}
                    keyExtractor={item => item._id}
                />
            </View>

            {loading && <ActivityIndicator size="large" color="#008069" style={{ marginTop: 20 }} />}

            <FlatList
                data={results}
                keyExtractor={(item: any) => item._id}
                renderItem={({ item }: { item: any }) => {
                    const isSelected = selectedUsers.some(u => u._id === item._id);
                    return (
                        <Pressable onPress={() => toggleUser(item)} style={styles.userItem}>
                            <View style={styles.avatar}>
                                {item.profilePic ? (
                                    <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden' }}>
                                        {/* Using View as placeholder if Image not imported, but assume IconSymbol or text */}
                                        <IconSymbol name="person.fill" size={24} color="#fff" />
                                    </View>
                                ) : (
                                    <IconSymbol name="person.fill" size={24} color="#fff" />
                                )}
                                {isSelected && (
                                    <View style={styles.checkMark}>
                                        <IconSymbol name="checkmark.circle.fill" size={20} color="#008069" />
                                    </View>
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                                <Text style={styles.userPhone}>{item.phone}</Text>
                            </View>
                        </Pressable>
                    );
                }}
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: '#008069' }]}
                onPress={createGroup}
                disabled={creating}
            >
                {creating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <IconSymbol name="checkmark" size={24} color="#fff" />
                )}
            </TouchableOpacity>

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
    inputContainer: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    input: {
        fontSize: 16,
        ...Platform.select({
            web: { outlineStyle: 'none' } as any
        })
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        margin: 10,
        padding: 10,
        borderRadius: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
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
    checkMark: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#fff',
        borderRadius: 10,
        zIndex: 10,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userPhone: {
        color: '#666',
    },
    selectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e0e0',
        padding: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        marginRight: 5,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
});
