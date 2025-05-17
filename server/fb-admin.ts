// Firebase Admin SDK initialization
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';

// Initialize Firebase Admin only once
let firebaseApp: admin.app.App;
if (!admin.apps.length) {
  try {
    // Initialize with just the project ID
    firebaseApp = admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
} else {
  firebaseApp = admin.apps[0]!;
  console.log('Using existing Firebase Admin app');
}

// Export the Firestore database and Auth instances
const db = admin.firestore();
const auth = admin.auth();

// Helper to normalize Firestore documents
function normalizeDoc(doc: any) {
  if (!doc || !doc.exists) return null;
  
  const data = doc.data();
  
  // Convert timestamps to dates
  if (data) {
    Object.keys(data).forEach(key => {
      if (data[key] && typeof data[key].toDate === 'function') {
        data[key] = data[key].toDate();
      }
    });
  }
  
  return {
    id: doc.id,
    ...data
  };
}

// Create the storage implementation with Firestore
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      const usersRef = db.collection(COLLECTIONS.USERS);
      const snapshot = await usersRef.where('firebaseUid', '==', firebaseUid).get();
      
      if (snapshot.empty) {
        console.log('No user found with that Firebase UID');
        return null;
      }
      
      return normalizeDoc(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return null;
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    try {
      console.log(`Creating user with data:`, userData);
      
      // Check if user already exists
      const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        console.log('User already exists, returning existing user');
        return existingUser;
      }
      
      // Create new user
      const docRef = await db.collection(COLLECTIONS.USERS).add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const doc = await docRef.get();
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    try {
      console.log(`Updating user ${userId} with data:`, userData);
      
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
      console.log(`Getting tables for user ${userId}`);
      
      const tablesRef = db.collection(COLLECTIONS.DATA_TABLES);
      const snapshot = await tablesRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      console.log(`Getting table ${tableId} for user ${userId}`);
      
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
        console.log('Table not found or does not belong to user');
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
      console.log(`Creating table for user ${tableData.userId}:`, tableData);
      
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
      console.log(`Updating table ${tableId} for user ${userId}:`, tableData);
      
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
        console.log('Table not found or does not belong to user');
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
      console.log(`Deleting table ${tableId} for user ${userId}`);
      
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
        console.log('Table not found or does not belong to user');
        return false;
      }
      
      // Delete the table
      await tableRef.delete();
      
      // Delete all rows for this table
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
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      const rowsRef = db.collection(COLLECTIONS.TABLE_ROWS);
      
      // Get total count
      const countSnapshot = await rowsRef.where('tableId', '==', tableId).get();
      const total = countSnapshot.size;
      
      // Get rows with pagination
      const snapshot = await rowsRef
        .where('tableId', '==', tableId)
        .orderBy('createdAt', 'desc')
        .limit(Number(limit))
        .get();
      
      const rows = snapshot.docs.map(doc => normalizeDoc(doc));
      
      return { rows, total };
    } catch (error) {
      console.error('Error getting table rows:', error);
      return { rows: [], total: 0 };
    }
  },
  
  async createTableRow(rowData: { tableId: string; data: any }) {
    try {
      console.log(`Creating row for table ${rowData.tableId}:`, rowData.data);
      
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
      console.log(`Updating row ${rowId} with data:`, data);
      
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
      console.log(`Deleting row ${rowId}`);
      
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
      console.log(`Getting flows for user ${userId}`);
      
      const flowsRef = db.collection(COLLECTIONS.FLOWS);
      const snapshot = await flowsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      console.log(`Getting flow ${flowId} for user ${userId}`);
      
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log(`Creating flow for user ${flowData.userId}:`, flowData);
      
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
      console.log(`Updating flow ${flowId} for user ${userId}:`, flowData);
      
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log(`Deleting flow ${flowId} for user ${userId}`);
      
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log(`Getting connectors for user ${userId}`);
      
      const connectorsRef = db.collection(COLLECTIONS.CONNECTORS);
      const snapshot = await connectorsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      console.log(`Getting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log(`Creating connector for user ${connectorData.userId}:`, connectorData);
      
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
      console.log(`Updating connector ${connectorId} for user ${userId}:`, connectorData);
      
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log(`Deleting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log(`Creating execution for flow ${executionData.flowId}:`, executionData);
      
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
      console.log(`Updating execution ${executionId}:`, executionData);
      
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
      console.log(`Getting executions for user ${userId} with params:`, queryParams);
      
      let query: any = db.collection(COLLECTIONS.EXECUTIONS).where('userId', '==', userId);
      
      // Apply filters
      if (queryParams.flowId) {
        query = query.where('flowId', '==', queryParams.flowId);
      }
      
      if (queryParams.status) {
        query = query.where('status', '==', queryParams.status);
      }
      
      // Order by creation date descending
      query = query.orderBy('createdAt', 'desc');
      
      // Apply limit if provided
      if (queryParams.limit) {
        query = query.limit(Number(queryParams.limit));
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting executions:', error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    try {
      console.log(`Getting execution ${executionId}`);
      
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
      console.log(`Adding execution log for execution ${logData.executionId}:`, logData);
      
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
      console.log(`Getting logs for execution ${executionId}`);
      
      const logsRef = db.collection(COLLECTIONS.EXECUTION_LOGS);
      const snapshot = await logsRef
        .where('executionId', '==', executionId)
        .orderBy('timestamp', 'asc')
        .get();
      
      return snapshot.docs.map((doc: any) => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting execution logs:', error);
      return [];
    }
  }
};