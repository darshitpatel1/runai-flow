// Simplified Firebase Admin SDK implementation
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';

// Initialize Firebase Admin SDK only once (with error handling)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
    console.log('Firebase Admin SDK initialized with project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Export Firestore database reference
export const db = admin.firestore();

// Helper function to normalize a document
function normalizeDoc(doc: any) {
  if (!doc || !doc.exists) return null;
  
  const data = doc.data();
  
  // Convert Firestore timestamps to JavaScript dates
  if (data) {
    Object.keys(data).forEach(key => {
      if (data[key] && typeof data[key]?.toDate === 'function') {
        data[key] = data[key].toDate();
      }
    });
  }
  
  return {
    id: doc.id,
    ...data
  };
}

// Simplified storage implementation with basic CRUD operations for each collection
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
    try {
      const usersRef = db.collection(COLLECTIONS.USERS);
      const snapshot = await usersRef.where('firebaseUid', '==', firebaseUid).get();
      
      if (snapshot.empty) {
        console.log('No matching user found');
        return null;
      }
      
      console.log('User found');
      return normalizeDoc(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return null;
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    console.log('Creating user with data:', userData);
    try {
      // Check if user already exists
      const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        console.log('User already exists in the database');
        return existingUser;
      }
      
      // Create new user
      const docRef = await db.collection(COLLECTIONS.USERS).add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('User created with ID:', docRef.id);
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    try {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      
      await userRef.update({
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await userRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },
  
  // Table methods
  async getTables(userId: string) {
    try {
      const tablesRef = db.collection(COLLECTIONS.DATA_TABLES);
      const snapshot = await tablesRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting table:', error);
      return null;
    }
  },
  
  async createTable(tableData: { userId: string; name: string; description: string; columns: any[] }) {
    try {
      const docRef = await db.collection(COLLECTIONS.DATA_TABLES).add({
        ...tableData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating table:', error);
      return null;
    }
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{ name: string; description: string; columns: any[] }>) {
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return null;
      }
      
      await tableRef.update({
        ...tableData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await tableRef.get();
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error('Error updating table:', error);
      return null;
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists) return false;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return false;
      }
      
      // Delete the table document
      await tableRef.delete();
      
      // Also delete all related rows
      const rowsRef = db.collection(COLLECTIONS.TABLE_ROWS);
      const rowsSnapshot = await rowsRef.where('tableId', '==', tableId).get();
      
      const batch = db.batch();
      rowsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (rowsSnapshot.size > 0) {
        await batch.commit();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting table:', error);
      return false;
    }
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    try {
      const rowsRef = db.collection(COLLECTIONS.TABLE_ROWS);
      
      // Get total count first
      const countSnapshot = await rowsRef.where('tableId', '==', tableId).get();
      const total = countSnapshot.size;
      
      // Get the rows with pagination
      const snapshot = await rowsRef
        .where('tableId', '==', tableId)
        .orderBy('createdAt', 'desc')
        .limit(Number(limit))
        .get();
      
      const rows = snapshot.docs.map(normalizeDoc);
      
      return { rows, total };
    } catch (error) {
      console.error('Error getting table rows:', error);
      return { rows: [], total: 0 };
    }
  },
  
  async createTableRow(rowData: { tableId: string; data: any }) {
    try {
      const docRef = await db.collection(COLLECTIONS.TABLE_ROWS).add({
        ...rowData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating table row:', error);
      return null;
    }
  },
  
  async updateTableRow(rowId: string, data: any) {
    try {
      const rowRef = db.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      
      await rowRef.update({
        data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await rowRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error updating table row:', error);
      return null;
    }
  },
  
  async deleteTableRow(rowId: string) {
    try {
      const rowRef = db.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      await rowRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting table row:', error);
      return false;
    }
  },
  
  // Flow methods
  async getFlows(userId: string) {
    try {
      const flowsRef = db.collection(COLLECTIONS.FLOWS);
      const snapshot = await flowsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting flow:', error);
      return null;
    }
  },
  
  async createFlow(flowData: { userId: string; name: string; description: string; nodes: any[]; edges: any[] }) {
    try {
      const docRef = await db.collection(COLLECTIONS.FLOWS).add({
        ...flowData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating flow:', error);
      return null;
    }
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{ name: string; description: string; nodes: any[]; edges: any[] }>) {
    try {
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return null;
      }
      
      await flowRef.update({
        ...flowData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await flowRef.get();
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error('Error updating flow:', error);
      return null;
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      if (!doc.exists) return false;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return false;
      }
      
      await flowRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting flow:', error);
      return false;
    }
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    try {
      const connectorsRef = db.collection(COLLECTIONS.CONNECTORS);
      const snapshot = await connectorsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting connector:', error);
      return null;
    }
  },
  
  async createConnector(connectorData: { userId: string; name: string; type: string; config: any }) {
    try {
      const docRef = await db.collection(COLLECTIONS.CONNECTORS).add({
        ...connectorData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating connector:', error);
      return null;
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{ name: string; config: any }>) {
    try {
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      if (!doc.exists) return null;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return null;
      }
      
      await connectorRef.update({
        ...connectorData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await connectorRef.get();
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error('Error updating connector:', error);
      return null;
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      if (!doc.exists) return false;
      
      const data = doc.data();
      if (data?.userId !== userId) {
        return false;
      }
      
      await connectorRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting connector:', error);
      return false;
    }
  },
  
  // Execution methods
  async createExecution(executionData: { userId: string; flowId: string; status: string; startedAt: Date; finishedAt?: Date; result?: any; error?: string }) {
    try {
      const docRef = await db.collection(COLLECTIONS.EXECUTIONS).add({
        ...executionData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating execution:', error);
      return null;
    }
  },
  
  async updateExecution(executionId: string, executionData: Partial<{ status: string; finishedAt: Date; result: any; error: string }>) {
    try {
      const executionRef = db.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
      
      await executionRef.update({
        ...executionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await executionRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error updating execution:', error);
      return null;
    }
  },
  
  async getExecutions(userId: string, queryParams: { limit?: number; offset?: number; flowId?: string; status?: string; startDate?: Date; endDate?: Date } = {}) {
    try {
      let queryRef = db.collection(COLLECTIONS.EXECUTIONS).where('userId', '==', userId);
      
      if (queryParams.flowId) {
        queryRef = queryRef.where('flowId', '==', queryParams.flowId);
      }
      
      if (queryParams.status) {
        queryRef = queryRef.where('status', '==', queryParams.status);
      }
      
      // Order by creation date descending
      queryRef = queryRef.orderBy('createdAt', 'desc');
      
      // Apply limit if provided
      if (queryParams.limit) {
        queryRef = queryRef.limit(Number(queryParams.limit));
      }
      
      const snapshot = await queryRef.get();
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting executions:', error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    try {
      const executionRef = db.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
      const doc = await executionRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting execution:', error);
      return null;
    }
  },
  
  async addExecutionLog(logData: { executionId: string; nodeId: string; level: string; message: string; timestamp?: Date; data?: any }) {
    try {
      const docRef = await db.collection(COLLECTIONS.EXECUTION_LOGS).add({
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error adding execution log:', error);
      return null;
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      const logsRef = db.collection(COLLECTIONS.EXECUTION_LOGS);
      const snapshot = await logsRef
        .where('executionId', '==', executionId)
        .orderBy('timestamp', 'asc')
        .get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting execution logs:', error);
      return [];
    }
  }
};