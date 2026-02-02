import type { Firestore } from 'firebase/firestore';

let dbPromise: Promise<Firestore | null> | null = null;

function hasFirebaseConfig(): boolean {
  return !!(
    import.meta.env.VITE_ENABLE_FIRESTORE === 'true' &&
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );
}

async function initFirestore(): Promise<Firestore | null> {
  if (!hasFirebaseConfig()) return null;

  const { initializeApp } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');

  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  return getFirestore(app);
}

export function getDb(): Promise<Firestore | null> {
  if (!dbPromise) {
    dbPromise = initFirestore().catch(() => null);
  }
  return dbPromise;
}
