import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { Alert, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from 'expo-router';
import { useCallback, useState } from 'react';

export default function SettingsScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [user, setUser] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadUser();
        }, [])
    );

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem('userInfo');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (e) {
            console.log(e);
        }
    };

    const handleLogout = async () => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm("Are you sure you want to log out?");
            if (confirmed) {
                await performLogout();
            }
        } else {
            Alert.alert(
                "Log Out",
                "Are you sure you want to log out?",
                [
                    {
                        text: "Cancel",
                        style: "cancel"
                    },
                    {
                        text: "Log Out",
                        style: "destructive",
                        onPress: performLogout
                    }
                ]
            );
        }
    };

    const performLogout = async () => {
        try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userInfo');

            console.log("Tokens cleared, navigating to welcome...");

            // Use simple router.replace for Web/Expo Router compatibility
            // This is often more reliable than dispatch reset on web
            router.replace('/auth/welcome');

            // Safety fallback: if router.replace doesn't clear properly on native, 
            // we can keep the dispatch as an alternative if needed, 
            // but router.replace('/auth/welcome') usually works well for authentication flows in Expo Router.
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: "Settings",
                    headerStyle: { backgroundColor: theme.headerBackground },
                    headerTintColor: theme.headerTintColor,
                }}
            />

            <View style={styles.content}>
                <View style={[styles.profileSection, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}>
                    <View style={styles.avatar}>
                        {user?.profilePic ? (
                            <Image
                                source={{ uri: user.profilePic }}
                                style={{ width: 60, height: 60, borderRadius: 30 }}
                            />
                        ) : (
                            <IconSymbol name="person.fill" size={40} color="#fff" />
                        )}
                    </View>
                    <View>
                        <Text style={[styles.name, { color: theme.text }]}>{user?.name || "User"}</Text>
                        <Text style={styles.status}>{user?.email || "Hey there! I am using WhatsApp."}</Text>
                        {/* <Text style={{ fontSize: 10, color: 'red' }}>Debug URL: {user?.profilePic}</Text> */}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}
                    onPress={handleLogout}
                >
                    <IconSymbol name="arrow.right.circle" size={24} color="#F53649" style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 2,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    status: {
        color: '#666',
        fontSize: 14,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 10,
        elevation: 2,
    },
    logoutIcon: {
        marginRight: 12,
    },
    logoutText: {
        color: '#F53649',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
