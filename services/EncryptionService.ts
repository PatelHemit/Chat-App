import { Platform, NativeModules } from 'react-native';
import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Robust check for native module availability to avoid loud Metro/Expo errors
const checkNativeModule = (moduleName: string): boolean => {
  if (Platform.OS === 'web') return false;
  
  // 1. Check standard NativeModules
  if (NativeModules[moduleName]) return true;
  
  // 2. Check for common RSA module names
  if (moduleName === 'RSA' && (NativeModules.RSA || NativeModules.RNRSANative)) return true;
  
  // 3. Check for Expo Modules proxy presence
  try {
     const ExpoModulesProxy = NativeModules.NativeUnimoduleProxy || NativeModules.ExpoModulesProxy;
     if (ExpoModulesProxy?.viewManagersNames?.includes(moduleName) || 
         ExpoModulesProxy?.modulesConstants?.[moduleName]) return true;
  } catch(e) {}

  return false;
};

const getSecureStore = () => {
  if (!checkNativeModule('ExpoSecureStore')) return null;
  try { return require('expo-secure-store'); } catch (e) { return null; }
};

const getRSA = () => {
  if (!checkNativeModule('RSA')) return null;
  try { return require('react-native-rsa-native').RSA; } catch (e) { return null; }
};

const PRIVATE_KEY_TAG = 'CHATZY_PRIVATE_KEY';
const PUBLIC_KEY_TAG = 'CHATZY_PUBLIC_KEY';
const E2E_PREFIX = 'E2E:';

export class EncryptionService {
  /**
   * Generates a new RSA 2048-bit key pair and stores it.
   * Returns the Public Key string.
   */
  static async generateKeyPair(): Promise<string | null> {
    if (Platform.OS === 'web') {
      console.warn('[Encryption] RSA key generation skipped on Web (Native only for now)');
      return null;
    }

    try {
      const RSA = getRSA();
      const SecureStore = getSecureStore();
      
      if (!RSA || !SecureStore) {
        console.warn('[Encryption] RSA/SecureStore discovery failed. This usually means you are running in Expo Go or haven\'t run "npx expo run:android" after installing native dependencies. E2EE will be disabled.');
        return null;
      }

      console.log('[Encryption] Generating RSA 2048 key pair...');
      const keys = await RSA.generateKeys(2048);
      
      // Store Private Key in Secure Store
      await SecureStore.setItemAsync(PRIVATE_KEY_TAG, keys.private);
      // Store Public Key in persistent storage for quick access
      await AsyncStorage.setItem(PUBLIC_KEY_TAG, keys.public);

      console.log('[Encryption] Key pair generated and stored successfully');
      return keys.public;
    } catch (error: any) {
      if (error.message?.includes('Cannot find native module')) {
         console.warn('[Encryption] Native module not found. Please build the native app.');
      } else {
         console.error('[Encryption] Key generation failed:', error);
      }
      return null;
    }
  }

  /**
   * Retrieves the stored Public Key or generates a new one if missing.
   */
  static async getOrGeneratePublicKey(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    let publicKey = await AsyncStorage.getItem(PUBLIC_KEY_TAG);
    if (!publicKey) {
      publicKey = await this.generateKeyPair();
    }
    return publicKey;
  }

  /**
   * Sends the Public Key to the backend.
   */
  static async syncPublicKeyWithServer(publicKey: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/update-public-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ publicKey })
      });

      const data = await response.json();
      return response.ok;
    } catch (error) {
      console.error('[Encryption] Failed to sync public key:', error);
      return false;
    }
  }

  /**
   * Encrypts a string using Hybrid Encryption (AES for data, RSA for key).
   */
  static async encrypt(text: string, publicKey: string): Promise<string | null> {
    if (Platform.OS === 'web' || !publicKey) return text;

    try {
      const RSA = getRSA();
      if (!RSA) return text;

      // 1. Generate a random AES key
      const aesKey = CryptoJS.lib.WordArray.random(16).toString();
      
      // 2. Encrypt text with AES
      const encryptedContent = CryptoJS.AES.encrypt(text, aesKey).toString();
      
      // 3. Encrypt AES key with Recipient's RSA Public Key
      const encryptedKey = await RSA.encrypt(aesKey, publicKey);
      
      // 4. Combine: Prefix + EncryptedKey + "|" + EncryptedContent
      return `${E2E_PREFIX}${encryptedKey}|${encryptedContent}`;
    } catch (error) {
      console.error('[Encryption] Hybrid Encryption failed:', error);
      return text;
    }
  }

  /**
   * Decrypts a string using Hybrid Decryption.
   */
  static async decrypt(encryptedText: string): Promise<string | null> {
    if (Platform.OS === 'web' || !encryptedText.startsWith(E2E_PREFIX)) return encryptedText;

    try {
      const SecureStore = getSecureStore();
      const RSA = getRSA();
      if (!SecureStore || !RSA) return encryptedText;

      const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_TAG);
      if (!privateKey) throw new Error('Private key missing');

      // 1. Extract Encrypted Key and Encrypted Content
      const parts = encryptedText.substring(E2E_PREFIX.length).split('|');
      if (parts.length !== 2) return encryptedText;

      const [encryptedKey, encryptedContent] = parts;

      // 2. Decrypt AES key with my RSA Private Key
      const aesKey = await RSA.decrypt(encryptedKey, privateKey);
      
      // 3. Decrypt Content with AES
      const bytes = CryptoJS.AES.decrypt(encryptedContent, aesKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      return decrypted || encryptedText;
    } catch (error) {
      console.error('[Encryption] Hybrid Decryption failed:', error);
      return encryptedText; 
    }
  }

  /**
   * Checks if a message is encrypted.
   */
  static isEncrypted(text: string): boolean {
    return text.startsWith(E2E_PREFIX);
  }
}
