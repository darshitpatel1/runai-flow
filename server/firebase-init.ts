import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin with application default credentials
const app = initializeApp({
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});

// Get Firestore instance
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

// Export the app
export default app;