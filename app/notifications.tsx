import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface Notification {
    _id: string;
    type: string;
    content: string;
    isRead: boolean;
    createdAt: string;
    sender?: {
        _id: string;
        name: string;
        profilePic: string;
    };
    chat?: {
        _id: string;
        chatName: string;
    };
}

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/notification`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/notification/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleNotificationPress = async (notification: Notification) => {
        // Mark as read
        if (!notification.isRead) {
            await markAsRead(notification._id);
        }

        // Navigate based on notification type
        if (notification.type === 'group_add' && notification.chat) {
            router.push(`/chat/${notification.chat._id}`);
        } else if (notification.type === 'missed_call' && notification.sender) {
            // Could navigate to call history or chat with sender
            console.log('Navigate to call history');
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'group_add':
                return '👥';
            case 'missed_call':
                return '📞';
            case 'friend_request':
                return '👋';
            case 'system_alert':
                return '⚠️';
            default:
                return '🔔';
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <Pressable
            style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.content}>{item.content}</Text>
                <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <Stack.Screen options={{ title: 'Notifications' }} />
                <ActivityIndicator size="large" color="#25D366" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Notifications' }} />
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item._id}
                contentContainerStyle={notifications.length === 0 && styles.emptyContainer}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🔔</Text>
                        <Text style={styles.emptyText}>No notifications yet</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        alignItems: 'center',
    },
    unreadNotification: {
        backgroundColor: '#f0f8ff',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 20,
    },
    contentContainer: {
        flex: 1,
    },
    content: {
        fontSize: 14,
        color: '#000',
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 12,
        color: '#666',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#25D366',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});
