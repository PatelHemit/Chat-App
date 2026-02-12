import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PrivacyType = 'contacts' | 'except' | 'only';

export default function StatusPrivacyScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedType, setSelectedType] = useState<PrivacyType>('contacts');
    const [excludedUsers, setExcludedUsers] = useState<any[]>([]);
    const [includedUsers, setIncludedUsers] = useState<any[]>([]);

    // User Selection Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'except' | 'only'>('except');
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSelectedUsers, setTempSelectedUsers] = useState<string[]>([]);

    useEffect(() => {
        fetchPrivacySettings();
    }, []);

    const fetchPrivacySettings = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/status/privacy`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                setSelectedType(data.type || 'contacts');
                setExcludedUsers(data.excludedUsers || []);
                setIncludedUsers(data.includedUsers || []);
            }
        } catch (error) {
            console.error("Error fetching privacy settings:", error);
            Alert.alert("Error", "Failed to load privacy settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const body = {
                type: selectedType,
                excludedUsers: excludedUsers.map(u => u._id),
                includedUsers: includedUsers.map(u => u._id)
            };

            const response = await fetch(`${API_BASE_URL}/api/status/privacy`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                router.back();
            } else {
                Alert.alert("Error", "Failed to save settings");
            }
        } catch (error) {
            console.error("Error saving privacy settings:", error);
            Alert.alert("Error", "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const openUserSelection = async (mode: 'except' | 'only') => {
        setSelectionMode(mode);
        setIsModalOpen(true);
        setLoading(true);

        // Fetch all contacts (users)
        try {
            const token = await AsyncStorage.getItem('userToken');
            // Fetch all users logic - reusing /api/user endpoint
            // In a real app, this should be /api/chat/contacts or similar
            const response = await fetch(`${API_BASE_URL}/api/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            // Filter out self if returned
            const myInfo = await AsyncStorage.getItem('userInfo');
            const myId = myInfo ? JSON.parse(myInfo)._id : null;
            const contacts = data.filter((u: any) => u._id !== myId);

            setAllUsers(contacts);

            // Pre-select based on mode
            const currentList = mode === 'except' ? excludedUsers : includedUsers;
            setTempSelectedUsers(currentList.map(u => u._id));

        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (userId: string) => {
        if (tempSelectedUsers.includes(userId)) {
            setTempSelectedUsers(prev => prev.filter(id => id !== userId));
        } else {
            setTempSelectedUsers(prev => [...prev, userId]);
        }
    };

    const saveUserSelection = () => {
        // Map selected IDs back to user objects
        const selectedObjects = allUsers.filter(u => tempSelectedUsers.includes(u._id));

        if (selectionMode === 'except') {
            setExcludedUsers(selectedObjects);
        } else {
            setIncludedUsers(selectedObjects);
        }
        setIsModalOpen(false);
    };

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery)
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                    <IconSymbol name="arrow.left" size={24} color={theme.headerTintColor} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Status privacy</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#008069" style={{ marginTop: 50 }} />
            ) : (
                <View style={styles.content}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Who can see my status updates</Text>

                    <TouchableOpacity style={styles.option} onPress={() => setSelectedType('contacts')}>
                        <View style={styles.radioContainer}>
                            <View style={[styles.radioOuter, { borderColor: selectedType === 'contacts' ? '#008069' : '#888' }]}>
                                {selectedType === 'contacts' && <View style={styles.radioInner} />}
                            </View>
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>My contacts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.option} onPress={() => { setSelectedType('except'); openUserSelection('except'); }}>
                        <View style={styles.radioContainer}>
                            <View style={[styles.radioOuter, { borderColor: selectedType === 'except' ? '#008069' : '#888' }]}>
                                {selectedType === 'except' && <View style={styles.radioInner} />}
                            </View>
                        </View>
                        <View>
                            <Text style={[styles.optionText, { color: theme.text }]}>My contacts except...</Text>
                            {excludedUsers.length > 0 && <Text style={styles.subText}>{excludedUsers.length} excluded</Text>}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.option} onPress={() => { setSelectedType('only'); openUserSelection('only'); }}>
                        <View style={styles.radioContainer}>
                            <View style={[styles.radioOuter, { borderColor: selectedType === 'only' ? '#008069' : '#888' }]}>
                                {selectedType === 'only' && <View style={styles.radioInner} />}
                            </View>
                        </View>
                        <View>
                            <Text style={[styles.optionText, { color: theme.text }]}>Only share with...</Text>
                            {includedUsers.length > 0 && <Text style={styles.subText}>{includedUsers.length} selected</Text>}
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.footerText}>
                        Changes to your privacy settings won't affect status updates that you've sent already.
                    </Text>

                    <TouchableOpacity
                        style={[styles.saveButton, { opacity: saving ? 0.7 : 1 }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Done</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* User Selection Modal */}
            <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
                <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                    <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)} style={{ marginRight: 15 }}>
                            <IconSymbol name="arrow.left" size={24} color={theme.headerTintColor} />
                        </TouchableOpacity>
                        <View>
                            <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>
                                {selectionMode === 'except' ? 'Hide status from...' : 'Share status with...'}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                                {tempSelectedUsers.length} selected
                            </Text>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={[styles.searchContainer, { backgroundColor: colorScheme === 'dark' ? '#202C33' : '#f0f2f5' }]}>
                        <IconSymbol name="magnifyingglass" size={20} color={theme.icon} style={{ marginRight: 10 }} />
                        <TextInput
                            style={[styles.input, { color: theme.text }]}
                            placeholder="Search..."
                            placeholderTextColor={theme.icon}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => {
                            const isSelected = tempSelectedUsers.includes(item._id);
                            return (
                                <TouchableOpacity style={styles.userItem} onPress={() => toggleUserSelection(item._id)}>
                                    <View style={styles.avatar}>
                                        {item.profilePic ? (
                                            <Image source={{ uri: getInternalUri(item.profilePic) }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                        ) : (
                                            <IconSymbol name="person.fill" size={24} color="#fff" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                                        <Text style={styles.userPhone}>{item.phone}</Text>
                                    </View>
                                    <View style={[styles.checkbox, {
                                        backgroundColor: isSelected ? (selectionMode === 'except' ? '#ff3b30' : '#008069') : 'transparent',
                                        borderColor: isSelected ? 'transparent' : '#888'
                                    }]}>
                                        {isSelected && <IconSymbol name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />

                    <TouchableOpacity style={styles.fab} onPress={saveUserSelection}>
                        <IconSymbol name="checkmark" size={24} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>
            </Modal>
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
        elevation: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 20,
        opacity: 0.7,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    radioContainer: {
        marginRight: 15,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#008069',
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    subText: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    footerText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 30,
        lineHeight: 18,
    },
    saveButton: {
        backgroundColor: '#008069',
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
        alignSelf: 'center',
        width: '50%',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // Modal Styles
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontSize: 14,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#008069',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    }
});
