import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRCodeScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    // Placeholder data - in a real app this would be the user's ID or profile link
    const qrData = "https://wa.me/919999999999";

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ title: 'My QR Code', headerBackTitle: 'Back' }} />

            <View style={styles.content}>
                <View style={styles.qrContainer}>
                    <QRCode
                        value={qrData}
                        size={250}
                        color="black"
                        backgroundColor="white"
                    />
                </View>

                <Text style={[styles.name, { color: theme.text }]}>Agasthya</Text>
                <Text style={[styles.info, { color: theme.text }]}>WhatsApp Contact</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
        padding: 20,
    },
    qrContainer: {
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginBottom: 20,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    info: {
        fontSize: 16,
        opacity: 0.7,
    },
});
