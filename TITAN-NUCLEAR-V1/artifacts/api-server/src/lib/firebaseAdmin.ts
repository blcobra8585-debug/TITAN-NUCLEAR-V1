import * as admin from "firebase-admin";
import { logger } from "./logger";

let initialized = false;

export function getFirebaseAdmin(): admin.app.App {
  if (initialized) return admin.app();

  try {
    const serviceAccount = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"];

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        storageBucket: "ma-engineering-titan.firebasestorage.app",
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "ma-engineering-titan",
        storageBucket: "ma-engineering-titan.firebasestorage.app",
      });
    }

    initialized = true;
    logger.info("Firebase Admin initialized");
  } catch (err) {
    logger.error({ err }, "Firebase Admin init failed");
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
