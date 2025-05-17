// Firebase storage implementation using Admin SDK for server-side operations
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // Just use project ID from environment variables - don't need full credentials
      // for this development environment
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully with project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Get Firestore database and Auth service
const firestoreDb = admin.firestore();
const auth = admin.auth();

// Helper to normalize document data
function normalizeDoc(doc) {
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
}

// Export the Firestore storage implementation
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      const usersRef = firestoreDb.collection(COLLECTIONS.USERS);
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
  
  async createUser(userData) {
    try {
      console.log(`Creating user with data:`, userData);
      
      // Check if user already exists
      const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        return existingUser;
      }
      
      // Create new user
      const docRef = await firestoreDb.collection(COLLECTIONS.USERS).add({
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
  
  async updateUser(userId, userData) {
    try {
      console.log(`Updating user ${userId} with data:`, userData);
      
      const userRef = firestoreDb.collection(COLLECTIONS.USERS).doc(userId);
      
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
  async getConnectors(userId) {
    try {
      console.log(`Getting connectors for user ${userId}`);
      
      const connectorsRef = firestoreDb.collection(COLLECTIONS.CONNECTORS);
      const snapshot = await connectorsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId, connectorId) {
    try {
      console.log(`Getting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = firestoreDb.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
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
  
  async createConnector(connectorData) {
    try {
      console.log(`Creating connector for user ${connectorData.userId}`);
      
      const docRef = await firestoreDb.collection(COLLECTIONS.CONNECTORS).add({
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
  
  async updateConnector(userId, connectorId, connectorData) {
    try {
      console.log(`Updating connector ${connectorId} for user ${userId}`);
      
      const connectorRef = firestoreDb.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
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
  
  async deleteConnector(userId, connectorId) {
    try {
      console.log(`Deleting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = firestoreDb.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
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
  async getFlows(userId) {
    try {
      console.log(`Getting flows for user ${userId}`);
      
      const flowsRef = firestoreDb.collection(COLLECTIONS.FLOWS);
      const snapshot = await flowsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId, flowId) {
    try {
      console.log(`Getting flow ${flowId} for user ${userId}`);
      
      const flowRef = firestoreDb.collection(COLLECTIONS.FLOWS).doc(flowId);
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
  
  async createFlow(flowData) {
    try {
      console.log(`Creating flow for user ${flowData.userId}`);
      
      const docRef = await firestoreDb.collection(COLLECTIONS.FLOWS).add({
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
  
  async updateFlow(userId, flowId, flowData) {
    try {
      console.log(`Updating flow ${flowId} for user ${userId}`);
      console.log('Flow data:', JSON.stringify(flowData));
      
      const flowRef = firestoreDb.collection(COLLECTIONS.FLOWS).doc(flowId);
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
  
  async deleteFlow(userId, flowId) {
    try {
      console.log(`Deleting flow ${flowId} for user ${userId}`);
      
      const flowRef = firestoreDb.collection(COLLECTIONS.FLOWS).doc(flowId);
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
  async createExecution(executionData) {
    try {
      console.log(`Creating execution for flow ${executionData.flowId}`);
      
      const docRef = await firestoreDb.collection(COLLECTIONS.EXECUTIONS).add({
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
  
  async updateExecution(executionId, executionData) {
    try {
      console.log(`Updating execution ${executionId}`);
      
      const executionRef = firestoreDb.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
      
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
  
  async getExecutions(userId, queryParams = {}) {
    try {
      console.log(`Getting executions for user ${userId} with params:`, queryParams);
      
      let query = firestoreDb.collection(COLLECTIONS.EXECUTIONS).where('userId', '==', userId);
      
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
        query = query.limit(queryParams.limit);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting executions:', error);
      return [];
    }
  },
  
  async getExecution(executionId) {
    try {
      console.log(`Getting execution ${executionId}`);
      
      const executionRef = firestoreDb.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
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
  
  async addExecutionLog(logData) {
    try {
      console.log(`Adding execution log for execution ${logData.executionId}`);
      
      const docRef = await firestoreDb.collection(COLLECTIONS.EXECUTION_LOGS).add({
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
  
  async getExecutionLogs(executionId) {
    try {
      console.log(`Getting logs for execution ${executionId}`);
      
      const logsRef = firestoreDb.collection(COLLECTIONS.EXECUTION_LOGS);
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
  async getTables(userId) {
    try {
      console.log(`Getting tables for user ${userId}`);
      
      const tablesRef = firestoreDb.collection(COLLECTIONS.DATA_TABLES);
      const snapshot = await tablesRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(doc => normalizeDoc(doc));
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId, tableId) {
    try {
      console.log(`Getting table ${tableId} for user ${userId}`);
      
      const tableRef = firestoreDb.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
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
  
  async createTable(tableData) {
    try {
      console.log(`Creating table for user ${tableData.userId}`, tableData);
      
      const docRef = await firestoreDb.collection(COLLECTIONS.DATA_TABLES).add({
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
  
  async updateTable(userId, tableId, tableData) {
    try {
      console.log(`Updating table ${tableId} for user ${userId}`);
      
      const tableRef = firestoreDb.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
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
  
  async deleteTable(userId, tableId) {
    try {
      console.log(`Deleting table ${tableId} for user ${userId}`);
      
      const tableRef = firestoreDb.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }
      
      // Delete the table
      await tableRef.delete();
      
      // Delete all rows for this table
      const rowsRef = firestoreDb.collection(COLLECTIONS.TABLE_ROWS);
      const rowsSnapshot = await rowsRef.where('tableId', '==', tableId).get();
      
      const batch = firestoreDb.batch();
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
  
  async getTableRows(tableId, limit = 100, offset = 0) {
    try {
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      const rowsRef = firestoreDb.collection(COLLECTIONS.TABLE_ROWS);
      
      // Get total count
      const countSnapshot = await rowsRef.where('tableId', '==', tableId).get();
      const total = countSnapshot.size;
      
      // Get rows with pagination
      const snapshot = await rowsRef
        .where('tableId', '==', tableId)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit))
        .get();
      
      const rows = snapshot.docs.map(doc => normalizeDoc(doc));
      
      return { rows, total };
    } catch (error) {
      console.error('Error getting table rows:', error);
      return { rows: [], total: 0 };
    }
  },
  
  async createTableRow(rowData) {
    try {
      console.log(`Creating row for table ${rowData.tableId}`);
      
      const docRef = await firestoreDb.collection(COLLECTIONS.TABLE_ROWS).add({
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
  
  async updateTableRow(rowId, data) {
    try {
      console.log(`Updating row ${rowId} with data:`, data);
      
      const rowRef = firestoreDb.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      
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
  
  async deleteTableRow(rowId) {
    try {
      console.log(`Deleting row ${rowId}`);
      
      const rowRef = firestoreDb.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      await rowRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting table row:', error);
      return false;
    }
  }
};