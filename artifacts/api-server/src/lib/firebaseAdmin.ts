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
