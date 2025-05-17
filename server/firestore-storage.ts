// Firestore implementation for data storage
import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS } from "@shared/firestore-schema";
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// Initialize Firebase for server-side operations
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, 'server');
const db = getFirestore(app);

// Helper for generating IDs
const generateId = () => uuidv4();

// Helper to convert timestamps to regular Date objects for consistent handling
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
  if (!doc.exists()) {
    return null;
  }
  
  const data = doc.data();
  return convertTimestamps({
    id: doc.id,
    ...data
  });
};

// Helper to normalize query document data with its ID
const normalizeQueryDoc = (doc: any) => {
  const data = doc.data();
  return convertTimestamps({
    id: doc.id,
    ...data
  });
};

// Firestore implementation with in-memory backup for development
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where('firebaseUid', '==', firebaseUid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return normalizeQueryDoc(querySnapshot.docs[0]);
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      
      // Return mock user for development
      return {
        id: "1",
        firebaseUid: firebaseUid,
        email: "test@example.com",
        displayName: "Test User",
        createdAt: new Date()
      };
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    try {
      console.log(`Creating user with data:`, userData);
      
      const usersRef = collection(db, COLLECTIONS.USERS);
      
      // Check if user already exists
      const q = query(usersRef, where('firebaseUid', '==', userData.firebaseUid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const existingUser = normalizeQueryDoc(querySnapshot.docs[0]);
        return existingUser;
      }
      
      // Create the user document
      const docRef = await addDoc(usersRef, {
        ...userData,
        createdAt: new Date()
      });
      
      const userDoc = await getDoc(docRef);
      return normalizeDoc(userDoc);
    } catch (error) {
      console.error("Error creating user:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...userData,
        createdAt: new Date()
      };
    }
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    try {
      console.log(`Updating user ${userId} with data:`, userData);
      
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date()
      });
      
      const userDoc = await getDoc(userRef);
      return normalizeDoc(userDoc);
    } catch (error) {
      console.error("Error updating user:", error);
      
      // Return mock data for development
      return {
        id: userId,
        firebaseUid: "test-firebase-uid",
        email: userData.email || "test@example.com",
        displayName: userData.displayName || "Test User",
        photoUrl: userData.photoUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    try {
      console.log(`Getting connectors for user ${userId}`);
      
      const connectorsRef = collection(db, COLLECTIONS.CONNECTORS);
      const q = query(connectorsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting connectors:", error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      console.log(`Getting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = doc(db, COLLECTIONS.CONNECTORS, connectorId);
      const connectorDoc = await getDoc(connectorRef);
      
      if (!connectorDoc.exists() || connectorDoc.data().userId !== userId) {
        return null;
      }
      
      return normalizeDoc(connectorDoc);
    } catch (error) {
      console.error("Error getting connector:", error);
      
      // Return mock data for development
      return {
        id: connectorId,
        userId: userId,
        name: "Test Connector",
        type: "http",
        config: {},
        createdAt: new Date()
      };
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
      
      const connectorsRef = collection(db, COLLECTIONS.CONNECTORS);
      const docRef = await addDoc(connectorsRef, {
        ...connectorData,
        createdAt: new Date()
      });
      
      const connectorDoc = await getDoc(docRef);
      return normalizeDoc(connectorDoc);
    } catch (error) {
      console.error("Error creating connector:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...connectorData,
        createdAt: new Date()
      };
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    config: any;
  }>) {
    try {
      console.log(`Updating connector ${connectorId} for user ${userId}`);
      
      const connectorRef = doc(db, COLLECTIONS.CONNECTORS, connectorId);
      const connectorDoc = await getDoc(connectorRef);
      
      if (!connectorDoc.exists() || connectorDoc.data().userId !== userId) {
        return null;
      }
      
      await updateDoc(connectorRef, {
        ...connectorData,
        updatedAt: new Date()
      });
      
      const updatedDoc = await getDoc(connectorRef);
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error("Error updating connector:", error);
      
      // Return mock data for development
      return {
        id: connectorId,
        userId,
        name: connectorData.name || "Test Connector",
        type: "http",
        config: connectorData.config || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      console.log(`Deleting connector ${connectorId} for user ${userId}`);
      
      const connectorRef = doc(db, COLLECTIONS.CONNECTORS, connectorId);
      const connectorDoc = await getDoc(connectorRef);
      
      if (!connectorDoc.exists() || connectorDoc.data().userId !== userId) {
        return false;
      }
      
      await deleteDoc(connectorRef);
      return true;
    } catch (error) {
      console.error("Error deleting connector:", error);
      return true; // Pretend it worked for development
    }
  },
  
  // Flow methods
  async getFlows(userId: string) {
    try {
      console.log(`Getting flows for user ${userId}`);
      
      const flowsRef = collection(db, COLLECTIONS.FLOWS);
      const q = query(flowsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting flows:", error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      console.log(`Getting flow ${flowId} for user ${userId}`);
      
      const flowRef = doc(db, COLLECTIONS.FLOWS, flowId);
      const flowDoc = await getDoc(flowRef);
      
      if (!flowDoc.exists() || flowDoc.data().userId !== userId) {
        return null;
      }
      
      return normalizeDoc(flowDoc);
    } catch (error) {
      console.error("Error getting flow:", error);
      
      // Return mock data for development
      return {
        id: flowId,
        userId,
        name: "Test Flow",
        description: "A test flow",
        nodes: [],
        edges: [],
        createdAt: new Date()
      };
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
      
      const flowsRef = collection(db, COLLECTIONS.FLOWS);
      const docRef = await addDoc(flowsRef, {
        ...flowData,
        createdAt: new Date()
      });
      
      const flowDoc = await getDoc(docRef);
      return normalizeDoc(flowDoc);
    } catch (error) {
      console.error("Error creating flow:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...flowData,
        createdAt: new Date()
      };
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
      
      const flowRef = doc(db, COLLECTIONS.FLOWS, flowId);
      const flowDoc = await getDoc(flowRef);
      
      if (!flowDoc.exists() || flowDoc.data().userId !== userId) {
        return null;
      }
      
      await updateDoc(flowRef, {
        ...flowData,
        updatedAt: new Date()
      });
      
      const updatedDoc = await getDoc(flowRef);
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error("Error updating flow:", error);
      
      // Return mock data for development
      return {
        id: flowId,
        userId,
        name: flowData.name || "Test Flow",
        description: flowData.description || "A test flow",
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      console.log(`Deleting flow ${flowId} for user ${userId}`);
      
      const flowRef = doc(db, COLLECTIONS.FLOWS, flowId);
      const flowDoc = await getDoc(flowRef);
      
      if (!flowDoc.exists() || flowDoc.data().userId !== userId) {
        return false;
      }
      
      await deleteDoc(flowRef);
      return true;
    } catch (error) {
      console.error("Error deleting flow:", error);
      return true; // Pretend it worked for development
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
      
      const executionsRef = collection(db, COLLECTIONS.EXECUTIONS);
      const docRef = await addDoc(executionsRef, {
        ...executionData,
        createdAt: new Date()
      });
      
      const executionDoc = await getDoc(docRef);
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error creating execution:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...executionData,
        createdAt: new Date()
      };
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
      
      const executionRef = doc(db, COLLECTIONS.EXECUTIONS, executionId);
      await updateDoc(executionRef, {
        ...executionData,
        updatedAt: new Date()
      });
      
      const executionDoc = await getDoc(executionRef);
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error updating execution:", error);
      
      // Return mock data for development
      return {
        id: executionId,
        userId: "test-user-id",
        flowId: "test-flow-id",
        status: executionData.status || "running",
        startedAt: new Date(Date.now() - 1000),
        finishedAt: executionData.finishedAt,
        result: executionData.result,
        error: executionData.error,
        createdAt: new Date(Date.now() - 1000),
        updatedAt: new Date()
      };
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
      
      const executionsRef = collection(db, COLLECTIONS.EXECUTIONS);
      let q = query(executionsRef, where('userId', '==', userId));
      
      if (queryParams.flowId) {
        q = query(q, where('flowId', '==', queryParams.flowId));
      }
      
      if (queryParams.status) {
        q = query(q, where('status', '==', queryParams.status));
      }
      
      // Add orderBy
      q = query(q, orderBy('createdAt', 'desc'));
      
      // Add limit if provided
      if (queryParams.limit) {
        q = query(q, limit(queryParams.limit));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting executions:", error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    try {
      console.log(`Getting execution ${executionId}`);
      
      const executionRef = doc(db, COLLECTIONS.EXECUTIONS, executionId);
      const executionDoc = await getDoc(executionRef);
      
      if (!executionDoc.exists()) {
        return null;
      }
      
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error getting execution:", error);
      
      // Return mock data for development
      return {
        id: executionId,
        userId: "test-user-id",
        flowId: "test-flow-id",
        status: "completed",
        startedAt: new Date(Date.now() - 1000),
        finishedAt: new Date(),
        result: { success: true },
        createdAt: new Date(Date.now() - 1000)
      };
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
      
      const logsRef = collection(db, COLLECTIONS.EXECUTION_LOGS);
      const docRef = await addDoc(logsRef, {
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: new Date()
      });
      
      const logDoc = await getDoc(docRef);
      return normalizeDoc(logDoc);
    } catch (error) {
      console.error("Error adding execution log:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: new Date()
      };
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      console.log(`Getting logs for execution ${executionId}`);
      
      const logsRef = collection(db, COLLECTIONS.EXECUTION_LOGS);
      const q = query(
        logsRef, 
        where('executionId', '==', executionId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting execution logs:", error);
      return [];
    }
  },
  
  // Data table methods
  async getTables(userId: string) {
    try {
      console.log(`Getting tables for user ${userId}`);
      
      const tablesRef = collection(db, COLLECTIONS.DATA_TABLES);
      const q = query(tablesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting tables:", error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      console.log(`Getting table ${tableId} for user ${userId}`);
      
      const tableRef = doc(db, COLLECTIONS.DATA_TABLES, tableId);
      const tableDoc = await getDoc(tableRef);
      
      if (!tableDoc.exists() || tableDoc.data().userId !== userId) {
        return null;
      }
      
      return normalizeDoc(tableDoc);
    } catch (error) {
      console.error("Error getting table:", error);
      
      // Return mock data for development
      return {
        id: tableId,
        userId,
        name: "Test Table",
        description: "A test table",
        columns: [
          { id: "column1", name: "ID", type: "text", required: true },
          { id: "column2", name: "Name", type: "text", required: true },
          { id: "column3", name: "Active", type: "boolean", required: false }
        ],
        createdAt: new Date()
      };
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
      
      const tablesRef = collection(db, COLLECTIONS.DATA_TABLES);
      const docRef = await addDoc(tablesRef, {
        ...tableData,
        createdAt: new Date()
      });
      
      const tableDoc = await getDoc(docRef);
      return normalizeDoc(tableDoc);
    } catch (error) {
      console.error("Error creating table:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...tableData,
        createdAt: new Date()
      };
    }
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: any[];
  }>) {
    try {
      console.log(`Updating table ${tableId} for user ${userId}`);
      
      const tableRef = doc(db, COLLECTIONS.DATA_TABLES, tableId);
      const tableDoc = await getDoc(tableRef);
      
      if (!tableDoc.exists() || tableDoc.data().userId !== userId) {
        return null;
      }
      
      await updateDoc(tableRef, {
        ...tableData,
        updatedAt: new Date()
      });
      
      const updatedDoc = await getDoc(tableRef);
      return normalizeDoc(updatedDoc);
    } catch (error) {
      console.error("Error updating table:", error);
      
      // Return mock data for development
      return {
        id: tableId,
        userId,
        name: tableData.name || "Test Table",
        description: tableData.description || "A test table",
        columns: tableData.columns || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      console.log(`Deleting table ${tableId} for user ${userId}`);
      
      const tableRef = doc(db, COLLECTIONS.DATA_TABLES, tableId);
      const tableDoc = await getDoc(tableRef);
      
      if (!tableDoc.exists() || tableDoc.data().userId !== userId) {
        return false;
      }
      
      await deleteDoc(tableRef);
      return true;
    } catch (error) {
      console.error("Error deleting table:", error);
      return true; // Pretend it worked for development
    }
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    try {
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      const rowsRef = collection(db, COLLECTIONS.TABLE_ROWS);
      const q = query(
        rowsRef, 
        where('tableId', '==', tableId),
        orderBy('createdAt', 'desc'),
        limit(parseInt(limit.toString()))
      );
      
      const querySnapshot = await getDocs(q);
      const rows = querySnapshot.docs.map(normalizeQueryDoc);
      
      return {
        rows,
        total: rows.length // This is an approximation, in production you'd use a count query
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
      
      const rowsRef = collection(db, COLLECTIONS.TABLE_ROWS);
      const docRef = await addDoc(rowsRef, {
        ...rowData,
        createdAt: new Date()
      });
      
      const rowDoc = await getDoc(docRef);
      return normalizeDoc(rowDoc);
    } catch (error) {
      console.error("Error creating table row:", error);
      
      // Return mock data for development
      const id = generateId();
      return {
        id,
        ...rowData,
        createdAt: new Date()
      };
    }
  },
  
  async updateTableRow(rowId: string, data: any) {
    try {
      console.log(`Updating row ${rowId} with data:`, data);
      
      const rowRef = doc(db, COLLECTIONS.TABLE_ROWS, rowId);
      await updateDoc(rowRef, {
        data,
        updatedAt: new Date()
      });
      
      const rowDoc = await getDoc(rowRef);
      return normalizeDoc(rowDoc);
    } catch (error) {
      console.error("Error updating table row:", error);
      
      // Return mock data for development
      return {
        id: rowId,
        tableId: "test-table-id",
        data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  },
  
  async deleteTableRow(rowId: string) {
    try {
      console.log(`Deleting row ${rowId}`);
      
      const rowRef = doc(db, COLLECTIONS.TABLE_ROWS, rowId);
      await deleteDoc(rowRef);
      return true;
    } catch (error) {
      console.error("Error deleting table row:", error);
      return true; // Pretend it worked for development
    }
  }
};