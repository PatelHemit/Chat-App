import * as FileSystem from 'expo-file-system/legacy';

/**
 * Format file size from bytes to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Get file type icon name based on extension
 */
export const getFileIcon = (extension: string): string => {
    const ext = extension.toLowerCase().replace('.', '');

    // Document types
    if (['pdf'].includes(ext)) return 'file-pdf-box';
    if (['doc', 'docx'].includes(ext)) return 'file-word-box';
    if (['xls', 'xlsx'].includes(ext)) return 'file-excel-box';
    if (['ppt', 'pptx'].includes(ext)) return 'file-powerpoint-box';
    if (['txt', 'text'].includes(ext)) return 'file-document-outline';

    // Archive types
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'folder-zip';

    // Code types
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css'].includes(ext)) return 'file-code';

    // Default
    return 'file-document';
};

/**
 * Get file type color based on extension
 */
export const getFileColor = (extension: string): string => {
    const ext = extension.toLowerCase().replace('.', '');

    if (['pdf'].includes(ext)) return '#E74C3C';
    if (['doc', 'docx'].includes(ext)) return '#2B579A';
    if (['xls', 'xlsx'].includes(ext)) return '#217346';
    if (['ppt', 'pptx'].includes(ext)) return '#D24726';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '#F39C12';
    if (['txt', 'text'].includes(ext)) return '#95A5A6';

    return '#34495E';
};

/**
 * Download file to local cache
 */
export const downloadFile = async (url: string, filename: string): Promise<string> => {
    try {
        // @ts-ignore - documentDirectory exists at runtime but may not be in type definitions
        const directory = FileSystem.documentDirectory as string | null;
        if (!directory) {
            throw new Error('Document directory not available');
        }
        const fileUri = `${directory}${filename}`;
        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        return downloadResult.uri;
    } catch (error) {
        console.error('Error downloading file:', error);
        throw error;
    }
};

/**
 * Sanitize filename to remove special characters
 */
export const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
};
