import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Lazy load native modules to prevent crashes if they are missing
let Sharing: any = null;
try {
    Sharing = require('expo-sharing');
} catch (e) {
    console.log("Sharing module not found");
}

type TabType = 'Media' | 'Docs' | 'Links';

export default function SharedMediaScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const { width } = useWindowDimensions();

    const [activeTab, setActiveTab] = useState<TabType>('Media');
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        fetchChatMessages();
    }, [id]);

    const fetchChatMessages = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(`${API_BASE_URL}/api/message/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.reverse()); // Newest first
            }
        } catch (error) {
            console.error("Error fetching shared media:", error);
        } finally {
            setLoading(false);
        }
    };

    const mediaList = messages.filter(m => m.type === 'image' || m.type === 'video');
    const docsList = messages.filter(m => m.type === 'document');
    const linksList = messages.filter(m => {
        if (m.type !== 'text') return false;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return urlRegex.test(m.content);
    });

    const renderMediaItem = ({ item }: { item: any }) => {
        const itemWidth = width / 3 - 2;
        const uri = getUri(item);
        const isImage = item.type === 'image' || (item.content && item.content.match(/\.(jpeg|jpg|gif|png)$/i));

        return (
            <TouchableOpacity
                style={[styles.mediaItem, { width: itemWidth, height: itemWidth }]}
                onPress={() => {
                    if (uri) {
                        Linking.openURL(uri);
                    }
                }}
            >
                {isImage ? (
                    <Image source={{ uri }} style={styles.mediaImage} />
                ) : (
                    <View style={styles.videoPlaceholder}>
                        <IconSymbol name="play.fill" size={30} color="#fff" />
                        {!!item.duration && (
                            <Text style={styles.durationText}>
                                {Math.floor(item.duration / 1000)}s
                            </Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const getUri = (item: any) => {
        const raw = item.fileUrl || item.content;
        return raw ? getInternalUri(raw) : '';
    };

    const handleOpenDoc = async (item: any) => {
        const uri = getUri(item);
        if (!uri) return;

        try {
            if ((Platform.OS as any) === 'web') {
                Linking.openURL(uri);
                return;
            }

            const pathParts = uri.split('?')[0].split('/');
            const nameFromUrl = pathParts[pathParts.length - 1];
            const fileExt = item.fileMetadata?.name?.split('.').pop() || nameFromUrl.split('.').pop() || 'bin';
            const localUri = `${FileSystem.cacheDirectory}${item._id}.${fileExt}`;

            if (Platform.OS === 'android') ToastAndroid.show("Opening document...", ToastAndroid.SHORT);

            const downloadResult = await FileSystem.downloadAsync(uri, localUri);

            const isSharingAvailable = await (async () => {
                try {
                    return Sharing && typeof Sharing.isAvailableAsync === 'function' && await Sharing.isAvailableAsync();
                } catch {
                    return false;
                }
            })();

            if (isSharingAvailable && Sharing) {
                await Sharing.shareAsync(downloadResult.uri);
            } else {
                Linking.openURL(uri);
            }
        } catch (error) {
            console.error("handleOpenDoc Error:", error);
            if (Platform.OS === 'android') ToastAndroid.show("Failed to open document", ToastAndroid.SHORT);
        }
    };

    const renderDocItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.listItem, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee' }]}
            onPress={() => handleOpenDoc(item)}
        >
            <View style={styles.docIcon}>
                <IconSymbol name="doc.fill" size={24} color="#888" />
            </View>
            <View style={styles.listContent}>
                <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.fileMetadata?.name || "Document"}
                </Text>
                <Text style={styles.listSubtitle}>
                    {item.fileMetadata?.size ? `${(item.fileMetadata.size / 1024).toFixed(1)} KB` : "Document File"} • {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderLinkItem = ({ item }: { item: any }) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = item.content.match(urlRegex);
        if (!urls) return null;

        return (
            <TouchableOpacity
                style={[styles.listItem, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee' }]}
                onPress={() => Linking.openURL(urls[0])}
            >
                <View style={styles.linkIcon}>
                    <IconSymbol name="link" size={24} color="#008069" />
                </View>
                <View style={styles.listContent}>
                    <Text style={[styles.listTitle, { color: theme.text }]} numberOfLines={2}>
                        {urls[0]}
                    </Text>
                    <Text style={styles.listSubtitle}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#008069" />
                </View>
            );
        }

        switch (activeTab) {
            case 'Media':
                return (
                    <FlatList
                        key="media-list"
                        data={mediaList}
                        renderItem={renderMediaItem}
                        keyExtractor={item => item._id}
                        numColumns={3}
                        contentContainerStyle={styles.gridContainer}
                        ListEmptyComponent={<EmptyState message="No media found" theme={theme} />}
                    />
                );
            case 'Docs':
                return (
                    <FlatList
                        key="docs-list"
                        data={docsList}
                        renderItem={renderDocItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={<EmptyState message="No documents found" theme={theme} />}
                    />
                );
            case 'Links':
                return (
                    <FlatList
                        key="links-list"
                        data={linksList}
                        renderItem={renderLinkItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContainer}
                        ListEmptyComponent={<EmptyState message="No links found" theme={theme} />}
                    />
                );
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
            <Stack.Screen options={{ title: 'Media, links and docs' }} />

            <View style={[styles.tabBar, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#eee' }]}>
                {(['Media', 'Docs', 'Links'] as TabType[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[
                            styles.tabItem,
                            activeTab === tab && { borderBottomColor: '#008069', borderBottomWidth: 3 }
                        ]}
                    >
                        <Text style={[
                            styles.tabText,
                            { color: activeTab === tab ? '#008069' : '#888' },
                            activeTab === tab && { fontWeight: 'bold' }
                        ]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {renderContent()}
        </SafeAreaView>
    );
}

function EmptyState({ message, theme }: { message: string, theme: any }) {
    return (
        <View style={styles.emptyContainer}>
            <Text style={{ color: '#888', fontSize: 16 }}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabBar: {
        flexDirection: 'row',
        height: 50,
        borderBottomWidth: 1,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabText: { fontSize: 16 },
    gridContainer: { padding: 1 },
    mediaItem: { margin: 1, backgroundColor: '#eee' },
    mediaImage: { width: '100%', height: '100%' },
    videoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center'
    },
    durationText: { color: '#fff', fontSize: 10, marginTop: 4 },
    listContainer: { paddingVertical: 10 },
    listItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    docIcon: {
        width: 40,
        height: 40,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    linkIcon: {
        width: 40,
        height: 40,
        backgroundColor: '#e6fffa',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    listContent: { flex: 1 },
    listTitle: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
    listSubtitle: { fontSize: 12, color: '#888' },
    emptyContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
