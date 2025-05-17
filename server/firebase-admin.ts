import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin with application default credentials
// In production, you would set up service account credentials
const app = initializeApp({
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

export default app;