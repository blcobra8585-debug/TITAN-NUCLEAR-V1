import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { Platform } from "react-native";

// NOTE: auth and storage removed — not used anywhere in the app.
// getAuth() was causing unnecessary Firebase Auth init on startup
// which slows down and can crash the app on Android cold starts.

const firebaseConfig = {
  apiKey: "AIzaSyBm0qftjdqRoH34VWWc0Tgz4kUcVA1LkXE",
  authDomain: "ma-engineering-titan.firebaseapp.com",
  projectId: "ma-engineering-titan",
  storageBucket: "ma-engineering-titan.firebasestorage.app",
  messagingSenderId: "132870376585",
  appId: "1:132870376585:android:6ab5faa40b6e5da5390a58",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Offline Mode: quotes/leads read+write locally even with no internet, then
// auto-sync to the cloud the moment connectivity returns. Web uses a
// multi-tab-safe persistent cache; native falls back to Firestore's default
// (already offline-capable) memory cache to avoid IndexedDB issues on RN.
let firestoreDb;
try {
  firestoreDb =
    Platform.OS === "web"
      ? initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        })
      : initializeFirestore(app, { localCache: memoryLocalCache() });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export default app;
