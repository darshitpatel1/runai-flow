// Firestore implementation for data storage using Firebase Admin SDK
import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS } from "@shared/firestore-schema";
import { adminDb, adminAuth } from './firebase-admin';

// Helper for generating IDs
const generateId = () => uuidv4();

// Helper to convert any Firestore Timestamps to regular Date objects
const convertTimestamps = (data: any) => {
  if (!data) return data;
  
  // Clone the data to avoid modifying the original
  const result = { ...data };
  
  // Look for fields that might be Firestore timestamps and convert to JS Date
  Object.keys(result).forEach(key => {
    const value = result[key];
    if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
      result[key] = value.toDate();
    } else if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {
      // Recursively convert nested objects
      result[key] = convertTimestamps(value);
    }
  });
  
  return result;
};

// Helper to normalize document data with its ID
const normalizeDoc = (doc: any) => {
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data();
  return convertTimestamps({
    id: doc.id,
    ...data
  });
};

// Firestore implementation using Admin SDK
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      const usersRef = adminDb.collection(COLLECTIONS.USERS);
      const query = usersRef.where('firebaseUid', '==', firebaseUid);
      const querySnapshot = await query.get();
      
      if (querySnapshot.empty) {
        // If the user doesn't exist, we'll create them from their Firebase Auth profile
        try {
          const userRecord = await adminAuth.getUser(firebaseUid);
          
          if (userRecord) {
            // Create a new user in Firestore
            const newUser = {
              firebaseUid: userRecord.uid,
              email: userRecord.email || '',
              displayName: userRecord.displayName || '',
              photoUrl: userRecord.photoURL || '',
              createdAt: new Date()
            };
            
            const docRef = await usersRef.add(newUser);
            const createdUser = await docRef.get();
            
            return normalizeDoc(createdUser);
          }
        } catch (authError) {
          console.error("Error getting Firebase Auth user:", authError);
        }
        
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
      
      const usersRef = adminDb.collection(COLLECTIONS.USERS);
      
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
        createdAt: new Date()
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
      
      const userRef = adminDb.collection(COLLECTIONS.USERS).doc(userId);
      await userRef.update({
        ...userData,
        updatedAt: new Date()
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
      
      const connectorsRef = adminDb.collection(COLLECTIONS.CONNECTORS);
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
      
      const connectorRef = adminDb.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const connectorDoc = await connectorRef.get();
      
      if (!connectorDoc.exists || connectorDoc.data().userId !== userId) {
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
      
      const connectorsRef = adminDb.collection(COLLECTIONS.CONNECTORS);
      const docRef = await connectorsRef.add({
        ...connectorData,
        createdAt: new Date()
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
      
      const connectorRef = adminDb.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const connectorDoc = await connectorRef.get();
      
      if (!connectorDoc.exists || connectorDoc.data().userId !== userId) {
        return null;
      }
      
      await connectorRef.update({
        ...connectorData,
        updatedAt: new Date()
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
      
      const connectorRef = adminDb.collection(COLLECTIONS.CONNECTORS).doc(connectorId);
      const connectorDoc = await connectorRef.get();
      
      if (!connectorDoc.exists || connectorDoc.data().userId !== userId) {
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
      
      const flowsRef = adminDb.collection(COLLECTIONS.FLOWS);
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
      
      const flowRef = adminDb.collection(COLLECTIONS.FLOWS).doc(flowId);
      const flowDoc = await flowRef.get();
      
      if (!flowDoc.exists || flowDoc.data().userId !== userId) {
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
      
      const flowsRef = adminDb.collection(COLLECTIONS.FLOWS);
      const docRef = await flowsRef.add({
        ...flowData,
        createdAt: new Date()
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
      
      const flowRef = adminDb.collection(COLLECTIONS.FLOWS).doc(flowId);
      const flowDoc = await flowRef.get();
      
      if (!flowDoc.exists || flowDoc.data().userId !== userId) {
        return null;
      }
      
      await flowRef.update({
        ...flowData,
        updatedAt: new Date()
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
      
      const flowRef = adminDb.collection(COLLECTIONS.FLOWS).doc(flowId);
      const flowDoc = await flowRef.get();
      
      if (!flowDoc.exists || flowDoc.data().userId !== userId) {
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
      
      const executionsRef = adminDb.collection(COLLECTIONS.EXECUTIONS);
      const docRef = await executionsRef.add({
        ...executionData,
        createdAt: new Date()
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
      
      const executionRef = adminDb.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
      await executionRef.update({
        ...executionData,
        updatedAt: new Date()
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
      
      const executionsRef = adminDb.collection(COLLECTIONS.EXECUTIONS);
      let query = executionsRef.where('userId', '==', userId);
      
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
      
      const executionRef = adminDb.collection(COLLECTIONS.EXECUTIONS).doc(executionId);
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
      
      const logsRef = adminDb.collection(COLLECTIONS.EXECUTION_LOGS);
      const docRef = await logsRef.add({
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: new Date()
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
      
      const logsRef = adminDb.collection(COLLECTIONS.EXECUTION_LOGS);
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
      
      const tablesRef = adminDb.collection(COLLECTIONS.DATA_TABLES);
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
      
      const tableRef = adminDb.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const tableDoc = await tableRef.get();
      
      if (!tableDoc.exists || tableDoc.data().userId !== userId) {
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
      
      const tablesRef = adminDb.collection(COLLECTIONS.DATA_TABLES);
      const docRef = await tablesRef.add({
        ...tableData,
        createdAt: new Date()
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
      
      const tableRef = adminDb.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const tableDoc = await tableRef.get();
      
      if (!tableDoc.exists || tableDoc.data().userId !== userId) {
        return null;
      }
      
      await tableRef.update({
        ...tableData,
        updatedAt: new Date()
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
      
      const tableRef = adminDb.collection(COLLECTIONS.DATA_TABLES).doc(tableId);
      const tableDoc = await tableRef.get();
      
      if (!tableDoc.exists || tableDoc.data().userId !== userId) {
        return false;
      }
      
      await tableRef.delete();
      
      // Also delete all rows from the table
      const rowsRef = adminDb.collection(COLLECTIONS.TABLE_ROWS);
      const rowsQuery = rowsRef.where('tableId', '==', tableId);
      const rowsSnapshot = await rowsQuery.get();
      
      // Batch delete rows
      const batch = adminDb.batch();
      rowsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error("Error deleting table:", error);
      return false;
    }
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    try {
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      const rowsRef = adminDb.collection(COLLECTIONS.TABLE_ROWS);
      const query = rowsRef
        .where('tableId', '==', tableId)
        .orderBy('createdAt', 'desc')
        .limit(limit);
      
      const querySnapshot = await query.get();
      const rows = querySnapshot.docs.map(normalizeDoc);
      
      // Get total count (in a real implementation, you'd use a counter document or another approach)
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
      
      const rowsRef = adminDb.collection(COLLECTIONS.TABLE_ROWS);
      const docRef = await rowsRef.add({
        ...rowData,
        createdAt: new Date()
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
      
      const rowRef = adminDb.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      await rowRef.update({
        data,
        updatedAt: new Date()
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
      
      const rowRef = adminDb.collection(COLLECTIONS.TABLE_ROWS).doc(rowId);
      await rowRef.delete();
      return true;
    } catch (error) {
      console.error("Error deleting table row:", error);
      return false;
    }
  }
};