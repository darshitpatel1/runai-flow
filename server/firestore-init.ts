// Properly initialize Firebase Admin for server-side operations
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';
import * as firestore from 'firebase/firestore';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully with project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Export the admin DB instance
export const db = admin.firestore();

// Helper function to convert Firestore timestamps to Date objects
export function convertTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : null;
}

// Helper function to normalize Firestore document
export function normalizeDoc(doc: admin.firestore.DocumentSnapshot): any {
  if (!doc.exists) return null;
  
  const data = doc.data() || {};
  
  // Convert timestamps to dates
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key].toDate === 'function') {
      data[key] = data[key].toDate();
    }
  });
  
  return {
    id: doc.id,
    ...data
  };
}

// Implementation using Firebase Admin for Firestore operations
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
    
    try {
      const usersRef = db.collection(COLLECTIONS.USERS);
      const snapshot = await usersRef.where('firebaseUid', '==', firebaseUid).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      return normalizeDoc(snapshot.docs[0]);
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return null;
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    console.log(`Creating user with data:`, userData);
    
    try {
      // Check if user already exists
      const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
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
    console.log(`Updating user ${userId} with data:`, userData);
    
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
  
  // Connector methods
  async getConnectors(userId: string) {
    console.log(`Getting connectors for user ${userId}`);
    
    try {
      const connectorsRef = db.collection(COLLECTIONS.CONNECTORS);
      const snapshot = await connectorsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    console.log(`Getting connector ${connectorId} for user ${userId}`);
    
    try {
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting connector:', error);
      return null;
    }
  },
  
  async createConnector(connectorData: {
    userId: string;
    name: string;
    type: string;
    config: any;
  }) {
    console.log(`Creating connector for user ${connectorData.userId}`);
    
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
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    config: any;
  }>) {
    console.log(`Updating connector ${connectorId} for user ${userId}`);
    
    try {
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
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
    console.log(`Deleting connector ${connectorId} for user ${userId}`);
    
    try {
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const doc = await connectorRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }
      
      await connectorRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting connector:', error);
      return false;
    }
  },
  
  // Flow methods
  async getFlows(userId: string) {
    console.log(`Getting flows for user ${userId}`);
    
    try {
      const flowsRef = db.collection(COLLECTIONS.FLOWS);
      const snapshot = await flowsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    console.log(`Getting flow ${flowId} for user ${userId}`);
    
    try {
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting flow:', error);
      return null;
    }
  },
  
  async createFlow(flowData: {
    userId: string;
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }) {
    console.log(`Creating flow for user ${flowData.userId}`);
    
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
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }>) {
    console.log(`Updating flow ${flowId} for user ${userId}`);
    console.log('Flow data:', JSON.stringify(flowData));
    
    try {
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
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
    console.log(`Deleting flow ${flowId} for user ${userId}`);
    
    try {
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const doc = await flowRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }
      
      await flowRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting flow:', error);
      return false;
    }
  },
  
  // Execution methods
  async createExecution(executionData: {
    userId: string;
    flowId: string;
    status: string;
    startedAt: Date;
    finishedAt?: Date;
    result?: any;
    error?: string;
  }) {
    console.log(`Creating execution for flow ${executionData.flowId}`);
    
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
  
  async updateExecution(executionId: string, executionData: Partial<{
    status: string;
    finishedAt: Date;
    result: any;
    error: string;
  }>) {
    console.log(`Updating execution ${executionId}`);
    
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
  
  async getExecutions(userId: string, queryParams: {
    limit?: number;
    offset?: number;
    flowId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    console.log(`Getting executions for user ${userId} with params:`, queryParams);
    
    try {
      let query = db.collection(COLLECTIONS.EXECUTIONS).where('userId', '==', userId);
      
      if (queryParams.flowId) {
        query = query.where('flowId', '==', queryParams.flowId);
      }
      
      if (queryParams.status) {
        query = query.where('status', '==', queryParams.status);
      }
      
      // Apply date filters if provided
      // Note: Compound queries with range filters on different fields not supported
      
      // Order by creation date descending
      query = query.orderBy('createdAt', 'desc');
      
      // Apply limit if provided
      if (queryParams.limit) {
        query = query.limit(queryParams.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting executions:', error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    console.log(`Getting execution ${executionId}`);
    
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
  
  async addExecutionLog(logData: {
    executionId: string;
    nodeId: string;
    level: string;
    message: string;
    timestamp?: Date;
    data?: any;
  }) {
    console.log(`Adding execution log for execution ${logData.executionId}`);
    
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
    console.log(`Getting logs for execution ${executionId}`);
    
    try {
      const logsRef = db.collection(COLLECTIONS.EXECUTION_LOGS);
      const snapshot = await logsRef
        .where('executionId', '==', executionId)
        .orderBy('timestamp', 'asc')
        .get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting execution logs:', error);
      return [];
    }
  },
  
  // Data table methods
  async getTables(userId: string) {
    console.log(`Getting tables for user ${userId}`);
    
    try {
      const tablesRef = db.collection(COLLECTIONS.DATA_TABLES);
      const snapshot = await tablesRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    console.log(`Getting table ${tableId} for user ${userId}`);
    
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(doc);
    } catch (error) {
      console.error('Error getting table:', error);
      return null;
    }
  },
  
  async createTable(tableData: {
    userId: string;
    name: string;
    description: string;
    columns: any[];
  }) {
    console.log(`Creating table for user ${tableData.userId}`, tableData);
    
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
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: any[];
  }>) {
    console.log(`Updating table ${tableId} for user ${userId}`);
    
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
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
    console.log(`Deleting table ${tableId} for user ${userId}`);
    
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
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
    console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
    
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
      
      const rows = snapshot.docs.map(doc => normalizeDoc(doc));
      
      return { rows, total };
    } catch (error) {
      console.error('Error getting table rows:', error);
      return { rows: [], total: 0 };
    }
  },
  
  async createTableRow(rowData: {
    tableId: string;
    data: any;
  }) {
    console.log(`Creating row for table ${rowData.tableId}`);
    
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
    console.log(`Updating row ${rowId} with data:`, data);
    
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
    console.log(`Deleting row ${rowId}`);
    
    try {
      const rowRef = db.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      await rowRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting table row:', error);
      return false;
    }
  }
};