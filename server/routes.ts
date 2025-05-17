import express, { Express, NextFunction, Request, Response } from "express";
import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import admin from "firebase-admin";
import { ZodError } from "zod";
import axios from "axios";
import { vm } from "vm";

// Initialize Firebase Admin if credentials are available
let firebaseInitialized = false;
try {
  if (
    process.env.VITE_FIREBASE_PROJECT_ID &&
    process.env.VITE_FIREBASE_API_KEY
  ) {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
    firebaseInitialized = true;
    console.log("Firebase Admin initialized successfully");
  } else {
    console.warn(
      "Firebase credentials not found. Firebase Admin is not initialized."
    );
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
}

// Keep track of WebSocket connections
const connections = new Map<number, WebSocket[]>();
// Map WebSocket connections to authenticated user IDs
const authenticatedConnections = new Map<WebSocket, { firebaseUid: string; databaseUserId: number }>();

// Send a message to all connections for a user
function sendToUser(userId: number, message: any) {
  const userConnections = connections.get(userId);
  if (userConnections && userConnections.length > 0) {
    const messageString = JSON.stringify(message);
    for (const connection of userConnections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(messageString);
      }
    }
    return true;
  }
  return false;
}

// Send execution updates to the user
function sendExecutionUpdate(userId: number, executionData: any) {
  return sendToUser(userId, {
    type: 'execution_update',
    execution: executionData
  });
}

// Middleware to require authentication
const requireAuth = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header provided" });
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Invalid authorization format" });
  }
  
  const token = authHeader.substring(7);
  
  try {
    if (!firebaseInitialized) {
      throw new Error("Firebase is not initialized");
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    
    // Get or create user in our database
    let user = await storage.getUserByFirebaseUid(firebaseUid);
    
    if (!user) {
      // Create user if they don't exist yet
      if (decodedToken.email) {
        user = await storage.createUser({
          firebaseUid,
          email: decodedToken.email,
          displayName: decodedToken.name || '',
          photoUrl: decodedToken.picture || ''
        });
      } else {
        return res.status(401).json({ error: "User has no email" });
      }
    }
    
    // Set user in request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle authentication
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firebaseUid, email, displayName, photoUrl } = req.body;
      
      if (!firebaseUid || !email) {
        return res.status(400).json({ error: "Firebase UID and email are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }
      
      // Create user in database
      const user = await storage.createUser({
        firebaseUid,
        email,
        displayName: displayName || '',
        photoUrl: photoUrl || ''
      });
      
      res.status(201).json(user);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });
  
  // Get currently authenticated user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      res.json((req as any).user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  
  // Tables API
  app.get('/api/tables', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tables = await storage.getTables(userId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });
  
  app.get('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      const table = await storage.getTable(userId, tableId);
      
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      res.json(table);
    } catch (error) {
      console.error("Error fetching table:", error);
      res.status(500).json({ error: "Failed to fetch table" });
    }
  });
  
  app.post('/api/tables', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableData = {
        ...req.body,
        userId
      };
      
      const table = await storage.createTable(tableData);
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating table:", error);
      res.status(500).json({ error: "Failed to create table" });
    }
  });
  
  app.put('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      const updatedTable = await storage.updateTable(userId, tableId, req.body);
      
      if (!updatedTable) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      res.json(updatedTable);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating table:", error);
      res.status(500).json({ error: "Failed to update table" });
    }
  });
  
  app.delete('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      await storage.deleteTable(userId, tableId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting table:", error);
      res.status(500).json({ error: "Failed to delete table" });
    }
  });
  
  // Table rows API
  app.get('/api/tables/:tableId/rows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.tableId);
      
      // Make sure the table belongs to the user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      // Get pagination parameters
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const rows = await storage.getTableRows(tableId, limit, offset);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching table rows:", error);
      res.status(500).json({ error: "Failed to fetch table rows" });
    }
  });
  
  app.post('/api/tables/:tableId/rows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.tableId);
      
      // Make sure the table belongs to the user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      const rowData = {
        tableId,
        data: req.body
      };
      
      const row = await storage.createTableRow(rowData);
      res.status(201).json(row);
    } catch (error) {
      console.error("Error creating table row:", error);
      res.status(500).json({ error: "Failed to create table row" });
    }
  });
  
  app.put('/api/tables/rows/:rowId', requireAuth, async (req, res) => {
    try {
      const rowId = parseInt(req.params.rowId);
      
      const updatedRow = await storage.updateTableRow(rowId, req.body);
      res.json(updatedRow);
    } catch (error) {
      console.error("Error updating table row:", error);
      res.status(500).json({ error: "Failed to update table row" });
    }
  });
  
  app.delete('/api/tables/rows/:rowId', requireAuth, async (req, res) => {
    try {
      const rowId = parseInt(req.params.rowId);
      
      await storage.deleteTableRow(rowId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting table row:", error);
      res.status(500).json({ error: "Failed to delete table row" });
    }
  });
  
  // Connectors API
  app.get('/api/connectors', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectors = await storage.getConnectors(userId);
      res.json(connectors);
    } catch (error) {
      console.error("Error fetching connectors:", error);
      res.status(500).json({ error: "Failed to fetch connectors" });
    }
  });
  
  app.get('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      const connector = await storage.getConnector(userId, connectorId);
      
      if (!connector) {
        return res.status(404).json({ error: "Connector not found" });
      }
      
      res.json(connector);
    } catch (error) {
      console.error("Error fetching connector:", error);
      res.status(500).json({ error: "Failed to fetch connector" });
    }
  });
  
  app.post('/api/connectors', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorData = {
        ...req.body,
        userId
      };
      
      const connector = await storage.createConnector(connectorData);
      res.status(201).json(connector);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating connector:", error);
      res.status(500).json({ error: "Failed to create connector" });
    }
  });
  
  app.put('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      const updatedConnector = await storage.updateConnector(userId, connectorId, req.body);
      
      if (!updatedConnector) {
        return res.status(404).json({ error: "Connector not found" });
      }
      
      res.json(updatedConnector);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating connector:", error);
      res.status(500).json({ error: "Failed to update connector" });
    }
  });
  
  app.delete('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      await storage.deleteConnector(userId, connectorId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting connector:", error);
      res.status(500).json({ error: "Failed to delete connector" });
    }
  });
  
  // Flows API
  app.get('/api/flows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flows = await storage.getFlows(userId);
      res.json(flows);
    } catch (error) {
      console.error("Error fetching flows:", error);
      res.status(500).json({ error: "Failed to fetch flows" });
    }
  });
  
  app.get('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      const flow = await storage.getFlow(userId, flowId);
      
      if (!flow) {
        return res.status(404).json({ error: "Flow not found" });
      }
      
      res.json(flow);
    } catch (error) {
      console.error("Error fetching flow:", error);
      res.status(500).json({ error: "Failed to fetch flow" });
    }
  });
  
  app.post('/api/flows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowData = {
        ...req.body,
        userId
      };
      
      const flow = await storage.createFlow(flowData);
      res.status(201).json(flow);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating flow:", error);
      res.status(500).json({ error: "Failed to create flow" });
    }
  });
  
  app.put('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      const updatedFlow = await storage.updateFlow(userId, flowId, req.body);
      
      if (!updatedFlow) {
        return res.status(404).json({ error: "Flow not found" });
      }
      
      res.json(updatedFlow);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating flow:", error);
      res.status(500).json({ error: "Failed to update flow" });
    }
  });
  
  app.delete('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      await storage.deleteFlow(userId, flowId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting flow:", error);
      res.status(500).json({ error: "Failed to delete flow" });
    }
  });
  
  // Flow execution API
  app.post('/api/flows/:id/execute', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      // Get the flow
      const flow = await storage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: "Flow not found" });
      }
      
      // Create an execution record
      const execution = await storage.createExecution({
        flowId,
        userId,
        status: 'running',
        input: req.body
      });
      
      // Start the execution in the background
      executeFlow(flow, execution, userId, req.body).catch(error => {
        console.error(`Error executing flow ${flowId}:`, error);
      });
      
      // Return the execution ID to the client
      res.status(202).json({
        id: execution.id,
        status: execution.status,
        message: 'Execution started'
      });
    } catch (error) {
      console.error("Error starting flow execution:", error);
      res.status(500).json({ error: "Failed to start flow execution" });
    }
  });
  
  app.get('/api/executions', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Get pagination parameters
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      
      // Get filter parameters
      const filters: any = {};
      
      if (req.query.flowId) {
        filters.flowId = parseInt(req.query.flowId as string);
      }
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }
      
      const executions = await storage.getExecutions(userId, limit, offset, filters);
      res.json(executions);
    } catch (error) {
      console.error("Error fetching executions:", error);
      res.status(500).json({ error: "Failed to fetch executions" });
    }
  });
  
  app.get('/api/executions/:id', requireAuth, async (req, res) => {
    try {
      const executionId = parseInt(req.params.id);
      const execution = await storage.getExecution(executionId);
      
      if (!execution) {
        return res.status(404).json({ error: "Execution not found" });
      }
      
      // Check if the execution belongs to the authenticated user
      const userId = (req as any).user.id;
      if (execution.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(execution);
    } catch (error) {
      console.error("Error fetching execution:", error);
      res.status(500).json({ error: "Failed to fetch execution" });
    }
  });
  
  app.get('/api/executions/:id/logs', requireAuth, async (req, res) => {
    try {
      const executionId = parseInt(req.params.id);
      const logs = await storage.getExecutionLogs(executionId);
      
      // Check if the execution belongs to the authenticated user
      const execution = await storage.getExecution(executionId);
      if (!execution) {
        return res.status(404).json({ error: "Execution not found" });
      }
      
      const userId = (req as any).user.id;
      if (execution.userId !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching execution logs:", error);
      res.status(500).json({ error: "Failed to fetch execution logs" });
    }
  });
  
  // Create HTTP server
  const httpServer = app.listen(5000, () => {
    console.log("Server is running on port 5000");
  });
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Set up ping/pong for connection health check
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
    
    // Set alive status to check later
    let isAlive = true;
    
    // Reset alive status on pong
    ws.on('pong', () => {
      isAlive = true;
    });
    
    // Define heartbeat function
    function heartbeat() {
      isAlive = true;
    }
    
    // Set initial heartbeat
    ws.on('pong', heartbeat);
    
    // Handle client messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle authentication message
        if (message.type === 'auth') {
          // Get the token from the message
          const token = message.token;
          
          try {
            // For Firebase admin, we need to verify the token
            // For database access, we need the numerical user ID from our database
            let authenticatedUserId;
            let databaseUserId;
            
            if (token) {
              // Verify the Firebase token
              try {
                if (!firebaseInitialized) {
                  throw new Error("Firebase is not initialized");
                }
                
                const decodedToken = await admin.auth().verifyIdToken(token);
                authenticatedUserId = decodedToken.uid;
                
                // Now get the user from our database
                const user = await storage.getUserByFirebaseUid(authenticatedUserId);
                if (user) {
                  databaseUserId = user.id;
                } else {
                  // User not found in database - try to create if we have the info
                  if (decodedToken.email) {
                    try {
                      const newUser = await storage.createUser({
                        firebaseUid: authenticatedUserId,
                        email: decodedToken.email,
                        displayName: decodedToken.name || '',
                        photoUrl: decodedToken.picture || ''
                      });
                      databaseUserId = newUser.id;
                    } catch (error) {
                      console.error('Error creating user in database:', error);
                    }
                  }
                }
              } catch (error) {
                console.error('Firebase token verification failed:', error);
                throw new Error('Invalid token');
              }
            } else {
              throw new Error('No token provided');
            }
            
            if (!databaseUserId) {
              throw new Error('User not found in database');
            }
            
            // Store both user IDs with the WebSocket connection
            authenticatedConnections.set(ws, {
              firebaseUid: authenticatedUserId,
              databaseUserId: databaseUserId
            });
            
            // Store the connection in the appropriate user group
            if (!connections.has(databaseUserId)) {
              connections.set(databaseUserId, []);
            }
            connections.get(databaseUserId).push(ws);
            
            // Send authentication success message
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: databaseUserId,
              firebaseUid: authenticatedUserId
            }));
            
            console.log(`WebSocket client authenticated. Firebase ID: ${authenticatedUserId}, Database ID: ${databaseUserId}`);
          } catch (error) {
            // Authentication failed
            console.error('WebSocket authentication failed:', error);
            
            // Send authentication failure message
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error')
            }));
            
            // Close the connection
            ws.close(1008, 'Authentication failed');
          }
        }
        
        // All other message types require authentication
        else {
          // Check if the connection is authenticated
          if (!authenticatedConnections.has(ws)) {
            // Not authenticated
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Not authenticated'
            }));
            
            // Close the connection
            ws.close(1008, 'Not authenticated');
            return;
          }
          
          const userInfo = authenticatedConnections.get(ws);
          const userId = userInfo.databaseUserId;
          
          // Handle different message types
          // ...
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
      
      // Clear ping interval
      clearInterval(pingInterval);
      
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
      
      // Remove from authenticated connections
      authenticatedConnections.delete(ws);
    });
  });
  
  return httpServer;
}

async function executeFlow(flow: any, execution: any, userId: number, triggerData: any) {
  try {
    // Add execution log
    await storage.addExecutionLog({
      executionId: execution.id,
      level: 'info',
      message: 'Flow execution started',
      nodeId: null,
      data: null,
      type: 'system'
    });
    
    // Add notification to user
    sendExecutionUpdate(userId, {
      id: execution.id,
      status: 'running',
      flowId: flow.id
    });
    
    // Find a starting node (one with no incoming edges - typically a trigger)
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    
    // Start execution
    const startTime = Date.now();
    
    // Run all nodes in the flow
    const result = await runFlowNodes(flow.id, execution.id, nodes, edges, userId, triggerData);
    
    // Calculate execution duration
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Update execution record with results
    await storage.updateExecution(execution.id, {
      status: 'completed',
      finishedAt: new Date(),
      duration,
      output: result,
      result: result // For backward compatibility
    });
    
    // Add final execution log
    await storage.addExecutionLog({
      executionId: execution.id,
      level: 'info',
      message: 'Flow execution completed successfully',
      nodeId: null,
      data: null,
      type: 'system'
    });
    
    // Send final notification to user
    sendExecutionUpdate(userId, {
      id: execution.id,
      status: 'completed',
      flowId: flow.id,
      duration,
      output: result
    });
    
    return result;
  } catch (error) {
    // Log error
    console.error(`Error executing flow ${flow.id}:`, error);
    
    // Add error log
    await storage.addExecutionLog({
      executionId: execution.id,
      level: 'error',
      message: `Flow execution failed: ${error.message}`,
      nodeId: null,
      data: { error: error.message, stack: error.stack },
      type: 'system'
    });
    
    // Update execution record with error
    await storage.updateExecution(execution.id, {
      status: 'failed',
      finishedAt: new Date(),
      error: error.message || 'Unknown error'
    });
    
    // Send error notification to user
    sendExecutionUpdate(userId, {
      id: execution.id,
      status: 'failed',
      flowId: flow.id,
      error: error.message || 'Unknown error'
    });
    
    throw error;
  }
}

async function runFlowNodes(flowId: number, executionId: number, nodes: any[], edges: any[], userId: number, triggerData: any) {
  // Initialize variables to store node outputs
  const nodeOutputs: any = {};
  const nodeStatuses: any = {};
  
  // Use a queue to process nodes in order
  let processingQueue = [...nodes]; // Create a copy
  let processedNodes = new Set<string>(); // Keep track of processed nodes
  let iterations = 0;
  const maxIterations = nodes.length * 2; // Safety limit
  
  // Add the trigger data as output from a virtual "trigger" node
  nodeOutputs['trigger'] = triggerData;
  
  // Process nodes until queue is empty or max iterations reached
  while (processingQueue.length > 0 && iterations < maxIterations) {
    iterations++;
    
    const currentNode = processingQueue.shift()!;
    const nodeId = currentNode.id;
    
    // Skip processed nodes
    if (processedNodes.has(nodeId)) {
      continue;
    }
    
    // Check if all dependencies (incoming edges) are satisfied
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    const dependencies = incomingEdges.map(edge => edge.source);
    
    // Make sure all dependencies have been processed
    const allDependenciesMet = dependencies.every(dep => processedNodes.has(dep));
    
    if (!allDependenciesMet) {
      // Put back in queue for later processing
      processingQueue.push(currentNode);
      continue;
    }
    
    // Skip nodes marked to be skipped (for conditional nodes)
    if (nodeStatuses[nodeId] === 'skipped') {
      processedNodes.add(nodeId);
      continue;
    }
    
    try {
      // Log node execution start
      await storage.addExecutionLog({
        executionId: executionId,
        level: 'info',
        message: `Executing node: ${currentNode.data?.name || nodeId}`,
        nodeId: nodeId,
        data: null,
        type: 'node'
      });
      
      // Get inputs for this node from dependencies
      const inputs: any = {};
      for (const edge of incomingEdges) {
        // The source node's output becomes an input to this node
        const sourceNodeId = edge.source;
        const sourceOutput = nodeOutputs[sourceNodeId];
        
        // Add to inputs
        inputs[sourceNodeId] = sourceOutput;
      }
      
      // Also add trigger data as input
      inputs['trigger'] = triggerData;
      
      // Execute the node
      const result = await executeNode(currentNode, inputs, userId);
      
      // Store the output
      nodeOutputs[nodeId] = result;
      nodeStatuses[nodeId] = 'completed';
      
      // Log node execution result
      await storage.addExecutionLog({
        executionId: executionId,
        level: 'info',
        message: `Node execution completed: ${currentNode.data?.name || nodeId}`,
        nodeId: nodeId,
        data: { result },
        type: 'node'
      });
      
      // If this is a loop or condition node, it may affect the flow
      if (currentNode.type === 'ifElse') {
        // Find child nodes (true/false branches)
        const trueBranchEdges = edges.filter(
          edge => edge.source === nodeId && edge.sourceHandle === 'true'
        );
        const falseBranchEdges = edges.filter(
          edge => edge.source === nodeId && edge.sourceHandle === 'false'
        );
        
        // Mark nodes to be skipped based on condition result
        if (result === true) {
          // Skip false branch nodes
          for (const edge of falseBranchEdges) {
            nodeStatuses[edge.target] = 'skipped';
          }
        } else {
          // Skip true branch nodes
          for (const edge of trueBranchEdges) {
            nodeStatuses[edge.target] = 'skipped';
          }
        }
      }
      
      // Mark this node as processed
      processedNodes.add(nodeId);
    } catch (error) {
      // Log node execution error
      await storage.addExecutionLog({
        executionId: executionId,
        level: 'error',
        message: `Node execution failed: ${error.message}`,
        nodeId: nodeId,
        data: { error: error.message, stack: error.stack },
        type: 'node'
      });
      
      // Propagate error
      throw new Error(`Error executing node ${currentNode.data?.name || nodeId}: ${error.message}`);
    }
  }
  
  // Check if we hit the max iterations limit
  if (iterations >= maxIterations) {
    throw new Error(`Flow execution exceeded maximum iterations (${maxIterations}). Possible circular dependencies.`);
  }
  
  // Return the outputs of all nodes
  return nodeOutputs;
}

async function executeNode(
  node: any,
  inputs: { [key: string]: any },
  userId: number
) {
  // Get node type
  const nodeType = node.type;
  
  // Execute node based on type
  switch (nodeType) {
    case 'httpRequest':
      return executeHttpNode(node, inputs, userId);
    case 'javascript':
      return executeJavascriptNode(node, inputs);
    case 'table':
      return executeTableNode(node, inputs, userId);
    case 'ifElse':
      return executeConditionNode(node, inputs);
    case 'forEach':
    case 'while':
      return executeLoopNode(node, inputs, userId);
    default:
      throw new Error(`Unsupported node type: ${nodeType}`);
  }
}

async function executeHttpNode(node: any, inputs: { [key: string]: any }, userId: number) {
  const nodeData = node.data || {};
  
  // Get parameters from node data
  let url = nodeData.url || '';
  let method = nodeData.method || 'GET';
  let headers = nodeData.headers || [];
  let body = nodeData.body || '';
  let auth = nodeData.auth || { type: 'none' };
  
  // Process URL and replace variables
  url = resolveVariables(url, inputs);
  
  // Process headers
  const processedHeaders: { [key: string]: string } = {};
  for (const header of headers) {
    if (header.key && header.value) {
      const resolvedKey = resolveVariables(header.key, inputs);
      const resolvedValue = resolveVariables(header.value, inputs);
      processedHeaders[resolvedKey] = resolvedValue;
    }
  }
  
  // Process body
  if (typeof body === 'string') {
    body = resolveVariables(body, inputs);
  } else if (typeof body === 'object' && body !== null) {
    body = JSON.stringify(body);
  }
  
  // Process authentication
  if (auth.type === 'basic') {
    const username = resolveVariables(auth.username || '', inputs);
    const password = resolveVariables(auth.password || '', inputs);
    processedHeaders['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  } else if (auth.type === 'bearer') {
    const token = resolveVariables(auth.token || '', inputs);
    processedHeaders['Authorization'] = `Bearer ${token}`;
  } else if (auth.type === 'apiKey') {
    const key = resolveVariables(auth.key || '', inputs);
    const value = resolveVariables(auth.value || '', inputs);
    const location = auth.in || 'header';
    
    if (location === 'header') {
      processedHeaders[key] = value;
    } else if (location === 'query') {
      // Append to URL as query parameter
      const separator = url.includes('?') ? '&' : '?';
      const finalUrl = `${url}${separator}${key}=${encodeURIComponent(value)}`;
      url = finalUrl;
    }
  }
  
  // Make the HTTP request
  try {
    const response = await axios({
      method,
      url,
      headers: processedHeaders,
      data: ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? body : undefined,
      timeout: 30000 // 30 second timeout
    });
    
    // Return response data
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    };
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // outside of the 2xx range
      return {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        data: error.response.data,
        error: true
      };
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(`No response received: ${error.message}`);
    } else {
      // Something happened in setting up the request
      throw new Error(`Error making request: ${error.message}`);
    }
  }
}

async function executeJavascriptNode(node: any, inputs: { [key: string]: any }) {
  const nodeData = node.data || {};
  const code = nodeData.code || '';
  
  try {
    // Create a safe execution context with input data
    const inputsStr = Object.keys(inputs).map(key => `const ${key} = inputs["${key}"];`).join('\n');
    
    // Create the complete code to execute
    const fullCode = `
      ${inputsStr}
      // User code starts here
      ${code}
    `;
    
    // Use vm to sandbox the execution
    const context: any = { inputs, console };
    const script = new vm.Script(fullCode);
    script.runInNewContext(context, { timeout: 5000 }); // 5 second timeout
    
    // Get the result from the last expression
    return context.result;
  } catch (e) {
    throw new Error(`JavaScript execution error: ${e.message}`);
  }
}

async function executeTableNode(node: any, inputs: { [key: string]: any }, userId: number) {
  const nodeData = node.data || {};
  const operation = nodeData.operation || 'select';
  const tableId = nodeData.tableId;
  
  if (!tableId) {
    throw new Error('Table ID is required');
  }
  
  // Check that the table belongs to the user
  const table = await storage.getTable(userId, tableId);
  if (!table) {
    throw new Error('Table not found');
  }
  
  // Execute based on operation
  switch (operation) {
    case 'select': {
      const limit = nodeData.limit || 100;
      const offset = nodeData.offset || 0;
      
      // Get rows from the table
      const rows = await storage.getTableRows(tableId, limit, offset);
      return { rows };
    }
      
    case 'insert': {
      const rowData = nodeData.data || {};
      
      // Process row data to replace variables
      const processedData: any = {};
      for (const [key, value] of Object.entries(rowData)) {
        if (typeof value === 'string') {
          processedData[key] = resolveVariables(value, inputs);
        } else {
          processedData[key] = value;
        }
      }
      
      // Insert row into the table
      const row = await storage.createTableRow({
        tableId,
        data: processedData
      });
      
      return { row };
    }
      
    case 'update': {
      const rowId = nodeData.rowId;
      if (!rowId) {
        throw new Error('Row ID is required for update operation');
      }
      
      const rowData = nodeData.data || {};
      
      // Process row data to replace variables
      const processedData: any = {};
      for (const [key, value] of Object.entries(rowData)) {
        if (typeof value === 'string') {
          processedData[key] = resolveVariables(value, inputs);
        } else {
          processedData[key] = value;
        }
      }
      
      // Update row in the table
      const row = await storage.updateTableRow(rowId, processedData);
      return { row };
    }
      
    case 'delete': {
      const rowId = nodeData.rowId;
      if (!rowId) {
        throw new Error('Row ID is required for delete operation');
      }
      
      // Delete row from the table
      await storage.deleteTableRow(rowId);
      return { success: true };
    }
      
    default:
      throw new Error(`Unsupported table operation: ${operation}`);
  }
}

async function executeLoopNode(
  node: any,
  inputs: { [key: string]: any },
  userId: number
) {
  const nodeData = node.data || {};
  const nodeType = node.type;
  
  if (nodeType === 'forEach') {
    const itemsPath = nodeData.itemsPath || '';
    let items = [];
    
    // Resolve items path to get the array to iterate over
    if (itemsPath) {
      const parts = itemsPath.split('.');
      let current = inputs;
      
      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }
      
      if (Array.isArray(current)) {
        items = current;
      } else {
        throw new Error('ForEach node: The items path does not resolve to an array');
      }
    }
    
    // If items is empty, just return empty array
    if (items.length === 0) {
      return { items: [], results: [] };
    }
    
    // Process each item
    const results = [];
    let index = 0;
    
    for (const item of items) {
      // Execute sub-node for each item
      const itemContext = {
        ...inputs,
        loop: {
          item,
          index,
          number: index + 1 // 1-based for user-friendly display
        }
      };
      
      // Process templates within this node's child/sub-nodes
      const processedItem = await executeLoopItem(nodeData, itemContext, userId);
      results.push(processedItem);
      
      index++;
    }
    
    return { items, results };
  } else if (nodeType === 'while') {
    const condition = nodeData.condition || '';
    const maxIterations = nodeData.maxIterations || 10;
    
    // Process items until condition is false
    const results = [];
    let iterations = 0;
    let conditionMet = true;
    
    // Evaluate initial condition
    try {
      // Use javascript node execution to evaluate the condition
      const conditionResult = await executeJavascriptNode(
        { data: { code: `result = ${condition};` } },
        inputs
      );
      
      conditionMet = Boolean(conditionResult);
    } catch (error) {
      throw new Error(`Error evaluating while condition: ${error.message}`);
    }
    
    // Loop until condition is false or max iterations reached
    while (conditionMet && iterations < maxIterations) {
      const loopContext = {
        ...inputs,
        loop: {
          index: iterations,
          number: iterations + 1 // 1-based for user-friendly display
        }
      };
      
      // Process templates within this node's child/sub-nodes
      const result = await executeLoopItem(nodeData, loopContext, userId);
      results.push(result);
      
      // Update inputs with the latest result
      inputs.loop = {
        ...inputs.loop,
        lastResult: result
      };
      
      // Re-evaluate condition
      try {
        const conditionResult = await executeJavascriptNode(
          { data: { code: `result = ${condition};` } },
          inputs
        );
        
        conditionMet = Boolean(conditionResult);
      } catch (error) {
        throw new Error(`Error evaluating while condition: ${error.message}`);
      }
      
      iterations++;
    }
    
    return { iterations, results };
  }
  
  throw new Error(`Unsupported loop type: ${nodeType}`);
}

async function executeLoopItem(nodeData: any, context: any, userId: number) {
  // This would execute any contained nodes/logic within the loop
  // For now, we'll just evaluate templates in the data
  
  // Example of evaluating a template in a sub-node
  const templateField = nodeData.template || '';
  const result = resolveVariables(templateField, context);
  
  return result;
}

async function executeConditionNode(node: any, inputs: { [key: string]: any }) {
  const nodeData = node.data || {};
  const condition = nodeData.condition || '';
  
  try {
    // Use javascript node execution to evaluate the condition
    const result = await executeJavascriptNode(
      { data: { code: `result = ${condition};` } },
      inputs
    );
    
    // Return boolean result
    return Boolean(result);
  } catch (error) {
    throw new Error(`Error evaluating condition: ${error.message}`);
  }
}

function resolveVariables(template: string, context: { [key: string]: any }): string {
  if (!template || typeof template !== 'string') {
    return template;
  }
  
  // Replace {{variableName}} with values from context
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const parts = trimmedPath.split('.');
    
    // Traverse the object to get the value
    let value = context;
    for (const part of parts) {
      if (value === undefined || value === null) {
        return match; // Keep original placeholder if path doesn't exist
      }
      value = value[part];
    }
    
    // Ensure value is primitively usable in a string (avoid [object Object])
    if (value === undefined || value === null) {
      return '';
    } else if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return '[object]';
      }
    }
    
    return String(value);
  });
}