import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CommunityGroupsScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [community, setCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCommunityData();
    }, [id]);

    const fetchCommunityData = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/community/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCommunity(data);
            }
        } catch (error) {
            console.error("Error fetching community data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    if (!community) {
        return (
            <View style={[styles.centered, { backgroundColor: theme.background }]}>
                <Text style={{ color: theme.text }}>Community not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Community groups</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.groupsSection}>
                    <Text style={[styles.sectionHeader, { color: theme.tint }]}>{community.groups?.length || 0} groups</Text>

                    {community.announcementGroup && (
                        <TouchableOpacity
                            style={styles.groupItem}
                            onPress={() => router.push(`/chat/${community.announcementGroup._id}` as any)}
                        >
                            <View style={[styles.groupAvatar, { backgroundColor: '#dcf8c6' }]}>
                                <IconSymbol name="megaphone.fill" size={24} color="#008069" />
                            </View>
                            <View style={styles.groupInfo}>
                                <Text style={[styles.groupName, { color: theme.text }]}>Announcements</Text>
                                <Text style={styles.groupMeta}>Official updates</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {(community.groups || []).map((group: any) => (
                        <TouchableOpacity
                            key={group._id}
                            style={styles.groupItem}
                            onPress={() => router.push(`/chat/${group._id}` as any)}
                        >
                            <View style={styles.groupAvatar}>
                                {group.groupPic ? (
                                    <Image source={{ uri: getInternalUri(group.groupPic) }} style={styles.avatarImage} />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#ccc' }]}>
                                        <IconSymbol name="person.fill" size={24} color="#fff" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.groupInfo}>
                                <Text style={[styles.groupName, { color: theme.text }]}>{group.chatName}</Text>
                                <Text style={styles.groupMeta}>{group.users?.length || 0} members</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingBottom: 20,
    },
    groupsSection: {
        width: '100%',
        paddingVertical: 10,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    groupItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    groupAvatar: {
        width: 50,
        height: 50,
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    groupMeta: {
        fontSize: 13,
        color: '#8696A0',
        marginTop: 2,
    }
});
