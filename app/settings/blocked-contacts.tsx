import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BlockedContactsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBlockedUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await AsyncStorage.getItem('userToken');
            const url = `${API_BASE_URL}/api/user/blocked`;
            console.log(`[BlockedContacts] Fetching from ${url}`);

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await response.json();
            console.log(`[BlockedContacts] Status: ${response.status}, Data Count: ${data?.length}`);

            if (response.ok) {
                setBlockedUsers(data);
            } else {
                setError(data.message || "Failed to fetch");
            }
        } catch (err: any) {
            console.error("[BlockedContacts] Error:", err);
            setError(err.message || "Network error");
        } finally {
            setLoading(false);
        }
    };

    const unblockUser = async (userId: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/user/unblock`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                setBlockedUsers(prev => prev.filter(u => u._id !== userId));
                Alert.alert("Success", "User unblocked");
            } else {
                Alert.alert("Error", "Failed to unblock user");
            }
        } catch (error) {
            console.error("Unblock error:", error);
            Alert.alert("Error", "Something went wrong");
        }
    };

    const { useFocusEffect } = require('expo-router');
    const { useCallback } = require('react');

    useFocusEffect(
        useCallback(() => {
            fetchBlockedUsers();
        }, [])
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: "Blocked Contacts",
                    headerStyle: { backgroundColor: theme.headerBackground },
                    headerTintColor: theme.headerTintColor,
                }}
            />

            {loading ? (
                <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            {error ? (
                                <Text style={[styles.errorText, { color: '#F53649' }]}>{error}</Text>
                            ) : (
                                <Text style={[styles.emptyText, { color: theme.text }]}>No blocked contacts</Text>
                            )}
                            <TouchableOpacity style={styles.retryBtn} onPress={fetchBlockedUsers}>
                                <Text style={{ color: theme.tint }}>Tap to refresh</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.userItem, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee' }]}>
                            <View style={styles.avatar}>
                                {item.profilePic ? (
                                    <Image source={{ uri: getInternalUri(item.profilePic) }} style={styles.avatarImg} />
                                ) : (
                                    <IconSymbol name="person.fill" size={24} color="#fff" />
                                )}
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, { color: theme.text }]}>{item.name || "Unknown"}</Text>
                                <Text style={styles.userStatus}>{item.about}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.unblockBtn, { borderColor: theme.tint }]}
                                onPress={() => unblockUser(item._id)}
                            >
                                <Text style={[styles.unblockText, { color: theme.tint }]}>Unblock</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.6,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userStatus: {
        fontSize: 14,
        color: '#666',
    },
    unblockBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    unblockText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 16,
        marginBottom: 10,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 10,
        padding: 10,
    }
});
