import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
// In a production environment, you would use service account credentials
const app = admin.initializeApp({
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

export default app;