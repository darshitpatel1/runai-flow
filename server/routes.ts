import express, { Express, NextFunction, Request, Response } from "express";
import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { ZodError } from "zod";

// Keep track of WebSocket connections
const connections = new Map<number, WebSocket[]>();
// Map WebSocket connections to authenticated user IDs
const authenticatedConnections = new Map<WebSocket, number>();

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
  // For simplicity, we'll create a dummy user if it doesn't exist
  try {
    // Check if we have a test user
    let user = await storage.getUserByFirebaseUid('test-user-123');
    
    if (!user) {
      // Create a test user
      user = await storage.createUser({
        firebaseUid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoUrl: ''
      });
      console.log('Created test user:', user);
    }
    
    // Set user in request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle authentication (simplified)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { firebaseUid, email, displayName, photoUrl } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByFirebaseUid(firebaseUid || 'test-user-123');
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }
      
      // Create user in database
      const user = await storage.createUser({
        firebaseUid: firebaseUid || 'test-user-123',
        email: email || 'test@example.com',
        displayName: displayName || 'Test User',
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
  
  // Simplified Flow execution API
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
        status: 'running'
      });
      
      // Return the execution ID to the client
      res.status(202).json({
        id: execution.id,
        status: execution.status,
        message: 'Execution started'
      });
      
      // Update to completed for simplicity after a short delay
      setTimeout(async () => {
        try {
          await storage.updateExecution(execution.id, {
            status: 'completed',
            finishedAt: new Date(),
            duration: 100,
            output: { result: 'Success' }
          });
          
          sendExecutionUpdate(userId, {
            id: execution.id,
            status: 'completed',
            flowId: flow.id,
            output: { result: 'Success' }
          });
        } catch (err) {
          console.error('Error updating execution:', err);
        }
      }, 2000);
      
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
  
  // Create HTTP server but don't listen yet - we'll let index.ts handle that
  const httpServer = require('http').createServer(app);
  
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
    
    // Handle client messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // A simplified auth model - we'll always authenticate as our test user
        // This greatly simplifies the frontend/backend integration
        if (message.type === 'auth') {
          try {
            // Get our test user
            const user = await storage.getUserByFirebaseUid('test-user-123');
            
            if (!user) {
              throw new Error('Test user not found');
            }
            
            // Store the authenticated user ID with the WebSocket connection
            authenticatedConnections.set(ws, user.id);
            
            // Store the connection in the appropriate user group
            if (!connections.has(user.id)) {
              connections.set(user.id, []);
            }
            connections.get(user.id)?.push(ws);
            
            // Send authentication success message
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: user.id
            }));
            
            console.log(`WebSocket client authenticated as test user: ${user.id}`);
          } catch (error) {
            // Authentication failed
            console.error('WebSocket authentication failed:', error);
            
            // Send authentication failure message
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Authentication failed'
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
          
          const userId = authenticatedConnections.get(ws)!;
          
          // Handle different message types
          if (message.type === 'save_flow') {
            try {
              const flowData = message.data;
              if (flowData && flowData.id) {
                // Update existing flow
                const updatedFlow = await storage.updateFlow(userId, flowData.id, flowData);
                
                ws.send(JSON.stringify({
                  type: 'flow_saved',
                  flowId: flowData.id,
                  success: true
                }));
              } else {
                // Create new flow
                const newFlow = await storage.createFlow({
                  ...flowData,
                  userId
                });
                
                ws.send(JSON.stringify({
                  type: 'flow_saved',
                  flowId: newFlow.id,
                  success: true,
                  flow: newFlow
                }));
              }
            } catch (error) {
              console.error('Error saving flow:', error);
              ws.send(JSON.stringify({
                type: 'flow_saved',
                success: false,
                error: 'Failed to save flow'
              }));
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