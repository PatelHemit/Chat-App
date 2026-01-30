import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LinkDeviceScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.button}>
                    <Text style={styles.buttonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;

        if (data === "loading..." || !data) {
            console.log("[SCANNER] Ignored invalid scan data:", data);
            return;
        }

        setScanned(true);
        console.log(`[SCANNER] Scanned Session ID: ${data}`);

        try {
            const token = await AsyncStorage.getItem('userToken');
            const userInfo = await AsyncStorage.getItem('userInfo');
            if (!token || !userInfo) {
                Alert.alert("Error", "You must be logged in on mobile to link a device.");
                return;
            }

            const user = JSON.parse(userInfo);

            // Send link request to backend
            const response = await fetch(`${API_BASE_URL}/api/auth/qr-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: data,
                    userId: user._id,
                    token: token
                })
            });

            const result = await response.json();
            if (result.success) {
                // Laptop will show the success message, so we just go back on mobile
                router.back();
            } else {
                throw new Error(result.message || "Failed to link device");
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
            setScanned(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Link a Device', headerBackTitle: 'Back' }} />

            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />

            <View style={styles.overlay}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.middleContainer}>
                    <View style={styles.unfocusedContainer}></View>
                    <View style={styles.focusedContainer}>
                        {/* The scanner square */}
                    </View>
                    <View style={styles.unfocusedContainer}></View>
                </View>
                <View style={styles.unfocusedContainer}>
                    <Text style={styles.instructionText}>
                        Point your camera at the QR code on your computer screen
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <IconSymbol name="xmark" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    button: {
        backgroundColor: '#008069',
        padding: 15,
        borderRadius: 5,
        alignSelf: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    middleContainer: {
        flexDirection: 'row',
        height: 250,
    },
    focusedContainer: {
        width: 250,
        borderWidth: 2,
        borderColor: '#008069',
        backgroundColor: 'transparent',
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        padding: 10,
    }
});
