import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

/**
 * ==============================================================================
 * سِجِل (Sejel) - تهيئة وإعداد Firebase
 * firebase.js - Firebase Client Initialization (Firestore, Auth, Google Provider)
 * ==============================================================================
 */

export const firebaseConfig = {
  apiKey: "AIzaSyDR0z-aYWC9PRfIZnw1A5DQL482fXTB2R0",
  authDomain: "segel-1b227.firebaseapp.com",
  projectId: "segel-1b227",
  storageBucket: "segel-1b227.firebasestorage.app",
  messagingSenderId: "340656361735",
  appId: "1:340656361735:web:97025c73feed07983335a2"
};

// Initialize Firebase App as Singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Services instances (Firestore & Auth)
export const db = getFirestore(app);
export const auth = getAuth(app);

// Configure Google Auth Provider with drive.file and calendar.events scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

export default app;
