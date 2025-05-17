import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { firestoreStorage } from "./firestore-server";
import { 
  connectorSchema, 
  flowSchema,
  executionSchema,
  dataTableSchema,
  tableRowSchema,
  columnDefinitionSchema,
  COLLECTIONS
} from "@shared/firestore-schema";
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
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Extract the Firebase UID from the payload
      const firebaseUid = payload.user_id || payload.sub || payload.uid;
      
      if (!firebaseUid) {
        return res.status(401).json({ error: 'Could not extract user ID from token' });
      }
      
      // Look up the user by Firebase UID
      const user = await firestoreStorage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // For development purposes, if the user doesn't exist, we'll create them
        // This helps with testing and development when the frontend and backend states get out of sync
        console.log(`User with Firebase UID ${firebaseUid} not found in database, creating...`);
        if (payload.email) {
          const newUser = await firestoreStorage.createUser({
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
      
      // Attach user to request object for later use
      (req as any).user = user;
      next();
    } catch (error) {
      console.error('Error decoding JWT token:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: error.message });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firebaseUid, email, displayName, photoUrl } = req.body;
      
      if (!firebaseUid || !email) {
        return res.status(400).json({ error: 'Firebase UID and email are required' });
      }
      
      // Check if user already exists
      const existingUser = await firestoreStorage.getUserByFirebaseUid(firebaseUid);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      const user = await firestoreStorage.createUser({
        firebaseUid,
        email,
        displayName: displayName || '',
        photoUrl: photoUrl || ''
      });
      
      res.status(201).json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // User routes
  app.get('/api/user', requireAuth, async (req, res) => {
    res.json((req as any).user);
  });
  
  app.patch('/api/user', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { displayName, photoUrl } = req.body;
      
      const updatedUser = await firestoreStorage.updateUser(userId, {
        displayName,
        photoUrl
      });
      
      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Connector routes
  app.get('/api/connectors', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectors = await firestoreStorage.getConnectors(userId);
      res.json(connectors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = req.params.id;
      
      const connector = await firestoreStorage.getConnector(userId, connectorId);
      
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      res.json(connector);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/connectors', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Create connector data with userId
      const connectorData = {
        ...req.body,
        userId
      };
      
      const connector = await firestoreStorage.createConnector(connectorData);
      res.status(201).json(connector);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error creating connector' });
    }
  });
  
  app.put('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = req.params.id;
      
      // Check if connector exists and belongs to user
      const connector = await firestoreStorage.getConnector(userId, connectorId);
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      const updatedConnector = await firestoreStorage.updateConnector(userId, connectorId, req.body);
      res.json(updatedConnector);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error updating connector' });
    }
  });
  
  app.delete('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = req.params.id;
      
      // Check if connector exists and belongs to user
      const connector = await firestoreStorage.getConnector(userId, connectorId);
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      await firestoreStorage.deleteConnector(userId, connectorId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Flow routes
  app.get('/api/flows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flows = await firestoreStorage.getFlows(userId);
      res.json(flows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = req.params.id;
      
      const flow = await firestoreStorage.getFlow(userId, flowId);
      
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      res.json(flow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/flows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Create flow data with userId
      const flowData = {
        ...req.body,
        userId
      };
      
      const flow = await firestoreStorage.createFlow(flowData);
      res.status(201).json(flow);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error creating flow' });
    }
  });
  
  app.put('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = req.params.id;
      
      // Check if flow exists and belongs to user
      const flow = await firestoreStorage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      const updatedFlow = await firestoreStorage.updateFlow(userId, flowId, req.body);
      res.json(updatedFlow);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error updating flow' });
    }
  });
  
  app.delete('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = req.params.id;
      
      // Check if flow exists and belongs to user
      const flow = await firestoreStorage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      await firestoreStorage.deleteFlow(userId, flowId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Flow Execution routes
  app.post('/api/flows/:id/execute', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = req.params.id;
      
      // Check if flow exists and belongs to user
      const flow = await firestoreStorage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      // Create a new execution record
      const execution = await firestoreStorage.createExecution({
        flowId,
        userId,
        status: 'running',
        input: req.body.input || {}
      });
      
      // In a real implementation, we would start an async process to execute the flow
      // For now, we'll simulate success with progress updates via WebSocket
      
      // Immediately send a "started" notification via WebSocket
      sendExecutionUpdate(userId.toString(), {
        executionId: execution.id,
        flowId,
        status: 'running',
        timestamp: new Date(),
        message: 'Flow execution started',
        progress: 0
      });
      
      // Simulate node-by-node execution with progress updates
      const nodeCount = (flow.nodes && Array.isArray(flow.nodes) ? flow.nodes.length : 0) || 5; // Fallback to 5 if no nodes defined
      let currentNode = 0;
      
      const processNodes = () => {
        setTimeout(async () => {
          currentNode++;
          const progress = Math.floor((currentNode / nodeCount) * 100);
          
          // Send progress update via WebSocket
          sendExecutionUpdate(userId.toString(), {
            executionId: execution.id,
            flowId,
            status: 'running',
            timestamp: new Date(),
            message: `Executing node ${currentNode} of ${nodeCount}`,
            progress: progress,
            currentNode
          });
          
          // Add log entry
          await firestoreStorage.addExecutionLog({
            executionId: execution.id,
            level: 'info',
            message: `Executing node ${currentNode} of ${nodeCount}`
          });
          
          // Continue processing nodes or complete
          if (currentNode < nodeCount) {
            processNodes();
          } else {
            // Final completion update
            setTimeout(async () => {
              try {
                // Update execution with success
                await firestoreStorage.updateExecution(execution.id, {
                  status: 'success',
                  finishedAt: new Date(),
                  duration: (nodeCount + 1) * 300, // Simulate duration based on node count
                  output: { success: true, message: 'Flow executed successfully' }
                });
                
                // Add completion log
                await firestoreStorage.addExecutionLog({
                  executionId: execution.id,
                  level: 'info',
                  message: 'Flow execution completed successfully'
                });
                
                // Send completion notification via WebSocket
                sendExecutionUpdate(userId.toString(), {
                  executionId: execution.id,
                  flowId,
                  status: 'completed',
                  timestamp: new Date(),
                  message: 'Flow execution completed successfully',
                  progress: 100
                });
              } catch (error) {
                console.error('Error updating execution:', error);
              }
            }, 300);
          }
        }, 300); // 300ms delay between nodes
      };
      
      // Start processing after a small delay
      setTimeout(processNodes, 200);
      
      res.status(202).json(execution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/executions', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const filters: any = {};
      
      if (req.query.flowId) {
        filters.flowId = req.query.flowId as string;
      }
      
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      
      const executions = await firestoreStorage.getExecutions(userId, {
        limit,
        offset,
        filters
      });
      
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/executions/:id', requireAuth, async (req, res) => {
    try {
      const executionId = req.params.id;
      
      const execution = await firestoreStorage.getExecution(executionId);
      
      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      
      // Check if execution belongs to user
      const userId = (req as any).user.id;
      if (execution.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to execution' });
      }
      
      res.json(execution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/executions/:id/logs', requireAuth, async (req, res) => {
    try {
      const executionId = req.params.id;
      
      const execution = await firestoreStorage.getExecution(executionId);
      
      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      
      // Check if execution belongs to user
      const userId = (req as any).user.id;
      if (execution.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to execution logs' });
      }
      
      const logs = await firestoreStorage.getExecutionLogs(executionId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Data Tables routes
  app.get('/api/tables', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tables = await firestoreStorage.getTables(userId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = req.params.id;
      
      const table = await firestoreStorage.getTable(userId, tableId);
      
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      res.json(table);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/tables', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Validate columns
      const columns = req.body.columns || [];
      if (!Array.isArray(columns)) {
        return res.status(400).json({ error: 'Columns must be an array' });
      }
      
      for (const column of columns) {
        try {
          columnDefinitionSchema.parse(column);
        } catch (error) {
          return res.status(400).json({ error: `Invalid column definition: ${error}` });
        }
      }
      
      // Create table data with userId
      const tableData = {
        name: req.body.name,
        description: req.body.description,
        columns,
        userId
      };
      
      const table = await firestoreStorage.createTable(tableData);
      res.status(201).json(table);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error creating table' });
    }
  });
  
  app.put('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = req.params.id;
      
      // Check if table exists and belongs to user
      const table = await firestoreStorage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Validate columns if provided
      if (req.body.columns) {
        if (!Array.isArray(req.body.columns)) {
          return res.status(400).json({ error: 'Columns must be an array' });
        }
        
        for (const column of req.body.columns) {
          try {
            columnDefinitionSchema.parse(column);
          } catch (error) {
            return res.status(400).json({ error: `Invalid column definition: ${error}` });
          }
        }
      }
      
      const updatedTable = await firestoreStorage.updateTable(userId, tableId, req.body);
      res.json(updatedTable);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error updating table' });
    }
  });
  
  app.delete('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = req.params.id;
      
      // Check if table exists and belongs to user
      const table = await firestoreStorage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      await firestoreStorage.deleteTable(userId, tableId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Table Rows routes
  app.get('/api/tables/:tableId/rows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = req.params.tableId;
      
      // Check if table exists and belongs to user
      const table = await firestoreStorage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      const rows = await firestoreStorage.getTableRows(tableId, { limit, offset });
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/tables/:tableId/rows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = req.params.tableId;
      
      // Check if table exists and belongs to user
      const table = await firestoreStorage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      const rowData = {
        tableId,
        data: req.body.data || {}
      };
      
      const row = await firestoreStorage.createTableRow(rowData);
      res.status(201).json(row);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: error.message || 'Error creating row' });
    }
  });
  
  app.put('/api/rows/:id', requireAuth, async (req, res) => {
    try {
      const rowId = req.params.id;
      const data = req.body.data;
      
      if (!data) {
        return res.status(400).json({ error: 'Row data is required' });
      }
      
      const updatedRow = await firestoreStorage.updateTableRow(rowId, data);
      res.json(updatedRow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete('/api/rows/:id', requireAuth, async (req, res) => {
    try {
      const rowId = req.params.id;
      
      await firestoreStorage.deleteTableRow(rowId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Set a ping interval to check connection
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
    
    // Ping-pong mechanism to check connection health
    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });
    
    // Define a heartbeat check interval
    const heartbeatInterval = setInterval(() => {
      if (isAlive === false) {
        console.log('WebSocket connection is unresponsive, terminating');
        clearInterval(pingInterval);
        clearInterval(heartbeatInterval);
        return ws.terminate();
      }
      
      isAlive = false;
    }, 40000);
    
    // Authentication handling
    let authenticated = false;
    let userId = '';
    
    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message.toString());
        
        // Handle authentication message
        if (msg.type === 'auth' && msg.token) {
          try {
            // Basic JWT decoding (in production, use proper verification)
            const parts = msg.token.split('.');
            if (parts.length !== 3) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid token format' }));
              return;
            }
            
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            const firebaseUid = payload.user_id || payload.sub || payload.uid;
            
            if (!firebaseUid) {
              ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
              return;
            }
            
            // Look up user in database
            const user = await firestoreStorage.getUserByFirebaseUid(firebaseUid);
            
            if (!user) {
              ws.send(JSON.stringify({ type: 'error', message: 'User not found' }));
              return;
            }
            
            // Mark as authenticated and store user ID
            authenticated = true;
            
            // Store the user ID (string in Firestore)
            if (user && user.id) {
              userId = String(user.id);
              
              // Register this connection for the user
              if (!connections.has(userId)) {
                connections.set(userId, []);
              }
              const userConnections = connections.get(userId);
              if (userConnections) {
                userConnections.push(ws);
              }
            }
            
            console.log(`User ${userId || 'unknown'} authenticated on WebSocket`);
            
            // Send success response
            ws.send(JSON.stringify({ type: 'auth_success', userId: userId || '' }));
          } catch (error: any) {
            console.error('Authentication error:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
          }
        }
        // Other message handlers can be added here
        else if (!authenticated) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
        }
        // Handle other message types here (when authenticated)
      } catch (e) {
        console.error('Error parsing message:', e);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    // Cleanup when connection closes
    ws.on('close', (code, reason) => {
      clearInterval(pingInterval);
      clearInterval(heartbeatInterval);
      console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason.toString()}`);
      
      // Remove from connections map
      if (userId) {
        const userConnections = connections.get(userId);
        if (userConnections) {
          const index = userConnections.indexOf(ws);
          if (index !== -1) {
            userConnections.splice(index, 1);
            
            // If no more connections for this user, remove entry
            if (userConnections.length === 0) {
              connections.delete(userId);
            }
            
            console.log(`Removed connection for user ${userId}`);
          }
        }
      }
    });
    
    // Error handling
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  return httpServer;
}