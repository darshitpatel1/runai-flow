// Simplified mock implementation for development
// This provides in-memory storage for testing without Firebase dependencies

export const firestoreStorage = {
  // In-memory data store for testing
  _data: {
    users: [],
    connectors: [],
    flows: [],
    executions: [],
    executionLogs: [],
    dataTables: [],
    tableRows: []
  },

  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
    
    // Return mock user for testing
    return {
      id: "1",
      firebaseUid: firebaseUid,
      email: "test@example.com",
      displayName: "Test User",
      createdAt: new Date()
    };
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    console.log(`Creating user with data:`, userData);
    return {
      id: "1",
      ...userData,
      createdAt: new Date()
    };
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    console.log(`Updating user ${userId} with data:`, userData);
    return {
      id: userId,
      firebaseUid: "test-firebase-uid",
      email: userData.email || "test@example.com",
      displayName: userData.displayName || "Test User",
      photoUrl: userData.photoUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    console.log(`Getting connectors for user ${userId}`);
    return [];
  },
  
  async getConnector(userId: string, connectorId: string) {
    console.log(`Getting connector ${connectorId} for user ${userId}`);
    return null;
  },
  
  async createConnector(connectorData: any) {
    console.log(`Creating connector with data:`, connectorData);
    return {
      id: "1",
      ...connectorData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: any) {
    console.log(`Updating connector ${connectorId} for user ${userId} with data:`, connectorData);
    return {
      id: connectorId,
      userId,
      ...connectorData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    console.log(`Deleting connector ${connectorId} for user ${userId}`);
  },
  
  // Flow methods
  async getFlows(userId: string) {
    console.log(`Getting flows for user ${userId}`);
    return [];
  },
  
  async getFlow(userId: string, flowId: string) {
    console.log(`Getting flow ${flowId} for user ${userId}`);
    return null;
  },
  
  async createFlow(flowData: any) {
    console.log(`Creating flow with data:`, flowData);
    return {
      id: "1",
      ...flowData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async updateFlow(userId: string, flowId: string, flowData: any) {
    console.log(`Updating flow ${flowId} for user ${userId} with data:`, flowData);
    return {
      id: flowId,
      userId,
      ...flowData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteFlow(userId: string, flowId: string) {
    console.log(`Deleting flow ${flowId} for user ${userId}`);
  },
  
  // Execution methods
  async createExecution(executionData: any) {
    console.log(`Creating execution with data:`, executionData);
    return {
      id: "1",
      ...executionData,
      startedAt: new Date(),
      createdAt: new Date()
    };
  },
  
  async updateExecution(executionId: string, executionData: any) {
    console.log(`Updating execution ${executionId} with data:`, executionData);
    return {
      id: executionId,
      ...executionData,
      startedAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async getExecutions(userId: string, queryParams: any = {}) {
    console.log(`Getting executions for user ${userId} with params:`, queryParams);
    return [];
  },
  
  async getExecution(executionId: string) {
    console.log(`Getting execution ${executionId}`);
    return {
      id: executionId,
      flowId: "1",
      userId: "1",
      status: "completed",
      startedAt: new Date(),
      finishedAt: new Date(),
      duration: 100,
      createdAt: new Date()
    };
  },
  
  async addExecutionLog(logData: any) {
    console.log(`Adding execution log with data:`, logData);
    return {
      id: "1",
      ...logData,
      timestamp: logData.timestamp || new Date(),
      createdAt: new Date()
    };
  },
  
  async getExecutionLogs(executionId: string) {
    console.log(`Getting logs for execution ${executionId}`);
    return [];
  },
  
  // Table methods
  async getTables(userId: string) {
    console.log(`Getting tables for user ${userId}`);
    return [{
      id: "9",
      userId: "1",
      name: "ada",
      description: "test",
      columns: [
        { id: "a", name: "Name", type: "text" },
        { id: "b", name: "Value", type: "number" }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  },
  
  async getTable(userId: string, tableId: string) {
    console.log(`Getting table ${tableId} for user ${userId}`);
    return {
      id: tableId,
      userId,
      name: "Sample Table",
      description: "A sample table for testing",
      columns: [
        { id: "a", name: "Name", type: "text" },
        { id: "b", name: "Value", type: "number" }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async createTable(tableData: any) {
    console.log(`Creating table with data:`, tableData);
    return {
      id: "1",
      ...tableData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async updateTable(userId: string, tableId: string, tableData: any) {
    console.log(`Updating table ${tableId} for user ${userId} with data:`, tableData);
    return {
      id: tableId,
      userId,
      ...tableData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteTable(userId: string, tableId: string) {
    console.log(`Deleting table ${tableId} for user ${userId}`);
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    console.log(`Getting rows for table ${tableId} (limit: ${limit}, offset: ${offset})`);
    return [{
      id: "9",
      tableId: "9",
      data: { data: { a: "Test", b: 42 } },
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  },
  
  async createTableRow(rowData: any) {
    console.log(`Creating table row with data:`, rowData);
    return {
      id: "1",
      ...rowData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async updateTableRow(rowId: string, data: any) {
    console.log(`Updating table row ${rowId} with data:`, data);
    return {
      id: rowId,
      tableId: "1",
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteTableRow(rowId: string) {
    console.log(`Deleting table row ${rowId}`);
  }
};

// Helper to normalize document data with its ID
const normalizeDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
  if (!doc.exists) {
    return null;
  }
  
  const data = doc.data();
  return convertTimestamps({
    id: doc.id,
    ...data
  });
};

// Helper to normalize query document data with its ID
const normalizeQueryDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
  const data = doc.data();
  return convertTimestamps({
    id: doc.id,
    ...data
  });
};

// Server-side Firestore client implementation
export const firestoreStorage = {
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      const usersRef = collection(adminDb, COLLECTIONS.USERS);
      const q = query(usersRef, where('firebaseUid', '==', firebaseUid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      return normalizeQueryDoc(querySnapshot.docs[0]);
    } catch (error) {
      console.error("Error getting user by Firebase UID:", error);
      throw error;
    }
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    try {
      const usersRef = collection(adminDb, COLLECTIONS.USERS);
      
      // Create the user document
      const userDoc = {
        firebaseUid: userData.firebaseUid,
        email: userData.email,
        displayName: userData.displayName || null,
        photoUrl: userData.photoUrl || null,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(usersRef, userDoc);
      
      // Get the newly created user
      const newUser = await getDoc(docRef);
      return normalizeDoc(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    try {
      const userDocRef = doc(adminDb, COLLECTIONS.USERS, userId);
      
      // Update the user document
      await updateDoc(userDocRef, {
        ...userData,
        updatedAt: new Date()
      });
      
      // Get the updated user
      const updatedUser = await getDoc(userDocRef);
      return normalizeDoc(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
  
  async getConnectors(userId: string) {
    try {
      const connectorsRef = collection(adminDb, COLLECTIONS.CONNECTORS);
      const q = query(connectorsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting connectors:", error);
      throw error;
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      const connectorDocRef = doc(adminDb, COLLECTIONS.CONNECTORS, connectorId);
      const connectorDoc = await getDoc(connectorDocRef);
      
      if (!connectorDoc.exists) {
        return null;
      }
      
      const connector = normalizeDoc(connectorDoc);
      
      // Verify the connector belongs to the user
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
    authConfig?: Record<string, any>;
    headers?: Record<string, any>;
  }) {
    try {
      const connectorsRef = collection(adminDb, COLLECTIONS.CONNECTORS);
      
      // Create the connector document
      const connectorDoc = {
        ...connectorData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(connectorsRef, connectorDoc);
      
      // Get the newly created connector
      const newConnector = await getDoc(docRef);
      return normalizeDoc(newConnector);
    } catch (error) {
      console.error("Error creating connector:", error);
      throw error;
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    baseUrl: string;
    authType: string;
    authConfig: Record<string, any>;
    headers: Record<string, any>;
  }>) {
    try {
      const connectorDocRef = doc(adminDb, COLLECTIONS.CONNECTORS, connectorId);
      
      // Verify the connector exists and belongs to the user
      const connectorDoc = await getDoc(connectorDocRef);
      if (!connectorDoc.exists) {
        throw new Error("Connector not found");
      }
      
      const connector = normalizeDoc(connectorDoc);
      if (connector.userId !== userId) {
        throw new Error("Unauthorized access to connector");
      }
      
      // Update the connector document
      await updateDoc(connectorDocRef, {
        ...connectorData,
        updatedAt: new Date()
      });
      
      // Get the updated connector
      const updatedConnector = await getDoc(connectorDocRef);
      return normalizeDoc(updatedConnector);
    } catch (error) {
      console.error("Error updating connector:", error);
      throw error;
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      const connectorDocRef = doc(adminDb, COLLECTIONS.CONNECTORS, connectorId);
      
      // Verify the connector exists and belongs to the user
      const connectorDoc = await getDoc(connectorDocRef);
      if (!connectorDoc.exists) {
        throw new Error("Connector not found");
      }
      
      const connector = normalizeDoc(connectorDoc);
      if (connector.userId !== userId) {
        throw new Error("Unauthorized access to connector");
      }
      
      // Delete the connector document
      await deleteDoc(connectorDocRef);
    } catch (error) {
      console.error("Error deleting connector:", error);
      throw error;
    }
  },
  
  async getFlows(userId: string) {
    try {
      const flowsRef = collection(adminDb, COLLECTIONS.FLOWS);
      const q = query(flowsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting flows:", error);
      throw error;
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      const flowDocRef = doc(adminDb, COLLECTIONS.FLOWS, flowId);
      const flowDoc = await getDoc(flowDocRef);
      
      if (!flowDoc.exists) {
        return null;
      }
      
      const flow = normalizeDoc(flowDoc);
      
      // Verify the flow belongs to the user
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
    nodes: Array<Record<string, any>>;
    edges: Array<Record<string, any>>;
    active?: boolean;
  }) {
    try {
      const flowsRef = collection(adminDb, COLLECTIONS.FLOWS);
      
      // Create the flow document
      const flowDoc = {
        ...flowData,
        active: flowData.active ?? false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(flowsRef, flowDoc);
      
      // Get the newly created flow
      const newFlow = await getDoc(docRef);
      return normalizeDoc(newFlow);
    } catch (error) {
      console.error("Error creating flow:", error);
      throw error;
    }
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{
    name: string;
    description: string;
    nodes: Array<Record<string, any>>;
    edges: Array<Record<string, any>>;
    active: boolean;
  }>) {
    try {
      const flowDocRef = doc(adminDb, COLLECTIONS.FLOWS, flowId);
      
      // Verify the flow exists and belongs to the user
      const flowDoc = await getDoc(flowDocRef);
      if (!flowDoc.exists) {
        throw new Error("Flow not found");
      }
      
      const flow = normalizeDoc(flowDoc);
      if (flow.userId !== userId) {
        throw new Error("Unauthorized access to flow");
      }
      
      // Update the flow document
      await updateDoc(flowDocRef, {
        ...flowData,
        updatedAt: new Date()
      });
      
      // Get the updated flow
      const updatedFlow = await getDoc(flowDocRef);
      return normalizeDoc(updatedFlow);
    } catch (error) {
      console.error("Error updating flow:", error);
      throw error;
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      const flowDocRef = doc(adminDb, COLLECTIONS.FLOWS, flowId);
      
      // Verify the flow exists and belongs to the user
      const flowDoc = await getDoc(flowDocRef);
      if (!flowDoc.exists) {
        throw new Error("Flow not found");
      }
      
      const flow = normalizeDoc(flowDoc);
      if (flow.userId !== userId) {
        throw new Error("Unauthorized access to flow");
      }
      
      // Delete the flow document
      await deleteDoc(flowDocRef);
    } catch (error) {
      console.error("Error deleting flow:", error);
      throw error;
    }
  },
  
  async createExecution(executionData: {
    flowId: string;
    userId: string;
    status: string;
    input?: Record<string, any>;
  }) {
    try {
      const executionsRef = collection(adminDb, COLLECTIONS.EXECUTIONS);
      
      // Create the execution document
      const executionDoc = {
        ...executionData,
        startedAt: new Date(),
        createdAt: new Date()
      };
      
      const docRef = await addDoc(executionsRef, executionDoc);
      
      // Get the newly created execution
      const newExecution = await getDoc(docRef);
      return normalizeDoc(newExecution);
    } catch (error) {
      console.error("Error creating execution:", error);
      throw error;
    }
  },
  
  async updateExecution(executionId: string, executionData: Partial<{
    status: string;
    finishedAt: Date;
    duration: number;
    output: Record<string, any>;
  }>) {
    try {
      const executionDocRef = doc(adminDb, COLLECTIONS.EXECUTIONS, executionId);
      
      // Update the execution document
      await updateDoc(executionDocRef, {
        ...executionData,
        updatedAt: new Date()
      });
      
      // Get the updated execution
      const updatedExecution = await getDoc(executionDocRef);
      return normalizeDoc(updatedExecution);
    } catch (error) {
      console.error("Error updating execution:", error);
      throw error;
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
      const executionsRef = collection(adminDb, COLLECTIONS.EXECUTIONS);
      
      // Build query with filters
      let q = query(executionsRef, where('userId', '==', userId));
      
      if (queryParams.flowId) {
        q = query(q, where('flowId', '==', queryParams.flowId));
      }
      
      if (queryParams.status) {
        q = query(q, where('status', '==', queryParams.status));
      }
      
      // Add ordering
      q = query(q, orderBy('startedAt', 'desc'));
      
      // Add limit
      if (queryParams.limit) {
        q = query(q, limit(queryParams.limit));
      }
      
      // Execute query
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting executions:", error);
      throw error;
    }
  },
  
  async getExecution(executionId: string) {
    try {
      const executionDocRef = doc(adminDb, COLLECTIONS.EXECUTIONS, executionId);
      const executionDoc = await getDoc(executionDocRef);
      
      if (!executionDoc.exists) {
        return null;
      }
      
      return normalizeDoc(executionDoc);
    } catch (error) {
      console.error("Error getting execution:", error);
      throw error;
    }
  },
  
  async addExecutionLog(logData: {
    executionId: string;
    level: string;
    message: string;
    nodeId?: string;
    timestamp?: Date;
  }) {
    try {
      const logsRef = collection(adminDb, COLLECTIONS.EXECUTION_LOGS);
      
      // Create the log document
      const logDoc = {
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: new Date()
      };
      
      const docRef = await addDoc(logsRef, logDoc);
      
      // Get the newly created log
      const newLog = await getDoc(docRef);
      return normalizeDoc(newLog);
    } catch (error) {
      console.error("Error adding execution log:", error);
      throw error;
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      const logsRef = collection(adminDb, COLLECTIONS.EXECUTION_LOGS);
      const q = query(
        logsRef, 
        where('executionId', '==', executionId),
        orderBy('timestamp', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting execution logs:", error);
      throw error;
    }
  },
  
  async getTables(userId: string) {
    try {
      const tablesRef = collection(adminDb, COLLECTIONS.DATA_TABLES);
      const q = query(tablesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting tables:", error);
      throw error;
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      const tableDocRef = doc(adminDb, COLLECTIONS.DATA_TABLES, tableId);
      const tableDoc = await getDoc(tableDocRef);
      
      if (!tableDoc.exists) {
        return null;
      }
      
      const table = normalizeDoc(tableDoc);
      
      // Verify the table belongs to the user
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
    columns: Array<any>;
  }) {
    try {
      const tablesRef = collection(adminDb, COLLECTIONS.DATA_TABLES);
      
      // Create the table document
      const tableDoc = {
        ...tableData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(tablesRef, tableDoc);
      
      // Get the newly created table
      const newTable = await getDoc(docRef);
      return normalizeDoc(newTable);
    } catch (error) {
      console.error("Error creating table:", error);
      throw error;
    }
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: Array<any>;
  }>) {
    try {
      const tableDocRef = doc(adminDb, COLLECTIONS.DATA_TABLES, tableId);
      
      // Verify the table exists and belongs to the user
      const tableDoc = await getDoc(tableDocRef);
      if (!tableDoc.exists) {
        throw new Error("Table not found");
      }
      
      const table = normalizeDoc(tableDoc);
      if (table.userId !== userId) {
        throw new Error("Unauthorized access to table");
      }
      
      // Update the table document
      await updateDoc(tableDocRef, {
        ...tableData,
        updatedAt: new Date()
      });
      
      // Get the updated table
      const updatedTable = await getDoc(tableDocRef);
      return normalizeDoc(updatedTable);
    } catch (error) {
      console.error("Error updating table:", error);
      throw error;
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      const tableDocRef = doc(adminDb, COLLECTIONS.DATA_TABLES, tableId);
      
      // Verify the table exists and belongs to the user
      const tableDoc = await getDoc(tableDocRef);
      if (!tableDoc.exists) {
        throw new Error("Table not found");
      }
      
      const table = normalizeDoc(tableDoc);
      if (table.userId !== userId) {
        throw new Error("Unauthorized access to table");
      }
      
      // Delete the table document
      await deleteDoc(tableDocRef);
    } catch (error) {
      console.error("Error deleting table:", error);
      throw error;
    }
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    try {
      const rowsRef = collection(adminDb, COLLECTIONS.TABLE_ROWS);
      const q = query(
        rowsRef, 
        where('tableId', '==', tableId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(normalizeQueryDoc);
    } catch (error) {
      console.error("Error getting table rows:", error);
      throw error;
    }
  },
  
  async createTableRow(rowData: {
    tableId: string;
    data: Record<string, any>;
  }) {
    try {
      const rowsRef = collection(adminDb, COLLECTIONS.TABLE_ROWS);
      
      // Create the row document
      const rowDoc = {
        ...rowData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(rowsRef, rowDoc);
      
      // Get the newly created row
      const newRow = await getDoc(docRef);
      return normalizeDoc(newRow);
    } catch (error) {
      console.error("Error creating table row:", error);
      throw error;
    }
  },
  
  async updateTableRow(rowId: string, data: any) {
    try {
      const rowDocRef = doc(adminDb, COLLECTIONS.TABLE_ROWS, rowId);
      
      // Update the row document
      await updateDoc(rowDocRef, {
        data,
        updatedAt: new Date()
      });
      
      // Get the updated row
      const updatedRow = await getDoc(rowDocRef);
      return normalizeDoc(updatedRow);
    } catch (error) {
      console.error("Error updating table row:", error);
      throw error;
    }
  },
  
  async deleteTableRow(rowId: string) {
    try {
      const rowDocRef = doc(adminDb, COLLECTIONS.TABLE_ROWS, rowId);
      
      // Delete the row document
      await deleteDoc(rowDocRef);
    } catch (error) {
      console.error("Error deleting table row:", error);
      throw error;
    }
  }
};