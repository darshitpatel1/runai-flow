import { db } from '@db';
import { users, connectors, flows, executions, executionLogs } from '@shared/schema';
import { eq, and, desc } from "drizzle-orm";

export const storage = {
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
    let query = db.select().from(executions).where(eq(executions.userId, userId));
    
    if (filters?.flowId) {
      query = query.where(eq(executions.flowId, filters.flowId));
    }
    
    if (filters?.status) {
      query = query.where(eq(executions.status, filters.status));
    }
    
    if (filters?.startDate) {
      query = query.where(and(
        executions.startedAt >= filters.startDate
      ));
    }
    
    return await query
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
