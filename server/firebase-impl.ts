// Simple in-memory implementation of storage
import { User, Flow, DataTable, TableRow, Connector, Execution, ExecutionLog } from '@shared/firestore-schema';

// Create maps for each collection
const users = new Map<string, Omit<User, 'id'>>();
const flows = new Map<string, Omit<Flow, 'id'>>();
const tables = new Map<string, Omit<DataTable, 'id'>>();
const tableRows = new Map<string, Omit<TableRow, 'id'>>();
const connectors = new Map<string, Omit<Connector, 'id'>>();
const executions = new Map<string, Omit<Execution, 'id'>>();
const executionLogs = new Map<string, Omit<ExecutionLog, 'id'>>();

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Add document ID to data
function normalizeDoc<T>(id: string, data: any): T & { id: string } {
  return {
    id,
    ...data
  } as T & { id: string };
}

export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    for (const [id, user] of Array.from(users.entries())) {
      if (user.firebaseUid === firebaseUid) {
        return normalizeDoc<User>(id, user);
      }
    }
    return null;
  },

  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    const existingUser = await this.getUserByFirebaseUid(userData.firebaseUid);
    if (existingUser) {
      console.log("User already exists in the database");
      return existingUser;
    }

    const id = generateId();
    const user = {
      ...userData,
      createdAt: new Date()
    };

    users.set(id, user);
    return normalizeDoc<User>(id, user);
  },

  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    const user = users.get(userId);
    if (!user) return null;

    const updatedUser = {
      ...user,
      ...userData,
      updatedAt: new Date()
    };

    users.set(userId, updatedUser);
    return normalizeDoc<User>(userId, updatedUser);
  },

  // Table methods
  async getTables(userId: string) {
    const results = [];
    for (const [id, table] of Array.from(tables.entries())) {
      if (table.userId === userId) {
        results.push(normalizeDoc<DataTable>(id, table));
      }
    }
    return results;
  },

  async getTable(userId: string, tableId: string) {
    const table = tables.get(tableId);
    if (!table || table.userId !== userId) return null;
    return normalizeDoc<DataTable>(tableId, table);
  },

  async createTable(tableData: { userId: string; name: string; description: string; columns: any[] }) {
    const id = generateId();
    const table = {
      ...tableData,
      createdAt: new Date()
    };

    tables.set(id, table);
    return normalizeDoc<DataTable>(id, table);
  },

  async updateTable(userId: string, tableId: string, tableData: Partial<{ name: string; description: string; columns: any[] }>) {
    const table = tables.get(tableId);
    if (!table || table.userId !== userId) return null;

    const updatedTable = {
      ...table,
      ...tableData,
      updatedAt: new Date()
    };

    tables.set(tableId, updatedTable);
    return normalizeDoc<DataTable>(tableId, updatedTable);
  },

  async deleteTable(userId: string, tableId: string) {
    const table = tables.get(tableId);
    if (!table || table.userId !== userId) return false;

    tables.delete(tableId);

    // Delete related rows
    for (const [rowId, row] of Array.from(tableRows.entries())) {
      if (row.tableId === tableId) {
        tableRows.delete(rowId);
      }
    }

    return true;
  },

  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    const rows = [];
    for (const [id, row] of Array.from(tableRows.entries())) {
      if (row.tableId === tableId) {
        rows.push(normalizeDoc<TableRow>(id, row));
      }
    }

    // Sort and paginate
    const sortedRows = rows.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return {
      rows: sortedRows.slice(offset, offset + limit),
      total: rows.length
    };
  },

  async createTableRow(rowData: { tableId: string; data: any }) {
    const id = generateId();
    const row = {
      ...rowData,
      createdAt: new Date()
    };

    tableRows.set(id, row);
    return normalizeDoc<TableRow>(id, row);
  },

  async updateTableRow(rowId: string, data: any) {
    const row = tableRows.get(rowId);
    if (!row) return null;

    const updatedRow = {
      ...row,
      data,
      updatedAt: new Date()
    };

    tableRows.set(rowId, updatedRow);
    return normalizeDoc<TableRow>(rowId, updatedRow);
  },

  async deleteTableRow(rowId: string) {
    if (!tableRows.has(rowId)) return false;
    tableRows.delete(rowId);
    return true;
  },

  // Flow methods
  async getFlows(userId: string) {
    const results = [];
    for (const [id, flow] of Array.from(flows.entries())) {
      if (flow.userId === userId) {
        results.push(normalizeDoc<Flow>(id, flow));
      }
    }
    return results;
  },

  async getFlow(userId: string, flowId: string) {
    const flow = flows.get(flowId);
    if (!flow || flow.userId !== userId) return null;
    return normalizeDoc<Flow>(flowId, flow);
  },

  async createFlow(flowData: { userId: string; name: string; description: string; nodes: any[]; edges: any[] }) {
    const id = generateId();
    const flow = {
      ...flowData,
      createdAt: new Date()
    };

    flows.set(id, flow);
    return normalizeDoc<Flow>(id, flow);
  },

  async updateFlow(userId: string, flowId: string, flowData: Partial<{ name: string; description: string; nodes: any[]; edges: any[] }>) {
    const flow = flows.get(flowId);
    if (!flow || flow.userId !== userId) return null;

    const updatedFlow = {
      ...flow,
      ...flowData,
      updatedAt: new Date()
    };

    flows.set(flowId, updatedFlow);
    return normalizeDoc<Flow>(flowId, updatedFlow);
  },

  async deleteFlow(userId: string, flowId: string) {
    const flow = flows.get(flowId);
    if (!flow || flow.userId !== userId) return false;
    flows.delete(flowId);
    return true;
  },

  // Connector methods
  async getConnectors(userId: string) {
    const results = [];
    for (const [id, connector] of Array.from(connectors.entries())) {
      if (connector.userId === userId) {
        results.push(normalizeDoc<Connector>(id, connector));
      }
    }
    return results;
  },

  async getConnector(userId: string, connectorId: string) {
    const connector = connectors.get(connectorId);
    if (!connector || connector.userId !== userId) return null;
    return normalizeDoc<Connector>(connectorId, connector);
  },

  async createConnector(connectorData: { userId: string; name: string; type: string; config: any }) {
    const id = generateId();
    const connector = {
      ...connectorData,
      createdAt: new Date()
    };

    connectors.set(id, connector);
    return normalizeDoc<Connector>(id, connector);
  },

  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{ name: string; config: any }>) {
    const connector = connectors.get(connectorId);
    if (!connector || connector.userId !== userId) return null;

    const updatedConnector = {
      ...connector,
      ...connectorData,
      updatedAt: new Date()
    };

    connectors.set(connectorId, updatedConnector);
    return normalizeDoc<Connector>(connectorId, updatedConnector);
  },

  async deleteConnector(userId: string, connectorId: string) {
    const connector = connectors.get(connectorId);
    if (!connector || connector.userId !== userId) return false;
    connectors.delete(connectorId);
    return true;
  },

  // Execution methods
  async createExecution(executionData: { 
    userId: string; 
    flowId: string; 
    status: "queued" | "running" | "success" | "error" | "cancelled"; 
    startedAt: Date; 
    finishedAt?: Date; 
    result?: any; 
    error?: string 
  }) {
    const id = generateId();
    const execution = {
      ...executionData,
      createdAt: new Date()
    };

    executions.set(id, execution);
    return normalizeDoc<Execution>(id, execution);
  },

  async updateExecution(executionId: string, executionData: Partial<{ 
    status: "queued" | "running" | "success" | "error" | "cancelled"; 
    finishedAt: Date; 
    result: any; 
    error: string 
  }>) {
    const execution = executions.get(executionId);
    if (!execution) return null;

    const updatedExecution = {
      ...execution,
      ...executionData,
      updatedAt: new Date()
    };

    executions.set(executionId, updatedExecution);
    return normalizeDoc<Execution>(executionId, updatedExecution);
  },

  async getExecutions(userId: string, queryParams: { 
    limit?: number; 
    offset?: number; 
    flowId?: string; 
    status?: string; 
    startDate?: Date; 
    endDate?: Date 
  } = {}) {
    const results = [];
    for (const [id, execution] of Array.from(executions.entries())) {
      if (execution.userId !== userId) continue;
      
      // Apply filters
      if (queryParams.flowId && execution.flowId !== queryParams.flowId) continue;
      if (queryParams.status && execution.status !== queryParams.status) continue;
      
      results.push(normalizeDoc<Execution>(id, execution));
    }

    // Sort by created date (newest first)
    const sortedResults = results.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Apply pagination
    if (queryParams.limit) {
      const offset = queryParams.offset || 0;
      return sortedResults.slice(offset, offset + queryParams.limit);
    }

    return sortedResults;
  },

  async getExecution(executionId: string) {
    const execution = executions.get(executionId);
    if (!execution) return null;
    return normalizeDoc<Execution>(executionId, execution);
  },

  async addExecutionLog(logData: { 
    executionId: string; 
    nodeId: string; 
    level: "debug" | "info" | "warning" | "error"; 
    message: string; 
    timestamp?: Date; 
    data?: any 
  }) {
    const id = generateId();
    const log = {
      ...logData,
      timestamp: logData.timestamp || new Date(),
      createdAt: new Date()
    };

    executionLogs.set(id, log);
    return normalizeDoc<ExecutionLog>(id, log);
  },

  async getExecutionLogs(executionId: string) {
    const logs = [];
    for (const [id, log] of Array.from(executionLogs.entries())) {
      if (log.executionId === executionId) {
        logs.push(normalizeDoc<ExecutionLog>(id, log));
      }
    }

    // Sort by timestamp (oldest first for chronological display)
    return logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
  }
};