import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SectionList,
    StyleSheet,
    Text,
    View
} from 'react-native';

export default function MessageInfoScreen() {
    const { messageId } = useLocalSearchParams<{ messageId: string }>();
    const [loading, setLoading] = useState(true);
    const [messageInfo, setMessageInfo] = useState<any>(null);
    const colorScheme = useColorScheme();
    const router = useRouter();

    useEffect(() => {
        fetchMessageInfo();
    }, [messageId]);

    const fetchMessageInfo = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const res = await fetch(`${API_BASE_URL}/api/message/info/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setMessageInfo(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#00A884" />
            </View>
        );
    }

    if (!messageInfo) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text>Message not found</Text>
            </View>
        );
    }

    const readByUsers = messageInfo.readBy || [];
    const deliveredToUsers = messageInfo.deliveredTo || [];
    // Only show in 'Delivered' if NOT already in 'Read'
    const notReadYet = deliveredToUsers.filter((d: any) => !readByUsers.some((r: any) => r.user._id === d.user._id));

    const sections = [
        {
            title: 'Read by',
            data: readByUsers,
            icon: 'checkmark.seal.fill',
            color: '#34B7F1'
        },
        {
            title: 'Delivered to',
            data: notReadYet,
            icon: 'checkmark',
            color: '#888'
        }
    ];

    const renderItem = ({ item, section }: { item: any, section: any }) => (
        <View style={styles.userItem}>
            <Image
                source={{ uri: getInternalUri(item.user.profilePic) || 'https://via.placeholder.com/50' }}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                    {item.user.name || item.user.phone}
                </Text>
                <Text style={styles.userTime}>
                    {new Date(section.title === 'Read by' ? item.readAt : item.deliveredAt).toLocaleString([], {
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short'
                    })}
                </Text>
            </View>
            <IconSymbol name={section.icon} size={18} color={section.color} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#121b22' : '#f0f2f5' }]}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Message Info',
                headerStyle: { backgroundColor: colorScheme === 'dark' ? '#202c33' : '#fff' },
                headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
            }} />

            {/* Message Preview */}
            <View style={[styles.previewContainer, { backgroundColor: colorScheme === 'dark' ? '#202c33' : '#fff' }]}>
                <View style={[styles.messageBubble, { backgroundColor: '#d9fdd3' }]}>
                    <Text style={styles.messageText}>{messageInfo.content || "Media Message"}</Text>
                    <Text style={styles.messageTime}>
                        {new Date(messageInfo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.user._id}
                renderItem={renderItem}
                renderSectionHeader={({ section: { title, data } }) => {
                    if (data.length === 0) return null;
                    return (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{title}</Text>
                        </View>
                    );
                }}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListHeaderComponent={() => <View style={{ height: 10 }} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    previewContainer: {
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    messageBubble: {
        padding: 10,
        borderRadius: 8,
        maxWidth: '85%',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    messageText: {
        fontSize: 16,
        color: '#000',
    },
    messageTime: {
        fontSize: 11,
        color: '#667781',
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'transparent',
    },
    avatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
    },
    userInfo: {
        flex: 1,
        marginLeft: 15,
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
    },
    userTime: {
        fontSize: 13,
        color: '#8696a0',
        marginTop: 2,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginLeft: 75,
    },
    sectionHeader: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#00A884',
        textTransform: 'uppercase',
    }
});
