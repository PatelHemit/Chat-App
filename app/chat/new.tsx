import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewChatScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Initial load of all users
    useEffect(() => {
        handleSearch('');
    }, []);

    const handleSearch = async (text: string) => {
        setSearch(text);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`http://localhost:3000/api/user?search=${text}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error(error);
        }
    };

    const accessChat = async (userId: string, userName: string) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId })
            });
            const chat = await response.json();

            // Redirect to chat screen
            router.replace({ pathname: '/chat/[id]', params: { id: chat._id, name: userName } });
        } catch (error) {
            alert("Failed to start chat");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 10 }}>
                    <IconSymbol name="arrow.left" size={24} color={theme.text} />
                </Pressable>
                <Text style={[styles.title, { color: theme.text }]}>Select Contact</Text>
            </View>

            <View style={styles.searchContainer}>
                <IconSymbol name="magnifyingglass" size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput
                    style={StyleSheet.flatten([styles.input, { color: theme.text }])}
                    placeholder="Search name or number..."
                    placeholderTextColor="#999"
                    value={search}
                    onChangeText={handleSearch}
                    autoFocus
                />
            </View>

            {loading && <ActivityIndicator size="large" color="#008069" style={{ marginTop: 20 }} />}

            <FlatList
                data={results}
                keyExtractor={(item: any) => item._id}
                renderItem={({ item }: { item: any }) => (
                    <Pressable onPress={() => accessChat(item._id, item.name)} style={styles.userItem}>
                        <View style={styles.avatar}>
                            <IconSymbol name="person.fill" size={24} color="#fff" />
                        </View>
                        <View>
                            <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
                            <Text style={styles.userPhone}>{item.phone}</Text>
                        </View>
                    </Pressable>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        margin: 10,
        padding: 10,
        borderRadius: 20,
    },
    input: {
        flex: 1,
        fontSize: 16,
        ...Platform.select({
            web: { outlineStyle: 'none' } as any
        })
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    userPhone: {
        color: '#666',
    }
});
