import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL, SOCKET_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';

export default function QRLoginScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<"waiting" | "linked" | "error">("waiting");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        // Only run on Web (or whenever these screens are visited)
        initQRSession();
    }, []);

    const initQRSession = async () => {
        setLoading(true);
        setErrorMsg(null);
        setStatus("waiting");
        try {
            const sessionUrl = `${API_BASE_URL}/api/auth/qr-session`;
            console.log("[QR] Fetching session from:", sessionUrl);

            const response = await fetch(sessionUrl).catch(err => {
                console.error("[QR] Fetch error:", err);
                throw new Error(`Failed to reach server: ${err.message}. Check if backend is running.`);
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            const { sessionId: newId } = await response.json();
            console.log("[QR] Session obtained:", newId);
            setSessionId(newId);

            // 2. Setup Socket.io to listen for login
            console.log("[QR] Connecting socket to:", SOCKET_URL);
            const socket = io(SOCKET_URL, {
                transports: ['websocket'],
                forceNew: true
            });

            socket.on("connect", () => {
                console.log(`[SOCKET] Connected. Joining QR room: ${newId}`);
                socket.emit("join-qr-room", newId);
            });

            socket.on("connect_error", (err) => {
                console.error("[SOCKET] Connection error:", err);
            });

            socket.on("login-success", async (data) => {
                console.log("[SOCKET] Login Success received!");
                setStatus("linked");

                await AsyncStorage.setItem("userToken", data.token);
                await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));

                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 1500);
            });

            setLoading(false);
        } catch (error: any) {
            console.error("[QR] Initialization Error:", error);
            setErrorMsg(error.message);
            setStatus("error");
            setLoading(false);
        }
    };

    const handleSimulateScan = () => {
        // Keep for testing/dev
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#f0f2f5' }]}>
            {/* Content centered */}
            <View style={styles.centerContainer}>
                <View style={styles.card}>
                    {loading ? (
                        <View style={{ width: 240, height: 240, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#008069" />
                            <Text style={{ marginTop: 10, color: '#666' }}>Generating code...</Text>
                        </View>
                    ) : status === "linked" ? (
                        <View style={{ width: 240, height: 240, justifyContent: 'center', alignItems: 'center' }}>
                            <IconSymbol name="checkmark.circle.fill" size={100} color="#008069" />
                            <Text style={[styles.name, { marginTop: 20 }]}>Laptop Linked!</Text>
                            <Text style={styles.subtitle}>Loading your chats...</Text>
                        </View>
                    ) : status === "error" ? (
                        <View style={{ width: 240, height: 240, justifyContent: 'center', alignItems: 'center' }}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={60} color="#ff4444" />
                            <Text style={[styles.name, { marginTop: 10, textAlign: 'center' }]}>Connection Failed</Text>
                            <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 20 }]}>{errorMsg}</Text>
                            <TouchableOpacity style={styles.scanButton} onPress={initQRSession}>
                                <Text style={styles.scanButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : sessionId ? (
                        <View style={styles.qrWrapper}>
                            <QRCode
                                value={sessionId}
                                size={220}
                            />
                        </View>
                    ) : null}

                    {status === "waiting" && (
                        <View style={styles.infoContainer}>
                            <Text style={styles.name}>WhatsApp Web</Text>
                            <Text style={styles.subtitle}>Scan to log in instantly</Text>
                        </View>
                    )}
                </View>
            </View>
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
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        elevation: 2,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 30,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        minWidth: 300,
        minHeight: 350,
    },
    qrWrapper: {
        padding: 10,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 10,
    },
    infoContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'black',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    instructionText: {
        textAlign: 'center',
        fontSize: 13,
        maxWidth: 300,
        lineHeight: 18,
        marginBottom: 20,
    },
    scanButton: {
        flexDirection: 'row',
        backgroundColor: '#008069',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 2,
    },
    scanButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
