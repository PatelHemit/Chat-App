import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DUMMY_CHATS = [
  { id: '1', name: 'Alice', lastMessage: 'Hey there!', time: '10:30 AM', unread: 0 },
  { id: '2', name: 'Bob', lastMessage: 'See you tomorrow.', time: 'Yesterday', unread: 0 },
  { id: '3', name: 'Charlie', lastMessage: 'How are you?', time: 'Tuesday', unread: 0 },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      <View style={[styles.header, { backgroundColor: Colors[colorScheme].headerBackground }]}>
        <Text style={[styles.headerTitle, { color: Colors[colorScheme].headerTintColor }]}>WhatsApp</Text>
        <View style={styles.headerIcons}>
          <Link href={"/qrcode" as any} asChild>
            <Pressable>
              <IconSymbol name="qrcode" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
            </Pressable>
          </Link>
          <IconSymbol name="camera" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
          <IconSymbol name="magnifyingglass" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
          <IconSymbol name="ellipsis" size={24} color={Colors[colorScheme].headerTintColor} style={styles.icon} />
        </View>
      </View>

      <FlatList
        data={DUMMY_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/chat/[id]', params: { id: item.id, name: item.name } }} asChild>
            <Pressable>
              <View style={styles.chatItem}>
                <View style={styles.avatar}>
                  <IconSymbol name="person.fill" size={30} color="#fff" />
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={[styles.name, { color: Colors[colorScheme].text }]}>{item.name}</Text>
                    <Text style={[styles.time, { color: item.unread > 0 ? Colors[colorScheme].tint : '#666' }]}>{item.time}</Text>
                  </View>
                  <View style={styles.chatFooter}>
                    <Text numberOfLines={1} style={styles.lastMessage}>{item.lastMessage}</Text>
                    {item.unread > 0 && (
                      <View style={[styles.badge, { backgroundColor: Colors[colorScheme].tint }]}>
                        <Text style={styles.badgeText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          </Link>
        )}
      />
      <View style={[styles.fab, { backgroundColor: Colors[colorScheme].tint }]}>
        <IconSymbol name="plus.message.fill" size={24} color="#fff" />
      </View>
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
});
