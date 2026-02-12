import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatFileSize, getFileColor, getFileIcon } from '../utils/fileUtils';

interface DocumentBubbleProps {
    fileName: string;
    fileSize: number;
    fileExtension: string;
    fileUrl: string;
}

const DocumentBubble: React.FC<DocumentBubbleProps> = ({
    fileName,
    fileSize,
    fileExtension,
    fileUrl
}) => {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const canOpen = await Linking.canOpenURL(fileUrl);
            if (canOpen) {
                await Linking.openURL(fileUrl);
            } else {
                Alert.alert('Download', 'File will be downloaded in your browser');
                await Linking.openURL(fileUrl);
            }
        } catch (error) {
            console.error('Error opening file:', error);
            Alert.alert('Error', 'Failed to open file');
        } finally {
            setDownloading(false);
        }
    };

    const iconName = getFileIcon(fileExtension);
    const iconColor = getFileColor(fileExtension);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={handleDownload}
            disabled={downloading}
        >
            <View style={styles.cardContent}>
                {/* File Icon Container */}
                <View style={styles.iconBox}>
                    <View style={[styles.innerIconBox, { backgroundColor: iconColor }]}>
                        <Text style={styles.iconLetter}>
                            {fileExtension.charAt(0).toUpperCase() || 'F'}
                        </Text>
                    </View>
                </View>

                {/* File Details */}
                <View style={styles.details}>
                    <Text style={styles.fileName} numberOfLines={1}>
                        {fileName}
                    </Text>
                    <Text style={styles.fileMeta}>
                        {formatFileSize(fileSize)} • {fileExtension.toUpperCase()}
                    </Text>
                </View>

                {/* Download Action */}
                <View style={styles.action}>
                    {downloading ? (
                        <ActivityIndicator size="small" color="#555" />
                    ) : (
                        <MaterialCommunityIcons
                            name="download-outline"
                            size={28}
                            color="#555"
                        />
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(0, 0, 0, 0.05)', // Slightly darker than bubble for contrast
        borderRadius: 8,
        padding: 8,
        marginBottom: 4,
        width: '100%',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 44,
        height: 44,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    innerIconBox: {
        width: 24,
        height: 24,
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconLetter: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    details: {
        flex: 1,
        marginRight: 5,
    },
    fileName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111b21',
        marginBottom: 2,
    },
    fileMeta: {
        fontSize: 12,
        color: '#667781',
    },
    action: {
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default DocumentBubble;
