import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Firebase initialization is handled automatically by @react-native-firebase/app 
// on native platforms using google-services.json and the Expo config plugin.
// For web, we keep the standard JS SDK initialization.


const firebaseConfig = {
    apiKey: "AIzaSyDOauy5XxF_8yIOy0e6D4qAZtJvPFkmeYQ",
    authDomain: "chat-app-cc3e1.firebaseapp.com",
    projectId: "chat-app-cc3e1",
    storageBucket: "chat-app-cc3e1.firebasestorage.app",
    messagingSenderId: "407520938248",
    appId: "1:407520938248:web:ce30a9c3c301d2f33484bd",
    measurementId: "G-01BKCZELJQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
// Note: Persistence might need to be configured differently if getReactNativePersistence is missing.
export const auth = getAuth(app);
