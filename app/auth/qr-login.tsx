import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QRLoginScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const handleSimulateScan = () => {
        // Simulate scan -> open chat
        router.replace('/(tabs)');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#f0f2f5' }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: 'white' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol name="arrow.left" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: Colors.light.text }]}>My QR Code</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={styles.centerContainer}>
                <View style={styles.card}>
                    <TouchableOpacity onPress={handleSimulateScan} activeOpacity={0.9}>
                        <QRCode
                            value="https://wa.me/919999999999"
                            size={200}
                        />
                    </TouchableOpacity>

                    <View style={styles.infoContainer}>
                        <Text style={styles.name}>Agasthya</Text>
                        <Text style={styles.subtitle}>WhatsApp Contact</Text>
                    </View>
                </View>

                <Text style={[styles.instructionText, { color: '#666' }]}>
                    Your QR code is private. If you share it with someone, they can scan it with their WhatsApp camera to add you as a contact.
                </Text>
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
        paddingTop: 60,
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
        marginBottom: 30,
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
    },
});
