import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, getInternalUri } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Switch, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationService from '@/services/NotificationService';

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

    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            handleUpdateProfilePic(result.assets[0].uri);
        }
    };

    const handleUpdateProfilePic = async (uri: string) => {
        setUploading(true);
        try {
            const token = await AsyncStorage.getItem('userToken');

            // 1. Upload Image
            const formData = new FormData();
            const filename = `profile-${Date.now()}.jpg`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('file', blob, filename);
            } else {
                // @ts-ignore
                formData.append('file', { uri, name: filename, type: 'image/jpeg' });
            }

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) throw new Error("Image upload failed");

            const uploadData = await uploadRes.json();
            const profilePicUrl = uploadData.imageUrl;

            // 2. Update Profile API
            const response = await fetch(`${API_BASE_URL}/api/user/update-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone: user.phone,
                    name: user.name,
                    profilePic: profilePicUrl,
                    about: user.about // Preserve existing about
                })
            });

            const data = await response.json();

            if (response.ok) {
                // 3. Update Local Storage & State
                await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
                setUser(data.user);
                Alert.alert("Success", "Profile picture updated!");
            } else {
                Alert.alert("Error", data.message || "Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to update profile picture");
        } finally {
            setUploading(false);
        }
    };

    const [testingCall, setTestingCall] = useState(false);

    const handleTestCall = async () => {
        setTestingCall(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_BASE_URL}/api/user/test-call-push`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                if (Platform.OS === 'web') {
                    alert("Test Initiated: A background signal has been sent to this device. Please close the app COMPLETELY and wait 5-10 seconds.");
                } else {
                    Alert.alert(
                        "Test Initiated", 
                        "A high-priority background signal has been sent to this device. Please close the app COMPLETELY and wait 5-10 seconds to see if the calling UI appears."
                    );
                }
            } else {
                if (Platform.OS === 'web') alert(data.message || "Failed to trigger test call");
                else Alert.alert("Error", data.message || "Failed to trigger test call");
            }
        } catch (error) {
            console.error(error);
            if (Platform.OS === 'web') alert("Network error while testing");
            else Alert.alert("Error", "Network error while testing");
        } finally {
            setTestingCall(false);
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
            // Uninitialize ZegoCloud if on native
            if (Platform.OS !== 'web') {
                try {
                    const { onUserLogout } = require('@/services/CallingService');
                    await onUserLogout();
                } catch (err) {
                    console.log("[Settings] Call service logout skipped or failed", err);
                }
            }

            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userInfo');

            console.log("Tokens cleared, navigating to welcome...");

            if (Platform.OS === 'web') {
                router.replace('/auth/qr-login');
            } else {
                router.replace('/auth/welcome');
            }
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const response = await fetch(`${API_BASE_URL}/api/user/delete-account`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    await performLogout();
                } else {
                    const data = await response.json();
                    Alert.alert("Error", data.message || "Failed to delete account");
                }
            } catch (error) {
                console.error("Delete account error:", error);
                Alert.alert("Error", "Something went wrong");
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("WARNING: This will permanently delete your account and all data. Are you sure?")) {
                await confirmDelete();
            }
        } else {
            Alert.alert(
                "Delete Account",
                "WARNING: This will permanently delete your account and all data. This action cannot be undone.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete Permanently", style: "destructive", onPress: confirmDelete }
                ]
            );
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                    <TouchableOpacity style={styles.avatar} onPress={pickImage} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator size="small" color="#008069" />
                        ) : user?.profilePic ? (
                            <Image
                                source={{ uri: getInternalUri(user.profilePic) }}
                                style={{ width: 60, height: 60, borderRadius: 30 }}
                                resizeMode="cover"
                            />
                        ) : (
                            <IconSymbol name="person.fill" size={40} color="#fff" />
                        )}

                        <View style={styles.cameraIcon}>
                            <IconSymbol name="camera.fill" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.name, { color: theme.text }]}>{user?.name || "User"}</Text>
                        <Text style={styles.status}>{user?.about || "Hey there! I am using Chatzy."}</Text>
                        {/* <Text style={{ fontSize: 10, color: 'red' }}>Debug URL: {user?.profilePic}</Text> */}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}
                    onPress={() => router.push('/link-device' as any)}
                >
                    <IconSymbol name="laptopcomputer" size={24} color={theme.text} style={styles.menuIcon} />
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.menuText, { color: theme.text }]}>Linked Devices</Text>
                        <IconSymbol name="qrcode" size={20} color={theme.text} style={{ opacity: 0.7 }} />
                    </View>
                </TouchableOpacity>

                <View style={[styles.menuItem, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <IconSymbol name={user?.notificationsMuted ? "bell.slash.fill" : "bell.fill"} size={24} color={theme.text} style={styles.menuIcon} />
                        <Text style={[styles.menuText, { color: theme.text }]}>Notifications</Text>
                    </View>
                    <Switch
                        value={!user?.notificationsMuted} // If muted is false, switch is ON (notifications active)
                        onValueChange={async (val) => {
                            try {
                                const token = await AsyncStorage.getItem('userToken');
                                const response = await fetch(`${API_BASE_URL}/api/user/toggle-notifications`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ notificationsMuted: !val })
                                });
                                if (response.ok) {
                                    const data = await response.json();
                                    const updatedUser = { ...user, notificationsMuted: data.notificationsMuted };
                                    setUser(updatedUser);
                                    await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
                                }
                            } catch (e) {
                                console.error("Error toggling notifications:", e);
                            }
                        }}
                        trackColor={{ false: "#767577", true: "#25D366" }}
                        thumbColor={"#f4f3f4"}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}
                    onPress={() => router.push('/settings/blocked-contacts' as any)}
                >
                    <IconSymbol name="lock.fill" size={24} color={theme.text} style={styles.menuIcon} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Blocked Contacts</Text>
                </TouchableOpacity>


                <TouchableOpacity
                    style={[styles.menuItem, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}
                    onPress={handleDeleteAccount}
                >
                    <IconSymbol name="trash" size={24} color="#F53649" style={styles.menuIcon} />
                    <Text style={[styles.menuText, { color: "#F53649" }]}>Delete Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff', marginBottom: 10 }]}
                    onPress={handleLogout}
                >
                    <IconSymbol name="arrow.right.circle" size={24} color="#F53649" style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                {/* Diagnostics Section */}
                <View style={{ marginTop: 30, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 13, color: '#666', marginBottom: 15, fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Diagnostics & Reliability
                    </Text>
                    
                    <TouchableOpacity
                        style={[styles.menuItem, { backgroundColor: colorScheme === 'dark' ? '#1f2c34' : '#fff' }]}
                        onPress={handleTestCall}
                        disabled={testingCall}
                    >
                        <IconSymbol name="phone.badge.plus" size={24} color="#25D366" style={styles.menuIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.menuText, { color: theme.text }]}>Test Background Call</Text>
                            <Text style={{ fontSize: 12, color: '#666' }}>Verify if app rings when closed</Text>
                        </View>
                        {testingCall && <ActivityIndicator size="small" color="#25D366" />}
                    </TouchableOpacity>

                    {Platform.OS === 'android' && (
                        <View style={{ padding: 12, backgroundColor: 'rgba(37, 211, 102, 0.05)', borderRadius: 10, marginTop: 5 }}>
                            <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>
                                <Text style={{ fontWeight: 'bold' }}>Note for Android:</Text> If the test call doesn't appear when the app is killed, ensure you have allowed:
                                {"\n"}• "Display over other apps"
                                {"\n"}• "Auto-start"
                                {"\n"}• "No restrictions" in Battery optimization
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            </ScrollView>
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
        position: 'relative',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#008069',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
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
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
    },
    menuIcon: {
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
