import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [name, setName] = useState('');

    const [loading, setLoading] = useState(false);

    const handleFinish = async () => {
        if (name.length === 0) {
            alert("Please enter your name");
            return;
        }

        setLoading(true);
        try {
            const userInfo = await AsyncStorage.getItem('userInfo');
            const token = await AsyncStorage.getItem('userToken');

            if (!userInfo || !token) {
                alert("Session expired. Please login again.");
                router.replace('/auth/welcome');
                return;
            }

            const user = JSON.parse(userInfo);

            // Call API to update profile
            const response = await fetch('http://localhost:3000/api/user/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone: user.phone,
                    name: name,
                    profilePic: "" // Implement image upload later
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Update local user info
                await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
                router.replace('/(tabs)');
            } else {
                alert(data.error || "Failed to update profile");
            }

        } catch (error) {
            console.error(error);
            alert("Network error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.headerBackground }]}>Profile Info</Text>
                <Text style={[styles.subtitle, { color: theme.text }]}>Please provide your name and an optional profile photo.</Text>
            </View>

            <View style={styles.avatarContainer}>
                <View style={[styles.avatarStats, { backgroundColor: '#ddd' }]}>
                    <IconSymbol name="camera" size={40} color="#fff" />
                </View>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Type your name here"
                    placeholderTextColor="#aaa"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                />
                <View style={styles.emojiButton}>
                    <IconSymbol name="face.smiling" size={24} color="#aaa" />
                </View>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#008069' }]} onPress={handleFinish}>
                    <Text style={styles.buttonText}>NEXT</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
        width: '100%',
        maxWidth: 500,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        color: '#aaa',
    },
    avatarContainer: {
        marginBottom: 30,
    },
    avatarStats: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        width: '90%',
        maxWidth: 400,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#008069',
        paddingBottom: 5,
    },
    input: {
        flex: 1,
        fontSize: 16,
        borderWidth: 0,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                borderBottomWidth: 0,
            } as any,
        }),
    },
    emojiButton: {
        marginLeft: 10,
    },
    footer: {
        flex: 1,
        justifyContent: 'flex-end',
        marginBottom: 20,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 4,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
