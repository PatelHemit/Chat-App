import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_STORAGE_KEY = 'app_persistent_logs';
const MAX_LOGS = 100;

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: any;
}

class PersistentLogger {
    private logs: LogEntry[] = [];

    async info(message: string, context?: any) {
        await this.log('INFO', message, context);
    }

    async warn(message: string, context?: any) {
        await this.log('WARN', message, context);
    }

    async error(message: string, context?: any) {
        await this.log('ERROR', message, context);
    }

    private async log(level: LogLevel, message: string, context?: any) {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
        };

        console.log(`[${level}] ${message}`, context || '');

        try {
            const existingLogsStr = await AsyncStorage.getItem(LOG_STORAGE_KEY);
            let existingLogs: LogEntry[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];

            existingLogs.push(entry);

            // Keep only the last MAX_LOGS
            if (existingLogs.length > MAX_LOGS) {
                existingLogs = existingLogs.slice(existingLogs.length - MAX_LOGS);
            }

            await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(existingLogs));
        } catch (e) {
            console.error('Failed to save persistent log:', e);
        }
    }

    async getLogs(): Promise<LogEntry[]> {
        try {
            const logsStr = await AsyncStorage.getItem(LOG_STORAGE_KEY);
            return logsStr ? JSON.parse(logsStr) : [];
        } catch (e) {
            console.error('Failed to get persistent logs:', e);
            return [];
        }
    }

    async clearLogs() {
        try {
            await AsyncStorage.removeItem(LOG_STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear persistent logs:', e);
        }
    }
}

export default new PersistentLogger();
