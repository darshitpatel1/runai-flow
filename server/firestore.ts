import { db } from "@/lib/firebase"; 
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  DocumentData 
} from "firebase/firestore";
import { COLLECTIONS } from "@shared/firestore-schema";

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  // If it's a Firestore Timestamp, convert to Date
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  
  // If it's an array, convert each element
  if (Array.isArray(data)) {
    return data.map(item => convertTimestamps(item));
  }
  
  // If it's an object, convert each property
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const key in data) {
      result[key] = convertTimestamps(data[key]);
    }
    return result;
  }
  
  // Otherwise, return as is
  return data;
};

// Helper to normalize document data with its ID
const normalizeDoc = (doc: DocumentData) => {
  const data = doc.data();
  return convertTimestamps({
    id: doc.id,
    ...data
  });
};

// Firestore storage implementation
export const firestoreStorage = {
  // User operations
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      const q = query(usersRef, where("id", "==", firebaseUid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return normalizeDoc(querySnapshot.docs[0]);
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      throw error;
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    try {
      const usersRef = collection(db, COLLECTIONS.USERS);
      
      // In Firestore, we'll use the Firebase Auth UID as the document ID
      const userDocRef = doc(usersRef, userData.firebaseUid);
      
      // Create the user document with the correct schema
      await updateDoc(userDocRef, {
        id: userData.firebaseUid,
        email: userData.email,
        displayName: userData.displayName || null,
        photoUrl: userData.photoUrl || null,
        createdAt: new Date()
      });
      
      // Get the newly created user
      const userDoc = await getDoc(userDocRef);
      return normalizeDoc(userDoc);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    try {
      const userDocRef = doc(db, COLLECTIONS.USERS, userId);
      
      // Update with the new data
      await updateDoc(userDocRef, {
        ...userData,
        updatedAt: new Date()
      });
      
      // Get the updated user
      const userDoc = await getDoc(userDocRef);
      return normalizeDoc(userDoc);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
  
  // Connector operations
  async getConnectors(userId: string) {
    try {
      const connectorsRef = collection(db, COLLECTIONS.CONNECTORS);
      const q = query(
        connectorsRef, 
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting connectors:", error);
      throw error;
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      const connectorDocRef = doc(db, COLLECTIONS.CONNECTORS, connectorId);
      const connectorDoc = await getDoc(connectorDocRef);
      
      if (!connectorDoc.exists()) {
        return null;
      }
      
      const connector = normalizeDoc(connectorDoc);
      
      // Ensure the connector belongs to the user
      if (connector.userId !== userId) {
        return null;
      }
      
      return connector;
    } catch (error) {
      console.error("Error getting connector:", error);
      throw error;
    }
  },
  
  async createConnector(connectorData: {
    userId: string;
    name: string;
    baseUrl: string;
    authType: string;
    authConfig?: any;
    headers?: any;
  }) {
    try {
      const connectorsRef = collection(db, COLLECTIONS.CONNECTORS);
      
      // Add timestamps
      const connectorWithTimestamps = {
        ...connectorData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(connectorsRef, connectorWithTimestamps);
      
      // Get the newly created connector
      const connectorDoc = await getDoc(docRef);
      return normalizeDoc(connectorDoc);
    } catch (error) {
      console.error("Error creating connector:", error);
      throw error;
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    baseUrl: string;
    authType: string;
    authConfig: any;
    headers: any;
  }>) {
    try {
      const connectorDocRef = doc(db, COLLECTIONS.CONNECTORS, connectorId);
      
      // First, verify the connector belongs to the user
      const connectorDoc = await getDoc(connectorDocRef);
      
      if (!connectorDoc.exists()) {
        throw new Error("Connector not found");
      }
      
      const connector = normalizeDoc(connectorDoc);
      
      if (connector.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Update with the new data
      await updateDoc(connectorDocRef, {
        ...connectorData,
        updatedAt: new Date()
      });
      
      // Get the updated connector
      const updatedConnectorDoc = await getDoc(connectorDocRef);
      return normalizeDoc(updatedConnectorDoc);
    } catch (error) {
      console.error("Error updating connector:", error);
      throw error;
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      const connectorDocRef = doc(db, COLLECTIONS.CONNECTORS, connectorId);
      
      // First, verify the connector belongs to the user
      const connectorDoc = await getDoc(connectorDocRef);
      
      if (!connectorDoc.exists()) {
        throw new Error("Connector not found");
      }
      
      const connector = normalizeDoc(connectorDoc);
      
      if (connector.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Delete the connector
      await deleteDoc(connectorDocRef);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting connector:", error);
      throw error;
    }
  },
  
  // Flow operations
  async getFlows(userId: string) {
    try {
      const flowsRef = collection(db, COLLECTIONS.FLOWS);
      const q = query(
        flowsRef, 
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting flows:", error);
      throw error;
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      const flowDocRef = doc(db, COLLECTIONS.FLOWS, flowId);
      const flowDoc = await getDoc(flowDocRef);
      
      if (!flowDoc.exists()) {
        return null;
      }
      
      const flow = normalizeDoc(flowDoc);
      
      // Ensure the flow belongs to the user
      if (flow.userId !== userId) {
        return null;
      }
      
      return flow;
    } catch (error) {
      console.error("Error getting flow:", error);
      throw error;
    }
  },
  
  async createFlow(flowData: {
    userId: string;
    name: string;
    description?: string;
    nodes: any;
    edges: any;
    active?: boolean;
  }) {
    try {
      const flowsRef = collection(db, COLLECTIONS.FLOWS);
      
      // Add timestamps
      const flowWithTimestamps = {
        ...flowData,
        active: flowData.active || false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(flowsRef, flowWithTimestamps);
      
      // Get the newly created flow
      const flowDoc = await getDoc(docRef);
      return normalizeDoc(flowDoc);
    } catch (error) {
      console.error("Error creating flow:", error);
      throw error;
    }
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{
    name: string;
    description: string;
    nodes: any;
    edges: any;
    active: boolean;
  }>) {
    try {
      const flowDocRef = doc(db, COLLECTIONS.FLOWS, flowId);
      
      // First, verify the flow belongs to the user
      const flowDoc = await getDoc(flowDocRef);
      
      if (!flowDoc.exists()) {
        throw new Error("Flow not found");
      }
      
      const flow = normalizeDoc(flowDoc);
      
      if (flow.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Update with the new data
      await updateDoc(flowDocRef, {
        ...flowData,
        updatedAt: new Date()
      });
      
      // Get the updated flow
      const updatedFlowDoc = await getDoc(flowDocRef);
      return normalizeDoc(updatedFlowDoc);
    } catch (error) {
      console.error("Error updating flow:", error);
      throw error;
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      const flowDocRef = doc(db, COLLECTIONS.FLOWS, flowId);
      
      // First, verify the flow belongs to the user
      const flowDoc = await getDoc(flowDocRef);
      
      if (!flowDoc.exists()) {
        throw new Error("Flow not found");
      }
      
      const flow = normalizeDoc(flowDoc);
      
      if (flow.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Delete the flow
      await deleteDoc(flowDocRef);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting flow:", error);
      throw error;
    }
  },
  
  // Execution operations
  async createExecution(executionData: {
    flowId: string;
    userId: string;
    status: string;
    input?: any;
  }) {
    try {
      const executionsRef = collection(db, COLLECTIONS.EXECUTIONS);
      
      // Add timestamps and defaults
      const executionWithTimestamps = {
        ...executionData,
        startedAt: new Date(),
        status: executionData.status || 'running',
        input: executionData.input || {},
      };
      
      const docRef = await addDoc(executionsRef, executionWithTimestamps);
      
      // Get the newly created execution
      const executionDoc = await getDoc(docRef);
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error creating execution:", error);
      throw error;
    }
  },
  
  async updateExecution(executionId: string, executionData: Partial<{
    status: string;
    finishedAt: Date;
    duration: number;
    logs: any;
    output: any;
  }>) {
    try {
      const executionDocRef = doc(db, COLLECTIONS.EXECUTIONS, executionId);
      
      // Update with the new data
      await updateDoc(executionDocRef, executionData);
      
      // Get the updated execution
      const executionDoc = await getDoc(executionDocRef);
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error updating execution:", error);
      throw error;
    }
  },
  
  async getExecutions(userId: string, queryParams: {
    limit?: number;
    offset?: number;
    filters?: {
      flowId?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  } = {}) {
    try {
      const { limit: recordLimit = 10, offset = 0, filters = {} } = queryParams;
      const executionsRef = collection(db, COLLECTIONS.EXECUTIONS);
      
      // Build the query with filters
      let q = query(
        executionsRef,
        where("userId", "==", userId)
      );
      
      if (filters.flowId) {
        q = query(q, where("flowId", "==", filters.flowId));
      }
      
      if (filters.status) {
        q = query(q, where("status", "==", filters.status));
      }
      
      // Add ordering
      q = query(q, orderBy("startedAt", "desc"));
      
      // Add limit
      q = query(q, limit(recordLimit));
      
      // Handle offset using startAfter if needed
      if (offset > 0) {
        // For Firestore, we need a document to start after
        // This is a simplification; in a real app you'd use pagination tokens
        const offsetQuery = query(
          executionsRef,
          where("userId", "==", userId),
          orderBy("startedAt", "desc"),
          limit(offset)
        );
        const offsetSnapshot = await getDocs(offsetQuery);
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc));
        }
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting executions:", error);
      throw error;
    }
  },
  
  async getExecution(executionId: string) {
    try {
      const executionDocRef = doc(db, COLLECTIONS.EXECUTIONS, executionId);
      const executionDoc = await getDoc(executionDocRef);
      
      if (!executionDoc.exists()) {
        return null;
      }
      
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error getting execution:", error);
      throw error;
    }
  },
  
  // Execution Logs operations
  async addExecutionLog(logData: {
    executionId: string;
    nodeId?: string;
    level: string;
    message: string;
    data?: any;
  }) {
    try {
      const logsRef = collection(db, COLLECTIONS.EXECUTION_LOGS);
      
      // Add timestamp
      const logWithTimestamp = {
        ...logData,
        timestamp: new Date()
      };
      
      const docRef = await addDoc(logsRef, logWithTimestamp);
      
      // Get the newly created log
      const logDoc = await getDoc(docRef);
      return normalizeDoc(logDoc);
    } catch (error) {
      console.error("Error adding execution log:", error);
      throw error;
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      const logsRef = collection(db, COLLECTIONS.EXECUTION_LOGS);
      const q = query(
        logsRef,
        where("executionId", "==", executionId),
        orderBy("timestamp", "asc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting execution logs:", error);
      throw error;
    }
  },
  
  // Data Tables operations
  async getTables(userId: string) {
    try {
      const tablesRef = collection(db, COLLECTIONS.DATA_TABLES);
      const q = query(
        tablesRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting tables:", error);
      throw error;
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      const tableDocRef = doc(db, COLLECTIONS.DATA_TABLES, tableId);
      const tableDoc = await getDoc(tableDocRef);
      
      if (!tableDoc.exists()) {
        return null;
      }
      
      const table = normalizeDoc(tableDoc);
      
      // Ensure the table belongs to the user
      if (table.userId !== userId) {
        return null;
      }
      
      return table;
    } catch (error) {
      console.error("Error getting table:", error);
      throw error;
    }
  },
  
  async createTable(tableData: {
    userId: string;
    name: string;
    description?: string;
    columns: any;
  }) {
    try {
      const tablesRef = collection(db, COLLECTIONS.DATA_TABLES);
      
      // Add timestamps
      const tableWithTimestamps = {
        ...tableData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(tablesRef, tableWithTimestamps);
      
      // Get the newly created table
      const tableDoc = await getDoc(docRef);
      return normalizeDoc(tableDoc);
    } catch (error) {
      console.error("Error creating table:", error);
      throw error;
    }
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: any;
  }>) {
    try {
      const tableDocRef = doc(db, COLLECTIONS.DATA_TABLES, tableId);
      
      // First, verify the table belongs to the user
      const tableDoc = await getDoc(tableDocRef);
      
      if (!tableDoc.exists()) {
        throw new Error("Table not found");
      }
      
      const table = normalizeDoc(tableDoc);
      
      if (table.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Update with the new data
      await updateDoc(tableDocRef, {
        ...tableData,
        updatedAt: new Date()
      });
      
      // Get the updated table
      const updatedTableDoc = await getDoc(tableDocRef);
      return normalizeDoc(updatedTableDoc);
    } catch (error) {
      console.error("Error updating table:", error);
      throw error;
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      const tableDocRef = doc(db, COLLECTIONS.DATA_TABLES, tableId);
      
      // First, verify the table belongs to the user
      const tableDoc = await getDoc(tableDocRef);
      
      if (!tableDoc.exists()) {
        throw new Error("Table not found");
      }
      
      const table = normalizeDoc(tableDoc);
      
      if (table.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Delete the table rows first
      const rowsRef = collection(db, COLLECTIONS.TABLE_ROWS);
      const q = query(rowsRef, where("tableId", "==", tableId));
      const rowsSnapshot = await getDocs(q);
      
      // Delete all rows in batches
      const deletePromises = rowsSnapshot.docs.map(rowDoc => 
        deleteDoc(doc(db, COLLECTIONS.TABLE_ROWS, rowDoc.id))
      );
      
      await Promise.all(deletePromises);
      
      // Then delete the table
      await deleteDoc(tableDocRef);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting table:", error);
      throw error;
    }
  },
  
  // Table Rows operations
  async getTableRows(tableId: string, queryParams: {
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const { limit: recordLimit = 100, offset = 0 } = queryParams;
      const rowsRef = collection(db, COLLECTIONS.TABLE_ROWS);
      
      // Build the query
      let q = query(
        rowsRef,
        where("tableId", "==", tableId),
        orderBy("createdAt", "desc"),
        limit(recordLimit)
      );
      
      // Handle offset using startAfter if needed
      if (offset > 0) {
        // For Firestore, we need a document to start after
        const offsetQuery = query(
          rowsRef,
          where("tableId", "==", tableId),
          orderBy("createdAt", "desc"),
          limit(offset)
        );
        const offsetSnapshot = await getDocs(offsetQuery);
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc));
        }
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(normalizeDoc);
    } catch (error) {
      console.error("Error getting table rows:", error);
      throw error;
    }
  },
  
  async createTableRow(rowData: {
    tableId: string;
    data: any;
  }) {
    try {
      const rowsRef = collection(db, COLLECTIONS.TABLE_ROWS);
      
      // Add timestamps
      const rowWithTimestamps = {
        ...rowData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(rowsRef, rowWithTimestamps);
      
      // Get the newly created row
      const rowDoc = await getDoc(docRef);
      return normalizeDoc(rowDoc);
    } catch (error) {
      console.error("Error creating table row:", error);
      throw error;
    }
  },
  
  async updateTableRow(rowId: string, data: any) {
    try {
      const rowDocRef = doc(db, COLLECTIONS.TABLE_ROWS, rowId);
      
      // Update with the new data
      await updateDoc(rowDocRef, {
        data,
        updatedAt: new Date()
      });
      
      // Get the updated row
      const rowDoc = await getDoc(rowDocRef);
      return normalizeDoc(rowDoc);
    } catch (error) {
      console.error("Error updating table row:", error);
      throw error;
    }
  },
  
  async deleteTableRow(rowId: string) {
    try {
      const rowDocRef = doc(db, COLLECTIONS.TABLE_ROWS, rowId);
      
      // Delete the row
      await deleteDoc(rowDocRef);
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting table row:", error);
      throw error;
    }
  }
};