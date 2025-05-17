// Real Firestore implementation using Firebase Admin SDK with proper initialization
import { adminDb } from "./firebase-admin-init";
import { collection, doc, query, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "@shared/firestore-schema";
import { v4 as uuidv4 } from 'uuid';

// Helper function to normalize document data and handle timestamps
function normalizeDocument(docSnapshot: any) {
  if (!docSnapshot.exists()) return null;
  
  const data = docSnapshot.data();
  
  // Convert timestamps to regular dates
  Object.keys(data).forEach(key => {
    if (data[key] && typeof data[key].toDate === 'function') {
      data[key] = data[key].toDate();
    }
  });
  
  return {
    id: docSnapshot.id,
    ...data
  };
}

// Real Firestore implementation
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      const usersCollection = collection(adminDb, COLLECTIONS.USERS);
      const q = query(usersCollection, where('firebaseUid', '==', firebaseUid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return normalizeDocument(querySnapshot.docs[0]);
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
        return existingUser;
      }
      
      // Create new user document
      const usersCollection = collection(adminDb, COLLECTIONS.USERS);
      const docRef = await addDoc(usersCollection, {
        ...userData,
        createdAt: serverTimestamp()
      });
      
      const userSnapshot = await getDoc(docRef);
      return normalizeDocument(userSnapshot);
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    try {
      console.log(`Updating user ${userId} with data:`, userData);
      
      const userRef = doc(adminDb, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
      
      const userSnapshot = await getDoc(userRef);
      return normalizeDocument(userSnapshot);
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    try {
      console.log(`Getting connectors for user ${userId}`);
      
      const connectorsCollection = collection(adminDb, COLLECTIONS.CONNECTORS);
      const q = query(connectorsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeDocument);
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      console.log(`Getting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = doc(adminDb, COLLECTIONS.CONNECTORS, connectorId);
      const connectorSnapshot = await getDoc(connectorRef);
      
      if (!connectorSnapshot.exists() || connectorSnapshot.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDocument(connectorSnapshot);
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
    try {
      console.log(`Creating connector for user ${connectorData.userId}`);
      
      const connectorsCollection = collection(adminDb, COLLECTIONS.CONNECTORS);
      const docRef = await addDoc(connectorsCollection, {
        ...connectorData,
        createdAt: serverTimestamp()
      });
      
      const connectorSnapshot = await getDoc(docRef);
      return normalizeDocument(connectorSnapshot);
    } catch (error) {
      console.error('Error creating connector:', error);
      return null;
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    config: any;
  }>) {
    try {
      console.log(`Updating connector ${connectorId} for user ${userId}`);
      
      const connectorRef = doc(adminDb, COLLECTIONS.CONNECTORS, connectorId);
      const connectorSnapshot = await getDoc(connectorRef);
      
      if (!connectorSnapshot.exists() || connectorSnapshot.data()?.userId !== userId) {
        return null;
      }
      
      await updateDoc(connectorRef, {
        ...connectorData,
        updatedAt: serverTimestamp()
      });
      
      const updatedSnapshot = await getDoc(connectorRef);
      return normalizeDocument(updatedSnapshot);
    } catch (error) {
      console.error('Error updating connector:', error);
      return null;
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      console.log(`Deleting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = doc(adminDb, COLLECTIONS.CONNECTORS, connectorId);
      const connectorSnapshot = await getDoc(connectorRef);
      
      if (!connectorSnapshot.exists() || connectorSnapshot.data()?.userId !== userId) {
        return false;
      }
      
      await deleteDoc(connectorRef);
      return true;
    } catch (error) {
      console.error('Error deleting connector:', error);
      return false;
    }
  },
  
  // Flow methods
  async getFlows(userId: string) {
    try {
      console.log(`Getting flows for user ${userId}`);
      
      const flowsCollection = collection(adminDb, COLLECTIONS.FLOWS);
      const q = query(flowsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeDocument);
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      console.log(`Getting flow ${flowId} for user ${userId}`);
      
      const flowRef = doc(adminDb, COLLECTIONS.FLOWS, flowId);
      const flowSnapshot = await getDoc(flowRef);
      
      if (!flowSnapshot.exists() || flowSnapshot.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDocument(flowSnapshot);
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
    try {
      console.log(`Creating flow for user ${flowData.userId}`);
      
      const flowsCollection = collection(adminDb, COLLECTIONS.FLOWS);
      const docRef = await addDoc(flowsCollection, {
        ...flowData,
        createdAt: serverTimestamp()
      });
      
      const flowSnapshot = await getDoc(docRef);
      return normalizeDocument(flowSnapshot);
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
    try {
      console.log(`Updating flow ${flowId} for user ${userId}`);
      console.log('Flow data:', JSON.stringify(flowData));
      
      const flowRef = doc(adminDb, COLLECTIONS.FLOWS, flowId);
      const flowSnapshot = await getDoc(flowRef);
      
      if (!flowSnapshot.exists() || flowSnapshot.data()?.userId !== userId) {
        return null;
      }
      
      await updateDoc(flowRef, {
        ...flowData,
        updatedAt: serverTimestamp()
      });
      
      const updatedSnapshot = await getDoc(flowRef);
      return normalizeDocument(updatedSnapshot);
    } catch (error) {
      console.error('Error updating flow:', error);
      return null;
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      console.log(`Deleting flow ${flowId} for user ${userId}`);
      
      const flowRef = doc(adminDb, COLLECTIONS.FLOWS, flowId);
      const flowSnapshot = await getDoc(flowRef);
      
      if (!flowSnapshot.exists() || flowSnapshot.data()?.userId !== userId) {
        return false;
      }
      
      await deleteDoc(flowRef);
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
    try {
      console.log(`Creating execution for flow ${executionData.flowId}`);
      
      const executionsCollection = collection(adminDb, COLLECTIONS.EXECUTIONS);
      const docRef = await addDoc(executionsCollection, {
        ...executionData,
        createdAt: serverTimestamp()
      });
      
      const executionSnapshot = await getDoc(docRef);
      return normalizeDocument(executionSnapshot);
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
    try {
      console.log(`Updating execution ${executionId}`);
      
      const executionRef = doc(adminDb, COLLECTIONS.EXECUTIONS, executionId);
      const executionSnapshot = await getDoc(executionRef);
      
      if (!executionSnapshot.exists()) {
        return null;
      }
      
      await updateDoc(executionRef, {
        ...executionData,
        updatedAt: serverTimestamp()
      });
      
      const updatedSnapshot = await getDoc(executionRef);
      return normalizeDocument(updatedSnapshot);
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
    try {
      console.log(`Getting executions for user ${userId} with params:`, queryParams);
      
      const executionsCollection = collection(adminDb, COLLECTIONS.EXECUTIONS);
      let q = query(executionsCollection, where('userId', '==', userId));
      
      if (queryParams.flowId) {
        q = query(q, where('flowId', '==', queryParams.flowId));
      }
      
      if (queryParams.status) {
        q = query(q, where('status', '==', queryParams.status));
      }
      
      // Add ordering by createdAt desc
      q = query(q, orderBy('createdAt', 'desc'));
      
      // Add limit if provided
      if (queryParams.limit) {
        q = query(q, limit(queryParams.limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDocument);
    } catch (error) {
      console.error('Error getting executions:', error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    try {
      console.log(`Getting execution ${executionId}`);
      
      const executionRef = doc(adminDb, COLLECTIONS.EXECUTIONS, executionId);
      const executionSnapshot = await getDoc(executionRef);
      
      if (!executionSnapshot.exists()) {
        return null;
      }
      
      return normalizeDocument(executionSnapshot);
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
    try {
      console.log(`Adding execution log for execution ${logData.executionId}`);
      
      const logsCollection = collection(adminDb, COLLECTIONS.EXECUTION_LOGS);
      const docRef = await addDoc(logsCollection, {
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: serverTimestamp()
      });
      
      const logSnapshot = await getDoc(docRef);
      return normalizeDocument(logSnapshot);
    } catch (error) {
      console.error('Error adding execution log:', error);
      return null;
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      console.log(`Getting logs for execution ${executionId}`);
      
      const logsCollection = collection(adminDb, COLLECTIONS.EXECUTION_LOGS);
      const q = query(
        logsCollection, 
        where('executionId', '==', executionId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDocument);
    } catch (error) {
      console.error('Error getting execution logs:', error);
      return [];
    }
  },
  
  // Data table methods
  async getTables(userId: string) {
    try {
      console.log(`Getting tables for user ${userId}`);
      
      const tablesCollection = collection(adminDb, COLLECTIONS.DATA_TABLES);
      const q = query(tablesCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeDocument);
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      console.log(`Getting table ${tableId} for user ${userId}`);
      
      const tableRef = doc(adminDb, COLLECTIONS.DATA_TABLES, tableId);
      const tableSnapshot = await getDoc(tableRef);
      
      if (!tableSnapshot.exists() || tableSnapshot.data()?.userId !== userId) {
        return null;
      }
      
      return normalizeDocument(tableSnapshot);
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
    try {
      console.log(`Creating table for user ${tableData.userId}`, tableData);
      
      const tablesCollection = collection(adminDb, COLLECTIONS.DATA_TABLES);
      const docRef = await addDoc(tablesCollection, {
        ...tableData,
        createdAt: serverTimestamp()
      });
      
      const tableSnapshot = await getDoc(docRef);
      return normalizeDocument(tableSnapshot);
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
    try {
      console.log(`Updating table ${tableId} for user ${userId}`);
      
      const tableRef = doc(adminDb, COLLECTIONS.DATA_TABLES, tableId);
      const tableSnapshot = await getDoc(tableRef);
      
      if (!tableSnapshot.exists() || tableSnapshot.data()?.userId !== userId) {
        return null;
      }
      
      await updateDoc(tableRef, {
        ...tableData,
        updatedAt: serverTimestamp()
      });
      
      const updatedSnapshot = await getDoc(tableRef);
      return normalizeDocument(updatedSnapshot);
    } catch (error) {
      console.error('Error updating table:', error);
      return null;
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      console.log(`Deleting table ${tableId} for user ${userId}`);
      
      const tableRef = doc(adminDb, COLLECTIONS.DATA_TABLES, tableId);
      const tableSnapshot = await getDoc(tableRef);
      
      if (!tableSnapshot.exists() || tableSnapshot.data()?.userId !== userId) {
        return false;
      }
      
      // Delete the table
      await deleteDoc(tableRef);
      
      // Also delete all rows for this table
      const rowsCollection = collection(adminDb, COLLECTIONS.TABLE_ROWS);
      const q = query(rowsCollection, where('tableId', '==', tableId));
      const rowsSnapshot = await getDocs(q);
      
      // Delete each row
      const deletePromises = rowsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return true;
    } catch (error) {
      console.error('Error deleting table:', error);
      return false;
    }
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    try {
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      const rowsCollection = collection(adminDb, COLLECTIONS.TABLE_ROWS);
      const q = query(
        rowsCollection, 
        where('tableId', '==', tableId),
        orderBy('createdAt', 'desc'),
        limit(Number(limit))
      );
      
      const querySnapshot = await getDocs(q);
      const rows = querySnapshot.docs.map(normalizeDocument);
      
      // Get total count
      const countQuery = query(rowsCollection, where('tableId', '==', tableId));
      const countSnapshot = await getDocs(countQuery);
      
      return {
        rows,
        total: countSnapshot.size
      };
    } catch (error) {
      console.error('Error getting table rows:', error);
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
      
      const rowsCollection = collection(adminDb, COLLECTIONS.TABLE_ROWS);
      const docRef = await addDoc(rowsCollection, {
        ...rowData,
        createdAt: serverTimestamp()
      });
      
      const rowSnapshot = await getDoc(docRef);
      return normalizeDocument(rowSnapshot);
    } catch (error) {
      console.error('Error creating table row:', error);
      return null;
    }
  },
  
  async updateTableRow(rowId: string, data: any) {
    try {
      console.log(`Updating row ${rowId} with data:`, data);
      
      const rowRef = doc(adminDb, COLLECTIONS.TABLE_ROWS, rowId);
      await updateDoc(rowRef, {
        data,
        updatedAt: serverTimestamp()
      });
      
      const rowSnapshot = await getDoc(rowRef);
      return normalizeDocument(rowSnapshot);
    } catch (error) {
      console.error('Error updating table row:', error);
      return null;
    }
  },
  
  async deleteTableRow(rowId: string) {
    try {
      console.log(`Deleting row ${rowId}`);
      
      const rowRef = doc(adminDb, COLLECTIONS.TABLE_ROWS, rowId);
      await deleteDoc(rowRef);
      return true;
    } catch (error) {
      console.error('Error deleting table row:', error);
      return false;
    }
  }
};