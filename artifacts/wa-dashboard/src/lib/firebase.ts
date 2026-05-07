import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBm0qftjdqRoH34VWWc0Tgz4kUcVA1LkXE",
  authDomain: "ma-engineering-titan.firebaseapp.com",
  projectId: "ma-engineering-titan",
  storageBucket: "ma-engineering-titan.firebasestorage.app",
  messagingSenderId: "132870376585",
  appId: "1:132870376585:android:6ab5faa40b6e5da5390a58",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export default app;
