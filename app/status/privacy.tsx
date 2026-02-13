import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
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

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/user`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            const myInfo = await AsyncStorage.getItem('userInfo');
            const myId = myInfo ? JSON.parse(myInfo)._id : null;
            const contacts = data.filter((u: any) => u._id !== myId);

            setAllUsers(contacts);

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
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom WhatsApp Teal Header */}
            <View style={[styles.header, { backgroundColor: '#008069' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Status privacy</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#008069" style={{ marginTop: 50 }} />
            ) : (
                <View style={styles.content}>
                    <Text style={[styles.sectionTitle, { color: colorScheme === 'dark' ? '#9BA1A6' : '#667781' }]}>
                        Who can see my status updates
                    </Text>

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
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.optionText, { color: theme.text }]}>My contacts except...</Text>
                            {excludedUsers.length > 0 && (
                                <Text style={styles.subText}>{excludedUsers.length} excluded</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.option} onPress={() => { setSelectedType('only'); openUserSelection('only'); }}>
                        <View style={styles.radioContainer}>
                            <View style={[styles.radioOuter, { borderColor: selectedType === 'only' ? '#008069' : '#888' }]}>
                                {selectedType === 'only' && <View style={styles.radioInner} />}
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.optionText, { color: theme.text }]}>Only share with...</Text>
                            {includedUsers.length > 0 && (
                                <Text style={styles.subText}>{includedUsers.length} selected</Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.footerText, { color: colorScheme === 'dark' ? '#9BA1A6' : '#667781' }]}>
                        Changes to your privacy settings won't affect status updates that you've sent already.
                    </Text>

                    <View style={styles.saveButtonContainer}>
                        <TouchableOpacity
                            style={[styles.saveButton, { opacity: saving ? 0.7 : 1 }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Done</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* User Selection Modal */}
            <Modal visible={isModalOpen} animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
                <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                    {/* Teal Modal Header */}
                    <View style={[styles.header, { backgroundColor: '#008069' }]}>
                        <TouchableOpacity onPress={() => setIsModalOpen(false)} style={styles.backButton}>
                            <IconSymbol name="arrow.left" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <View>
                            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
                                {selectionMode === 'except' ? 'Hide status from...' : 'Share status with...'}
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
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
                                        <Text style={[styles.userPhone, { color: colorScheme === 'dark' ? '#9BA1A6' : '#667781' }]}>{item.phone}</Text>
                                    </View>
                                    <View style={[styles.checkbox, {
                                        backgroundColor: isSelected ? (selectionMode === 'except' ? '#ff3b30' : '#008069') : 'transparent',
                                        borderColor: isSelected ? 'transparent' : '#888',
                                        borderWidth: isSelected ? 0 : 2
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
        paddingVertical: 15,
        paddingHorizontal: 15,
        elevation: 4,
        height: 60,
    },
    backButton: {
        marginRight: 20,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    content: {
        padding: 20,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 25,
        textTransform: 'none',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    radioContainer: {
        marginRight: 20,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#008069',
    },
    optionText: {
        fontSize: 16,
    },
    subText: {
        fontSize: 13,
        color: '#008069',
        marginTop: 2,
    },
    footerText: {
        fontSize: 13,
        textAlign: 'left',
        marginTop: 10,
        marginBottom: 40,
        lineHeight: 20,
    },
    saveButtonContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#008069',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        minWidth: 150,
        alignItems: 'center',
        elevation: 2,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // Modal Styles
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 15,
        padding: 10,
        borderRadius: 25,
        height: 45,
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
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    avatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
    },
    userPhone: {
        fontSize: 14,
        marginTop: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 25,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#008069',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    }
});
