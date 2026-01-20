import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import React from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import RNEmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import { IconSymbol } from './ui/icon-symbol';

// Helper to detect if an emoji is a flag (Regional Indicator Symbols)
const isFlagEmoji = (emoji: string) => {
    const regex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;
    return regex.test(emoji);
};

interface CustomEmojiPickerProps {
    open: boolean;
    onClose: () => void;
    onEmojiSelected: (emojiInfo: { emoji: string; name: string; isFlag: boolean }) => void;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    onSend?: () => void;
}

export const CustomEmojiPicker = ({ open, onClose, onEmojiSelected, value, onChangeText, placeholder, onSend }: CustomEmojiPickerProps) => {
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    if (!open) return null;

    if (Platform.OS === 'web') {
        return (
            <View style={styles.webOverlay}>
                <TouchableOpacity style={styles.webBackdrop} onPress={onClose} activeOpacity={1} />
                <View style={[styles.webContainer, { backgroundColor: theme.background }]}>
                    <View style={styles.webHeader}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <IconSymbol name="xmark" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Added Input Field at the Top */}
                    {onChangeText && (
                        <View style={[styles.inputContainer, { borderBottomColor: theme.icon ?? '#ccc' }]}>
                            <IconSymbol name="face.smiling" size={24} color={theme.text} style={{ marginRight: 10 }} />
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                value={value}
                                onChangeText={onChangeText}
                                placeholder={placeholder || "Type a message"}
                                placeholderTextColor="#888"
                            />
                            {onSend && (
                                <TouchableOpacity onPress={onSend} style={styles.sendButton}>
                                    <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <div style={{ width: '100%', height: '400px' }}>
                        <EmojiPicker
                            onEmojiClick={(emojiData: EmojiClickData) => {
                                const name = emojiData.names[0] || "";
                                const isFlag = isFlagEmoji(emojiData.emoji);
                                onEmojiSelected({ emoji: emojiData.emoji, name, isFlag });
                            }}
                            width="100%"
                            height={400}
                            theme={colorScheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                            lazyLoadEmojis
                        />
                    </div>
                </View>
            </View>
        );
    }

    return (
        <RNEmojiPicker
            open={open}
            onClose={onClose}
            onEmojiSelected={(emojiObject: EmojiType) => {
                const isFlag = isFlagEmoji(emojiObject.emoji);
                onEmojiSelected({
                    emoji: emojiObject.emoji,
                    name: emojiObject.name,
                    isFlag
                });
            }}
            theme={{
                container: theme.background,
                header: theme.headerBackground,
                knob: theme.text,
                category: {
                    icon: theme.text,
                    iconActive: theme.tint,
                    container: theme.headerBackground,
                    containerActive: theme.headerBackground
                }
            }}
        />
    );
};

const styles = StyleSheet.create({
    webOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    webBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    webContainer: {
        width: '100%',
        maxWidth: 500,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        paddingBottom: 20,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    webHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    closeButton: {
        padding: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginHorizontal: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 16,
        padding: 5,
        outlineStyle: 'none',
        fontFamily: 'Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, Android Emoji, EmojiSymbols',
    } as any,
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#008069',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
    },
});
