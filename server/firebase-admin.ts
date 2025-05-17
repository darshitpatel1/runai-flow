import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Use environment variables for Firebase config
// Note: We use process.env directly for server-side env variables
// In a production environment, you would use service account credentials
const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'default-project-id',
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase Admin SDK with default credentials
// This works well for development and production environments
const app = admin.initializeApp({
  projectId: firebaseConfig.projectId
});

console.log(`Firebase Admin initialized with project ID: ${firebaseConfig.projectId}`);

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

export default app;