// Firebase Admin SDK initialization
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';

// Create a credential object with just the project ID
const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? admin.credential.applicationDefault()
  : admin.credential.cert({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    } as admin.ServiceAccount);

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
  console.log('Firebase Admin SDK initialized with project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
}

// Get Firestore database
const db = admin.firestore();

// Helper function to normalize a document
function normalizeDoc(doc) {
  if (!doc || !doc.exists) return null;
  
  const data = doc.data();
  
  // Convert Firebase timestamps to JavaScript dates
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

// Storage implementation for Firestore
export const firestoreStorage = {
  // Table methods
  async getTables(userId) {
    try {
      const tablesRef = db.collection(COLLECTIONS.DATA_TABLES);
      const snapshot = await tablesRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId, tableId) {
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      console.log('Creating table:', tableData);
      
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
  
  async updateTable(userId, tableId, tableData) {
    try {
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const doc = await tableRef.get();
      
      const data = doc.data();
      if (!doc.exists || !data || data.userId !== userId) {
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
  
  async getTableRows(tableId, limit = 100, offset = 0) {
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
  
  async createTableRow(rowData) {
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
  
  async updateTableRow(rowId, data) {
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
  
  async deleteTableRow(rowId) {
    try {
      const rowRef = db.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      await rowRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting table row:', error);
      return false;
    }
  },
  
  // User methods
  async getUserByFirebaseUid(firebaseUid) {
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
  
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
      if (existingUser) {
        return existingUser;
      }
      
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
  
  async updateUser(userId, userData) {
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
  
  // Flow methods
  async getFlows(userId) {
    try {
      const flowsRef = db.collection(COLLECTIONS.FLOWS);
      const snapshot = await flowsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId, flowId) {
    try {
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
  
  async createFlow(flowData) {
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
  
  async updateFlow(userId, flowId, flowData) {
    try {
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
  
  async deleteFlow(userId, flowId) {
    try {
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
  async getConnectors(userId) {
    try {
      const connectorsRef = db.collection(COLLECTIONS.CONNECTORS);
      const snapshot = await connectorsRef.where('userId', '==', userId).get();
      
      return snapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId, connectorId) {
    try {
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
  
  async createConnector(connectorData) {
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
  
  async updateConnector(userId, connectorId, connectorData) {
    try {
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
  
  async deleteConnector(userId, connectorId) {
    try {
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
  async createExecution(executionData) {
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
  
  async updateExecution(executionId, executionData) {
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
  
  async getExecutions(userId, queryParams = {}) {
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
  
  async getExecution(executionId) {
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
  
  async addExecutionLog(logData) {
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
  
  async getExecutionLogs(executionId) {
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