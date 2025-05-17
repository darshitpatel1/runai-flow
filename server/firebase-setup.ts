// Simplified Firebase setup for development
import * as admin from 'firebase-admin';

// Check if Firebase app is already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // Use environment variables for configuration
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

// Export the Firestore database instance
export const db = admin.firestore();
export const auth = admin.auth();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

// Simple function to convert Firestore timestamps to dates
export function convertTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return timestamp;
}

// Helper to normalize a Firestore document
export function normalizeDoc(doc: admin.firestore.DocumentSnapshot): any {
  if (!doc.exists) return null;
  const data = doc.data() || {};
  
  // Convert all timestamps to dates
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key].toDate === 'function') {
      data[key] = data[key].toDate();
    }
  });
  
  return {
    id: doc.id,
    ...data,
  };
}

// Helper to normalize query results
export function normalizeQueryResults(snapshot: admin.firestore.QuerySnapshot): any[] {
  return snapshot.docs.map(doc => normalizeDoc(doc));
}