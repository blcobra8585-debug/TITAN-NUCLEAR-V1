import * as admin from "firebase-admin";
import { logger } from "./logger";
import { sendTelegramAlert } from "./telegramAlert";

let initialized = false;

export function getFirebaseAdmin(): admin.app.App {
  if (initialized) return admin.app();

  try {
    const serviceAccount = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];

    // Fix(L1): use env var so bucket name doesn't need a code push when
    // the Firebase project changes. Falls back to the known default.
    const storageBucket =
      process.env["FIREBASE_STORAGE_BUCKET"] ?? "ma-engineering-titan.firebasestorage.app";

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        storageBucket,
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env["FIREBASE_PROJECT_ID"] ?? "ma-engineering-titan",
        storageBucket,
      });
    }

    initialized = true;
    logger.info("Firebase Admin initialized");
  } catch (err) {
    logger.error({ err }, "Firebase Admin init failed");
    sendTelegramAlert(
      "🔥 Firebase Admin Init Failed",
      err instanceof Error ? err.message : String(err),
      "firebaseAdmin/init",
    ).catch(() => {});
    // Do NOT call admin.app() below — if init failed there is no default
    // app registered, and admin.app() throws "no Firebase App '[DEFAULT]'
    // has been created", crashing every route that touches Firestore.
    // Throw a clear, catchable error instead so callers' existing
    // try/catch blocks can turn this into a 500 response.
    throw new Error(
      `Firebase Admin is not available: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return admin.app();
}

export function getFirestore() {
  getFirebaseAdmin();
  return admin.firestore();
}

export function getAuth() {
  getFirebaseAdmin();
  return admin.auth();
}
