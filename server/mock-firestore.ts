// This is a simplified mock implementation of Firestore storage for development
// It uses in-memory storage while providing the same API interface
// This allows the application to function without Firebase credentials

import { v4 as uuidv4 } from 'uuid';
import { COLLECTIONS } from '@shared/firestore-schema';

// In-memory database for development
const mockDb: Record<string, any[]> = {
  [COLLECTIONS.USERS]: [],
  [COLLECTIONS.CONNECTORS]: [],
  [COLLECTIONS.FLOWS]: [],
  [COLLECTIONS.EXECUTIONS]: [],
  [COLLECTIONS.EXECUTION_LOGS]: [],
  [COLLECTIONS.DATA_TABLES]: [],
  [COLLECTIONS.TABLE_ROWS]: [],
};

// Helper for generating unique IDs
const generateId = () => uuidv4();

// Helper to clone data to avoid mutation issues
const cloneData = (data: any) => JSON.parse(JSON.stringify(data));

// Simplified mock Firestore storage implementation
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    console.log(`[Mock] Looking up user with Firebase UID: ${firebaseUid}`);
    
    const user = mockDb[COLLECTIONS.USERS].find(u => u.firebaseUid === firebaseUid);
    
    if (!user) {
      return null;
    }
    
    return cloneData(user);
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    console.log(`[Mock] Creating user with data:`, userData);
    
    // Check if user already exists
    const existingUser = mockDb[COLLECTIONS.USERS].find(u => u.firebaseUid === userData.firebaseUid);
    if (existingUser) {
      return cloneData(existingUser);
    }
    
    // Create new user
    const user = {
      id: generateId(),
      ...userData,
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.USERS].push(user);
    return cloneData(user);
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    console.log(`[Mock] Updating user ${userId} with data:`, userData);
    
    const userIndex = mockDb[COLLECTIONS.USERS].findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return null;
    }
    
    // Update user
    const user = mockDb[COLLECTIONS.USERS][userIndex];
    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    
    mockDb[COLLECTIONS.USERS][userIndex] = updatedUser;
    return cloneData(updatedUser);
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    console.log(`[Mock] Getting connectors for user ${userId}`);
    
    const connectors = mockDb[COLLECTIONS.CONNECTORS].filter(c => c.userId === userId);
    return cloneData(connectors);
  },
  
  async getConnector(userId: string, connectorId: string) {
    console.log(`[Mock] Getting connector ${connectorId} for user ${userId}`);
    
    const connector = mockDb[COLLECTIONS.CONNECTORS].find(
      c => c.id === connectorId && c.userId === userId
    );
    
    if (!connector) {
      return null;
    }
    
    return cloneData(connector);
  },
  
  async createConnector(connectorData: {
    userId: string;
    name: string;
    type: string;
    config: any;
  }) {
    console.log(`[Mock] Creating connector for user ${connectorData.userId}`);
    
    const connector = {
      id: generateId(),
      ...connectorData,
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.CONNECTORS].push(connector);
    return cloneData(connector);
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{
    name: string;
    config: any;
  }>) {
    console.log(`[Mock] Updating connector ${connectorId} for user ${userId}`);
    
    const connectorIndex = mockDb[COLLECTIONS.CONNECTORS].findIndex(
      c => c.id === connectorId && c.userId === userId
    );
    
    if (connectorIndex === -1) {
      return null;
    }
    
    // Update connector
    const connector = mockDb[COLLECTIONS.CONNECTORS][connectorIndex];
    const updatedConnector = {
      ...connector,
      ...connectorData,
      updatedAt: new Date()
    };
    
    mockDb[COLLECTIONS.CONNECTORS][connectorIndex] = updatedConnector;
    return cloneData(updatedConnector);
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    console.log(`[Mock] Deleting connector ${connectorId} for user ${userId}`);
    
    const connectorIndex = mockDb[COLLECTIONS.CONNECTORS].findIndex(
      c => c.id === connectorId && c.userId === userId
    );
    
    if (connectorIndex === -1) {
      return false;
    }
    
    mockDb[COLLECTIONS.CONNECTORS].splice(connectorIndex, 1);
    return true;
  },
  
  // Flow methods
  async getFlows(userId: string) {
    console.log(`[Mock] Getting flows for user ${userId}`);
    
    const flows = mockDb[COLLECTIONS.FLOWS].filter(f => f.userId === userId);
    return cloneData(flows);
  },
  
  async getFlow(userId: string, flowId: string) {
    console.log(`[Mock] Getting flow ${flowId} for user ${userId}`);
    
    const flow = mockDb[COLLECTIONS.FLOWS].find(
      f => f.id === flowId && f.userId === userId
    );
    
    if (!flow) {
      return null;
    }
    
    return cloneData(flow);
  },
  
  async createFlow(flowData: {
    userId: string;
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }) {
    console.log(`[Mock] Creating flow for user ${flowData.userId}`, flowData);
    
    const flow = {
      id: generateId(),
      ...flowData,
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.FLOWS].push(flow);
    return cloneData(flow);
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  }>) {
    console.log(`[Mock] Updating flow ${flowId} for user ${userId}`);
    console.log("[Mock] Flow data:", JSON.stringify(flowData));
    
    const flowIndex = mockDb[COLLECTIONS.FLOWS].findIndex(
      f => f.id === flowId && f.userId === userId
    );
    
    if (flowIndex === -1) {
      return null;
    }
    
    // Update flow
    const flow = mockDb[COLLECTIONS.FLOWS][flowIndex];
    const updatedFlow = {
      ...flow,
      ...flowData,
      updatedAt: new Date()
    };
    
    mockDb[COLLECTIONS.FLOWS][flowIndex] = updatedFlow;
    console.log("[Mock] Updated flow:", JSON.stringify(updatedFlow));
    return cloneData(updatedFlow);
  },
  
  async deleteFlow(userId: string, flowId: string) {
    console.log(`[Mock] Deleting flow ${flowId} for user ${userId}`);
    
    const flowIndex = mockDb[COLLECTIONS.FLOWS].findIndex(
      f => f.id === flowId && f.userId === userId
    );
    
    if (flowIndex === -1) {
      return false;
    }
    
    mockDb[COLLECTIONS.FLOWS].splice(flowIndex, 1);
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
    console.log(`[Mock] Creating execution for flow ${executionData.flowId}`);
    
    const execution = {
      id: generateId(),
      ...executionData,
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.EXECUTIONS].push(execution);
    return cloneData(execution);
  },
  
  async updateExecution(executionId: string, executionData: Partial<{
    status: string;
    finishedAt: Date;
    result: any;
    error: string;
  }>) {
    console.log(`[Mock] Updating execution ${executionId}`);
    
    const executionIndex = mockDb[COLLECTIONS.EXECUTIONS].findIndex(
      e => e.id === executionId
    );
    
    if (executionIndex === -1) {
      return null;
    }
    
    // Update execution
    const execution = mockDb[COLLECTIONS.EXECUTIONS][executionIndex];
    const updatedExecution = {
      ...execution,
      ...executionData,
      updatedAt: new Date()
    };
    
    mockDb[COLLECTIONS.EXECUTIONS][executionIndex] = updatedExecution;
    return cloneData(updatedExecution);
  },
  
  async getExecutions(userId: string, queryParams: {
    limit?: number;
    offset?: number;
    flowId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    console.log(`[Mock] Getting executions for user ${userId} with params:`, queryParams);
    
    let executions = mockDb[COLLECTIONS.EXECUTIONS].filter(e => e.userId === userId);
    
    // Apply filters
    if (queryParams.flowId) {
      executions = executions.filter(e => e.flowId === queryParams.flowId);
    }
    
    if (queryParams.status) {
      executions = executions.filter(e => e.status === queryParams.status);
    }
    
    // Sort by created date descending
    executions.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Apply pagination
    if (queryParams.limit) {
      const offset = queryParams.offset || 0;
      executions = executions.slice(offset, offset + queryParams.limit);
    }
    
    return cloneData(executions);
  },
  
  async getExecution(executionId: string) {
    console.log(`[Mock] Getting execution ${executionId}`);
    
    const execution = mockDb[COLLECTIONS.EXECUTIONS].find(e => e.id === executionId);
    
    if (!execution) {
      return null;
    }
    
    return cloneData(execution);
  },
  
  async addExecutionLog(logData: {
    executionId: string;
    nodeId: string;
    level: string;
    message: string;
    timestamp?: Date;
    data?: any;
  }) {
    console.log(`[Mock] Adding execution log for execution ${logData.executionId}`);
    
    const log = {
      id: generateId(),
      ...logData,
      timestamp: logData.timestamp || new Date(),
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.EXECUTION_LOGS].push(log);
    return cloneData(log);
  },
  
  async getExecutionLogs(executionId: string) {
    console.log(`[Mock] Getting logs for execution ${executionId}`);
    
    const logs = mockDb[COLLECTIONS.EXECUTION_LOGS].filter(
      l => l.executionId === executionId
    );
    
    // Sort by timestamp ascending
    logs.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
    
    return cloneData(logs);
  },
  
  // Data table methods
  async getTables(userId: string) {
    console.log(`[Mock] Getting tables for user ${userId}`);
    
    const tables = mockDb[COLLECTIONS.DATA_TABLES].filter(t => t.userId === userId);
    return cloneData(tables);
  },
  
  async getTable(userId: string, tableId: string) {
    console.log(`[Mock] Getting table ${tableId} for user ${userId}`);
    
    const table = mockDb[COLLECTIONS.DATA_TABLES].find(
      t => t.id === tableId && t.userId === userId
    );
    
    if (!table) {
      return null;
    }
    
    return cloneData(table);
  },
  
  async createTable(tableData: {
    userId: string;
    name: string;
    description: string;
    columns: any[];
  }) {
    console.log(`[Mock] Creating table for user ${tableData.userId}`, tableData);
    
    const table = {
      id: generateId(),
      ...tableData,
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.DATA_TABLES].push(table);
    return cloneData(table);
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{
    name: string;
    description: string;
    columns: any[];
  }>) {
    console.log(`[Mock] Updating table ${tableId} for user ${userId}`);
    
    const tableIndex = mockDb[COLLECTIONS.DATA_TABLES].findIndex(
      t => t.id === tableId && t.userId === userId
    );
    
    if (tableIndex === -1) {
      return null;
    }
    
    // Update table
    const table = mockDb[COLLECTIONS.DATA_TABLES][tableIndex];
    const updatedTable = {
      ...table,
      ...tableData,
      updatedAt: new Date()
    };
    
    mockDb[COLLECTIONS.DATA_TABLES][tableIndex] = updatedTable;
    return cloneData(updatedTable);
  },
  
  async deleteTable(userId: string, tableId: string) {
    console.log(`[Mock] Deleting table ${tableId} for user ${userId}`);
    
    const tableIndex = mockDb[COLLECTIONS.DATA_TABLES].findIndex(
      t => t.id === tableId && t.userId === userId
    );
    
    if (tableIndex === -1) {
      return false;
    }
    
    // Delete table
    mockDb[COLLECTIONS.DATA_TABLES].splice(tableIndex, 1);
    
    // Delete all rows for this table
    mockDb[COLLECTIONS.TABLE_ROWS] = mockDb[COLLECTIONS.TABLE_ROWS].filter(
      r => r.tableId !== tableId
    );
    
    return true;
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    console.log(`[Mock] Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
    
    let rows = mockDb[COLLECTIONS.TABLE_ROWS].filter(r => r.tableId === tableId);
    
    // Sort by created date descending
    rows.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    // Apply pagination
    const total = rows.length;
    rows = rows.slice(offset, offset + limit);
    
    return {
      rows: cloneData(rows),
      total
    };
  },
  
  async createTableRow(rowData: {
    tableId: string;
    data: any;
  }) {
    console.log(`[Mock] Creating row for table ${rowData.tableId}`);
    
    const row = {
      id: generateId(),
      ...rowData,
      createdAt: new Date()
    };
    
    mockDb[COLLECTIONS.TABLE_ROWS].push(row);
    return cloneData(row);
  },
  
  async updateTableRow(rowId: string, data: any) {
    console.log(`[Mock] Updating row ${rowId} with data:`, data);
    
    const rowIndex = mockDb[COLLECTIONS.TABLE_ROWS].findIndex(r => r.id === rowId);
    
    if (rowIndex === -1) {
      return null;
    }
    
    // Update row
    const row = mockDb[COLLECTIONS.TABLE_ROWS][rowIndex];
    const updatedRow = {
      ...row,
      data,
      updatedAt: new Date()
    };
    
    mockDb[COLLECTIONS.TABLE_ROWS][rowIndex] = updatedRow;
    return cloneData(updatedRow);
  },
  
  async deleteTableRow(rowId: string) {
    console.log(`[Mock] Deleting row ${rowId}`);
    
    const rowIndex = mockDb[COLLECTIONS.TABLE_ROWS].findIndex(r => r.id === rowId);
    
    if (rowIndex === -1) {
      return false;
    }
    
    mockDb[COLLECTIONS.TABLE_ROWS].splice(rowIndex, 1);
    return true;
  }
};