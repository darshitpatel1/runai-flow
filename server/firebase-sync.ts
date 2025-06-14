import admin from 'firebase-admin';
import { storage } from './storage';

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

function initializeFirebase() {
  if (firebaseApp) return firebaseApp;
  
  try {
    // Check if we have Firebase service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccount) {
      const credentials = JSON.parse(serviceAccount);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(credentials)
      });
    } else {
      console.log('Firebase service account not configured, using default initialization');
      // For development, try to initialize with default credentials
      firebaseApp = admin.initializeApp();
    }
    
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

interface FirebaseConnector {
  id: string;
  name: string;
  baseUrl: string;
  authType: string;
  auth: any;
  headers?: any[];
  connectionStatus?: string;
  createdAt?: any;
  updatedAt?: any;
}

export class FirebaseConnectorSync {
  private db: admin.firestore.Firestore | null = null;

  constructor() {
    const app = initializeFirebase();
    if (app) {
      this.db = app.firestore();
    }
  }

  async syncConnectorToPostgres(userId: string, connectorId: string, connectorData: FirebaseConnector): Promise<void> {
    try {
      // Get the PostgreSQL user ID from Firebase UID
      const pgUser = await storage.getUserByFirebaseUid(userId);
      if (!pgUser) {
        console.error(`No PostgreSQL user found for Firebase UID: ${userId}`);
        return;
      }

      // Check if connector already exists in PostgreSQL
      const existingConnectors = await storage.getConnectors(pgUser.id);
      const existingConnector = existingConnectors.find(c => c.name === connectorData.name);

      const connectorPayload = {
        userId: pgUser.id,
        name: connectorData.name,
        baseUrl: connectorData.baseUrl,
        authType: connectorData.authType,
        authConfig: connectorData.auth,
        headers: connectorData.headers
      };

      if (existingConnector) {
        // Update existing connector
        await storage.updateConnector(pgUser.id, existingConnector.id, {
          name: connectorPayload.name,
          baseUrl: connectorPayload.baseUrl,
          authType: connectorPayload.authType,
          authConfig: connectorPayload.authConfig,
          headers: connectorPayload.headers
        });
        console.log(`Updated connector ${connectorData.name} in PostgreSQL`);
      } else {
        // Create new connector
        await storage.createConnector(connectorPayload);
        console.log(`Created connector ${connectorData.name} in PostgreSQL`);
      }
    } catch (error) {
      console.error(`Failed to sync connector ${connectorId} to PostgreSQL:`, error);
    }
  }

  async syncConnectorFromPostgres(userId: string, connectorName: string, updatedAuth: any): Promise<void> {
    if (!this.db) {
      console.error('Firebase not initialized, cannot sync back to Firebase');
      return;
    }

    try {
      // Find the connector in Firebase and update it
      const userConnectorsRef = this.db.collection('users').doc(userId).collection('connectors');
      const querySnapshot = await userConnectorsRef.where('name', '==', connectorName).get();

      if (!querySnapshot.empty) {
        const connectorDoc = querySnapshot.docs[0];
        await connectorDoc.ref.update({
          auth: updatedAuth,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Updated Firebase connector ${connectorName} with refreshed auth`);
      }
    } catch (error) {
      console.error(`Failed to sync updated auth back to Firebase:`, error);
    }
  }

  async getAllFirebaseConnectors(): Promise<Array<{ userId: string; connectorId: string; connector: FirebaseConnector }>> {
    if (!this.db) {
      console.log('Firebase not initialized, cannot fetch connectors');
      return [];
    }

    try {
      const connectors: Array<{ userId: string; connectorId: string; connector: FirebaseConnector }> = [];
      
      // Get all users
      const usersSnapshot = await this.db.collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get connectors for this user
        const connectorsSnapshot = await userDoc.ref.collection('connectors').get();
        
        for (const connectorDoc of connectorsSnapshot.docs) {
          const connectorData = connectorDoc.data() as FirebaseConnector;
          connectorData.id = connectorDoc.id;
          
          connectors.push({
            userId,
            connectorId: connectorDoc.id,
            connector: connectorData
          });
        }
      }
      
      return connectors;
    } catch (error) {
      console.error('Failed to fetch Firebase connectors:', error);
      return [];
    }
  }

  async syncAllConnectorsToPostgres(): Promise<void> {
    console.log('Syncing all Firebase connectors to PostgreSQL...');
    
    const firebaseConnectors = await this.getAllFirebaseConnectors();
    
    for (const { userId, connectorId, connector } of firebaseConnectors) {
      await this.syncConnectorToPostgres(userId, connectorId, connector);
    }
    
    console.log(`Synced ${firebaseConnectors.length} connectors to PostgreSQL`);
  }

  async getOAuthConnectorsNeedingRefresh(): Promise<Array<{ userId: string; connectorName: string; auth: any }>> {
    const firebaseConnectors = await this.getAllFirebaseConnectors();
    const needsRefresh: Array<{ userId: string; connectorName: string; auth: any }> = [];
    
    for (const { userId, connector } of firebaseConnectors) {
      if (connector.authType === 'oauth2' && connector.auth?.accessToken) {
        const auth = connector.auth;
        
        // Check if token is expired or will expire soon (within 10 minutes)
        if (auth.tokenExpiresAt) {
          const expiryTime = new Date(auth.tokenExpiresAt).getTime();
          const currentTime = Date.now();
          const bufferTime = 10 * 60 * 1000; // 10 minutes
          
          if ((expiryTime - currentTime) <= bufferTime) {
            needsRefresh.push({
              userId,
              connectorName: connector.name,
              auth
            });
          }
        }
      }
    }
    
    return needsRefresh;
  }
}

export const firebaseSync = new FirebaseConnectorSync();