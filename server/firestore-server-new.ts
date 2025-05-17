// Mock implementation for development until Firebase credentials are configured
// This provides in-memory storage for testing

import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS } from "@shared/firestore-schema";

// Helper for generating unique IDs
const generateId = () => uuidv4();

// Helper to convert timestamp objects in the data
const convertTimestamps = (data: any) => {
  if (!data) return data;
  
  // Clone the data to avoid modifying the original
  const result = { ...data };
  
  // Process timestamp fields if needed
  return result;
};

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
    const id = generateId();
    return {
      id,
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
    return {
      id: connectorId,
      userId: userId,
      name: "Test Connector",
      type: "http",
      config: {},
      createdAt: new Date()
    };
  },
  
  async createConnector(connectorData: {
    userId: string;
    name: string;
    type: string;
    config: any;
  }) {
    console.log(`Creating connector for user ${connectorData.userId}`);
    const id = generateId();
    return {
      id,
      ...connectorData,
      createdAt: new Date()
    };
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    config: any;
  }>) {
    console.log(`Updating connector ${connectorId} for user ${userId}`);
    return {
      id: connectorId,
      userId,
      name: connectorData.name || "Test Connector",
      type: "http",
      config: connectorData.config || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    console.log(`Deleting connector ${connectorId} for user ${userId}`);
    return true;
  },
  
  // Flow methods
  async getFlows(userId: string) {
    console.log(`Getting flows for user ${userId}`);
    return [];
  },
  
  async getFlow(userId: string, flowId: string) {
    console.log(`Getting flow ${flowId} for user ${userId}`);
    return {
      id: flowId,
      userId,
      name: "Test Flow",
      description: "A test flow",
      nodes: [],
      edges: [],
      createdAt: new Date()
    };
  },
  
  async createFlow(flowData: {
    userId: string;
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }) {
    console.log(`Creating flow for user ${flowData.userId}`);
    const id = generateId();
    return {
      id,
      ...flowData,
      createdAt: new Date()
    };
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }>) {
    console.log(`Updating flow ${flowId} for user ${userId}`);
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
  },
  
  async deleteFlow(userId: string, flowId: string) {
    console.log(`Deleting flow ${flowId} for user ${userId}`);
    return true;
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
    const id = generateId();
    return {
      id,
      ...executionData,
      createdAt: new Date()
    };
  },
  
  async updateExecution(executionId: string, executionData: Partial<{
    status: string;
    finishedAt: Date;
    result: any;
    error: string;
  }>) {
    console.log(`Updating execution ${executionId}`);
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
    return [];
  },
  
  async getExecution(executionId: string) {
    console.log(`Getting execution ${executionId}`);
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
    const id = generateId();
    return {
      id,
      ...logData,
      timestamp: logData.timestamp || new Date(),
      createdAt: new Date()
    };
  },
  
  async getExecutionLogs(executionId: string) {
    console.log(`Getting logs for execution ${executionId}`);
    return [];
  },
  
  // Data table methods
  async getTables(userId: string) {
    console.log(`Getting tables for user ${userId}`);
    return [];
  },
  
  async getTable(userId: string, tableId: string) {
    console.log(`Getting table ${tableId} for user ${userId}`);
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
  },
  
  async createTable(tableData: {
    userId: string;
    name: string;
    description: string;
    columns: any[];
  }) {
    console.log(`Creating table for user ${tableData.userId}`);
    const id = generateId();
    return {
      id,
      ...tableData,
      createdAt: new Date()
    };
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: any[];
  }>) {
    console.log(`Updating table ${tableId} for user ${userId}`);
    return {
      id: tableId,
      userId,
      name: tableData.name || "Test Table",
      description: tableData.description || "A test table",
      columns: tableData.columns || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteTable(userId: string, tableId: string) {
    console.log(`Deleting table ${tableId} for user ${userId}`);
    return true;
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
    return {
      rows: [],
      total: 0
    };
  },
  
  async createTableRow(rowData: {
    tableId: string;
    data: any;
  }) {
    console.log(`Creating row for table ${rowData.tableId}`);
    const id = generateId();
    return {
      id,
      ...rowData,
      createdAt: new Date()
    };
  },
  
  async updateTableRow(rowId: string, data: any) {
    console.log(`Updating row ${rowId} with data:`, data);
    return {
      id: rowId,
      tableId: "test-table-id",
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },
  
  async deleteTableRow(rowId: string) {
    console.log(`Deleting row ${rowId}`);
    return true;
  }
};