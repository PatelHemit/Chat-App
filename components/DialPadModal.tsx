import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_BASE_URL } from '@/config/api';
import { useCall } from '@/context/CallContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DialPadModalProps {
    visible: boolean;
    onClose: () => void;
}

const DialPadModal: React.FC<DialPadModalProps> = ({ visible, onClose }) => {
    const [dialedNumber, setDialedNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const { initiateCall } = useCall();
    const insets = useSafeAreaInsets();

    const handlePress = (val: string) => {
        if (dialedNumber.length < 15) {
            setDialedNumber(prev => prev + val);
            if (Platform.OS !== 'web') Vibration.vibrate(10);
        }
    };

    const handleBackspace = () => {
        setDialedNumber(prev => prev.slice(0, -1));
        if (Platform.OS !== 'web') Vibration.vibrate(10);
    };

    const startCall = async (isVideo: boolean) => {
        if (!dialedNumber.trim()) return;

        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            const userInfoStr = await AsyncStorage.getItem('userInfo');
            if (!token || !userInfoStr) {
                console.error("[DialPad] Missing token/userInfo");
                return;
            }

            const currentUser = JSON.parse(userInfoStr);
            const searchVal = dialedNumber.length === 10 ? `+91${dialedNumber}` : dialedNumber;

            console.log(`[DialPad] Searching for: ${searchVal}`);

            // Search for user by phone number
            const response = await fetch(`${API_BASE_URL}/api/user?search=${encodeURIComponent(searchVal)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const users = await response.json();
            console.log(`[DialPad] Search results:`, Array.isArray(users) ? `${users.length} users found` : "Invalid response");

            if (response.ok && Array.isArray(users) && users.length > 0) {
                // Find exact match or first result
                const targetUser = users.find((u: any) => u.phone === searchVal || u.phone === dialedNumber) || users[0];

                if (!targetUser?._id) {
                    Alert.alert("Error", "Invalid user data found.");
                    return;
                }

                if (String(targetUser._id) === String(currentUser._id)) {
                    Alert.alert("Error", "You cannot call yourself.");
                    return;
                }

                console.log(`[DialPad] Initiating ${isVideo ? 'Video' : 'Voice'} call to: ${targetUser.name || targetUser.phone} (${targetUser._id})`);

                // Create from object with all fields required by server/recipient
                const fromObject = {
                    _id: currentUser._id,
                    name: currentUser.name || "User",
                    profilePic: currentUser.profilePic || "",
                    phone: currentUser.phone || ""
                };

                initiateCall(String(targetUser._id), fromObject, isVideo);

                onClose();
                setDialedNumber('');
            } else {
                Alert.alert("User not found", "The number you dialed is not registered on ChatApp.");
            }
        } catch (error) {
            console.error("DialPad Call Error:", error);
            Alert.alert("Error", "Something went wrong while initiating the call.");
        } finally {
            setLoading(false);
        }
    };

    const KeyButton = ({ value, label }: { value: string; label?: string }) => (
        <TouchableOpacity
            style={styles.key}
            onPress={() => handlePress(value)}
            activeOpacity={0.7}
        >
            <Text style={styles.keyText}>{value}</Text>
            {label && <Text style={styles.keyLabel}>{label}</Text>}
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <IconSymbol name="xmark" size={24} color="#555" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Dial Pad</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Display */}
                <View style={styles.displayContainer}>
                    <Text
                        style={[styles.displayText, { fontSize: dialedNumber.length > 10 ? 30 : 40 }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {dialedNumber || ' '}
                    </Text>
                </View>

                {/* Keypad */}
                <View style={styles.keypad}>
                    <View style={styles.row}>
                        <KeyButton value="1" />
                        <KeyButton value="2" label="ABC" />
                        <KeyButton value="3" label="DEF" />
                    </View>
                    <View style={styles.row}>
                        <KeyButton value="4" label="GHI" />
                        <KeyButton value="5" label="JKL" />
                        <KeyButton value="6" label="MNO" />
                    </View>
                    <View style={styles.row}>
                        <KeyButton value="7" label="PQRS" />
                        <KeyButton value="8" label="TUV" />
                        <KeyButton value="9" label="WXYZ" />
                    </View>
                    <View style={styles.row}>
                        <KeyButton value="*" />
                        <KeyButton value="0" label="+" />
                        <KeyButton value="#" />
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <View style={{ width: 60 }} />
                    <View style={styles.callButtons}>
                        <TouchableOpacity
                            style={[styles.callBtn, styles.videoBtn]}
                            onPress={() => startCall(true)}
                            disabled={loading}
                        >
                            <IconSymbol name="video.fill" size={24} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.callBtn, styles.voiceBtn]}
                            onPress={() => startCall(false)}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <IconSymbol name="phone.fill" size={24} color="#fff" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.backspaceBtn}
                        onPress={handleBackspace}
                        onLongPress={() => {
                            setDialedNumber('');
                            if (Platform.OS !== 'web') Vibration.vibrate(50);
                        }}
                        delayLongPress={500}
                    >
                        {dialedNumber.length > 0 && (
                            <IconSymbol name="delete.backward.fill" size={28} color="#666" />
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: insets.bottom + 20 }} />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 56,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 8,
    },
    displayContainer: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    displayText: {
        fontWeight: '400',
        color: '#333',
        letterSpacing: 2,
    },
    keypad: {
        paddingHorizontal: 40,
        paddingVertical: 10,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    key: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyText: {
        fontSize: 28,
        fontWeight: '400',
        color: '#333',
    },
    keyLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: 'bold',
        marginTop: -2,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 20,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    callButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    callBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 10,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    voiceBtn: {
        backgroundColor: '#25D366',
    },
    videoBtn: {
        backgroundColor: '#008069',
    },
    backspaceBtn: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default DialPadModal;
