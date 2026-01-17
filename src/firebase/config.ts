// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5DFVjl5Xd7k_TZIEsNf5ZqXlrqAzANuk",
    authDomain: "proneomanager.firebaseapp.com",
    projectId: "proneomanager",
    storageBucket: "proneomanager.firebasestorage.app",
    messagingSenderId: "1039439049102",
    appId: "1:1039439049102:web:e6b90687fb03cd6aab34df",
    measurementId: "G-NYMNXF6GL3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// ACTIVATING PRODUCTION MODE
export const isDemoMode = false;

export default app;
