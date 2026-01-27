import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OTPScreen() {
    const router = useRouter();
    const { phoneNumber } = useLocalSearchParams();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [otp, setOtp] = useState('');
    const displayPhone = typeof phoneNumber === 'string' ? phoneNumber : "your number";

    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (otp.length < 6) {
            alert("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);
        try {
            // Ensure phoneNumber is a string
            const phoneStr = Array.isArray(phoneNumber) ? phoneNumber[0] : phoneNumber;

            const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneStr, otp })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.user && data.token) {
                    await AsyncStorage.setItem('userInfo', JSON.stringify(data.user));
                    await AsyncStorage.setItem('userToken', data.token);
                }
                router.push('/auth/profile');
            } else {
                alert(data.message || "Invalid OTP");
            }
        } catch (error: any) {
            console.error(error);
            alert(`Verification failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.headerBackground }]}>Verifying your number</Text>
                <Text style={[styles.subtitle, { color: theme.text }]}>
                    Waiting to automatically detect an SMS sent to {displayPhone}.
                </Text>
                <TouchableOpacity><Text style={{ color: '#008069', marginTop: 10, fontWeight: 'bold' }}>Wrong number?</Text></TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
                <View style={styles.otpInputContainer}>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholderTextColor="#aaa"
                        keyboardType="numeric"
                        maxLength={6}
                        value={otp}
                        onChangeText={setOtp}
                        autoFocus
                        textAlign="center"
                    />
                </View>
                <Text style={[styles.helperText, { color: '#aaa' }]}>Enter 6-digit code</Text>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#008069' }]}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'VERIFYING...' : 'VERIFY'}</Text>
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
        marginHorizontal: 20,
    },
    inputContainer: {
        width: '80%',
        maxWidth: 400,
        alignItems: 'center',
    },
    otpInputContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#008069',
        paddingBottom: 5,
        width: '100%',
        marginBottom: 10,
    },
    input: {
        fontSize: 24,
        letterSpacing: 8,
        borderWidth: 0,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                borderBottomWidth: 0,
            } as any,
        }),
    },
    helperText: {
        fontSize: 12,
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
