/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Ensure local persistence so user session is retained across page reloads and browser reopens
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase setPersistence warning:', err);
});

const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom databaseId if provided
const db = firebaseConfig.firestoreDatabaseId 
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

// Validate Connection to Firestore (MANDATORY constraint)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection test successful.');
  } catch (error: any) {
    const isOffline =
      error?.code === 'unavailable' ||
      (error instanceof Error &&
        (error.message.includes('offline') ||
         error.message.includes('Could not reach Cloud Firestore') ||
         error.message.includes('could not be completed')));

    if (isOffline) {
      console.warn('Firestore initialized (operating in offline/reconnecting mode).');
    } else {
      console.log('Firebase connection initialized (non-blocking validation).');
    }
  }
}
testConnection();

export { app, auth, db, googleProvider };
