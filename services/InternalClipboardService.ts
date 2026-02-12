
interface CopiedMessage {
    content: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    fileUrl?: string;
    fileMetadata?: {
        fileName?: string;
        fileSize?: number;
        fileExtension?: string;
        mimeType?: string;
    };
}

class InternalClipboardService {
    private copiedMessage: CopiedMessage | null = null;
    private listeners: ((message: CopiedMessage | null) => void)[] = [];

    set(message: CopiedMessage) {
        this.copiedMessage = message;
        this.notifyListeners();
    }

    get(): CopiedMessage | null {
        return this.copiedMessage;
    }

    clear() {
        this.copiedMessage = null;
        this.notifyListeners();
    }

    addListener(callback: (message: CopiedMessage | null) => void) {
        this.listeners.push(callback);
        // Immediately notify the new listener of the current state
        callback(this.copiedMessage);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.copiedMessage));
    }
}

export default new InternalClipboardService();
