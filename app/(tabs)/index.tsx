import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { onUserLogin } from '@/services/CallingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch chats and user info when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchChats();
      loadUser();
    }, [])
  );

  const loadUser = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (userInfo) {
        const user = JSON.parse(userInfo);
        setCurrentUserId(user._id);
        // Initialize Calling Service
        onUserLogin(user._id, user.name);
      }
    } catch (error) {
      console.log("Error loading user:", error);
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setChats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getChatName = (chat: any) => {
    if (chat.isGroupChat) return chat.chatName;
    if (!currentUserId || !chat.users) return "Unknown";
    // Find the user who is NOT the current user
    const otherUser = chat.users.find((u: any) => u._id !== currentUserId);
    return otherUser ? otherUser.name : "Unknown User";
  };

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: Colors[colorScheme].background }])}>
      <View style={StyleSheet.flatten([styles.header, { backgroundColor: Colors[colorScheme].headerBackground }])}>
        <Text style={StyleSheet.flatten([styles.headerTitle, { color: Colors[colorScheme].headerTintColor }])}>WhatsApp</Text>
        <View style={styles.headerIcons}>
          <Link href={"/qrcode" as any} asChild>
            <Pressable>
              <IconSymbol name="qrcode" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
            </Pressable>
          </Link>
          <IconSymbol name="camera" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
          <IconSymbol name="magnifyingglass" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
          <Link href="/settings" asChild>
            <Pressable>
              <IconSymbol name="ellipsis" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
            </Pressable>
          </Link>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#008069" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item: any) => item._id}
          extraData={currentUserId}
          renderItem={({ item }) => {
            const chatName = getChatName(item);
            const isLatestMessageMyOwn = item.latestMessage && (
              String(item.latestMessage.sender._id) === String(currentUserId) ||
              String(item.latestMessage.sender) === String(currentUserId)
            );

            return (
              <Link href={{ pathname: '/chat/[id]', params: { id: item._id, name: chatName, profilePic: item.users.find((u: any) => u._id !== currentUserId)?.profilePic, otherUserId: item.users.find((u: any) => u._id !== currentUserId)?._id } }} asChild>
                <Pressable>
                  <View style={styles.chatItem}>
                    <View style={styles.avatar}>
                      {/* Show other user profile pic if available */}
                      {(() => {
                        if (item.isGroupChat) {
                          return <IconSymbol name="person.2.fill" size={30} color="#fff" />;
                        }
                        const otherUser = item.users.find((u: any) => u._id !== currentUserId);
                        return otherUser?.profilePic ? (
                          <RNImage
                            source={{ uri: otherUser.profilePic }}
                            style={{ width: 50, height: 50, borderRadius: 25 }}
                          />
                        ) : (
                          <IconSymbol name="person.fill" size={30} color="#fff" />
                        );
                      })()}
                    </View>
                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeader}>
                        <Text style={StyleSheet.flatten([styles.name, { color: Colors[colorScheme].text }])}>{chatName}</Text>
                        <Text style={StyleSheet.flatten([styles.time, { color: '#666' }])}>
                          {item.latestMessage ? new Date(item.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </Text>
                      </View>
                      <View style={styles.chatFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          {isLatestMessageMyOwn && (
                            <IconSymbol
                              name={item.latestMessage.status === 'sent' ? 'checkmark' : 'checkmark.double'}
                              size={16}
                              color={item.latestMessage.status === 'read' ? '#34B7F1' : '#888'}
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <Text numberOfLines={1} style={styles.lastMessage}>
                            {item.latestMessage ? (
                              item.latestMessage.type === 'audio' ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <IconSymbol name="mic" size={16} color="#888" style={{ marginRight: 4 }} />
                                  <Text style={{ color: '#888' }}>
                                    {(() => {
                                      const duration = item.latestMessage.duration || 0;
                                      const mins = Math.floor(duration / 60);
                                      const secs = duration % 60;
                                      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                                    })()}
                                  </Text>
                                </View>
                              ) : (
                                item.latestMessage.content
                              )
                            ) : "No messages yet"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
      <Link href="/meta-ai" asChild>
        <Pressable style={styles.aiFab}>
          <IconSymbol name="sparkles" size={24} color="#fff" />
        </Pressable>
      </Link>
      <Link href="/chat/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { backgroundColor: Colors[colorScheme].tint }])}>
          <IconSymbol name="plus.message.fill" size={24} color="#fff" />
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

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
  chatItem: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  chatInfo: {
    flex: 1,
    paddingBottom: 12, // For separator effect visual only
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
  },
  lastMessage: {
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  aiFab: {
    position: 'absolute',
    right: 24, // Slightly smaller or aligned
    bottom: 90, // Positioned above the main FAB
    width: 48,
    height: 48,
    borderRadius: 24,
    // backgroundColor: 'transparent', // Using a gradient usually, but here solid or image
    // For Meta AI, it often looks like a rainbow circle or blue/purple
    // Let's use a nice distinct color for now, maybe a deep purple or blue
    // Or we can try to make it look like the multi-color ring if possible, but simple for now:
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#615EF0', // Example Meta AI-ish color
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 10,
  },
});
