import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { onUserLogin } from '@/services/CallingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, Image as RNImage, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme() ?? 'light';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync filteredChats when chats update
  useEffect(() => {
    if (!searchQuery) {
      setFilteredChats(chats);
    } else {
      handleSearch(searchQuery);
    }
  }, [chats]);

  // Fetch chats and user info when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchChats();
      loadUser();
      checkPushRegistration();
    }, [])
  );

  const checkPushRegistration = async () => {
    // Redundant: handled in _layout.tsx
  };

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

      // Add timestamp to prevent caching on Web
      const response = await fetch(`${API_BASE_URL}/api/chat?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      console.log(`[HomeScreen] Fetched ${data?.length} chats`);

      if (Array.isArray(data)) {
        setChats(data);
        setFilteredChats(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatPress = async (chat: any) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: chat._id,
        name: getChatName(chat),
        profilePic: chat.users.find((u: any) => u._id !== currentUserId)?.profilePic,
        otherUserId: chat.isGroupChat ? undefined : chat.users.find((u: any) => u._id !== currentUserId)?._id
      }
    });
  };

  // Socket setup for home screen real-time updates
  useEffect(() => {
    if (!currentUserId) return;

    const { io } = require('socket.io-client');
    const { SOCKET_URL } = require('@/config/api');

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('[Home] Connected to socket, id:', socket.id);
      socket.emit('setup', { _id: currentUserId });
    });

    socket.on('connected', () => {
      console.log('[Home] Setup SUCCESS (connected event received)');
    });

    socket.on('message received', (newMessage: any) => {
      console.log('[Home] New message received:', newMessage);
      const senderId = newMessage.sender?._id || newMessage.sender;
      const isFromMe = String(senderId) === String(currentUserId);

      setChats(prevChats => {
        const updatedChats = prevChats.map(chat => {
          if (chat._id === newMessage.chat._id) {
            return {
              ...chat,
              latestMessage: newMessage,
              unreadCount: isFromMe ? (chat.unreadCount || 0) : (chat.unreadCount || 0) + 1
            };
          }
          return chat;
        });

        const chatIndex = updatedChats.findIndex(c => c._id === newMessage.chat._id);
        if (chatIndex > -1) {
          const [chat] = updatedChats.splice(chatIndex, 1);
          updatedChats.unshift(chat);
        } else {
          fetchChats();
        }
        return updatedChats;
      });
    });

    socket.on('message-status-updated', ({ messageId, status }: any) => {
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.latestMessage && chat.latestMessage._id === messageId) {
            return {
              ...chat,
              latestMessage: { ...chat.latestMessage, status }
            };
          }
          return chat;
        });
      });
    });

    socket.on('messages-read', ({ chatId, userId }: any) => {
      console.log('[Home] messages-read event:', chatId, userId);
      // If WE are the ones who read the messages (or someone else in 1-on-1)
      // Reset the local count to 0 for that chat
      if (String(userId) === String(currentUserId)) {
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat._id === chatId) {
              return { ...chat, unreadCount: 0 };
            }
            return chat;
          });
        });
      }
    });

    socket.on('user-online', (userId: string) => {
      console.log('[Home] User online:', userId);
      // Optional: update online status in UI
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredChats(chats);
      return;
    }

    const filtered = chats.filter((chat: any) => {
      const chatName = getChatName(chat).toLowerCase();
      return chatName.includes(query.toLowerCase());
    });
    setFilteredChats(filtered);
  };

  const openCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        // Navigate to contact selection with the image
        router.push({ pathname: '/chat/new', params: { imageUri } });
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera');
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
        {isSearching ? (
          <View style={styles.searchBar}>
            <TouchableOpacity onPress={() => { setIsSearching(false); handleSearch(""); }}>
              <IconSymbol name="arrow.left" size={24} color={Colors[colorScheme].headerTintColor} />
            </TouchableOpacity>
            <TextInput
              style={[styles.searchInput, { color: Colors[colorScheme].headerTintColor }]}
              placeholder="Search..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              autoFocus
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        ) : (
          <>
            <Text style={StyleSheet.flatten([styles.headerTitle, { color: Colors[colorScheme].headerTintColor }])}>
              WhatsApp
            </Text>
            <View style={styles.headerIcons}>
              <Link href={"/qrcode" as any} asChild>
                <Pressable>
                  <IconSymbol name="qrcode" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
                </Pressable>
              </Link>
              <TouchableOpacity onPress={openCamera}>
                <IconSymbol name="camera" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/chat/new')}>
                <IconSymbol name="magnifyingglass" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
              </TouchableOpacity>
              <Link href="/settings" asChild>
                <Pressable>
                  <IconSymbol name="ellipsis" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
                </Pressable>
              </Link>
            </View>
          </>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#008069" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item: any) => item._id}
          extraData={currentUserId}
          renderItem={({ item }) => {
            const chatName = getChatName(item);
            const isLatestMessageMyOwn = item.latestMessage && (
              String(item.latestMessage.sender._id) === String(currentUserId) ||
              String(item.latestMessage.sender) === String(currentUserId)
            );

            const isMuted = item.mutedBy?.some((m: any) => {
              const userId = m.user._id ? m.user._id.toString() : m.user.toString();
              return userId === String(currentUserId) && (!m.mutedUntil || new Date(m.mutedUntil) > new Date());
            });

            return (
              <TouchableOpacity onPress={() => handleChatPress(item)}>
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
                      <Text style={StyleSheet.flatten([styles.time, { color: (item.unreadCount > 0) ? Colors[colorScheme].tint : '#666', fontWeight: (item.unreadCount > 0) ? '500' : 'normal' }])}>
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
                        <Text numberOfLines={1} style={[styles.lastMessage, { color: (item.unreadCount > 0 && !isLatestMessageMyOwn) ? (colorScheme === 'dark' ? '#fff' : '#000') : '#666' }]}>
                          {item.latestMessage ? (
                            (() => {
                              const type = item.latestMessage.type;
                              if (type === 'audio') {
                                const duration = item.latestMessage.duration || 0;
                                const totalSeconds = Math.floor(duration / 1000);
                                const mins = Math.floor(totalSeconds / 60);
                                const secs = totalSeconds % 60;
                                return `🎤 ${mins}:${secs < 10 ? '0' : ''}${secs}`;
                              }
                              if (type === 'image') return "📷 Photo";
                              if (type === 'video') return "🎥 Video";
                              if (type === 'document') return "📄 Document";
                              return item.latestMessage.content;
                            })()
                          ) : "No messages yet"}
                        </Text>
                      </View>
                      {isMuted && (
                        <IconSymbol name="bell.slash" size={16} color="#888" style={{ marginRight: 8 }} />
                      )}
                      {item.unreadCount > 0 && (
                        <View style={StyleSheet.flatten([styles.badge, { backgroundColor: isMuted ? '#888' : Colors[colorScheme].tint }])}>
                          <Text style={styles.badgeText}>{item.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
      <Link href="/meta-ai" asChild>
        <Pressable style={StyleSheet.flatten([styles.aiFab, { bottom: 125 + insets.bottom, right: 24 }])}>
          <IconSymbol name="sparkles" size={20} color="#fff" />
        </Pressable>
      </Link>
      <Link href="/chat/new" asChild>
        <Pressable style={StyleSheet.flatten([styles.fab, { bottom: 62 + insets.bottom, right: 20 }])}>
          <IconSymbol name="message.fill" size={24} color="#fff" />
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 16,
    fontSize: 18,
    borderWidth: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#008069',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  aiFab: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: '#615EF0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
  },
});
