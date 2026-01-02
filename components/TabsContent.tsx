import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Shared Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    icon: {
        marginLeft: 20,
    },
    // Calls & Updates
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
    },
    // Calls specific
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    callInfo: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    callMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    itemDate: {
        color: '#666',
    },
    // Communities specific
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    image: {
        width: 150,
        height: 150,
        marginBottom: 20,
        opacity: 0.5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 30,
        lineHeight: 20,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    // Updates specific
    updatesSectionTitle: { // overwriting sectionTitle size for updates if needed, but looks same or similar. Updates had 20, Calls 16.
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    myStatus: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    addIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#008069',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    sectionItemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionItemSubtitle: {
        color: '#666',
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusRing: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statusAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export function CallsContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Calls</Text>
                <View style={styles.headerIcons}>
                    <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                </View>
            </View>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent</Text>
                    {/* Dummy Calls */}
                    {['Alice', 'Bob', 'Charlie'].map((name, i) => (
                        <View key={i} style={styles.callItem}>
                            <View style={styles.avatar}>
                                <IconSymbol name="person.fill" size={25} color="#fff" />
                            </View>
                            <View style={styles.callInfo}>
                                <Text style={[styles.itemName, { color: theme.text }]}>{name}</Text>
                                <View style={styles.callMeta}>
                                    <IconSymbol name={i % 2 === 0 ? "video" : "phone"} size={14} color={i % 2 === 0 ? "red" : "green"} />
                                    <Text style={styles.itemDate}> Today, 10:0{i + 1} AM</Text>
                                </View>
                            </View>
                            <IconSymbol name={i % 2 === 0 ? "video" : "phone"} size={24} color="#008069" />
                        </View>
                    ))}
                </View>
            </ScrollView>
            <View style={[styles.fab, { backgroundColor: theme.tint }]}>
                <IconSymbol name="phone" size={24} color="#fff" />
            </View>
        </SafeAreaView>
    );
}

export function CommunitiesContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Communities</Text>
                <View style={styles.headerIcons}>
                    <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                </View>
            </View>

            <View style={styles.content}>
                <View style={[styles.image, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }]}>
                    <FontAwesome name="users" size={100} color="#008069" />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Stay connected with a community</Text>
                <Text style={styles.subtitle}>Communities bring members together in topic-based groups, and make it easy to get admin announcements. Any community you're added to will appear here.</Text>

                <View style={[styles.button, { backgroundColor: '#008069' }]}>
                    <Text style={styles.buttonText}>Start your community</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

export function UpdatesContent() {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
                <Text style={[styles.headerTitle, { color: theme.headerTintColor }]}>Updates</Text>
                <View style={styles.headerIcons}>
                    <IconSymbol name="camera" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="magnifyingglass" size={24} color={theme.headerTintColor} style={styles.icon} />
                    <IconSymbol name="ellipsis" size={24} color={theme.headerTintColor} style={styles.icon} />
                </View>
            </View>
            <ScrollView>
                <View style={styles.section}>
                    <Text style={[styles.updatesSectionTitle, { color: theme.text }]}>Status</Text>
                    <View style={styles.myStatus}>
                        <View style={styles.avatarContainer}>
                            <IconSymbol name="person.fill" size={30} color="#fff" />
                            <View style={styles.addIcon}>
                                <IconSymbol name="plus" size={12} color="#fff" />
                            </View>
                        </View>
                        <View>
                            <Text style={[styles.sectionItemTitle, { color: theme.text }]}>My Status</Text>
                            <Text style={styles.sectionItemSubtitle}>Tap to add status update</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.section}>
                    <Text style={[styles.updatesSectionTitle, { color: theme.text }]}>Recent updates</Text>
                    {/* Dummy Statuses */}
                    {['Alice', 'Bob', 'Charlie'].map((name, i) => (
                        <View key={i} style={styles.statusItem}>
                            <View style={[styles.statusRing, { borderColor: '#008069' }]}>
                                <View style={styles.statusAvatar}>
                                    <IconSymbol name="person.fill" size={25} color="#fff" />
                                </View>
                            </View>
                            <View>
                                <Text style={[styles.sectionItemTitle, { color: theme.text }]}>{name}</Text>
                                <Text style={styles.sectionItemSubtitle}>Today, 10:0{i + 1} AM</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
            <View style={[styles.fab, { backgroundColor: theme.tint }]}>
                <IconSymbol name="camera" size={24} color="#fff" />
            </View>
        </SafeAreaView>
    );
}
