import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Use a default project ID for development if environment variable is missing
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "demo-project-id";

console.log(`Initializing Firebase Admin with project ID: ${projectId}`);

// Initialize Firebase Admin with application default credentials or a demo configuration
const app = initializeApp({
  projectId
});

// Get Firestore instance
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

// Export the app
export default app;