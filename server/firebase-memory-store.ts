// Simple in-memory implementation of Firebase-like storage
import { User, Flow, DataTable, TableRow, Connector, Execution, ExecutionLog } from '@shared/firestore-schema';

// Create in-memory database using Maps
const db = {
  users: new Map<string, Omit<User, 'id'>>(),
  flows: new Map<string, Omit<Flow, 'id'>>(),
  tables: new Map<string, Omit<DataTable, 'id'>>(),
  tableRows: new Map<string, Omit<TableRow, 'id'>>(),
  connectors: new Map<string, Omit<Connector, 'id'>>(),
  executions: new Map<string, Omit<Execution, 'id'>>(),
  executionLogs: new Map<string, Omit<ExecutionLog, 'id'>>()
};

// Helper to generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Helper to add ID to document
function normalizeDoc<T>(id: string, data: T): T & { id: string } {
  return {
    id,
    ...data as object
  } as T & { id: string };
}

// Full storage implementation
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    for (const [id, user] of Array.from(db.users.entries())) {
      if (user.firebaseUid === firebaseUid) {
        return normalizeDoc(id, user);
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

    db.users.set(id, user);
    return normalizeDoc(id, user);
  },

  async updateUser(userId: string, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    const existingUser = db.users.get(userId);
    if (!existingUser) return null;

    const updatedUser = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };

    db.users.set(userId, updatedUser);
    return normalizeDoc(userId, updatedUser);
  },

  // Table methods
  async getTables(userId: string) {
    const tables = [];
    for (const [id, table] of Array.from(db.tables.entries())) {
      if (table.userId === userId) {
        tables.push(normalizeDoc(id, table));
      }
    }
    return tables;
  },

  async getTable(userId: string, tableId: string) {
    const table = db.tables.get(tableId);
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

    db.tables.set(id, table);
    return normalizeDoc(id, table);
  },

  async updateTable(userId: string, tableId: string, tableData: Partial<{ name: string; description: string; columns: any[] }>) {
    const table = db.tables.get(tableId);
    if (!table || table.userId !== userId) {
      return null;
    }

    const updatedTable = {
      ...table,
      ...tableData,
      updatedAt: new Date()
    };

    db.tables.set(tableId, updatedTable);
    return normalizeDoc(tableId, updatedTable);
  },

  async deleteTable(userId: string, tableId: string) {
    const table = db.tables.get(tableId);
    if (!table || table.userId !== userId) {
      return false;
    }

    db.tables.delete(tableId);

    // Delete associated rows
    for (const [rowId, row] of Array.from(db.tableRows.entries())) {
      if (row.tableId === tableId) {
        db.tableRows.delete(rowId);
      }
    }

    return true;
  },

  async getTableRows(tableId: string, limit: number = 100, offset: number = 0) {
    const rows = [];
    for (const [id, row] of Array.from(db.tableRows.entries())) {
      if (row.tableId === tableId) {
        rows.push(normalizeDoc(id, row));
      }
    }

    // Sort by creation date and apply pagination
    const sortedRows = rows.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const paginatedRows = sortedRows.slice(offset, offset + limit);
    
    return {
      rows: paginatedRows,
      total: rows.length
    };
  },

  async createTableRow(rowData: { tableId: string; data: any }) {
    const id = generateId();
    const row = {
      ...rowData,
      createdAt: new Date()
    };

    db.tableRows.set(id, row);
    return normalizeDoc(id, row);
  },

  async updateTableRow(rowId: string, data: any) {
    const row = db.tableRows.get(rowId);
    if (!row) {
      return null;
    }

    const updatedRow = {
      ...row,
      data,
      updatedAt: new Date()
    };

    db.tableRows.set(rowId, updatedRow);
    return normalizeDoc(rowId, updatedRow);
  },

  async deleteTableRow(rowId: string) {
    if (!db.tableRows.has(rowId)) {
      return false;
    }

    db.tableRows.delete(rowId);
    return true;
  },

  // Flow methods
  async getFlows(userId: string) {
    const flows = [];
    for (const [id, flow] of Array.from(db.flows.entries())) {
      if (flow.userId === userId) {
        flows.push(normalizeDoc(id, flow));
      }
    }
    return flows;
  },

  async getFlow(userId: string, flowId: string) {
    const flow = db.flows.get(flowId);
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

    db.flows.set(id, flow);
    return normalizeDoc(id, flow);
  },

  async updateFlow(userId: string, flowId: string, flowData: Partial<{ name: string; description: string; nodes: any[]; edges: any[] }>) {
    const flow = db.flows.get(flowId);
    if (!flow || flow.userId !== userId) {
      return null;
    }

    const updatedFlow = {
      ...flow,
      ...flowData,
      updatedAt: new Date()
    };

    db.flows.set(flowId, updatedFlow);
    return normalizeDoc(flowId, updatedFlow);
  },

  async deleteFlow(userId: string, flowId: string) {
    const flow = db.flows.get(flowId);
    if (!flow || flow.userId !== userId) {
      return false;
    }

    db.flows.delete(flowId);
    return true;
  },

  // Connector methods
  async getConnectors(userId: string) {
    const connectors = [];
    for (const [id, connector] of Array.from(db.connectors.entries())) {
      if (connector.userId === userId) {
        connectors.push(normalizeDoc(id, connector));
      }
    }
    return connectors;
  },

  async getConnector(userId: string, connectorId: string) {
    const connector = db.connectors.get(connectorId);
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

    db.connectors.set(id, connector);
    return normalizeDoc(id, connector);
  },

  async updateConnector(userId: string, connectorId: string, connectorData: Partial<{ name: string; config: any }>) {
    const connector = db.connectors.get(connectorId);
    if (!connector || connector.userId !== userId) {
      return null;
    }

    const updatedConnector = {
      ...connector,
      ...connectorData,
      updatedAt: new Date()
    };

    db.connectors.set(connectorId, updatedConnector);
    return normalizeDoc(connectorId, updatedConnector);
  },

  async deleteConnector(userId: string, connectorId: string) {
    const connector = db.connectors.get(connectorId);
    if (!connector || connector.userId !== userId) {
      return false;
    }

    db.connectors.delete(connectorId);
    return true;
  },

  // Execution methods
  async createExecution(executionData: { userId: string; flowId: string; status: "queued" | "running" | "success" | "error" | "cancelled"; startedAt: Date; finishedAt?: Date; result?: any; error?: string }) {
    const id = generateId();
    const execution = {
      ...executionData,
      createdAt: new Date()
    };

    db.executions.set(id, execution);
    return normalizeDoc(id, execution);
  },

  async updateExecution(executionId: string, executionData: Partial<{ status: "queued" | "running" | "success" | "error" | "cancelled"; finishedAt: Date; result: any; error: string }>) {
    const execution = db.executions.get(executionId);
    if (!execution) {
      return null;
    }

    const updatedExecution = {
      ...execution,
      ...executionData,
      updatedAt: new Date()
    };

    db.executions.set(executionId, updatedExecution);
    return normalizeDoc(executionId, updatedExecution);
  },

  async getExecutions(userId: string, queryParams: { limit?: number; offset?: number; flowId?: string; status?: string; startDate?: Date; endDate?: Date } = {}) {
    const executions = [];
    for (const [id, execution] of Array.from(db.executions.entries())) {
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

    // Sort by creation date (newest first)
    const sortedExecutions = executions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Apply pagination if limit is specified
    if (queryParams.limit && queryParams.limit > 0) {
      const offset = queryParams.offset || 0;
      return sortedExecutions.slice(offset, offset + queryParams.limit);
    }

    return sortedExecutions;
  },

  async getExecution(executionId: string) {
    const execution = db.executions.get(executionId);
    if (!execution) {
      return null;
    }
    return normalizeDoc(executionId, execution);
  },

  async addExecutionLog(logData: { executionId: string; nodeId: string; level: "debug" | "info" | "warning" | "error"; message: string; timestamp?: Date; data?: any }) {
    const id = generateId();
    const log = {
      ...logData,
      timestamp: logData.timestamp || new Date(),
      createdAt: new Date()
    };

    db.executionLogs.set(id, log);
    return normalizeDoc(id, log);
  },

  async getExecutionLogs(executionId: string) {
    const logs = [];
    for (const [id, log] of Array.from(db.executionLogs.entries())) {
      if (log.executionId === executionId) {
        logs.push(normalizeDoc(id, log));
      }
    }

    // Sort by timestamp ascending
    return logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
  }
};