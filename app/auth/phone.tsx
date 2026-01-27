import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PhoneScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        if (phone.length !== 10) {
            alert("Please enter a valid 10-digit phone number");
            return;
        }

        const formattedPhone = `+91${phone}`;
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: formattedPhone })
            });

            const data = await response.json();

            if (response.ok) {
                if (data.otp) {
                    // For development/testing if Twilio fails or is not set up
                    console.log("OTP:", data.otp);
                    // alert(`Dev OTP: ${data.otp}`); 
                }
                router.push({
                    pathname: '/auth/otp',
                    params: { phoneNumber: formattedPhone }
                });
            } else {
                alert(data.message || "Failed to send OTP");
            }
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <View style={styles.headerTop}>
                            <View style={{ width: 24 }} />
                            <Text style={[styles.title, { color: '#008069' }]}>Enter your phone number</Text>
                            <TouchableOpacity>
                                <Text style={[styles.menuDots, { color: theme.text }]}>⋮</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.subtitle, { color: theme.text }]}>
                            WhatsApp will need to verify your phone number.
                        </Text>
                        <TouchableOpacity>
                            <Text style={styles.linkText}>What's my number?</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>
                        <View style={styles.inputWrapper}>
                            {/* Country Picker */}
                            <View style={styles.pickerContainer}>
                                <View style={styles.pickerContent}>
                                    <Text style={[styles.pickerText, { color: theme.text }]}>India</Text>
                                    <Text style={[styles.arrow, { color: '#008069' }]}>▼</Text>
                                </View>
                                <View style={styles.separator} />
                            </View>

                            {/* Phone Input */}
                            <View style={styles.phoneInputContainer}>
                                <View style={styles.countryCodeContainer}>
                                    <Text style={[styles.codeText, { color: theme.text }]}>+ 91</Text>
                                    <View style={styles.separator} />
                                </View>

                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        style={[styles.input, { color: theme.text }]}
                                        placeholder="phone number"
                                        placeholderTextColor="#999"
                                        keyboardType="number-pad"
                                        value={phone}
                                        onChangeText={setPhone}
                                        maxLength={10}
                                        autoFocus
                                        selectionColor="#008069"
                                    />
                                    <View style={styles.separator} />
                                </View>
                            </View>

                            <Text style={styles.carrierText}>Carrier charges may apply</Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.button} onPress={handleNext} disabled={loading}>
                            <Text style={styles.buttonText}>{loading ? 'CONNECTING...' : 'NEXT'}</Text>
                        </TouchableOpacity>
                    </View>
                    {loading && <View style={styles.loadingOverlay}><Text>Sending OTP...</Text></View>}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 30,
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    menuDots: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        marginBottom: 5,
        lineHeight: 20,
    },
    linkText: {
        color: '#34B7F1',
        fontSize: 14,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    inputWrapper: {
        width: '85%',
        maxWidth: 340,
    },
    pickerContainer: {
        marginBottom: 15,
        width: '100%',
    },
    pickerContent: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 5,
    },
    pickerText: {
        fontSize: 16,
        paddingLeft: 10,
        flex: 1,
        textAlign: 'center',
    },
    arrow: {
        fontSize: 10,
    },
    separator: {
        height: 1,
        backgroundColor: '#008069',
        width: '100%',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    countryCodeContainer: {
        width: 70,
        marginRight: 15,
        alignItems: 'center',
    },
    codeText: {
        fontSize: 16,
        paddingBottom: 5,
        paddingLeft: 10,
    },
    numberInputContainer: {
        flex: 1,
    },
    input: {
        fontSize: 16,
        paddingBottom: 5,
        paddingLeft: 5,
        borderWidth: 0,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                borderBottomWidth: 0,
            } as any,
        }),
    },
    carrierText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 5,
    },
    footer: {
        flex: 1,
        justifyContent: 'flex-end',
        marginBottom: 20,
        alignItems: 'center',
        width: '100%',
    },
    button: {
        backgroundColor: '#008069',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 3,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
