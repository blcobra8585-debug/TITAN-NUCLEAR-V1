import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { Platform } from "react-native";
import { diagLog, diagWarn } from "@/lib/diagnosticLog";

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

// Fix #0: initializeApp/getFirestore run at module load time and are on the
// import chain that _layout.tsx pulls in before the first screen mounts.
// If either throws (slow/not-ready native module on an Android cold start,
// a Firestore SDK/storageBucket mismatch, etc.) the whole app used to crash
// instantly with no UI and no way for ErrorBoundary to catch it (it only
// catches React render-time errors, not module-import-time throws).
// Everything below is guarded so a failure here degrades to "Firebase is
// unavailable" instead of crashing the app.
export let firebaseReady = false;

let _app: ReturnType<typeof initializeApp> | undefined;

// Fix: export let so ES module live binding is updated after successful retry.
// Consumers that import `db` directly will see the updated reference because
// ES named imports are live bindings — assigning here is reflected everywhere.
export let db: ReturnType<typeof getFirestore> | undefined = undefined;

// Keep default export in sync (used by some callers as `import app from './firebase'`)
export default undefined as ReturnType<typeof initializeApp> | undefined;

function initFirebaseOnce(): void {
  try {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

    // Offline Mode: quotes/leads read+write locally even with no internet, then
    // auto-sync to the cloud the moment connectivity returns. Web uses a
    // multi-tab-safe persistent cache; native falls back to Firestore's default
    // (already offline-capable) memory cache to avoid IndexedDB issues on RN.
    let firestoreDb: ReturnType<typeof getFirestore>;
    try {
      firestoreDb =
        Platform.OS === "web"
          ? initializeFirestore(_app, {
              localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            })
          : initializeFirestore(_app, { localCache: memoryLocalCache() });
    } catch {
      firestoreDb = getFirestore(_app);
    }

    // Assign live binding — callers who already imported `db` will see this value
    // because ES named exports are live references, not copies.
    db = firestoreDb;
    firebaseReady = true;
    diagLog("firebase", "initialized ✓ (project: ma-engineering-titan)");
  } catch (err) {
    // Never let a Firebase init failure crash the app at import time.
    // Consumers must check firebaseReady before touching `db`.
    firebaseReady = false;
    db = undefined;
    const msg = err instanceof Error ? err.message : String(err);
    diagWarn("firebase", `init failed — degraded/offline mode: ${msg}`);
    // eslint-disable-next-line no-console
    console.warn("[firebase] init failed — app will run in degraded/offline mode:", err);
  }
}

// Delay init by 150 ms — gives Hermes + TurboModules (New Architecture) time
// to finish registering native modules before Firebase JS SDK touches them.
// Calling initFirebaseOnce() synchronously at module load used to cause a hang
// on some Android cold starts with newArchEnabled: true.
setTimeout(() => {
  initFirebaseOnce();
  if (!firebaseReady) {
    diagLog("firebase", "retrying init in 1.5s…");
    setTimeout(() => {
      initFirebaseOnce();
      if (!firebaseReady) {
        diagWarn("firebase", "retry also failed — Firestore unavailable this session");
      }
    }, 1500);
  }
}, 150);
