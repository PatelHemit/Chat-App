import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CommunityAddGroupsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAvailableGroups();
    }, []);

    const fetchAvailableGroups = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/community/${id}/available-groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setGroups(data);
            }
        } catch (error) {
            console.error("Error fetching groups:", error);
        } finally {
            setLoading(false);
        }
    };

    const addGroup = async (group: any) => {
        Alert.alert(
            "Add Group",
            `Add "${group.chatName}" to this community?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Add",
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            const response = await fetch(`${API_BASE_URL}/api/community/add-group`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    communityId: id,
                                    groupId: group._id
                                })
                            });

                            if (response.ok) {
                                Alert.alert("Success", "Group added to community");
                                fetchAvailableGroups(); // Refresh list to remove added group
                            } else {
                                const data = await response.json();
                                Alert.alert("Error", data.message || "Failed to add group");
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to add group");
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 10 }}>
                    <IconSymbol name="arrow.left" size={24} color={theme.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: theme.text }]}>Add Existing Groups</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#008069" />
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item: any) => item._id}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ color: '#888', marginTop: 50 }}>No available groups found.</Text>
                            <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', padding: 20 }}>
                                You must be an admin of a group to add it to this community.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => addGroup(item)} style={styles.groupItem}>
                            <View style={styles.avatar}>
                                {item.groupPic ? (
                                    <Image source={{ uri: getInternalUri(item.groupPic) }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <IconSymbol name="person.3.fill" size={24} color="#fff" />
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.groupName, { color: theme.text }]}>{item.chatName}</Text>
                                <Text style={styles.groupMeta}>{item.users.length} members</Text>
                            </View>
                            <IconSymbol name="plus.circle.fill" size={24} color="#008069" />
                        </TouchableOpacity>
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    groupMeta: {
        color: '#666',
        fontSize: 13,
    },
});
