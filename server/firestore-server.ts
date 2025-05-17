import { firestoreClient } from '../client/src/lib/firestore-client';

// Re-export the client for server use
export const firestoreStorage = firestoreClient;