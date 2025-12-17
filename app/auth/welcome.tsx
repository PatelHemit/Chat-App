import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function WelcomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.content}>
                <View style={styles.imageContainer}>
                    <View style={[styles.circle, { backgroundColor: 'rgba(0, 128, 105, 0.1)' }]}>
                        <FontAwesome name="whatsapp" size={100} color="#008069" />
                    </View>
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Welcome to WhatsApp</Text>
                <Text style={[styles.terms, { color: '#888' }]}>
                    Read our <Text style={{ color: '#008069' }}>Privacy Policy</Text>. Tap "Agree and Continue" to accept the <Text style={{ color: '#008069' }}>Terms of Service</Text>.
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => router.push('/auth/phone')}
                >
                    <Text style={styles.buttonText}>AGREE AND CONTINUE</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 20,
        width: '100%',
    },
    imageContainer: {
        marginBottom: 50,
    },
    circle: {
        width: 250,
        height: 250,
        borderRadius: 125,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    terms: {
        textAlign: 'center',
        marginBottom: 40,
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        backgroundColor: '#008069',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 4,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
});
