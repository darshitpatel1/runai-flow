// Real Firestore implementation that uses Firebase Admin SDK
import * as admin from 'firebase-admin';
import { COLLECTIONS } from "@shared/firestore-schema";

// Initialize the app if it hasn't been already
let app: admin.app.App;
try {
  if (admin.apps && admin.apps.length === 0) {
    app = admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin initialized successfully with project ID:', process.env.VITE_FIREBASE_PROJECT_ID);
  } else {
    app = admin.app();
    console.log('Using existing Firebase Admin app');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  throw error;
}

// Get Firestore database
const db = admin.firestore(app);

// Get Auth service
const auth = admin.auth(app);

// Helper to normalize a Firestore document
const normalizeDoc = (doc: admin.firestore.DocumentSnapshot): any => {
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

// Real Firestore storage implementation
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      const usersRef = db.collection(COLLECTIONS.USERS);
      const query = usersRef.where('firebaseUid', '==', firebaseUid);
      const querySnapshot = await query.get();
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return normalizeDoc(querySnapshot.docs[0]);
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      return null;
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    try {
      console.log(`Creating user with data:`, userData);
      
      const usersRef = db.collection(COLLECTIONS.USERS);
      
      // Check if user already exists
      const query = usersRef.where('firebaseUid', '==', userData.firebaseUid);
      const querySnapshot = await query.get();
      
      if (!querySnapshot.empty) {
        const existingUser = normalizeDoc(querySnapshot.docs[0]);
        return existingUser;
      }
      
      // Create the user document
      const docRef = await usersRef.add({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const userDoc = await docRef.get();
      return normalizeDoc(userDoc);
    } catch (error) {
      console.error("Error creating user:", error);
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
      
      const userDoc = await userRef.get();
      return normalizeDoc(userDoc);
    } catch (error) {
      console.error("Error updating user:", error);
      return null;
    }
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    try {
      console.log(`Getting connectors for user ${userId}`);
      
      const connectorsRef = db.collection(COLLECTIONS.CONNECTORS);
      const query = connectorsRef.where('userId', '==', userId);
      const querySnapshot = await query.get();
      
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting connectors:", error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      console.log(`Getting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const connectorDoc = await connectorRef.get();
      
      if (!connectorDoc.exists || connectorDoc.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(connectorDoc);
    } catch (error) {
      console.error("Error getting connector:", error);
      return null;
    }
  },
  
  async createConnector(connectorData: {
    userId: string;
    name: string;
    type: string;
    config: any;
  }) {
    try {
      console.log(`Creating connector for user ${connectorData.userId}`);
      
      const connectorsRef = db.collection(COLLECTIONS.CONNECTORS);
      const docRef = await connectorsRef.add({
        ...connectorData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const connectorDoc = await docRef.get();
      return normalizeDoc(connectorDoc);
    } catch (error) {
      console.error("Error creating connector:", error);
      return null;
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    config: any;
  }>) {
    try {
      console.log(`Updating connector ${connectorId} for user ${userId}`);
      
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const connectorDoc = await connectorRef.get();
      
      if (!connectorDoc.exists || connectorDoc.data()?.userId !== userId) {
        return null;
      }
      
      await connectorRef.update({
        ...connectorData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await connectorRef.get();
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error("Error updating connector:", error);
      return null;
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      console.log(`Deleting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = db.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const connectorDoc = await connectorRef.get();
      
      if (!connectorDoc.exists || connectorDoc.data()?.userId !== userId) {
        return false;
      }
      
      await connectorRef.delete();
      return true;
    } catch (error) {
      console.error("Error deleting connector:", error);
      return false;
    }
  },
  
  // Flow methods
  async getFlows(userId: string) {
    try {
      console.log(`Getting flows for user ${userId}`);
      
      const flowsRef = db.collection(COLLECTIONS.FLOWS);
      const query = flowsRef.where('userId', '==', userId);
      const querySnapshot = await query.get();
      
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting flows:", error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      console.log(`Getting flow ${flowId} for user ${userId}`);
      
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const flowDoc = await flowRef.get();
      
      if (!flowDoc.exists || flowDoc.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(flowDoc);
    } catch (error) {
      console.error("Error getting flow:", error);
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
    try {
      console.log(`Creating flow for user ${flowData.userId}`, flowData);
      
      const flowsRef = db.collection(COLLECTIONS.FLOWS);
      const docRef = await flowsRef.add({
        ...flowData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const flowDoc = await docRef.get();
      return normalizeDoc(flowDoc);
    } catch (error) {
      console.error("Error creating flow:", error);
      return null;
    }
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }>) {
    try {
      console.log(`Updating flow ${flowId} for user ${userId}`);
      console.log("Flow data:", JSON.stringify(flowData));
      
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const flowDoc = await flowRef.get();
      
      if (!flowDoc.exists || flowDoc.data()?.userId !== userId) {
        return null;
      }
      
      await flowRef.update({
        ...flowData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await flowRef.get();
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error("Error updating flow:", error);
      return null;
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      console.log(`Deleting flow ${flowId} for user ${userId}`);
      
      const flowRef = db.collection(COLLECTIONS.FLOWS).doc(flowId);
      const flowDoc = await flowRef.get();
      
      if (!flowDoc.exists || flowDoc.data()?.userId !== userId) {
        return false;
      }
      
      await flowRef.delete();
      return true;
    } catch (error) {
      console.error("Error deleting flow:", error);
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
    try {
      console.log(`Creating execution for flow ${executionData.flowId}`);
      
      const executionsRef = db.collection(COLLECTIONS.EXECUTIONS);
      const docRef = await executionsRef.add({
        ...executionData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const executionDoc = await docRef.get();
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error creating execution:", error);
      return null;
    }
  },
  
  async updateExecution(executionId: string, executionData: Partial<{
    status: string;
    finishedAt: Date;
    result: any;
    error: string;
  }>) {
    try {
      console.log(`Updating execution ${executionId}`);
      
      const executionRef = db.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
      await executionRef.update({
        ...executionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const executionDoc = await executionRef.get();
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error updating execution:", error);
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
    try {
      console.log(`Getting executions for user ${userId} with params:`, queryParams);
      
      const executionsRef = db.collection(COLLECTIONS.EXECUTIONS);
      let query: any = executionsRef.where('userId', '==', userId);
      
      if (queryParams.flowId) {
        query = query.where('flowId', '==', queryParams.flowId);
      }
      
      if (queryParams.status) {
        query = query.where('status', '==', queryParams.status);
      }
      
      // Add orderBy
      query = query.orderBy('createdAt', 'desc');
      
      // Add limit if provided
      if (queryParams.limit) {
        query = query.limit(queryParams.limit);
      }
      
      const querySnapshot = await query.get();
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting executions:", error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    try {
      console.log(`Getting execution ${executionId}`);
      
      const executionRef = db.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
      const executionDoc = await executionRef.get();
      
      if (!executionDoc.exists) {
        return null;
      }
      
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error getting execution:", error);
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
    try {
      console.log(`Adding execution log for execution ${logData.executionId}`);
      
      const logsRef = db.collection(COLLECTIONS.EXECUTION_LOGS);
      const docRef = await logsRef.add({
        ...logData,
        timestamp: logData.timestamp || admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const logDoc = await docRef.get();
      return normalizeDoc(logDoc);
    } catch (error) {
      console.error("Error adding execution log:", error);
      return null;
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      console.log(`Getting logs for execution ${executionId}`);
      
      const logsRef = db.collection(COLLECTIONS.EXECUTION_LOGS);
      const query = logsRef
        .where('executionId', '==', executionId)
        .orderBy('timestamp', 'asc');
      
      const querySnapshot = await query.get();
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting execution logs:", error);
      return [];
    }
  },
  
  // Data table methods
  async getTables(userId: string) {
    try {
      console.log(`Getting tables for user ${userId}`);
      
      const tablesRef = db.collection(COLLECTIONS.DATA_TABLES);
      const query = tablesRef.where('userId', '==', userId);
      const querySnapshot = await query.get();
      
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting tables:", error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      console.log(`Getting table ${tableId} for user ${userId}`);
      
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const tableDoc = await tableRef.get();
      
      if (!tableDoc.exists || tableDoc.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDoc(tableDoc);
    } catch (error) {
      console.error("Error getting table:", error);
      return null;
    }
  },
  
  async createTable(tableData: {
    userId: string;
    name: string;
    description: string;
    columns: any[];
  }) {
    try {
      console.log(`Creating table for user ${tableData.userId}`, tableData);
      
      const tablesRef = db.collection(COLLECTIONS.DATA_TABLES);
      const docRef = await tablesRef.add({
        ...tableData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const tableDoc = await docRef.get();
      return normalizeDoc(tableDoc);
    } catch (error) {
      console.error("Error creating table:", error);
      return null;
    }
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: any[];
  }>) {
    try {
      console.log(`Updating table ${tableId} for user ${userId}`);
      
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const tableDoc = await tableRef.get();
      
      if (!tableDoc.exists || tableDoc.data()?.userId !== userId) {
        return null;
      }
      
      await tableRef.update({
        ...tableData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await tableRef.get();
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error("Error updating table:", error);
      return null;
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      console.log(`Deleting table ${tableId} for user ${userId}`);
      
      const tableRef = db.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const tableDoc = await tableRef.get();
      
      if (!tableDoc.exists || tableDoc.data()?.userId !== userId) {
        return false;
      }
      
      // Delete the table
      await tableRef.delete();
      
      // Also delete all rows for this table
      const rowsRef = db.collection(COLLECTIONS.TABLE_ROWS);
      const rowsQuery = rowsRef.where('tableId', '==', tableId);
      const rowsSnapshot = await rowsQuery.get();
      
      // Delete each row
      const batch = db.batch();
      rowsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (rowsSnapshot.docs.length > 0) {
        await batch.commit();
      }
      
      return true;
    } catch (error) {
      console.error("Error deleting table:", error);
      return false;
    }
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    try {
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      const rowsRef = db.collection(COLLECTIONS.TABLE_ROWS);
      const query = rowsRef
        .where('tableId', '==', tableId)
        .orderBy('createdAt', 'desc')
        .limit(limit);
      
      const querySnapshot = await query.get();
      const rows = querySnapshot.docs.map(normalizeDoc);
      
      // Get total count
      const countQuery = rowsRef.where('tableId', '==', tableId);
      const countSnapshot = await countQuery.get();
      
      return {
        rows,
        total: countSnapshot.size
      };
    } catch (error) {
      console.error("Error getting table rows:", error);
      return {
        rows: [],
        total: 0
      };
    }
  },
  
  async createTableRow(rowData: {
    tableId: string;
    data: any;
  }) {
    try {
      console.log(`Creating row for table ${rowData.tableId}`);
      
      const rowsRef = db.collection(COLLECTIONS.TABLE_ROWS);
      const docRef = await rowsRef.add({
        ...rowData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const rowDoc = await docRef.get();
      return normalizeDoc(rowDoc);
    } catch (error) {
      console.error("Error creating table row:", error);
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
      
      const rowDoc = await rowRef.get();
      return normalizeDoc(rowDoc);
    } catch (error) {
      console.error("Error updating table row:", error);
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
      console.error("Error deleting table row:", error);
      return false;
    }
  }
};