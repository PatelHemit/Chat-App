import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Platform, Image as RNImage, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DialPadModal from './DialPadModal';

// --- Shared Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    icon: {
        marginLeft: 20,
    },
    // Calls & Updates
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 80, // Moved up to avoid overlap with 60px tab bar
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    // Calls specific
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    callInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    callMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemDate: {
        color: '#666',
    },
    // Communities specific
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    image: {
        width: 150,
        height: 150,
        marginBottom: 20,
        opacity: 0.5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 30,
        lineHeight: 20,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    // Updates specific
    updatesSectionTitle: { // overwriting sectionTitle size for updates if needed, but looks same or similar. Updates had 20, Calls 16.
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    myStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    addIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#008069',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    sectionItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionItemSubtitle: {
        color: '#666',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusRing: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Viewer
    viewerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    viewerInner: {
        flex: 1,
        width: '100%',
        backgroundColor: '#000',
        position: 'relative',
    },
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    viewerName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    viewerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerMedia: {
        width: '100%',
        height: '100%',
    },
    viewerCaption: {
        color: '#fff',
        fontSize: 16,
        padding: 20,
        textAlign: 'center',
        position: 'absolute',
        bottom: 50,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%',
    },
    progressBarContainer: {
        flexDirection: 'row',
        position: 'absolute',
        top: Platform.OS === 'ios' ? 40 : 10,
        left: 10,
        right: 10,
        zIndex: 20,
        height: 2,
    },
    progressBarBackground: {
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 2,
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#fff',
    },
    viewerNav: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '30%',
        zIndex: 5,
    },
    viewerNavLeft: {
        left: 0,
    },
    viewerNavRight: {
        right: 0,
    },
    // View stats
    viewStatsContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 15,
    },
    viewStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    viewCountText: {
        color: '#fff',
        marginLeft: 6,
        fontWeight: 'bold',
    },
    // Viewers List
    viewersModalContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        zIndex: 100,
    },
    viewersContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        paddingBottom: 20,
    },
    viewersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    viewersTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
    },
    viewerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        marginRight: 12,
    },
    viewerListItemName: {
        fontSize: 16,
        fontWeight: '500',
    },
    // Modal & Community Creation
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        minHeight: '60%',
        maxHeight: '90%',
    },
    logoPicker: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    logoPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedLogo: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 15,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Status Privacy Menu
    menuContainer: {
        position: 'absolute',
        top: 60,
        right: 10,
        borderRadius: 4,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        minWidth: 150,
        paddingVertical: 5,
    },
    menuItem: {
        padding: 15,
    },
    menuText: {
        fontSize: 16,
    }
});

// --- Segmented Ring Component ---
function SegmentedRing({ count, viewedCount = 0, size = 56, children, theme }: { count: number, viewedCount?: number, size?: number, children?: React.ReactNode, theme?: any }) {
    if (count <= 1) {
        return (
            <View style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: count === 0 ? 'transparent' : (viewedCount > 0 ? '#8696A0' : '#008069'),
                marginRight: 16,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                {children}
            </View>
        );
    }

    const ringSize = size + 4;
    return (
        <View style={{ width: ringSize, height: ringSize, marginRight: 16, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
                position: 'absolute',
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderWidth: 2,
                borderColor: viewedCount === count ? '#8696A0' : '#008069',
            }} />
            {Array.from({ length: count }).map((_, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: 8,
                        height: 4,
                        backgroundColor: theme?.background || '#fff',
                        top: -1,
                        transform: [
                            { rotate: `${(360 / count) * i}deg` },
                            { translateY: -1 }
                        ],
                        zIndex: 1
                    }}
                />
            ))}
            {children}
        </View>
    );
}

export function CallsContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const [calls, setCalls] = useState<any[]>([]);
    const [filteredCalls, setFilteredCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isDialPadVisible, setIsDialPadVisible] = useState(false);

    const fetchCalls = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            const userInfoStr = await AsyncStorage.getItem('userInfo');
            if (!token || !userInfoStr) return;

            const userInfo = JSON.parse(userInfoStr);
            setCurrentUserId(userInfo._id);

            const response = await fetch(`${API_BASE_URL}/api/call`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCalls(data);
                setFilteredCalls(data);
            }
        } catch (error) {
            console.error("Error fetching calls:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredCalls(calls);
            return;
        }

        const filtered = calls.filter((call) => {
            const isCaller = call.caller?._id === currentUserId;
            const otherUser = isCaller ? call.receiver : call.caller;
            return otherUser?.name?.toLowerCase().includes(query.toLowerCase());
        });
        setFilteredCalls(filtered);
    };

    useEffect(() => {
        fetchCalls();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                {isSearching ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => { setIsSearching(false); handleSearch(""); }}>
                            <IconSymbol name="arrow.left" size={24} color={theme.headerTintColor} />
                        </TouchableOpacity>
                        <TextInput
                            style={{
                                flex: 1,
                                marginLeft: 16,
                                fontSize: 18,
                                color: theme.headerTintColor,
                                ...Platform.select({ web: { outlineStyle: 'none' } as any })
                            }}
                            placeholder="Search calls..."
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            autoFocus
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                ) : (
                    <>
                        <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Calls</Text>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity onPress={() => setIsSearching(true)}>
                                <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                            </TouchableOpacity>
                            <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                        </View>
                    </>
                )}
            </View>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent</Text>

                    {loading ? (
                        <ActivityIndicator size="small" color={theme.tint} />
                    ) : filteredCalls.length > 0 ? (
                        filteredCalls.map((call, i) => {
                            const isCaller = call.caller?._id === currentUserId;
                            const otherUser = isCaller ? call.receiver : call.caller;
                            const isMissed = call.status === 'missed' && !isCaller;

                            return (
                                <View key={call._id || i} style={styles.callItem}>
                                    <View style={styles.avatar}>
                                        {otherUser?.profilePic ? (
                                            <RNImage source={{ uri: getInternalUri(otherUser.profilePic) }} style={{ width: 50, height: 50, borderRadius: 25 }} />
                                        ) : (
                                            <IconSymbol name="person.fill" size={25} color="#fff" />
                                        )}
                                    </View>
                                    <View style={styles.callInfo}>
                                        <Text style={[styles.itemName, { color: isMissed ? '#FF3B30' : theme.text }]}>{otherUser?.name || "Unknown"}</Text>
                                        <View style={styles.callMeta}>
                                            <IconSymbol
                                                name={isCaller ? "arrow.up.right" : "arrow.down.left"}
                                                size={14}
                                                color={isMissed ? "#FF3B30" : "#25D366"}
                                            />
                                            <Text style={[styles.itemDate, { color: '#8696A0' }]}>
                                                {" "}{new Date(call.createdAt).toLocaleDateString()} {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                    <IconSymbol name={call.type === 'video' ? "video" : "phone"} size={24} color="#008069" />
                                </View>
                            );
                        })
                    ) : (
                        <Text style={{ textAlign: 'center', color: '#8696A0', marginTop: 20 }}>No recent calls</Text>
                    )}
                </View>
            </ScrollView>
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.tint, bottom: 65 + insets.bottom }]}
                onPress={() => setIsDialPadVisible(true)}
            >
                <IconSymbol name="phone.fill" size={24} color="#fff" />
            </TouchableOpacity>

            <DialPadModal
                visible={isDialPadVisible}
                onClose={() => setIsDialPadVisible(false)}
            />
        </SafeAreaView>
    );
}

export function CommunitiesContent() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [communities, setCommunities] = useState<any[]>([]);
    const [filteredCommunities, setFilteredCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [communityName, setCommunityName] = useState("");
    const [communityDescription, setCommunityDescription] = useState("");
    const [communityLogo, setCommunityLogo] = useState("");
    const [creating, setCreating] = useState(false);

    const fetchCommunities = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/community`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setCommunities(data);
                setFilteredCommunities(data);
            }
        } catch (error) {
            console.error("Error fetching communities:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCommunity = async () => {
        if (!communityName.trim()) {
            Alert.alert("Error", "Community name is required");
            return;
        }

        try {
            setCreating(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/community`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: communityName,
                    description: communityDescription,
                    profilePic: communityLogo
                })
            });

            const data = await response.json();

            if (response.ok) {
                setCommunityName("");
                setCommunityDescription("");
                setCommunityLogo("");
                setIsCreateModalOpen(false);
                fetchCommunities();
                Alert.alert("Success", "Community created successfully!");
            } else {
                Alert.alert("Error", data.message || "Failed to create community");
            }
        } catch (error) {
            console.error("Error creating community:", error);
            Alert.alert("Error", "Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const pickCommunityLogo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            // Upload log logic could be added here, similar to status upload
            // For now just using local URI or a placeholder
            setCommunityLogo(result.assets[0].uri);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredCommunities(communities);
            return;
        }

        const filtered = communities.filter((community) =>
            community.name?.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredCommunities(filtered);
    };

    useEffect(() => {
        fetchCommunities();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                {isSearching ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => { setIsSearching(false); handleSearch(""); }}>
                            <IconSymbol name="arrow.left" size={24} color={theme.headerTintColor} />
                        </TouchableOpacity>
                        <TextInput
                            style={{
                                flex: 1,
                                marginLeft: 16,
                                fontSize: 18,
                                color: theme.headerTintColor,
                                ...Platform.select({ web: { outlineStyle: 'none' } as any })
                            }}
                            placeholder="Search communities..."
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            autoFocus
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                ) : (
                    <>
                        <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Communities</Text>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity onPress={() => setIsSearching(true)}>
                                <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                            </TouchableOpacity>
                            <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                        </View>
                    </>
                )}
            </View>

            {loading ? (
                <View style={[styles.content]}>
                    <ActivityIndicator size="large" color="#008069" />
                </View>
            ) : filteredCommunities.length > 0 ? (
                <ScrollView>
                    <View style={styles.section}>
                        <TouchableOpacity style={styles.statusItem} onPress={() => setIsCreateModalOpen(true)}>
                            <View style={[styles.avatarContainer, { backgroundColor: '#008069' }]}>
                                <IconSymbol name="plus" size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={[styles.sectionItemTitle, { color: theme.text }]}>New Community</Text>
                            </View>
                        </TouchableOpacity>

                        {filteredCommunities.map((community) => (
                            <View key={community._id} style={{ marginBottom: 20 }}>
                                <TouchableOpacity
                                    style={styles.statusItem}
                                    onPress={() => router.push(`/community/${community._id}` as any)}
                                >
                                    <View style={styles.avatarContainer}>
                                        {community.profilePic ? (
                                            <Image source={{ uri: getInternalUri(community.profilePic) }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                                        ) : (
                                            <FontAwesome name="users" size={24} color="#666" />
                                        )}
                                    </View>
                                    <View>
                                        <Text style={[styles.sectionItemTitle, { color: theme.text, fontSize: 18 }]}>{community.name}</Text>
                                        <Text style={styles.sectionItemSubtitle}>{community.description || "Community"}</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Announcement Group */}
                                {community.announcementGroup && (
                                    <TouchableOpacity
                                        style={[styles.statusItem, { marginLeft: 20, marginTop: 10 }]}
                                        onPress={() => router.push(`/chat/${community.announcementGroup._id}` as any)}
                                    >
                                        <View style={[styles.avatarContainer, { width: 45, height: 45, backgroundColor: '#dcf8c6', borderRadius: 12 }]}>
                                            <IconSymbol name="megaphone.fill" size={22} color="#008069" />
                                        </View>
                                        <View>
                                            <Text style={[styles.sectionItemTitle, { color: theme.text, fontWeight: '600' }]}>Announcements</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* Linked Groups */}
                                {(community.groups || []).map((group: any) => (
                                    <TouchableOpacity
                                        key={group._id}
                                        style={[styles.statusItem, { marginLeft: 20, marginTop: 10 }]}
                                        onPress={() => router.push(`/chat/${group._id}` as any)}
                                    >
                                        <View style={[styles.avatarContainer, { width: 45, height: 45, borderRadius: 12 }]}>
                                            {group.groupPic ? (
                                                <Image source={{ uri: getInternalUri(group.groupPic) }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                                            ) : (
                                                <View style={[styles.avatarPlaceholder, { backgroundColor: '#ccc', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 12 }]}>
                                                    <IconSymbol name="person.fill" size={22} color="#666" />
                                                </View>
                                            )}
                                        </View>
                                        <View>
                                            <Text style={[styles.sectionItemTitle, { color: theme.text }]}>{group.chatName}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                <View style={{ height: 1, backgroundColor: colorScheme === 'dark' ? '#2A3942' : '#eee', marginTop: 15, marginHorizontal: 20 }} />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.content}>
                    <View style={[styles.image, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }]}>
                        <FontAwesome name="users" size={100} color="#008069" />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Stay connected with a community</Text>
                    <Text style={styles.subtitle}>Communities bring members together in topic-based groups, and make it easy to get admin announcements. Any community you're added to will appear here.</Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#008069' }]}
                        onPress={() => setIsCreateModalOpen(true)}
                    >
                        <Text style={styles.buttonText}>Start your community</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Create Community Modal */}
            <Modal
                visible={isCreateModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCreateModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={[styles.viewersHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee' }]}>
                            <Text style={[styles.viewersTitle, { color: theme.text }]}>New Community</Text>
                            <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                <IconSymbol name="xmark" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }}>
                            <TouchableOpacity onPress={pickCommunityLogo} style={styles.logoPicker}>
                                {communityLogo ? (
                                    <Image source={{ uri: communityLogo }} style={styles.selectedLogo} />
                                ) : (
                                    <View style={[styles.logoPlaceholder, { borderColor: theme.tint }]}>
                                        <IconSymbol name="camera.fill" size={30} color={theme.tint} />
                                        <Text style={{ color: theme.tint, fontSize: 12, marginTop: 5 }}>Add Logo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text style={[styles.inputLabel, { color: theme.text }]}>Community Name</Text>
                            <TextInput
                                style={[styles.modalInput, { color: theme.text, borderColor: colorScheme === 'dark' ? '#333' : '#ddd' }]}
                                value={communityName}
                                onChangeText={setCommunityName}
                                placeholder="Enter name"
                                placeholderTextColor="#888"
                            />

                            <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
                            <TextInput
                                style={[styles.modalInput, { color: theme.text, borderColor: colorScheme === 'dark' ? '#333' : '#ddd', height: 80 }]}
                                value={communityDescription}
                                onChangeText={setCommunityDescription}
                                placeholder="What is this community about?"
                                placeholderTextColor="#888"
                                multiline
                            />

                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.tint, marginTop: 20, width: '100%', alignItems: 'center' }]}
                                onPress={handleCreateCommunity}
                                disabled={creating}
                            >
                                {creating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Create Community</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

export function UpdatesContent() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const [groupedStatuses, setGroupedStatuses] = useState<any[]>([]);
    const [filteredGroupedStatuses, setFilteredGroupedStatuses] = useState<any[]>([]);
    const [myStatuses, setMyStatuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewingUser, setViewingUser] = useState<any | null>(null);
    const [viewingStatuses, setViewingStatuses] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [showViewersList, setShowViewersList] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const videoRef = useRef<Video>(null);
    const timerRef = useRef<any>(null);
    const progressAnim = useRef(new Animated.Value(0)).current;

    const fetchStatuses = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            const userInfoStr = await AsyncStorage.getItem('userInfo');

            if (!token || !userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);
            const userId = (userInfo._id || userInfo.id)?.toString();
            setCurrentUserId(userId);

            const response = await fetch(`${API_BASE_URL}/api/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                // Group statuses by user
                const my = data.filter((s: any) => {
                    const sUserId = (s.user._id || s.user)?.toString();
                    return sUserId === userId;
                });
                const others = data.filter((s: any) => {
                    const sUserId = (s.user._id || s.user)?.toString();
                    return sUserId !== userId;
                });

                const grouped: any[] = [];
                const userMap = new Map();

                others.forEach((status: any) => {
                    const uId = (status.user._id || status.user)?.toString();
                    if (!userMap.has(uId)) {
                        userMap.set(uId, grouped.length);
                        grouped.push({
                            user: status.user,
                            statuses: [status],
                            latestTime: status.createdAt
                        });
                    } else {
                        const index = userMap.get(uId);
                        grouped[index].statuses.push(status);
                        if (new Date(status.createdAt) > new Date(grouped[index].latestTime)) {
                            grouped[index].latestTime = status.createdAt;
                        }
                    }
                });

                // Sort users by latest status time
                grouped.sort((a, b) => new Date(b.latestTime).getTime() - new Date(a.latestTime).getTime());

                setMyStatuses(my);
                setGroupedStatuses(grouped);
                setFilteredGroupedStatuses(grouped);
            }
        } catch (error) {
            console.error("Error fetching statuses:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatuses();
    }, []);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredGroupedStatuses(groupedStatuses);
            return;
        }

        const filtered = groupedStatuses.filter((group) => {
            const name = group.user?.name || "Unknown User";
            return name.toLowerCase().includes(query.toLowerCase());
        });
        setFilteredGroupedStatuses(filtered);
    };

    // Auto-advance logic
    useEffect(() => {
        if (viewingStatuses.length > 0 && isViewerOpen) {
            const status = viewingStatuses[currentIndex];
            const duration = status.mediaType === 'video' ? 30000 : 5000;

            // Mark as viewed if not my status
            const statusCreatorId = (status.user._id || status.user)?.toString();
            if (statusCreatorId !== currentUserId) {
                markStatusAsViewed(status._id);
            }

            // Start animation
            progressAnim.setValue(0);
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: duration,
                useNativeDriver: false,
            }).start();

            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                nextStatus();
            }, duration);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            progressAnim.stopAnimation();
        };
    }, [currentIndex, viewingStatuses, isViewerOpen]);

    const markStatusAsViewed = async (statusId: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            fetch(`${API_BASE_URL}/api/status/${statusId}/view`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error marking status as viewed:", error);
        }
    };

    const nextStatus = () => {
        if (currentIndex < viewingStatuses.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // End of current user's statuses - try next user
            const currentGroupIndex = groupedStatuses.findIndex(g => g.user._id === viewingUser?._id);
            if (currentGroupIndex !== -1 && currentGroupIndex < groupedStatuses.length - 1) {
                const nextGroup = groupedStatuses[currentGroupIndex + 1];
                openViewer(nextGroup.user, nextGroup.statuses);
            } else {
                closeViewer();
            }
        }
    };

    const prevStatus = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        } else {
            // Try previous user? For now just stay on first status or close
            const currentGroupIndex = groupedStatuses.findIndex(g => g.user._id === viewingUser?._id);
            if (currentGroupIndex > 0) {
                const prevGroup = groupedStatuses[currentGroupIndex - 1];
                setViewingUser(prevGroup.user);
                setViewingStatuses(prevGroup.statuses);
                setCurrentIndex(prevGroup.statuses.length - 1);
            }
        }
    };

    const closeViewer = () => {
        setIsViewerOpen(false);
        setViewingUser(null);
        setViewingStatuses([]);
        setCurrentIndex(0);
        setShowViewersList(false);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const openViewer = (user: any, statuses: any[]) => {
        setViewingUser(user);
        setViewingStatuses(statuses);
        setCurrentIndex(0);
        setIsViewerOpen(true);
    };

    const uploadStatus = async (uri: string, type: 'image' | 'video') => {
        try {
            setUploading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const formData = new FormData();
            const filename = uri.split('/').pop() || (type === 'video' ? 'status.mp4' : 'status.jpg');

            // @ts-ignore
            formData.append('file', {
                uri,
                type: type === 'video' ? 'video/mp4' : 'image/jpeg',
                name: filename,
            });

            if (Platform.OS === 'web') {
                const res = await fetch(uri);
                const blob = await res.blob();
                formData.set('file', blob, filename);
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            console.log('Upload response status:', uploadRes.status);

            if (!uploadRes.ok) {
                const errorText = await uploadRes.text();
                console.error('Upload failed with status:', uploadRes.status, errorText);
                throw new Error(`File upload failed: ${uploadRes.status}`);
            }
            const uploadData = await uploadRes.json();
            const mediaUrl = uploadData.imageUrl;

            const statusRes = await fetch(`${API_BASE_URL}/api/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    mediaUrl,
                    mediaType: type,
                    caption: ''
                })
            });

            if (statusRes.ok) {
                fetchStatuses();
            } else {
                Alert.alert("Error", "Failed to update status");
            }
        } catch (error: any) {
            console.error("Upload status error:", error);
            console.error("API_BASE_URL:", API_BASE_URL);
            console.error("Error details:", error.message, error.stack);
            Alert.alert("Upload Error", `Failed to upload status: ${error.message || 'Network request failed'}\n\nPlease check if backend is running.`);
        } finally {
            setUploading(false);
        }
    };

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 0.7,
            videoMaxDuration: 30,
            allowsMultipleSelection: true,
        });

        if (!result.canceled && result.assets) {
            for (const asset of result.assets) {
                const type = asset.type === 'video' ? 'video' : 'image';
                await uploadStatus(asset.uri, type);
            }
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const currentStatus = viewingStatuses[currentIndex];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                {isSearching ? (
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => { setIsSearching(false); handleSearch(""); }}>
                            <IconSymbol name="arrow.left" size={24} color={theme.headerTintColor} />
                        </TouchableOpacity>
                        <TextInput
                            style={{
                                flex: 1,
                                marginLeft: 16,
                                fontSize: 18,
                                color: theme.headerTintColor,
                                ...Platform.select({ web: { outlineStyle: 'none' } as any })
                            }}
                            placeholder="Search status..."
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            autoFocus
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>
                ) : (
                    <>
                        <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Updates</Text>
                        <View style={styles.headerIcons}>
                            <TouchableOpacity onPress={pickMedia} disabled={uploading}>
                                {uploading ? <ActivityIndicator color={theme.headerTintColor} /> : <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsSearching(true)}>
                                <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowMenu(true)}>
                                <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>

            {/* Custom Menu Modal */}
            <Modal
                transparent={true}
                visible={showMenu}
                onRequestClose={() => setShowMenu(false)}
                animationType="fade"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMenu(false)}
                >
                    <View style={[styles.menuContainer, { backgroundColor: theme.background }]}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMenu(false);
                                router.push('/status/privacy' as any);
                            }}
                        >
                            <Text style={[styles.menuText, { color: theme.text }]}>Status privacy</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.updatesSectionTitle, { color: theme.text }]}>Status</Text>
                    <TouchableOpacity
                        style={styles.myStatus}
                        onPress={myStatuses.length > 0 ? () => openViewer({ name: "My Status" }, myStatuses) : pickMedia}
                        disabled={uploading}
                    >
                        <SegmentedRing count={myStatuses.length} viewedCount={myStatuses.filter(s => s.viewedBy.length > 0).length} theme={theme} size={54}>
                            {myStatuses.length > 0 ? (
                                <Image
                                    source={{ uri: getInternalUri(myStatuses[myStatuses.length - 1].mediaUrl) }}
                                    style={{ width: 44, height: 44, borderRadius: 22 }}
                                    contentFit="cover"
                                />
                            ) : (
                                <>
                                    <IconSymbol name="person.fill" size={30} color="#fff" />
                                    <View style={styles.addIcon}>
                                        <IconSymbol name="plus" size={12} color="#fff" />
                                    </View>
                                </>
                            )}
                        </SegmentedRing>
                        <View style={{ marginLeft: myStatuses.length > 0 ? 16 : 0 }}>
                            <Text style={[styles.sectionItemTitle, { color: theme.text }]}>My Status</Text>
                            <Text style={styles.sectionItemSubtitle}>
                                {uploading ? "Uploading..." : (myStatuses.length > 0 ? "Tap to view your status" : "Tap to add status update")}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={styles.section}>
                    <Text style={[styles.updatesSectionTitle, { color: theme.text }]}>Recent updates</Text>
                    {loading && <ActivityIndicator color="#008069" />}

                    {filteredGroupedStatuses.map((group, i) => (
                        <TouchableOpacity key={group.user?._id || i} style={styles.statusItem} onPress={() => openViewer(group.user, group.statuses)}>
                            <SegmentedRing count={group.statuses.length} viewedCount={group.statuses.filter((s: any) => s.viewedBy.some((v: any) => (v._id || v).toString() === currentUserId)).length} theme={theme}>
                                <View style={[styles.statusAvatar, { overflow: 'hidden' }]}>
                                    {group.user?.profilePic ? (
                                        <Image source={{ uri: getInternalUri(group.user.profilePic) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                    ) : (
                                        <IconSymbol name="person.fill" size={25} color="#fff" />
                                    )}
                                </View>
                            </SegmentedRing>
                            <View>
                                <Text style={[styles.sectionItemTitle, { color: theme.text }]}>{group.user?.name || "Unknown User"}</Text>
                                <Text style={styles.sectionItemSubtitle}>{formatTime(group.latestTime)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {filteredGroupedStatuses.length === 0 && !loading && (
                        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No recent updates</Text>
                    )}
                </View>
            </ScrollView>
            <View style={[styles.fab, { backgroundColor: theme.tint, bottom: 65 + insets.bottom }]}>
                <TouchableOpacity onPress={pickMedia}>
                    <IconSymbol name="camera" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Status Viewer Modal */}
            <Modal visible={isViewerOpen} transparent={true} animationType="fade" onRequestClose={closeViewer}>
                <View style={styles.viewerContainer}>
                    <View style={styles.viewerInner}>
                        {/* Progress Bars */}
                        <View style={styles.progressBarContainer}>
                            {viewingStatuses.map((_, index) => (
                                <View key={index} style={styles.progressBarBackground}>
                                    <Animated.View style={[
                                        styles.progressBarFill,
                                        {
                                            width: index < currentIndex ? '100%' : (index === currentIndex ? progressAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%']
                                            }) : '0%')
                                        }
                                    ]} />
                                </View>
                            ))}
                        </View>

                        <SafeAreaView style={{ flex: 1 }}>
                            <View style={styles.viewerHeader}>
                                <TouchableOpacity onPress={closeViewer} style={{ padding: 10 }}>
                                    <IconSymbol name="arrow.left" size={24} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.viewerName}>{viewingUser?.name}</Text>
                            </View>

                            {/* Navigation Areas */}
                            <TouchableOpacity
                                style={[styles.viewerNav, styles.viewerNavLeft]}
                                onPress={prevStatus}
                            />
                            <TouchableOpacity
                                style={[styles.viewerNav, styles.viewerNavRight]}
                                onPress={nextStatus}
                            />

                            <View style={styles.viewerContent}>
                                {currentStatus?.mediaType === 'video' ? (
                                    <Video
                                        ref={videoRef}
                                        style={styles.viewerMedia}
                                        source={{ uri: getInternalUri(currentStatus.mediaUrl) }}
                                        useNativeControls={false}
                                        resizeMode={ResizeMode.CONTAIN}
                                        isLooping={false}
                                        shouldPlay
                                        onPlaybackStatusUpdate={(status: any) => {
                                            if (status.didJustFinish) {
                                                nextStatus();
                                            }
                                        }}
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: getInternalUri(currentStatus?.mediaUrl) }}
                                        style={styles.viewerMedia}
                                        contentFit="contain"
                                    />
                                )}
                                {currentStatus?.caption ? <Text style={styles.viewerCaption}>{currentStatus.caption}</Text> : null}
                            </View>

                            {/* View Stats for My Status */}
                            {(currentStatus?.user?._id || currentStatus?.user)?.toString() === currentUserId && (
                                <TouchableOpacity
                                    style={styles.viewStatsContainer}
                                    onPress={() => setShowViewersList(true)}
                                >
                                    <View style={styles.viewStats}>
                                        <IconSymbol name="eye" size={18} color="#fff" />
                                        <Text style={styles.viewCountText}>{currentStatus?.viewedBy?.length || 0}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </SafeAreaView>
                    </View>

                    {/* Viewers List Overlay (Instead of Nested Modal) */}
                    {showViewersList && (
                        <TouchableOpacity
                            style={styles.viewersModalContainer}
                            activeOpacity={1}
                            onPress={() => setShowViewersList(false)}
                        >
                            <TouchableOpacity
                                style={[styles.viewersContent, { backgroundColor: theme.background }]}
                                activeOpacity={1}
                            >
                                <View style={styles.viewersHeader}>
                                    <Text style={[styles.viewersTitle, { color: theme.text }]}>Viewed by {currentStatus?.viewedBy?.length || 0}</Text>
                                    <TouchableOpacity onPress={() => setShowViewersList(false)}>
                                        <IconSymbol name="xmark" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView>
                                    {(currentStatus?.viewedBy || []).map((viewer: any, idx: number) => (
                                        <View key={viewer._id || idx} style={styles.viewerItem}>
                                            <View style={styles.viewerAvatar}>
                                                {viewer.profilePic ? (
                                                    <Image source={{ uri: getInternalUri(viewer.profilePic) }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                                                ) : (
                                                    <IconSymbol name="person.fill" size={20} color="#fff" />
                                                )}
                                            </View>
                                            <Text style={[styles.viewerListItemName, { color: theme.text }]}>{viewer.name}</Text>
                                        </View>
                                    ))}
                                    {(!currentStatus?.viewedBy || currentStatus.viewedBy.length === 0) && (
                                        <View style={{ padding: 40, alignItems: 'center' }}>
                                            <Text style={{ color: '#888' }}>No views yet</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}

                </View>
            </Modal>
        </SafeAreaView>
    );
}
