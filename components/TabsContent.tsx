import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        bottom: 20,
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
    viewerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
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
        bottom: 20,
    },
});

export function CallsContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Calls</Text>
                <View style={styles.headerIcons}>
                    <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                </View>
            </View>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent</Text>
                    {/* Dummy Calls */}
                    {['Alice', 'Bob', 'Charlie'].map((name, i) => (
                        <View key={i} style={styles.callItem}>
                            <View style={styles.avatar}>
                                <IconSymbol name="person.fill" size={25} color="#fff" />
                            </View>
                            <View style={styles.callInfo}>
                                <Text style={[styles.itemName, { color: theme.text }]}>{name}</Text>
                                <View style={styles.callMeta}>
                                    <IconSymbol name={i % 2 === 0 ? "video" : "phone"} size={14} color={i % 2 === 0 ? "red" : "green"} />
                                    <Text style={styles.itemDate}> Today, 10:0{i + 1} AM</Text>
                                </View>
                            </View>
                            <IconSymbol name={i % 2 === 0 ? "video" : "phone"} size={24} color="#008069" />
                        </View>
                    ))}
                </View>
            </ScrollView>
            <View style={[styles.fab, { backgroundColor: theme.tint }]}>
                <IconSymbol name="phone" size={24} color="#fff" />
            </View>
        </SafeAreaView>
    );
}

export function CommunitiesContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Communities</Text>
                <View style={styles.headerIcons}>
                    <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                </View>
            </View>

            <View style={styles.content}>
                <View style={[styles.image, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }]}>
                    <FontAwesome name="users" size={100} color="#008069" />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Stay connected with a community</Text>
                <Text style={styles.subtitle}>Communities bring members together in topic-based groups, and make it easy to get admin announcements. Any community you're added to will appear here.</Text>

                <View style={[styles.button, { backgroundColor: '#008069' }]}>
                    <Text style={styles.buttonText}>Start your community</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

export function UpdatesContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [statuses, setStatuses] = useState<any[]>([]);
    const [myStatuses, setMyStatuses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [viewingStatus, setViewingStatus] = useState<any | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const videoRef = useRef<Video>(null);

    const fetchStatuses = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            const userInfoStr = await AsyncStorage.getItem('userInfo');

            if (!token || !userInfoStr) return;
            const userInfo = JSON.parse(userInfoStr);
            const userId = userInfo._id || userInfo.id;
            setCurrentUserId(userId);

            const response = await fetch(`${API_BASE_URL}/api/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                // Separately filter my statuses and others
                const my = data.filter((s: any) => s.user._id === userId || s.user === userId);
                const others = data.filter((s: any) => s.user._id !== userId && s.user !== userId);

                setMyStatuses(my);
                setStatuses(others);
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

    const uploadStatus = async (uri: string, type: 'image' | 'video') => {
        try {
            setUploading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            // 1. Upload to /api/upload
            const formData = new FormData();
            const filename = uri.split('/').pop() || (type === 'video' ? 'status.mp4' : 'status.jpg');
            // @ts-ignore
            formData.append('file', {
                uri,
                type: type === 'video' ? 'video/mp4' : 'image/jpeg',
                name: filename,
            });

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    // 'Content-Type': 'multipart/form-data', // Do NOT set this manually
                },
            });

            if (!uploadRes.ok) throw new Error("File upload failed");
            const uploadData = await uploadRes.json();
            const mediaUrl = uploadData.imageUrl;

            // 2. Create Status
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
                fetchStatuses(); // Refresh list
            } else {
                Alert.alert("Error", "Failed to update status");
            }

        } catch (error) {
            console.error("Upload status error:", error);
            Alert.alert("Error", "Failed to upload status");
        } finally {
            setUploading(false);
        }
    };

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true, // For images. For videos it might be limited.
            quality: 0.7,
            videoMaxDuration: 30,
        });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const type = asset.type === 'video' ? 'video' : 'image';
            uploadStatus(asset.uri, type);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Updates</Text>
                <View style={styles.headerIcons}>
                    <TouchableOpacity onPress={pickMedia} disabled={uploading}>
                        {uploading ? <ActivityIndicator color={theme.headerTintColor} /> : <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />}
                    </TouchableOpacity>
                    <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                </View>
            </View>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.updatesSectionTitle, { color: theme.text }]}>Status</Text>
                    <TouchableOpacity
                        style={styles.myStatus}
                        onPress={myStatuses.length > 0 ? () => setViewingStatus(myStatuses[0]) : pickMedia}
                        disabled={uploading}
                    >
                        <View style={styles.avatarContainer}>
                            {myStatuses.length > 0 ? (
                                <View style={[styles.statusRing, { borderColor: '#008069', marginRight: 0, width: 54, height: 54 }]}>
                                    <Image
                                        source={{ uri: myStatuses[0].mediaUrl }}
                                        style={{ width: 44, height: 44, borderRadius: 22 }}
                                        contentFit="cover"
                                    />
                                </View>
                            ) : (
                                <>
                                    <IconSymbol name="person.fill" size={30} color="#fff" />
                                    <View style={styles.addIcon}>
                                        <IconSymbol name="plus" size={12} color="#fff" />
                                    </View>
                                </>
                            )}
                        </View>
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

                    {statuses.map((status, i) => (
                        <TouchableOpacity key={status._id || i} style={styles.statusItem} onPress={() => setViewingStatus(status)}>
                            <View style={[styles.statusRing, { borderColor: '#008069' }]}>
                                <View style={[styles.statusAvatar, { overflow: 'hidden' }]}>
                                    {/* Show profile pic of user if available, else standard icon */}
                                    {status.user?.profilePic ? (
                                        <Image source={{ uri: status.user.profilePic }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                    ) : (
                                        <IconSymbol name="person.fill" size={25} color="#fff" />
                                    )}
                                </View>
                            </View>
                            <View>
                                <Text style={[styles.sectionItemTitle, { color: theme.text }]}>{status.user?.name || "Unknown User"}</Text>
                                <Text style={styles.sectionItemSubtitle}>{formatTime(status.createdAt)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    {statuses.length === 0 && !loading && (
                        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No recent updates</Text>
                    )}
                </View>
            </ScrollView>
            <View style={[styles.fab, { backgroundColor: theme.tint }]}>
                <TouchableOpacity onPress={pickMedia}>
                    <IconSymbol name="camera" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Status Viewer Modal */}
            <Modal visible={!!viewingStatus} transparent={true} animationType="fade" onRequestClose={() => setViewingStatus(null)}>
                <View style={styles.viewerContainer}>
                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={styles.viewerHeader}>
                            <TouchableOpacity onPress={() => setViewingStatus(null)} style={{ padding: 10 }}>
                                <IconSymbol name="arrow.left" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.viewerName}>{viewingStatus?.user?.name}</Text>
                        </View>

                        <View style={styles.viewerContent}>
                            {viewingStatus?.mediaType === 'video' ? (
                                <Video
                                    ref={videoRef}
                                    style={styles.viewerMedia}
                                    source={{ uri: viewingStatus.mediaUrl }}
                                    useNativeControls
                                    resizeMode={ResizeMode.CONTAIN}
                                    isLooping
                                    shouldPlay
                                />
                            ) : (
                                <Image
                                    source={{ uri: viewingStatus?.mediaUrl }}
                                    style={styles.viewerMedia}
                                    contentFit="contain"
                                />
                            )}
                            {viewingStatus?.caption ? <Text style={styles.viewerCaption}>{viewingStatus.caption}</Text> : null}
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
