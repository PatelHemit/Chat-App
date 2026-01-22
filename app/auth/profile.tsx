import { CustomEmojiPicker } from '@/components/CustomEmojiPicker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [name, setName] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);

    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        try {
            console.log("Starting upload for:", uri);

            // Prepare Form Data
            let filename = "profile.jpg";
            let type = "image/jpeg";

            // Try to extract real filename/type if possible
            if (uri.includes('/')) {
                const parts = uri.split('/');
                const name = parts[parts.length - 1];
                if (name) filename = name;
            }
            if (filename.includes('.')) {
                const ext = filename.split('.').pop();
                if (ext) type = `image/${ext}`;
            }

            let formData = new FormData();

            if (Platform.OS === 'web') {
                console.log("Web platform detected. Fetching blob...");
                const response = await fetch(uri);
                const blob = await response.blob();
                console.log("Blob created:", blob);
                formData.append('file', blob, filename);
            } else {
                console.log("Native platform detected.");
                // @ts-ignore
                formData.append('file', { uri: uri, name: filename, type });
            }

            // 3. Upload to local backend
            console.log("Sending upload request to Backend:", `${API_BASE_URL}/api/upload`);
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                // NOTE: Do NOT set Content-Type header when sending FormData, 
                // fetch will automatically set it with boundary.
            });

            console.log("Upload Status:", uploadRes.status);
            const responseText = await uploadRes.text();
            console.log("Upload Response Text:", responseText);

            if (!uploadRes.ok) {
                // Try to parse JSON error message from body if possible
                try {
                    const errJson = JSON.parse(responseText);
                    throw new Error(errJson.message || `Upload Failed: ${uploadRes.status}`);
                } catch (e) {
                    // If not JSON, throw the text (likely HTML error)
                    throw new Error(`Upload Failed: ${uploadRes.status} - ${responseText.substring(0, 100)}...`);
                }
            }

            let uploadData;
            try {
                uploadData = JSON.parse(responseText);
            } catch (e) {
                throw new Error("Server returned non-JSON response: " + responseText.substring(0, 100));
            }

            console.log("Upload response JSON:", uploadData);

            return uploadData.imageUrl;
        } catch (error: any) {
            console.error("Upload Logic Error:", error);
            throw error; // Re-throw to be caught by handleFinish
        }
    };





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

            let profilePicUrl = user.profilePic || "";
            if (image) {
                profilePicUrl = await uploadImage(image);
            }

            // Call API to update profile
            const response = await fetch(`${API_BASE_URL}/api/user/update-profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    phone: user.phone,
                    name: name,
                    profilePic: profilePicUrl
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Update local user info
                await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
                router.replace('/(tabs)');
            } else {
                throw new Error(data.error || "Failed to update profile via API");
            }

        } catch (error: any) {
            console.error("Handle Finish Error:", error);
            alert(`Error: ${error.message}`);
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

            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                <View style={[styles.avatarStats, { backgroundColor: '#ddd', overflow: 'hidden' }]}>
                    {image ? (
                        <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                        <IconSymbol name="camera" size={40} color="#fff" />
                    )}
                </View>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#008069" />
                    </View>
                )}
            </TouchableOpacity>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Type your name here"
                    placeholderTextColor="#aaa"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                />
                <TouchableOpacity onPress={() => setIsEmojiOpen(true)} style={styles.emojiButton}>
                    <IconSymbol name="face.smiling" size={24} color="#aaa" />
                </TouchableOpacity>
            </KeyboardAvoidingView>





            <View style={styles.footer}>
                <TouchableOpacity style={[styles.button, { backgroundColor: '#008069', opacity: loading ? 0.7 : 1 }]} onPress={handleFinish} disabled={loading}>
                    <Text style={styles.buttonText}>{loading ? "SAVING..." : "NEXT"}</Text>
                </TouchableOpacity>
            </View>

            <CustomEmojiPicker
                open={isEmojiOpen}
                onClose={() => setIsEmojiOpen(false)}
                onEmojiSelected={(emojiInfo) => {
                    setName((prev) => prev + emojiInfo.emoji);
                }}
                value={name}
                onChangeText={setName}
                placeholder="Type your name"
            />
        </SafeAreaView >
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
        position: 'relative',
    },
    avatarStats: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 50,
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
        width: '100%',
        alignItems: 'center',
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 4,
        minWidth: 100,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },

});


