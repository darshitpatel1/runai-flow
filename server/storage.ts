import { db } from '@db';
import { users, connectors, flows, executions, executionLogs, dataTables, tableRows } from '@shared/schema';
import { eq, and, desc } from "drizzle-orm";

export const storage = {
  // Table operations
  async getTables(userId: number) {
    return await db.query.dataTables.findMany({
      where: eq(dataTables.userId, userId),
      orderBy: [desc(dataTables.updatedAt)]
    });
  },
  
  async getTable(userId: number, tableId: number) {
    return await db.query.dataTables.findFirst({
      where: and(
        eq(dataTables.userId, userId),
        eq(dataTables.id, tableId)
      )
    });
  },
  
  async createTable(tableData: {
    userId: number;
    name: string;
    description?: string;
    columns: any;
  }) {
    const [newTable] = await db.insert(dataTables).values({
      userId: tableData.userId,
      name: tableData.name,
      description: tableData.description,
      columns: tableData.columns,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return newTable;
  },
  
  async updateTable(userId: number, tableId: number, tableData: Partial<{
    name: string;
    description: string;
    columns: any;
  }>) {
    const [updatedTable] = await db.update(dataTables)
      .set({
        ...tableData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(dataTables.id, tableId),
          eq(dataTables.userId, userId)
        )
      )
      .returning();
    
    return updatedTable;
  },
  
  async deleteTable(userId: number, tableId: number) {
    // Delete all rows first (cascade is not automatic)
    await db.delete(tableRows)
      .where(eq(tableRows.tableId, tableId));
      
    // Then delete the table
    return await db.delete(dataTables)
      .where(
        and(
          eq(dataTables.id, tableId),
          eq(dataTables.userId, userId)
        )
      )
      .returning();
  },
  
  async getTableRows(tableId: number, limit: number = 100, offset: number = 0) {
    return await db.query.tableRows.findMany({
      where: eq(tableRows.tableId, tableId),
      orderBy: [desc(tableRows.updatedAt)],
      limit,
      offset
    });
  },
  
  async createTableRow(rowData: {
    tableId: number;
    data: any;
  }) {
    const [newRow] = await db.insert(tableRows).values({
      tableId: rowData.tableId,
      data: rowData.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return newRow;
  },
  
  async updateTableRow(rowId: number, data: any) {
    const [updatedRow] = await db.update(tableRows)
      .set({
        data,
        updatedAt: new Date()
      })
      .where(eq(tableRows.id, rowId))
      .returning();
    
    return updatedRow;
  },
  
  async deleteTableRow(rowId: number) {
    return await db.delete(tableRows)
      .where(eq(tableRows.id, rowId))
      .returning();
  },
  
  // User operations
  async getUserByFirebaseUid(firebaseUid: string) {
    return await db.query.users.findFirst({
      where: eq(users.firebaseUid, firebaseUid)
    });
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    const [user] = await db.insert(users).values({
      firebaseUid: userData.firebaseUid,
      email: userData.email,
      displayName: userData.displayName,
      photoUrl: userData.photoUrl,
    }).returning();
    
    return user;
  },
  
  async updateUser(userId: number, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  },
  
  // Connector operations
  async getConnectors(userId: number) {
    return await db.query.connectors.findMany({
      where: eq(connectors.userId, userId),
      orderBy: desc(connectors.createdAt)
    });
  },
  
  async getConnector(userId: number, connectorId: number) {
    return await db.query.connectors.findFirst({
      where: and(
        eq(connectors.userId, userId),
        eq(connectors.id, connectorId)
      )
    });
  },
  
  async createConnector(connectorData: {
    userId: number;
    name: string;
    baseUrl: string;
    authType: string;
    authConfig?: any;
    headers?: any;
  }) {
    const [connector] = await db.insert(connectors).values({
      userId: connectorData.userId,
      name: connectorData.name,
      baseUrl: connectorData.baseUrl,
      authType: connectorData.authType,
      authConfig: connectorData.authConfig,
      headers: connectorData.headers
    }).returning();
    
    return connector;
  },
  
  async updateConnector(userId: number, connectorId: number, connectorData: Partial<{
    name: string;
    baseUrl: string;
    authType: string;
    authConfig: any;
    headers: any;
  }>) {
    const [updatedConnector] = await db.update(connectors)
      .set({ 
        ...connectorData, 
        updatedAt: new Date()
      })
      .where(and(
        eq(connectors.userId, userId),
        eq(connectors.id, connectorId)
      ))
      .returning();
    
    return updatedConnector;
  },
  
  async deleteConnector(userId: number, connectorId: number) {
    return await db.delete(connectors)
      .where(and(
        eq(connectors.userId, userId),
        eq(connectors.id, connectorId)
      ))
      .returning();
  },
  
  // Flow operations
  async getFlows(userId: number) {
    return await db.query.flows.findMany({
      where: eq(flows.userId, userId),
      orderBy: desc(flows.updatedAt)
    });
  },
  
  async getFlow(userId: number, flowId: number) {
    return await db.query.flows.findFirst({
      where: and(
        eq(flows.userId, userId),
        eq(flows.id, flowId)
      )
    });
  },
  
  async createFlow(flowData: {
    userId: number;
    name: string;
    description?: string;
    nodes: any;
    edges: any;
    active?: boolean;
  }) {
    const [flow] = await db.insert(flows).values({
      userId: flowData.userId,
      name: flowData.name,
      description: flowData.description,
      nodes: flowData.nodes,
      edges: flowData.edges,
      active: flowData.active || false
    }).returning();
    
    return flow;
  },
  
  async updateFlow(userId: number, flowId: number, flowData: Partial<{
    name: string;
    description: string;
    nodes: any;
    edges: any;
    active: boolean;
  }>) {
    const [updatedFlow] = await db.update(flows)
      .set({ 
        ...flowData, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(flows.userId, userId),
        eq(flows.id, flowId)
      ))
      .returning();
    
    return updatedFlow;
  },
  
  async deleteFlow(userId: number, flowId: number) {
    return await db.delete(flows)
      .where(and(
        eq(flows.userId, userId),
        eq(flows.id, flowId)
      ))
      .returning();
  },
  
  // Execution operations
  async createExecution(executionData: {
    flowId: number;
    userId: number;
    status: string;
    input?: any;
  }) {
    const [execution] = await db.insert(executions).values({
      flowId: executionData.flowId,
      userId: executionData.userId,
      status: executionData.status,
      input: executionData.input,
      startedAt: new Date()
    }).returning();
    
    return execution;
  },
  
  async updateExecution(executionId: number, executionData: Partial<{
    status: string;
    finishedAt: Date;
    duration: number;
    logs: any;
    output: any;
  }>) {
    const [updatedExecution] = await db.update(executions)
      .set(executionData)
      .where(eq(executions.id, executionId))
      .returning();
    
    return updatedExecution;
  },
  
  async getExecutions(userId: number, limit: number = 10, offset: number = 0, filters?: {
    flowId?: number;
    status?: string;
    startDate?: Date;
  }) {
    // Build the conditions array
    const conditions = [eq(executions.userId, userId)];
    
    if (filters?.flowId) {
      conditions.push(eq(executions.flowId, filters.flowId));
    }
    
    if (filters?.status) {
      conditions.push(eq(executions.status, filters.status));
    }
    
    if (filters?.startDate) {
      // This would need more sophisticated handling for date comparison
      // For now, just skip this filter
    }
    
    return await db.select().from(executions)
      .where(and(...conditions))
      .orderBy(desc(executions.startedAt))
      .limit(limit)
      .offset(offset);
  },
  
  async getExecution(executionId: number) {
    return await db.query.executions.findFirst({
      where: eq(executions.id, executionId),
      with: {
        logs: true
      }
    });
  },
  
  // Execution Logs operations
  async addExecutionLog(logData: {
    executionId: number;
    level: string;
    message: string;
    nodeId?: string;
    data?: any;
  }) {
    const [log] = await db.insert(executionLogs).values({
      executionId: logData.executionId,
      level: logData.level,
      message: logData.message,
      nodeId: logData.nodeId,
      data: logData.data,
      timestamp: new Date()
    }).returning();
    
    return log;
  },
  
  async getExecutionLogs(executionId: number) {
    return await db.query.executionLogs.findMany({
      where: eq(executionLogs.executionId, executionId),
      orderBy: executionLogs.timestamp
    });
  }
};
