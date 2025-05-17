// Simple Firebase Admin setup
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';

// Only initialize if not already initialized
if (!admin.apps.length) {
  try {
    // Initialize with credentials
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    
    // Fallback initialization - more permissive
    try {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      console.log('Firebase Admin initialized with fallback');
    } catch (fallbackError) {
      console.error('Fallback initialization also failed:', fallbackError);
      throw fallbackError;
    }
  }
}

// Export the Firebase Admin services
export const db = admin.firestore();
export const auth = admin.auth();

// Set the Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

// Helper function to normalize a Firestore document
export const normalizeDoc = (doc: admin.firestore.DocumentSnapshot): any => {
  if (!doc.exists) return null;
  
  const data = doc.data() || {};
  
  // Convert Firebase timestamps to JavaScript dates
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key].toDate === 'function') {
      data[key] = data[key].toDate();
    }
  });
  
  return {
    id: doc.id,
    ...data,
  };
};

// Helper function to normalize query results
export const normalizeQueryResults = (snapshot: admin.firestore.QuerySnapshot): any[] => {
  return snapshot.docs.map(doc => normalizeDoc(doc));
};