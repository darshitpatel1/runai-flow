// Simplified Firebase service with mock data for development
import { COLLECTIONS } from '@shared/firestore-schema';

// Mock data store (in-memory database for development)
const mockDb = {
  users: new Map(),
  flows: new Map(),
  tables: new Map(),
  tableRows: new Map(),
  connectors: new Map(),
  executions: new Map(),
  executionLogs: new Map()
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to normalize documents
function normalizeDoc(id: string, data: any) {
  return {
    id,
    ...data
  };
}

// Firebase storage implementation with basic CRUD operations
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
    
    // Find user by Firebase UID
    for (const [id, user] of mockDb.users.entries()) {
      if (user.firebaseUid === firebaseUid) {
        return normalizeDoc(id, user);
      }
    }
    
    return null;
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    console.log('Creating user with data:', userData);
    
    // Check if user already exists
    const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
    if (existingUser) {
      console.log('User already exists in the database');
      return existingUser;
    }
    
    // Create new user
    const id = generateId();
    const user = {
      ...userData,
      createdAt: new Date()
    };
    
    mockDb.users.set(id, user);
    console.log('User created with ID:', id);
    
    return normalizeDoc(id, user);
  },
  
  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    const user = mockDb.users.get(userId);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };
    
    mockDb.users.set(userId, updatedUser);
    return normalizeDoc(userId, updatedUser);
  },
  
  // Table methods
  async getTables(userId: string) {
    const tables = [];
    
    for (const [id, table] of mockDb.tables.entries()) {
      if (table.userId === userId) {
        tables.push(normalizeDoc(id, table));
      }
    }
    
    return tables;
  },
  
  async getTable(userId: string, tableId: string) {
    const table = mockDb.tables.get(tableId);
    
    if (!table || table.userId !== userId) {
      return null;
    }
    
    return normalizeDoc(tableId, table);
  },
  
  async createTable(tableData: { userId: string; name: string; description: string; columns: any[] }) {
    const id = generateId();
    const table = {
      ...tableData,
      createdAt: new Date()
    };
    
    mockDb.tables.set(id, table);
    return normalizeDoc(id, table);
  },
  
  async updateTable(userId: string, tableId: string, tableData: Partial<{ name: string; description: string; columns: any[] }>) {
    const table = mockDb.tables.get(tableId);
    
    if (!table || table.userId !== userId) {
      return null;
    }
    
    const updatedTable = {
      ...table,
      ...tableData,
      updatedAt: new Date()
    };
    
    mockDb.tables.set(tableId, updatedTable);
    return normalizeDoc(tableId, updatedTable);
  },
  
  async deleteTable(userId: string, tableId: string) {
    const table = mockDb.tables.get(tableId);
    
    if (!table || table.userId !== userId) {
      return false;
    }
    
    // Delete the table
    mockDb.tables.delete(tableId);
    
    // Delete all related rows
    for (const [rowId, row] of mockDb.tableRows.entries()) {
      if (row.tableId === tableId) {
        mockDb.tableRows.delete(rowId);
      }
    }
    
    return true;
  },
  
  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    const rows = [];
    
    for (const [id, row] of mockDb.tableRows.entries()) {
      if (row.tableId === tableId) {
        rows.push(normalizeDoc(id, row));
      }
    }
    
    // Sort by created date and apply pagination
    const sortedRows = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const paginatedRows = sortedRows.slice(offset, offset + limit);
    
    return { rows: paginatedRows, total: rows.length };
  },
  
  async createTableRow(rowData: { tableId: string; data: any }) {
    const id = generateId();
    const row = {
      ...rowData,
      createdAt: new Date()
    };
    
    mockDb.tableRows.set(id, row);
    return normalizeDoc(id, row);
  },
  
  async updateTableRow(rowId: string, data: any) {
    const row = mockDb.tableRows.get(rowId);
    
    if (!row) {
      return null;
    }
    
    const updatedRow = {
      ...row,
      data,
      updatedAt: new Date()
    };
    
    mockDb.tableRows.set(rowId, updatedRow);
    return normalizeDoc(rowId, updatedRow);
  },
  
  async deleteTableRow(rowId: string) {
    if (!mockDb.tableRows.has(rowId)) {
      return false;
    }
    
    mockDb.tableRows.delete(rowId);
    return true;
  },
  
  // Flow methods
  async getFlows(userId: string) {
    const flows = [];
    
    for (const [id, flow] of mockDb.flows.entries()) {
      if (flow.userId === userId) {
        flows.push(normalizeDoc(id, flow));
      }
    }
    
    return flows;
  },
  
  async getFlow(userId: string, flowId: string) {
    const flow = mockDb.flows.get(flowId);
    
    if (!flow || flow.userId !== userId) {
      return null;
    }
    
    return normalizeDoc(flowId, flow);
  },
  
  async createFlow(flowData: { userId: string; name: string; description: string; nodes: any[]; edges: any[] }) {
    const id = generateId();
    const flow = {
      ...flowData,
      createdAt: new Date()
    };
    
    mockDb.flows.set(id, flow);
    return normalizeDoc(id, flow);
  },
  
  async updateFlow(userId: string, flowId: string, flowData: Partial<{ name: string; description: string; nodes: any[]; edges: any[] }>) {
    const flow = mockDb.flows.get(flowId);
    
    if (!flow || flow.userId !== userId) {
      return null;
    }
    
    const updatedFlow = {
      ...flow,
      ...flowData,
      updatedAt: new Date()
    };
    
    mockDb.flows.set(flowId, updatedFlow);
    return normalizeDoc(flowId, updatedFlow);
  },
  
  async deleteFlow(userId: string, flowId: string) {
    const flow = mockDb.flows.get(flowId);
    
    if (!flow || flow.userId !== userId) {
      return false;
    }
    
    mockDb.flows.delete(flowId);
    return true;
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    const connectors = [];
    
    for (const [id, connector] of mockDb.connectors.entries()) {
      if (connector.userId === userId) {
        connectors.push(normalizeDoc(id, connector));
      }
    }
    
    return connectors;
  },
  
  async getConnector(userId: string, connectorId: string) {
    const connector = mockDb.connectors.get(connectorId);
    
    if (!connector || connector.userId !== userId) {
      return null;
    }
    
    return normalizeDoc(connectorId, connector);
  },
  
  async createConnector(connectorData: { userId: string; name: string; type: string; config: any }) {
    const id = generateId();
    const connector = {
      ...connectorData,
      createdAt: new Date()
    };
    
    mockDb.connectors.set(id, connector);
    return normalizeDoc(id, connector);
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{ name: string; config: any }>) {
    const connector = mockDb.connectors.get(connectorId);
    
    if (!connector || connector.userId !== userId) {
      return null;
    }
    
    const updatedConnector = {
      ...connector,
      ...connectorData,
      updatedAt: new Date()
    };
    
    mockDb.connectors.set(connectorId, updatedConnector);
    return normalizeDoc(connectorId, updatedConnector);
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    const connector = mockDb.connectors.get(connectorId);
    
    if (!connector || connector.userId !== userId) {
      return false;
    }
    
    mockDb.connectors.delete(connectorId);
    return true;
  },
  
  // Execution methods
  async createExecution(executionData: { userId: string; flowId: string; status: string; startedAt: Date; finishedAt?: Date; result?: any; error?: string }) {
    const id = generateId();
    const execution = {
      ...executionData,
      createdAt: new Date()
    };
    
    mockDb.executions.set(id, execution);
    return normalizeDoc(id, execution);
  },
  
  async updateExecution(executionId: string, executionData: Partial<{ status: string; finishedAt: Date; result: any; error: string }>) {
    const execution = mockDb.executions.get(executionId);
    
    if (!execution) {
      return null;
    }
    
    const updatedExecution = {
      ...execution,
      ...executionData,
      updatedAt: new Date()
    };
    
    mockDb.executions.set(executionId, updatedExecution);
    return normalizeDoc(executionId, updatedExecution);
  },
  
  async getExecutions(userId: string, queryParams: { limit?: number; offset?: number; flowId?: string; status?: string; startDate?: Date; endDate?: Date } = {}) {
    const executions = [];
    
    for (const [id, execution] of mockDb.executions.entries()) {
      if (execution.userId !== userId) continue;
      
      let match = true;
      
      if (queryParams.flowId && execution.flowId !== queryParams.flowId) {
        match = false;
      }
      
      if (queryParams.status && execution.status !== queryParams.status) {
        match = false;
      }
      
      if (match) {
        executions.push(normalizeDoc(id, execution));
      }
    }
    
    // Sort by created date descending
    const sortedExecutions = executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply limit if provided
    if (queryParams.limit) {
      return sortedExecutions.slice(0, queryParams.limit);
    }
    
    return sortedExecutions;
  },
  
  async getExecution(executionId: string) {
    const execution = mockDb.executions.get(executionId);
    
    if (!execution) {
      return null;
    }
    
    return normalizeDoc(executionId, execution);
  },
  
  async addExecutionLog(logData: { executionId: string; nodeId: string; level: string; message: string; timestamp?: Date; data?: any }) {
    const id = generateId();
    const log = {
      ...logData,
      timestamp: logData.timestamp || new Date(),
      createdAt: new Date()
    };
    
    mockDb.executionLogs.set(id, log);
    return normalizeDoc(id, log);
  },
  
  async getExecutionLogs(executionId: string) {
    const logs = [];
    
    for (const [id, log] of mockDb.executionLogs.entries()) {
      if (log.executionId === executionId) {
        logs.push(normalizeDoc(id, log));
      }
    }
    
    // Sort by timestamp ascending
    return logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
};