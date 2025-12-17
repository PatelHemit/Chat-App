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

    const handleNext = () => {
        if (phone.length < 10) {
            alert("Please enter a valid phone number");
            return;
        }
        router.push('/auth/otp');
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
                            <View style={{ width: 24 }} /> {/* Spacer for balance */}
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
                        <TouchableOpacity style={styles.button} onPress={handleNext}>
                            <Text style={styles.buttonText}>NEXT</Text>
                        </TouchableOpacity>
                    </View>
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
        color: '#34B7F1', // WhatsApp blue
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
        width: '85%', // Mimic typical WhatsApp width logic
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
        marginRight: 20, // push arrow to the right a bit visually? No, usually centered together or spread. Reference image shows centered block.
        // Actually reference image has:
        //       India         v
        // -----------------------
        // + 91   931...
        //
        // Let's use space-between or simple center with margin.
        // Reference image looks like "India" is centered, arrow is right but maybe specific width?
        // Let's stick to simple center for now, with some margin.
        flex: 1,
        textAlign: 'center',
        paddingLeft: 10, // balance visual center
    },
    arrow: {
        fontSize: 10,
    },
    separator: {
        height: 1, // slightly smaller than 2 for nicer look? no, reference is solid green line.
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
        alignItems: 'center', // Center text
    },
    codeText: {
        fontSize: 16,
        paddingBottom: 5,
        paddingLeft: 10, // visual alignment
    },
    numberInputContainer: {
        flex: 1,
    },
    input: {
        fontSize: 16,
        paddingBottom: 5,
        paddingLeft: 5,
        borderWidth: 0, // Ensure no border on Android/iOS
        ...Platform.select({
            web: {
                outlineStyle: 'none', // Remove focus ring on Web
                borderBottomWidth: 0, // Ensure no default bottom border interferes
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
        borderRadius: 3, // slightly rounded
        elevation: 2, // shadow for android
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
});
