/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firebase Analytics safely for browser environments
let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this client environment
  });
}

// Ensure local persistence so user session is retained across page reloads and browser reopens
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase setPersistence warning:', err);
});

const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom databaseId if provided (and not '(default)')
const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function syncPartnerToFirebaseAuth(emailStr: string, passStr: string): Promise<{ success: boolean; message: string; uid?: string }> {
  try {
    const res = await createUserWithEmailAndPassword(auth, emailStr.trim().toLowerCase(), passStr.trim());
    return { success: true, message: 'Firebase Auth Account Provisioned', uid: res.user.uid };
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      return { success: true, message: 'Existing Firebase Auth Account Found' };
    }
    return { success: false, message: err.message || 'Failed to sync Firebase Auth' };
  }
}

/**
 * Recursively sanitizes data before sending to Firestore.
 * Removes `undefined` values and converts NaN/Infinity numbers to 0 to prevent Firestore errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const cleaned = sanitizeForFirestore(value);
        if (cleaned !== undefined) {
          cleanObj[key] = cleaned;
        }
      }
    }
    return cleanObj as any;
  }
  if (typeof data === 'number') {
    if (Number.isNaN(data) || !Number.isFinite(data)) {
      return 0 as any;
    }
  }
  return data;
}

export interface FirebaseDiagnostics {
  projectId: string;
  authDomain: string;
  firestoreStatus: 'connected' | 'not_enabled' | 'offline' | 'error';
  firestoreMessage: string;
  authStatus: 'connected' | 'not_enabled' | 'error';
  authMessage: string;
  consoleFirestoreUrl: string;
  consoleAuthUrl: string;
}

export async function checkFirebaseDiagnostics(): Promise<FirebaseDiagnostics> {
  const pId = firebaseConfig.projectId || 'taash-bhatti';
  const diag: FirebaseDiagnostics = {
    projectId: pId,
    authDomain: firebaseConfig.authDomain || `${pId}.firebaseapp.com`,
    firestoreStatus: 'connected',
    firestoreMessage: 'Firestore is live and responding.',
    authStatus: 'connected',
    authMessage: 'Firebase Authentication service is reachable.',
    consoleFirestoreUrl: `https://console.firebase.google.com/project/${pId}/firestore`,
    consoleAuthUrl: `https://console.firebase.google.com/project/${pId}/authentication`,
  };

  // 1. Verify Firestore Connection
  try {
    await getDocFromServer(doc(db, 'system_health', 'ping'));
    diag.firestoreStatus = 'connected';
    diag.firestoreMessage = 'Connected: Firestore database is active and ready.';
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('Cloud Firestore API has not been used') || msg.includes('disabled') || err?.code === 'permission-denied') {
      diag.firestoreStatus = 'not_enabled';
      diag.firestoreMessage = `Cloud Firestore Database has not been created yet in project '${pId}'. Click the link to create it in the Firebase Console.`;
    } else if (err?.code === 'unavailable' || msg.includes('offline') || msg.includes('Could not reach Cloud Firestore')) {
      diag.firestoreStatus = 'offline';
      diag.firestoreMessage = 'Operating in offline cache mode. Awaiting backend connection.';
    } else {
      diag.firestoreStatus = 'error';
      diag.firestoreMessage = msg;
    }
  }

  // 2. Verify Authentication Service
  try {
    await signInWithEmailAndPassword(auth, '__ping_check__@taashbhatti.internal', 'TestDummyPassword123!');
  } catch (err: any) {
    if (err?.code === 'auth/operation-not-allowed') {
      diag.authStatus = 'not_enabled';
      diag.authMessage = `Email/Password sign-in method is not enabled in Firebase Console for project '${pId}'. Click the link to enable it.`;
    } else if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/invalid-credential' ||
      err?.code === 'auth/wrong-password' ||
      err?.code === 'auth/invalid-email'
    ) {
      diag.authStatus = 'connected';
      diag.authMessage = 'Connected: Firebase Authentication engine is fully operational.';
    } else {
      diag.authStatus = 'error';
      diag.authMessage = err?.message || String(err);
    }
  }

  return diag;
}

// Validate Connection to Firestore (MANDATORY constraint)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log(`[Firebase] Firestore connection to project '${firebaseConfig.projectId}' verified.`);
  } catch (error: any) {
    const isOffline =
      error?.code === 'unavailable' ||
      (error instanceof Error &&
        (error.message.includes('offline') ||
         error.message.includes('Could not reach Cloud Firestore') ||
         error.message.includes('could not be completed')));

    if (isOffline) {
      console.warn(`[Firebase] Project '${firebaseConfig.projectId}' Firestore is operating in offline mode.`);
    } else {
      console.log(`[Firebase] Connection initialized for project '${firebaseConfig.projectId}'.`);
    }
  }
}
testConnection();

export { app, auth, db, googleProvider, analytics, firebaseConfig };
