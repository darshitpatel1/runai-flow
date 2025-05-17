import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK with a simplified approach for development
// In production, you would use proper service account credentials
let app;
try {
  // Check if app is already initialized
  app = admin.apps.length 
    ? admin.apps[0] 
    : admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        // Use a minimal credential for development purposes
        credential: admin.credential.applicationDefault()
      });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  // Create a minimal app for development purposes
  app = admin.apps.length 
    ? admin.apps[0] 
    : admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
      }, 'default-admin-app');
}

// Export the Firebase Admin services
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);

console.log('Firebase Admin SDK initialized with project:', process.env.VITE_FIREBASE_PROJECT_ID);