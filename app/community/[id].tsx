import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CommunityInfoScreen() {
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [community, setCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'community' | 'announcements'>('community');

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

    const pickImage = async () => {
        // Only admin check (UI hides it, but double check logic if needed, currently assuming owner/admin sees this)
        // Ideally we check if user is admin before allowing pick

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');

            // 1. Upload to ImageKit via backend
            const formData = new FormData();
            const filename = uri.split('/').pop() || `community-${Date.now()}.jpg`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, filename);
            } else {
                // @ts-ignore
                formData.append('file', {
                    uri,
                    name: filename,
                    type: 'image/jpeg',
                });
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) throw new Error(uploadData.message || "Upload failed");

            const imageUrl = uploadData.imageUrl;

            // 2. Update Community Profile Pic
            const updateRes = await fetch(`${API_BASE_URL}/api/community/${id}/profile-pic`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ profilePic: imageUrl })
            });

            if (updateRes.ok) {
                setCommunity({ ...community, profilePic: imageUrl });
                Alert.alert("Success", "Community icon updated!");
            } else {
                throw new Error("Failed to update profile pic");
            }

        } catch (error) {
            console.error("Error uploading image:", error);
            Alert.alert("Error", "Failed to update community icon");
        } finally {
            setUploading(false);
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={28} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity>
                    <IconSymbol name="ellipsis" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Logo Area */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoBorder}>
                        <TouchableOpacity
                            onPress={pickImage}
                            disabled={uploading}
                            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                        >
                            {community?.profilePic ? (
                                <Image source={{ uri: getInternalUri(community.profilePic) }} style={styles.logo} />
                            ) : (
                                <View style={[styles.logoPlaceholder, { backgroundColor: colorScheme === 'dark' ? '#2A3942' : '#e0e0e0' }]}>
                                    <IconSymbol name="person.2.fill" size={60} color="#8696A0" />
                                </View>
                            )}

                            {/* Edit Overlay */}
                            <View style={styles.editOverlay}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <IconSymbol name="camera.fill" size={20} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.communityName, { color: theme.text }]}>{community.name}</Text>
                    <Text style={styles.communityMeta}>Community · {community.groups?.length || 0} groups</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionGrid}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colorScheme === 'dark' ? '#1F2C34' : '#f0f0f0' }]}
                        onPress={() => router.push({ pathname: '/community/[id]/add_members', params: { id: community._id } } as any)}
                    >
                        <IconSymbol name="person.badge.plus" size={24} color={theme.tint} />
                        <Text style={[styles.actionButtonText, { color: theme.tint }]}>Add members</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colorScheme === 'dark' ? '#1F2C34' : '#f0f0f0' }]}
                        onPress={() => router.push({ pathname: '/community/[id]/add_groups', params: { id: community._id } } as any)}
                    >
                        <IconSymbol name="plus.circle" size={24} color={theme.tint} />
                        <Text style={[styles.actionButtonText, { color: theme.tint }]}>Add groups</Text>
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={[styles.tabsContainer, { borderBottomColor: colorScheme === 'dark' ? '#2A3942' : '#eee' }]}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('community')}
                        style={[styles.tab, activeTab === 'community' && { borderBottomColor: theme.tint, borderBottomWidth: 3 }]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'community' ? theme.tint : '#8696A0' }]}>Community</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('announcements')}
                        style={[styles.tab, activeTab === 'announcements' && { borderBottomColor: theme.tint, borderBottomWidth: 3 }]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'announcements' ? theme.tint : '#8696A0' }]}>Announcements</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {activeTab === 'community' ? (
                    <View style={styles.tabContent}>
                        {/* Community Description */}
                        {community.description && (
                            <View style={styles.descriptionContainer}>
                                <Text style={[styles.descriptionText, { color: theme.text }]}>
                                    {community.description}
                                    <Text style={{ color: theme.tint }}> Read more</Text>
                                </Text>
                            </View>
                        )}

                        {/* View Groups Button */}
                        <TouchableOpacity
                            style={styles.viewGroupsButton}
                            onPress={() => router.push({ pathname: '/community/groups', params: { id: community._id } } as any)}
                        >
                            <IconSymbol name="person.2" size={20} color={theme.text} />
                            <Text style={[styles.viewGroupsText, { color: theme.text }]}>
                                View groups ({(community.groups?.length || 0) + (community.announcementGroup ? 1 : 0)})
                            </Text>
                        </TouchableOpacity>

                        {/* Community Members */}
                        <View style={styles.membersSection}>
                            <Text style={[styles.membersHeader, { color: '#8696A0' }]}>Community members</Text>

                            {(community.users || []).map((user: any, index: number) => (
                                <TouchableOpacity key={user._id || index} style={styles.memberItem}>
                                    <View style={styles.memberAvatar}>
                                        {user.profilePic ? (
                                            <Image source={{ uri: getInternalUri(user.profilePic) }} style={styles.avatarImage} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: '#ccc' }]}>
                                                <IconSymbol name="person.fill" size={24} color="#fff" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={[styles.memberName, { color: theme.text }]}>
                                            {user.name}
                                        </Text>
                                        {user.about && (
                                            <Text style={styles.memberAbout} numberOfLines={1}>{user.about}</Text>
                                        )}
                                    </View>
                                    {user._id === community.admin?._id && (
                                        <View style={styles.ownerBadge}>
                                            <Text style={styles.ownerBadgeText}>Community Owner</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.settingsList}>
                        <SettingItem icon="bell" label="Notifications" color={theme.text} />
                        <SettingItem icon="photo" label="Media visibility" color={theme.text} />
                        <SettingItem icon="lock.fill" label="Encryption" subLabel="Messages and calls are end-to-end encrypted. Tap to learn more." color={theme.text} />
                        <SettingItem icon="lock.shield" label="Chat lock" showSwitch color={theme.text} />
                        <SettingItem icon="person.text.rectangle" label="Phone number privacy" subLabel="This chat has added privacy for your phone number. Tap to learn more." color={theme.text} />

                        <View style={{ height: 20 }} />
                        <SettingItem icon="hand.thumbsdown" label="Report community" color="#F15C6D" />
                        <TouchableOpacity style={styles.settingItem}>
                            <View style={styles.settingIcon}>
                                <IconSymbol name="door.left.hand.open" size={22} color="#F15C6D" />
                            </View>
                            <View style={styles.settingTextContent}>
                                <Text style={[styles.settingLabel, { color: "#F15C6D" }]}>Exit community</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function SettingItem({ icon, label, subLabel, showSwitch, color }: any) {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
                <IconSymbol name={icon as any} size={22} color="#8696A0" />
            </View>
            <View style={styles.settingTextContent}>
                <Text style={[styles.settingLabel, { color: color || theme.text }]}>{label}</Text>
                {subLabel && <Text style={styles.settingSubLabel}>{subLabel}</Text>}
            </View>
            {showSwitch && (
                <View style={[styles.switch, { backgroundColor: '#333' }]}>
                    <View style={styles.switchCircle} />
                </View>
            )}
        </TouchableOpacity>
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
    },
    backButton: {
        padding: 5,
    },
    scrollContent: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    logoBorder: {
        width: 140,
        height: 140,
        borderRadius: 35, // Squircle-like
        overflow: 'hidden',
        marginBottom: 20,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    communityName: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    communityMeta: {
        fontSize: 14,
        color: '#8696A0',
        marginTop: 5,
    },
    actionGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginVertical: 20,
        width: '100%',
        justifyContent: 'space-between',
    },
    actionButton: {
        width: '48%',
        height: 80,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(134, 150, 160, 0.1)',
    },
    actionButtonText: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        width: '100%',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    settingsList: {
        width: '100%',
        marginTop: 10,
    },
    settingItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    settingIcon: {
        width: 30,
        marginRight: 20,
        alignItems: 'center',
    },
    settingTextContent: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
    },
    settingSubLabel: {
        fontSize: 12,
        color: '#8696A0',
        marginTop: 4,
        lineHeight: 16,
    },
    switch: {
        width: 40,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#333',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    switchCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#8696A0',
    },
    tabContent: {
        width: '100%',
        paddingTop: 10,
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
    },
    sectionDivider: {
        width: '100%',
        height: 12,
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
    editOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#008069',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    descriptionContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 22,
    },
    viewGroupsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        gap: 10,
    },
    viewGroupsText: {
        fontSize: 16,
        fontWeight: '500',
    },
    membersSection: {
        width: '100%',
        paddingTop: 10,
    },
    membersHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 20,
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    memberItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    memberAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        marginRight: 15,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
    },
    memberAbout: {
        fontSize: 13,
        color: '#8696A0',
        marginTop: 2,
    },
    ownerBadge: {
        backgroundColor: '#E7F8EE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    ownerBadgeText: {
        fontSize: 12,
        color: '#008069',
        fontWeight: '600',
    }
});
