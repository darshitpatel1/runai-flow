// Firebase Admin implementation
import * as admin from 'firebase-admin';

// Initialize the app if it hasn't been already
let app: admin.app.App;
if (!admin.apps.length) {
  app = admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
} else {
  app = admin.app();
}

// Export the Firebase Admin services
export const db = admin.firestore(app);
export const auth = admin.auth(app);

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

// Helper to normalize a Firestore document
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
    ...data
  };
};

// Helper to normalize query results
export const normalizeQueryResults = (snapshot: admin.firestore.QuerySnapshot): any[] => {
  return snapshot.docs.map(doc => normalizeDoc(doc));
};