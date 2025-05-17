import * as admin from 'firebase-admin';

// Initialize Firebase Admin with the project credentials
const serviceAccount = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

// Make sure we only initialize once
let firebaseApp: admin.app.App;
if (!admin.apps.length) {
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
} else {
  firebaseApp = admin.apps[0]!;
}

// Export the initialized services
export const adminDb = admin.firestore(firebaseApp);
export const adminAuth = admin.auth(firebaseApp);

// Additional utility function for working with Firestore documents
export function normalizeDoc(doc: admin.firestore.DocumentSnapshot): any {
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
}

// Function to normalize query results
export function normalizeQueryResults(snapshot: admin.firestore.QuerySnapshot): any[] {
  return snapshot.docs.map(doc => normalizeDoc(doc));
}