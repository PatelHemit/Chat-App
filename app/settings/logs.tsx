import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import logger from '@/services/PersistentLogger';
import { useFocusEffect } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LogsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
    const [logs, setLogs] = useState<any[]>([]);

    const loadLogs = useCallback(async () => {
        const data = await logger.getLogs();
        setLogs(data.reverse()); // Newest first
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadLogs();
        }, [])
    );

    const handleClear = async () => {
        await logger.clearLogs();
        loadLogs();
    };

    const handleShare = async () => {
        const logString = logs.map(l => `[${l.timestamp}] [${l.level}] ${l.message} ${JSON.stringify(l.context || {})}`).join('\n');
        try {
            await Share.share({
                message: logString,
                title: 'App Debug Logs'
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: "Debug Logs",
                    headerStyle: { backgroundColor: theme.headerBackground },
                    headerTintColor: theme.headerTintColor,
                    headerRight: () => (
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={handleShare} style={{ marginRight: 15 }}>
                                <IconSymbol name="square.and.arrow.up" size={24} color={theme.headerTintColor} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleClear}>
                                <IconSymbol name="trash" size={24} color={theme.headerTintColor} />
                            </TouchableOpacity>
                        </View>
                    )
                }}
            />

            <FlatList
                data={logs}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={styles.logItem}>
                        <View style={styles.logHeader}>
                            <Text style={[styles.timestamp, { color: theme.text, opacity: 0.6 }]}>
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </Text>
                            <Text style={[
                                styles.level,
                                { color: item.level === 'ERROR' ? '#F53649' : item.level === 'WARN' ? '#FFD600' : '#25D366' }
                            ]}>
                                {item.level}
                            </Text>
                        </View>
                        <Text style={[styles.message, { color: theme.text }]}>{item.message}</Text>
                        {item.context && (
                            <Text style={[styles.context, { color: theme.text, opacity: 0.5 }]}>
                                {JSON.stringify(item.context)}
                            </Text>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={{ color: theme.text, opacity: 0.5 }}>No logs found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    logItem: {
        padding: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#ccc',
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    timestamp: {
        fontSize: 10,
    },
    level: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    message: {
        fontSize: 14,
        fontWeight: '500',
    },
    context: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 4,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 50,
    }
});
