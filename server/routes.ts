import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from "./storage";
import { 
  insertConnectorSchema, 
  insertFlowSchema,
  insertExecutionSchema,
  insertDataTableSchema,
  insertTableRowSchema,
  columnDefinitionSchema
} from "@shared/schema";
import { z } from "zod";

// Store active WebSocket connections by user ID
const connections = new Map<string, WebSocket[]>();

// Helper function to send execution updates to connected users with improved error handling
function sendExecutionUpdate(userId: string, executionData: any) {
  const userConnections = connections.get(userId.toString());
  
  if (!userConnections || userConnections.length === 0) {
    console.log(`No active connections for user ${userId}`);
    return;
  }
  
  // Filter out connections that are not in OPEN state
  const activeConnections = userConnections.filter(ws => ws.readyState === WebSocket.OPEN);
  
  if (activeConnections.length === 0) {
    console.log(`No open connections for user ${userId}`);
    return;
  }
  
  try {
    const message = JSON.stringify({
      type: 'execution_update',
      data: executionData
    });
    
    // Send message to all active connections
    let successCount = 0;
    
    for (const ws of activeConnections) {
      try {
        ws.send(message);
        successCount++;
      } catch (error: any) {
        console.error(`Error sending execution update to a client: ${error.message}`);
        // Connection is likely broken - terminate it
        try {
          ws.terminate();
        } catch (e) {
          // Ignore error during termination
        }
      }
    }
    
    console.log(`Successfully sent execution update to ${successCount}/${activeConnections.length} connection(s) for user ${userId}`);
  } catch (error: any) {
    console.error(`Error preparing execution update: ${error.message}`);
  }
}

// Middleware to ensure user is authenticated via Firebase
const requireAuth = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  // Extract token from the Authorization header
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // For a real Firebase implementation, we'd use admin.auth().verifyIdToken(token)
    // But for simplicity, we'll extract the Firebase UID from the token payload
    
    // Firebase tokens are JWTs, so we can decode them
    // without verification for this development implementation
    // The format is: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    try {
      // Decode the payload (the middle part)
      // Firebase uses URL-safe base64 encoding, so we need to add padding if needed
      let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (base64Payload.length % 4) {
        base64Payload += '=';
      }
      
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      // Extract the Firebase UID from the payload
      // Firebase uses 'sub' in newer tokens, but might use 'user_id' or 'uid' in others
      const firebaseUid = payload.user_id || payload.sub || payload.uid;
      
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Could not extract user ID from token' });
      }
      
      // Look up the user by Firebase UID
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // For development purposes, if the user doesn't exist, we'll create them
        // This helps with testing and development when the frontend and backend states get out of sync
        console.log(`User with Firebase UID ${firebaseUid} not found in database, creating...`);
        if (payload.email) {
          const newUser = await storage.createUser({
            firebaseUid,
            email: payload.email,
            displayName: payload.name || '',
            photoUrl: payload.picture || ''
          });
          (req as any).user = newUser;
          next();
          return;
        } else {
          return res.status(401).json({ error: 'User not found and could not auto-create user' });
        }
      }
      
      // Attach the user object to the request for use in the route handlers
      (req as any).user = user;
      next();
    } catch (error: any) {
      console.error('Error decoding token:', error);
      return res.status(401).json({ error: 'Invalid token content' });
    }
  } catch (error: any) {
    console.error('Error authenticating user:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server instance
  const httpServer = createServer(app);
  
  // API routes for authorization/authentication
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Extract data from request
      const { firebaseUid, email, displayName, photoUrl } = req.body;
      
      // Verify required fields
      if (!firebaseUid || !email) {
        return res.status(400).json({ error: 'Firebase UID and email are required' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      // Create user in database
      const user = await storage.createUser({
        firebaseUid,
        email,
        displayName: displayName || '',
        photoUrl: photoUrl || ''
      });
      
      return res.status(201).json(user);
    } catch (error: any) {
      console.error('Error registering user:', error);
      return res.status(500).json({ error: 'Server error creating user' });
    }
  });
  
  // Get user profile
  app.get('/api/user/profile', requireAuth, async (req, res) => {
    try {
      // User object is attached by the requireAuth middleware
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      return res.json(user);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Server error fetching profile' });
    }
  });
  
  // API routes for connectors
  app.get('/api/connectors', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const connectors = await storage.getConnectors(user.id);
      return res.json(connectors);
    } catch (error: any) {
      console.error('Error fetching connectors:', error);
      return res.status(500).json({ error: 'Server error fetching connectors' });
    }
  });
  
  app.get('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      const connector = await storage.getConnector(user.id, connectorId);
      
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      return res.json(connector);
    } catch (error: any) {
      console.error('Error fetching connector:', error);
      return res.status(500).json({ error: 'Server error fetching connector' });
    }
  });
  
  app.post('/api/connectors', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const connectorData = req.body;
      
      // Validate connector data
      const validatedData = insertConnectorSchema.parse({
        ...connectorData,
        userId: user.id
      });
      
      const connector = await storage.createConnector({
        name: validatedData.name,
        baseUrl: validatedData.baseUrl,
        userId: user.id,
        authType: validatedData.authType || 'none',
        authConfig: validatedData.authConfig || {},
        headers: validatedData.headers || {}
      });
      
      return res.status(201).json(connector);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid connector data', details: error.errors });
      }
      
      console.error('Error creating connector:', error);
      return res.status(500).json({ error: 'Server error creating connector' });
    }
  });
  
  app.put('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      const connectorData = req.body;
      
      // Check if connector exists
      const existingConnector = await storage.getConnector(user.id, connectorId);
      if (!existingConnector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      // Update the connector
      const updatedConnector = await storage.updateConnector(user.id, connectorId, connectorData);
      
      return res.json(updatedConnector);
    } catch (error: any) {
      console.error('Error updating connector:', error);
      return res.status(500).json({ error: 'Server error updating connector' });
    }
  });
  
  app.delete('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      // Check if connector exists
      const existingConnector = await storage.getConnector(user.id, connectorId);
      if (!existingConnector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      // Delete the connector
      await storage.deleteConnector(user.id, connectorId);
      
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting connector:', error);
      return res.status(500).json({ error: 'Server error deleting connector' });
    }
  });
  
  // API routes for flows
  app.get('/api/flows', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const flows = await storage.getFlows(user.id);
      return res.json(flows);
    } catch (error: any) {
      console.error('Error fetching flows:', error);
      return res.status(500).json({ error: 'Server error fetching flows' });
    }
  });
  
  app.get('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      const flow = await storage.getFlow(user.id, flowId);
      
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      return res.json(flow);
    } catch (error: any) {
      console.error('Error fetching flow:', error);
      return res.status(500).json({ error: 'Server error fetching flow' });
    }
  });
  
  app.post('/api/flows', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const flowData = req.body;
      
      // Validate flow data
      const validatedData = insertFlowSchema.parse({
        ...flowData,
        userId: user.id
      });
      
      const flow = await storage.createFlow({
        name: validatedData.name,
        description: validatedData.description || "",
        userId: user.id,
        nodes: validatedData.nodes || [],
        edges: validatedData.edges || [],
        active: validatedData.active || false
      });
      
      return res.status(201).json(flow);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid flow data', details: error.errors });
      }
      
      console.error('Error creating flow:', error);
      return res.status(500).json({ error: 'Server error creating flow' });
    }
  });
  
  app.put('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      const flowData = req.body;
      
      // Check if flow exists
      const existingFlow = await storage.getFlow(user.id, flowId);
      if (!existingFlow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      // Update the flow
      const updatedFlow = await storage.updateFlow(user.id, flowId, flowData);
      
      return res.json(updatedFlow);
    } catch (error: any) {
      console.error('Error updating flow:', error);
      return res.status(500).json({ error: 'Server error updating flow' });
    }
  });
  
  app.delete('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      // Check if flow exists
      const existingFlow = await storage.getFlow(user.id, flowId);
      if (!existingFlow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      // Delete the flow
      await storage.deleteFlow(user.id, flowId);
      
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting flow:', error);
      return res.status(500).json({ error: 'Server error deleting flow' });
    }
  });
  
  // Flow execution endpoints
  app.post('/api/flows/:id/execute', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      // Check if flow exists
      const flow = await storage.getFlow(user.id, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      // Create a new execution record
      const execution = await storage.createExecution({
        flowId: flow.id,
        userId: user.id,
        status: 'running',
        startedAt: new Date(),
        data: req.body.data || {}
      });
      
      // Start the execution in a background process
      setTimeout(() => {
        executeFlow(flow, execution, user.id, req.body.data || {}).catch(err => {
          console.error(`Error executing flow ${flowId}:`, err);
        });
      }, 0);
      
      return res.status(202).json(execution);
    } catch (error: any) {
      console.error('Error executing flow:', error);
      return res.status(500).json({ error: 'Server error executing flow' });
    }
  });
  
  // Get execution details
  app.get('/api/executions/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const executionId = parseInt(req.params.id);
      
      if (isNaN(executionId)) {
        return res.status(400).json({ error: 'Invalid execution ID' });
      }
      
      const execution = await storage.getExecution(executionId);
      
      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      
      // Check if user owns this execution
      if (execution.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to access this execution' });
      }
      
      // Get execution logs
      const logs = await storage.getExecutionLogs(executionId);
      
      return res.json({
        ...execution,
        logs
      });
    } catch (error: any) {
      console.error('Error fetching execution:', error);
      return res.status(500).json({ error: 'Server error fetching execution' });
    }
  });
  
  // Get recent executions
  app.get('/api/executions', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get optional filters
      const filters: any = {};
      
      if (req.query.flowId) {
        filters.flowId = parseInt(req.query.flowId as string);
      }
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      const executions = await storage.getExecutions(user.id, limit, offset, filters);
      
      return res.json(executions);
    } catch (error: any) {
      console.error('Error fetching executions:', error);
      return res.status(500).json({ error: 'Server error fetching executions' });
    }
  });
  
  // API routes for data tables
  app.get('/api/tables', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tables = await storage.getTables(user.id);
      return res.json(tables);
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      return res.status(500).json({ error: 'Server error fetching tables' });
    }
  });
  
  app.get('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const table = await storage.getTable(user.id, tableId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Get the table rows with pagination
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const rows = await storage.getTableRows(tableId, limit, offset);
      
      return res.json({
        ...table,
        rows
      });
    } catch (error: any) {
      console.error('Error fetching table:', error);
      return res.status(500).json({ error: 'Server error fetching table' });
    }
  });
  
  app.post('/api/tables', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableData = req.body;
      
      // Validate table schema
      const validatedData = insertDataTableSchema.parse({
        ...tableData,
        userId: user.id
      });
      
      // Validate column definitions
      if (Array.isArray(tableData.columns)) {
        for (const column of tableData.columns) {
          const validationResult = columnDefinitionSchema.safeParse(column);
          if (!validationResult.success) {
            return res.status(400).json({
              error: 'Invalid column definition',
              details: validationResult.error.errors
            });
          }
          
          // Ensure each column has an id
          if (!column.id) {
            column.id = column.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          }
        }
      }
      
      const table = await storage.createTable({
        name: validatedData.name,
        description: validatedData.description || "",
        userId: user.id,
        columns: tableData.columns || []
      });
      
      return res.status(201).json(table);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid table data', details: error.errors });
      }
      
      console.error('Error creating table:', error);
      return res.status(500).json({ error: 'Server error creating table' });
    }
  });
  
  app.put('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const tableData = req.body;
      
      // Check if table exists
      const existingTable = await storage.getTable(user.id, tableId);
      if (!existingTable) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Validate column definitions if provided
      if (tableData.columns && Array.isArray(tableData.columns)) {
        for (const column of tableData.columns) {
          const validationResult = columnDefinitionSchema.safeParse(column);
          if (!validationResult.success) {
            return res.status(400).json({
              error: 'Invalid column definition',
              details: validationResult.error.errors
            });
          }
          
          // Ensure each column has an id
          if (!column.id) {
            column.id = column.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
          }
        }
      }
      
      // Update the table
      const updatedTable = await storage.updateTable(user.id, tableId, tableData);
      
      return res.json(updatedTable);
    } catch (error: any) {
      console.error('Error updating table:', error);
      return res.status(500).json({ error: 'Server error updating table' });
    }
  });
  
  app.delete('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      // Check if table exists
      const existingTable = await storage.getTable(user.id, tableId);
      if (!existingTable) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Delete the table
      await storage.deleteTable(user.id, tableId);
      
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting table:', error);
      return res.status(500).json({ error: 'Server error deleting table' });
    }
  });
  
  // API routes for table rows
  app.post('/api/tables/:tableId/rows', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableId = parseInt(req.params.tableId);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      // Check if table exists and user owns it
      const table = await storage.getTable(user.id, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Create row
      const rowData = {
        ...req.body,
        tableId
      };
      
      const newRow = await storage.createTableRow(rowData);
      
      return res.status(201).json(newRow);
    } catch (error: any) {
      console.error('Error creating table row:', error);
      return res.status(500).json({ error: 'Server error creating table row' });
    }
  });
  
  app.put('/api/tables/:tableId/rows/:rowId', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableId = parseInt(req.params.tableId);
      const rowId = parseInt(req.params.rowId);
      
      if (isNaN(tableId) || isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid table ID or row ID' });
      }
      
      // Check if table exists and user owns it
      const table = await storage.getTable(user.id, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Update row
      const updatedRow = await storage.updateTableRow(rowId, req.body);
      
      return res.json(updatedRow);
    } catch (error: any) {
      console.error('Error updating table row:', error);
      return res.status(500).json({ error: 'Server error updating table row' });
    }
  });
  
  app.delete('/api/tables/:tableId/rows/:rowId', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const tableId = parseInt(req.params.tableId);
      const rowId = parseInt(req.params.rowId);
      
      if (isNaN(tableId) || isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid table ID or row ID' });
      }
      
      // Check if table exists and user owns it
      const table = await storage.getTable(user.id, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Delete row
      await storage.deleteTableRow(rowId);
      
      return res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting table row:', error);
      return res.status(500).json({ error: 'Server error deleting table row' });
    }
  });
  
  // API endpoint to test a connector
  app.post('/api/connectors/test', requireAuth, async (req, res) => {
    try {
      const { url, method, headers, body } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      
      // Make the request
      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {},
        body: body ? JSON.stringify(body) : undefined,
      });
      
      // Get response data
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
      
      return res.json({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      });
    } catch (error: any) {
      console.error('Error testing connector:', error);
      return res.status(500).json({ error: 'Error testing connector', message: error.message });
    }
  });
  
  // WebSocket Server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  function heartbeat() {
    // @ts-ignore - custom property to track connection liveliness
    this.isAlive = true;
  }
  
  // Set up heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      // @ts-ignore
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      // @ts-ignore
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  // Handle new WebSocket connections
  wss.on('connection', ws => {
    console.log('WebSocket client connected');
    
    // Initialize client as alive and set up heartbeat
    // @ts-ignore
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    
    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        // Prevent large messages from causing issues
        if ((message as any).length > 100000) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Message too large'
          }));
          return;
        }
        
        const data = JSON.parse(message.toString());
        
        // Handle authentication
        if (data.type === 'auth') {
          const { token, userId } = data;
          
          if (!token || !userId) {
            try {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Authentication failed: missing token or userId'
              }));
            } catch (e) {
              console.error('Error sending auth error message:', e);
            }
            return;
          }
          
          try {
            // Verify the token format
            const parts = token.split('.');
            if (parts.length !== 3) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Invalid token format'
              }));
              return;
            }
            
            // Process the token - in a production system, we would verify the signature
            // Here we just decode the payload
            let base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (base64Payload.length % 4) {
              base64Payload += '=';
            }
            
            const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
            const firebaseUid = payload.user_id || payload.sub || payload.uid;
            
            if (!firebaseUid || firebaseUid !== userId) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Invalid user ID in token'
              }));
              return;
            }
            
            console.log(`User ${userId} authenticated on WebSocket`);
            
            // Store connection by user ID
            if (!connections.has(userId)) {
              connections.set(userId, []);
            }
            
            // Add this connection to the user's connections
            const userConnections = connections.get(userId);
            if (userConnections) {
              // Check if connection already exists for this user
              if (!userConnections.includes(ws)) {
                userConnections.push(ws);
              }
              
              // Send confirmation
              try {
                ws.send(JSON.stringify({
                  type: 'auth_success',
                  message: 'Authentication successful'
                }));
              } catch (e) {
                console.error('Error sending auth success message:', e);
              }
            }
          } catch (error) {
            console.error("Error processing authentication:", error);
            try {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Authentication failed: server error'
              }));
            } catch (e) {
              console.error('Error sending auth error message:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        } catch (e) {
          console.error('Error sending error message:', e);
        }
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      
      // Remove connection from all user connections
      for (const [userId, userConnections] of connections.entries()) {
        const index = userConnections.indexOf(ws);
        if (index !== -1) {
          userConnections.splice(index, 1);
          console.log(`Removed connection for user ${userId}`);
          
          // Clean up empty user connections
          if (userConnections.length === 0) {
            connections.delete(userId);
          }
        }
      }
    });
  });
  
  return httpServer;
}

// Execute a flow with the given execution record
async function executeFlow(flow: any, execution: any, userId: number, triggerData: any) {
  try {
    // Log execution start
    await storage.addExecutionLog({
      executionId: execution.id,
      message: `Starting flow execution`,
      type: 'info',
      timestamp: new Date()
    });
    
    // Get all nodes and edges from the flow
    const nodes = flow.nodes;
    const edges = flow.edges;
    
    // Execute the flow
    const result = await runFlowNodes(flow.id, execution.id, nodes, edges, userId, triggerData);
    
    // Update execution record with completion
    await storage.updateExecution(execution.id, {
      status: 'completed',
      result,
      finishedAt: new Date()
    });
    
    // Log execution completion
    await storage.addExecutionLog({
      executionId: execution.id,
      message: `Flow execution completed successfully`,
      type: 'success',
      timestamp: new Date()
    });
    
    // Send update to connected clients
    const updatedExecution = await storage.getExecution(execution.id);
    sendExecutionUpdate(userId.toString(), {
      execution: updatedExecution,
      status: 'completed',
      message: 'Flow executed successfully'
    });
    
  } catch (error: any) {
    console.error(`Error executing flow ${flow.id}:`, error);
    
    // Log error
    await storage.addExecutionLog({
      executionId: execution.id,
      message: `Flow execution failed: ${error.message}`,
      type: 'error',
      timestamp: new Date()
    });
    
    // Update execution with error
    await storage.updateExecution(execution.id, {
      status: 'failed',
      error: {
        message: error.message,
        stack: error.stack
      },
      finishedAt: new Date()
    });
    
    // Send update to connected clients
    const updatedExecution = await storage.getExecution(execution.id);
    sendExecutionUpdate(userId.toString(), {
      execution: updatedExecution,
      status: 'failed',
      message: error.message
    });
  }
}

// Run all nodes in a flow
async function runFlowNodes(flowId: number, executionId: number, nodes: any[], edges: any[], userId: number, triggerData: any) {
  const nodeOutputs: { [key: string]: any } = {};
  const startNodes = nodes.filter(node => !edges.some(edge => edge.target === node.id));
  
  // Add trigger data to outputs
  nodeOutputs['trigger'] = triggerData;
  
  // Execute start nodes first
  for (const node of startNodes) {
    await executeNode(node, nodeOutputs, nodeOutputs, flowId, executionId, userId);
  }
  
  // Process the rest of the nodes in order of dependencies
  const processedNodes = new Set(startNodes.map(n => n.id));
  let remainingNodes = nodes.filter(node => !processedNodes.has(node.id));
  
  // Process nodes whose dependencies have all been resolved
  while (remainingNodes.length > 0) {
    const nodesToProcess = remainingNodes.filter(node => {
      const incomingEdges = edges.filter(edge => edge.target === node.id);
      return incomingEdges.every(edge => processedNodes.has(edge.source));
    });
    
    if (nodesToProcess.length === 0) {
      // Unable to resolve dependencies for remaining nodes
      const unprocessedNodes = remainingNodes.map(n => n.id).join(', ');
      throw new Error(`Unable to resolve dependencies for nodes: ${unprocessedNodes}`);
    }
    
    for (const node of nodesToProcess) {
      // Get inputs by following incoming edges
      const nodeInputs: { [key: string]: any } = {};
      
      // Add all node outputs so far
      Object.assign(nodeInputs, nodeOutputs);
      
      await executeNode(node, nodeInputs, nodeOutputs, flowId, executionId, userId);
      processedNodes.add(node.id);
    }
    
    remainingNodes = remainingNodes.filter(node => !processedNodes.has(node.id));
  }
  
  return nodeOutputs;
}

// Execute a single node in the flow
async function executeNode(
  node: any, 
  inputs: { [key: string]: any }, 
  outputs: { [key: string]: any },
  flowId: number,
  executionId: number,
  userId: number
) {
  console.log(`Executing node ${node.id} (${node.type})`);
  
  // Log execution
  await storage.addExecutionLog({
    executionId,
    nodeId: node.id,
    message: `Executing node: ${node.data?.label || node.type}`,
    type: 'info',
    timestamp: new Date()
  });
  
  // Skip execution if skipExecution is true in node data
  if (node.data?.skipExecution) {
    console.log(`Skipping execution of node ${node.id} as configured`);
    await storage.addExecutionLog({
      executionId,
      nodeId: node.id,
      message: `Skipping node execution as configured`,
      type: 'info',
      timestamp: new Date()
    });
    
    // Still need to provide an output for downstream nodes
    outputs[node.id] = { skipped: true };
    return;
  }
  
  try {
    let result;
    
    // Process nodes based on type
    switch (node.type) {
      case 'http':
        result = await executeHttpNode(node, inputs, userId);
        break;
        
      case 'javascript':
        result = await executeJavascriptNode(node, inputs);
        break;
        
      case 'table':
        result = await executeTableNode(node, inputs, userId);
        break;
        
      case 'loop':
        result = await executeLoopNode(node, inputs, flowId, executionId, userId, outputs);
        break;
        
      case 'condition':
        result = await executeConditionNode(node, inputs);
        break;
        
      default:
        result = { error: `Unsupported node type: ${node.type}` };
        break;
    }
    
    // Store the node result in the outputs map
    outputs[node.id] = result || {};
    
    // Log node completion
    await storage.addExecutionLog({
      executionId,
      nodeId: node.id,
      message: `Node executed successfully: ${node.data?.label || node.type}`,
      type: 'success',
      timestamp: new Date()
    });
    
    return result;
  } catch (error: any) {
    // Log node error
    await storage.addExecutionLog({
      executionId,
      nodeId: node.id,
      message: `Node execution failed: ${error.message}`,
      type: 'error',
      timestamp: new Date()
    });
    
    console.error(`Error executing node ${node.id}:`, error);
    
    // Store the error in outputs to allow flows to continue with partial processing
    outputs[node.id] = { error: error.message };
    
    // Re-throw the error to halt flow execution
    throw new Error(`Error in node ${node.data?.label || node.type} (${node.id}): ${error.message}`);
  }
}

// Execute a HTTP node
async function executeHttpNode(node: any, inputs: { [key: string]: any }, userId: number) {
  const { url, method, headers: rawHeaders, body: rawBody, connectorId } = node.data || {};
  
  // Resolve variables in node configuration
  const resolvedUrl = resolveVariables(url, inputs);
  let resolvedHeaders = {};
  let resolvedBody;
  
  if (rawHeaders) {
    if (typeof rawHeaders === 'string') {
      try {
        resolvedHeaders = JSON.parse(resolveVariables(rawHeaders, inputs));
      } catch (e) {
        resolvedHeaders = {}; // Default to empty headers if invalid JSON
      }
    } else if (typeof rawHeaders === 'object') {
      resolvedHeaders = Object.entries(rawHeaders).reduce((acc, [key, value]) => {
        acc[key] = resolveVariables(value as string, inputs);
        return acc;
      }, {} as Record<string, string>);
    }
  }
  
  if (rawBody) {
    if (typeof rawBody === 'string') {
      resolvedBody = resolveVariables(rawBody, inputs);
      
      // Try to parse as JSON if it looks like JSON
      if (resolvedBody.trim().startsWith('{') || resolvedBody.trim().startsWith('[')) {
        try {
          resolvedBody = JSON.parse(resolvedBody);
        } catch (e) {
          // Keep as string if JSON parsing fails
        }
      }
    } else if (typeof rawBody === 'object') {
      // Recursively resolve variables in the JSON object
      resolvedBody = JSON.parse(
        JSON.stringify(rawBody, (key, value) => {
          if (typeof value === 'string') {
            return resolveVariables(value, inputs);
          }
          return value;
        })
      );
    }
  }
  
  // If a connector is specified, get the connector details
  if (connectorId) {
    const connector = await storage.getConnector(userId, parseInt(connectorId));
    if (connector) {
      // Apply connector configuration
      const baseUrl = connector.baseUrl || '';
      
      // URL is either absolute or relative to the connector's base URL
      const finalUrl = resolvedUrl.startsWith('http') 
        ? resolvedUrl 
        : `${baseUrl.replace(/\/$/, '')}/${resolvedUrl.replace(/^\//, '')}`;
      
      // Merge connector headers with request headers
      if (connector.headers) {
        resolvedHeaders = {
          ...connector.headers,
          ...resolvedHeaders
        };
      }
      
      // Handle authentication if specified
      if (connector.authType === 'basic' && connector.authConfig) {
        const { username, password } = connector.authConfig;
        const base64Auth = Buffer.from(`${username}:${password}`).toString('base64');
        resolvedHeaders['Authorization'] = `Basic ${base64Auth}`;
      } else if (connector.authType === 'bearer' && connector.authConfig) {
        const { token } = connector.authConfig;
        resolvedHeaders['Authorization'] = `Bearer ${token}`;
      } else if (connector.authType === 'apiKey' && connector.authConfig) {
        const { key, value, in: location } = connector.authConfig;
        
        if (location === 'header') {
          resolvedHeaders[key] = value;
        } else if (location === 'query') {
          // Add API key to URL as a query parameter
          const separator = finalUrl.includes('?') ? '&' : '?';
          finalUrl = `${finalUrl}${separator}${key}=${encodeURIComponent(value)}`;
        }
      }
      
      // Make the API request
      const response = await fetch(finalUrl, {
        method: method || 'GET',
        headers: resolvedHeaders as HeadersInit,
        body: resolvedBody ? JSON.stringify(resolvedBody) : undefined
      });
      
      // Get response data
      let responseData;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch (error) {
        // If we can't parse the response, just use the status code
        responseData = { status: response.status, statusText: response.statusText };
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        response: responseData, // For backward compatibility
      };
    } else {
      throw new Error(`Connector with ID ${connectorId} not found`);
    }
  } else {
    // Make the request without a connector
    const response = await fetch(resolvedUrl, {
      method: method || 'GET',
      headers: resolvedHeaders as HeadersInit,
      body: resolvedBody ? JSON.stringify(resolvedBody) : undefined
    });
    
    // Get response data
    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    } catch (error) {
      // If we can't parse the response, just use the status code
      responseData = { status: response.status, statusText: response.statusText };
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      response: responseData, // For backward compatibility
    };
  }
}

// Execute a JavaScript node
async function executeJavascriptNode(node: any, inputs: { [key: string]: any }) {
  const { code } = node.data || {};
  
  if (!code) {
    return { error: 'No code provided for JavaScript node' };
  }
  
  try {
    // Wrap code in an async function and return the result
    const wrappedCode = `
      return (async function() {
        try {
          // User-provided code
          ${code}
        } catch (error) {
          return { error: error.message };
        }
      })();
    `;
    
    // Create function with inputs available
    const fn = new Function('inputs', wrappedCode);
    
    // Execute the function with the inputs
    const result = await fn(inputs);
    
    // Return the result
    return { result };
  } catch (error: any) {
    throw new Error(`Error executing JavaScript: ${error.message}`);
  }
}

// Execute a table node
async function executeTableNode(node: any, inputs: { [key: string]: any }, userId: number) {
  const { operation, tableId, data: rawData } = node.data || {};
  
  if (!tableId) {
    throw new Error('No table ID provided for table node');
  }
  
  // Resolve variables in the data
  const resolvedData = rawData 
    ? JSON.parse(
        JSON.stringify(rawData, (key, value) => {
          if (typeof value === 'string') {
            return resolveVariables(value, inputs);
          }
          return value;
        })
      )
    : undefined;
  
  // Get the table
  const table = await storage.getTable(userId, parseInt(tableId));
  
  if (!table) {
    throw new Error(`Table with ID ${tableId} not found`);
  }
  
  // Perform the operation
  switch (operation) {
    case 'read':
      const rows = await storage.getTableRows(parseInt(tableId));
      return { rows };
      
    case 'insert':
      if (!resolvedData) {
        throw new Error('No data provided for table insert operation');
      }
      
      const newRow = await storage.createTableRow({
        tableId: parseInt(tableId),
        data: resolvedData
      });
      
      return { row: newRow };
      
    case 'update':
      if (!resolvedData || !resolvedData.id) {
        throw new Error('No row ID provided for table update operation');
      }
      
      const updatedRow = await storage.updateTableRow(
        parseInt(resolvedData.id), 
        resolvedData
      );
      
      return { row: updatedRow };
      
    case 'delete':
      if (!resolvedData || !resolvedData.id) {
        throw new Error('No row ID provided for table delete operation');
      }
      
      await storage.deleteTableRow(parseInt(resolvedData.id));
      
      return { success: true };
      
    default:
      throw new Error(`Unsupported table operation: ${operation}`);
  }
}

// Execute a loop node
async function executeLoopNode(
  node: any, 
  inputs: { [key: string]: any },
  flowId: number,
  executionId: number,
  userId: number,
  outputs: { [key: string]: any }
) {
  const { type, source, maxIterations } = node.data || {};
  const MAX_ALLOWED_ITERATIONS = 100; // Safety limit
  
  // Check loop type
  if (type === 'foreach') {
    // Get the array to iterate over from the specified source
    const arrayPath = resolveVariables(source, inputs);
    let arrayData;
    
    try {
      arrayData = eval(`inputs.${arrayPath}`);
    } catch (e) {
      throw new Error(`Error accessing array at ${arrayPath}: ${e.message}`);
    }
    
    if (!Array.isArray(arrayData)) {
      throw new Error(`Source ${arrayPath} is not an array`);
    }
    
    // Implement foreach logic here
    const results = [];
    
    // Limit to prevent infinite loops
    const limit = Math.min(
      arrayData.length,
      maxIterations ? parseInt(maxIterations) : MAX_ALLOWED_ITERATIONS
    );
    
    // Log iteration count
    await storage.addExecutionLog({
      executionId,
      nodeId: node.id,
      message: `Starting forEach loop with ${limit} iterations`,
      type: 'info',
      timestamp: new Date()
    });
    
    // Execute for each item in the array
    for (let i = 0; i < limit; i++) {
      // Set loop variables for child nodes
      const loopContextId = `${node.id}_iteration_${i}`;
      outputs[loopContextId] = {
        item: arrayData[i],
        index: i,
        number: i + 1, // 1-based index for user convenience
      };
      
      await storage.addExecutionLog({
        executionId,
        nodeId: node.id,
        message: `Loop iteration ${i + 1}/${limit}`,
        type: 'info',
        timestamp: new Date()
      });
      
      results.push(arrayData[i]);
    }
    
    return { iterations: limit, results };
  } else if (type === 'while') {
    // Implement while loop logic here
    const conditionPath = resolveVariables(source, inputs);
    let iterations = 0;
    const results = [];
    
    // Limit to prevent infinite loops
    const limit = Math.min(
      maxIterations ? parseInt(maxIterations) : 10,
      MAX_ALLOWED_ITERATIONS
    );
    
    await storage.addExecutionLog({
      executionId,
      nodeId: node.id,
      message: `Starting while loop with condition: ${conditionPath}`,
      type: 'info',
      timestamp: new Date()
    });
    
    let conditionResult;
    do {
      try {
        conditionResult = eval(`inputs.${conditionPath}`);
      } catch (e) {
        throw new Error(`Error evaluating condition ${conditionPath}: ${e.message}`);
      }
      
      if (conditionResult) {
        iterations++;
        
        // Set loop variables for child nodes
        const loopContextId = `${node.id}_iteration_${iterations}`;
        outputs[loopContextId] = {
          index: iterations - 1,
          number: iterations,
        };
        
        await storage.addExecutionLog({
          executionId,
          nodeId: node.id,
          message: `Loop iteration ${iterations}/${limit}`,
          type: 'info',
          timestamp: new Date()
        });
        
        results.push({ iteration: iterations });
      }
    } while (conditionResult && iterations < limit);
    
    return { iterations, results };
  } else {
    throw new Error(`Unsupported loop type: ${type}`);
  }
}

// Execute a condition node
async function executeConditionNode(node: any, inputs: { [key: string]: any }) {
  const { condition } = node.data || {};
  
  if (!condition) {
    throw new Error('No condition provided for condition node');
  }
  
  // Resolve variables in the condition
  const resolvedCondition = resolveVariables(condition, inputs);
  
  // Evaluate the condition using Function constructor for safety
  try {
    const fn = new Function('inputs', `return Boolean(${resolvedCondition});`);
    const result = fn(inputs);
    
    return { result, condition: resolvedCondition };
  } catch (error: any) {
    throw new Error(`Error evaluating condition: ${error.message}`);
  }
}

// Helper function to resolve variables in strings
function resolveVariables(template: string, context: { [key: string]: any }): string {
  if (!template || typeof template !== 'string') {
    return template;
  }
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    try {
      // Trim the path to handle whitespace
      const trimmedPath = path.trim();
      
      // Use eval to access nested properties dynamically (carefully!)
      const value = eval(`context.${trimmedPath}`);
      
      // Handle different value types
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    } catch (e) {
      // Path not found in context, return the original template
      return match;
    }
  });
}