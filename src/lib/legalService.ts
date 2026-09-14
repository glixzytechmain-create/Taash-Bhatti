/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LegalDocument } from '../types';
import { DEFAULT_TERMS_AND_CONDITIONS, DEFAULT_PRIVACY_POLICY } from '../data/defaultLegalDocs';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const LOCAL_STORAGE_TERMS_KEY = 'taash_bhatti_legal_terms';
const LOCAL_STORAGE_PRIVACY_KEY = 'taash_bhatti_legal_privacy';
const LEGAL_CHANGED_EVENT = 'taash_bhatti_legal_changed';

/**
 * Get cached or default Terms & Conditions
 */
export function getLocalTermsAndConditions(): LegalDocument {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_TERMS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.sections && parsed.sections.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached terms:', e);
  }
  return DEFAULT_TERMS_AND_CONDITIONS;
}

/**
 * Get cached or default Privacy Policy
 */
export function getLocalPrivacyPolicy(): LegalDocument {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_PRIVACY_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.sections && parsed.sections.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached privacy policy:', e);
  }
  return DEFAULT_PRIVACY_POLICY;
}

/**
 * Save updated Legal Document to Firestore and local cache
 */
export async function saveLegalDocument(
  docType: 'terms_and_conditions' | 'privacy_policy',
  documentData: LegalDocument,
  authorEmail: string = 'admin'
): Promise<void> {
  const payload: LegalDocument = {
    ...documentData,
    id: docType,
    updatedAt: new Date().toISOString(),
    updatedBy: authorEmail,
  };

  // Cache locally
  const storageKey = docType === 'terms_and_conditions' ? LOCAL_STORAGE_TERMS_KEY : LOCAL_STORAGE_PRIVACY_KEY;
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (e) {
    console.warn('Error saving to local storage:', e);
  }

  // Dispatch custom event for immediate UI update in the active window
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEGAL_CHANGED_EVENT, { detail: { docType, data: payload } }));
  }

  // Save to Firestore site_content collection
  try {
    const docRef = doc(db, 'site_content', docType);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.error(`Error persisting ${docType} to Firestore:`, error);
    throw error;
  }
}

/**
 * Fetch legal document from Firestore (or fallback to local/default)
 */
export async function fetchLegalDocument(
  docType: 'terms_and_conditions' | 'privacy_policy'
): Promise<LegalDocument> {
  try {
    const docRef = doc(db, 'site_content', docType);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as LegalDocument;
      const storageKey = docType === 'terms_and_conditions' ? LOCAL_STORAGE_TERMS_KEY : LOCAL_STORAGE_PRIVACY_KEY;
      localStorage.setItem(storageKey, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn(`Failed to fetch ${docType} from Firestore, using cache/default:`, e);
  }

  return docType === 'terms_and_conditions' ? getLocalTermsAndConditions() : getLocalPrivacyPolicy();
}

/**
 * Subscribe to real-time updates for legal documents
 */
export function subscribeToLegalDocument(
  docType: 'terms_and_conditions' | 'privacy_policy',
  callback: (doc: LegalDocument) => void
): () => void {
  // Initial callback with local data
  callback(docType === 'terms_and_conditions' ? getLocalTermsAndConditions() : getLocalPrivacyPolicy());

  // Listen to in-window updates
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail?.docType === docType && custom.detail?.data) {
      callback(custom.detail.data);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(LEGAL_CHANGED_EVENT, handleLocalEvent);
  }

  // Listen to Firestore
  try {
    const docRef = doc(db, 'site_content', docType);
    const unsubscribeSnapshot = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as LegalDocument;
          const storageKey = docType === 'terms_and_conditions' ? LOCAL_STORAGE_TERMS_KEY : LOCAL_STORAGE_PRIVACY_KEY;
          try {
            localStorage.setItem(storageKey, JSON.stringify(data));
          } catch (e) {}
          callback(data);
        }
      },
      (err) => {
        console.warn(`Error in onSnapshot for ${docType}:`, err);
      }
    );

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LEGAL_CHANGED_EVENT, handleLocalEvent);
      }
      unsubscribeSnapshot();
    };
  } catch (err) {
    console.warn('Firestore subscription failed, using local only:', err);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LEGAL_CHANGED_EVENT, handleLocalEvent);
      }
    };
  }
}
