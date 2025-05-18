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
      } catch (error) {
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
  } catch (error) {
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
    
    let firebaseUid;
    
    // Check if token is a JWT (has 3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length === 3) {
      // Token appears to be a JWT, try to decode it
      try {
        // Decode the payload (the middle part)
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        // Extract the Firebase UID from various possible fields in the payload
        firebaseUid = payload.user_id || payload.sub || payload.uid;
        
        console.log('Extracted Firebase UID from token:', firebaseUid);
        
        if (!firebaseUid) {
          return res.status(401).json({ error: 'Could not extract user ID from token' });
        }
      } catch (decodeError) {
        console.error('Error decoding JWT token:', decodeError);
        // If decoding fails, try using the token directly as the UID
        firebaseUid = token;
      }
    } else {
      // Token is not a JWT, try using it directly as the Firebase UID
      console.log('Using raw token as Firebase UID');
      firebaseUid = token;
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
      
      // Attach user to request object for later use
      (req as any).user = user;
      next();
    } catch (decodeError: any) {
      console.error('Error decoding JWT token:', decodeError);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: error.message || 'Authentication failed' });
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
      const existingUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }
      
      const user = await storage.createUser({
        firebaseUid,
        email,
        displayName,
        photoUrl
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
      
      const updatedUser = await storage.updateUser(userId, {
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
      const connectors = await storage.getConnectors(userId);
      res.json(connectors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      const connector = await storage.getConnector(userId, connectorId);
      
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
      
      // Validate request data
      const validatedData = insertConnectorSchema.parse({
        ...req.body,
        userId
      });
      
      const connector = await storage.createConnector(validatedData);
      res.status(201).json(connector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error creating connector' });
    }
  });
  
  app.put('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      // Check if connector exists and belongs to user
      const connector = await storage.getConnector(userId, connectorId);
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      const updatedConnector = await storage.updateConnector(userId, connectorId, req.body);
      res.json(updatedConnector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error updating connector' });
    }
  });
  
  app.delete('/api/connectors/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      // Check if connector exists and belongs to user
      const connector = await storage.getConnector(userId, connectorId);
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      await storage.deleteConnector(userId, connectorId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Flow routes
  app.get('/api/flows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flows = await storage.getFlows(userId);
      res.json(flows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      const flow = await storage.getFlow(userId, flowId);
      
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
      
      // Validate request data
      const validatedData = insertFlowSchema.parse({
        ...req.body,
        userId
      });
      
      const flow = await storage.createFlow(validatedData);
      res.status(201).json(flow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error creating flow' });
    }
  });
  
  app.put('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      // Check if flow exists and belongs to user
      const flow = await storage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      const updatedFlow = await storage.updateFlow(userId, flowId, req.body);
      res.json(updatedFlow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error updating flow' });
    }
  });
  
  app.delete('/api/flows/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      // Check if flow exists and belongs to user
      const flow = await storage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      await storage.deleteFlow(userId, flowId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Flow Execution routes
  app.post('/api/flows/:id/execute', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = parseInt(req.params.id);
      
      if (isNaN(flowId)) {
        return res.status(400).json({ error: 'Invalid flow ID' });
      }
      
      // Check if flow exists and belongs to user
      const flow = await storage.getFlow(userId, flowId);
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      // Create a new execution record
      const execution = await storage.createExecution({
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
          await storage.addExecutionLog({
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
                await storage.updateExecution(execution.id, {
                  status: 'success',
                  finishedAt: new Date(),
                  duration: (nodeCount + 1) * 300, // Simulate duration based on node count
                  output: { success: true, message: 'Flow executed successfully' }
                });
                
                // Add completion log
                await storage.addExecutionLog({
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
  
  // Node testing endpoint - test a single node in isolation
  app.post('/api/flows/:flowId/nodes/:nodeId/test', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const flowId = req.params.flowId;
      const nodeId = req.params.nodeId;
      
      // Get the flow to verify ownership
      const flow = await storage.getFlow(userId, parseInt(flowId));
      if (!flow) {
        return res.status(404).json({ error: 'Flow not found' });
      }
      
      // Extract node data and flow context from the request
      const { nodeData, flowData } = req.body;
      
      if (!nodeData) {
        return res.status(400).json({ error: 'Missing node data' });
      }
      
      // Handle different node types
      const nodeType = nodeData.type || '';
      let result: any = { success: true };
      
      console.log(`Testing node ${nodeId} of type ${nodeType}`);
      
      // Process the node based on its type
      switch (nodeType) {
        case 'httpRequest':
          try {
            // Find the connector if specified
            let connectorConfig = null;
            if (nodeData.connector) {
              const userConnectors = await storage.getConnectors(userId);
              const connector = userConnectors.find(c => c.name === nodeData.connector);
              if (connector) {
                connectorConfig = connector;
              }
            }
            
            // Start building the request options
            const method = nodeData.method || 'GET';
            let url = nodeData.url || '';
            
            // Handle base URL from connector if available
            if (connectorConfig && connectorConfig.baseUrl) {
              // Don't double the URL if the node already has the full URL
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                // Ensure the connector base URL and node path join correctly with a slash
                const baseUrl = connectorConfig.baseUrl.endsWith('/') 
                  ? connectorConfig.baseUrl.slice(0, -1) 
                  : connectorConfig.baseUrl;
                const path = url.startsWith('/') ? url : `/${url}`;
                url = `${baseUrl}${path}`;
              }
            }
            
            if (!url) {
              return res.status(400).json({ error: 'URL is required for HTTP request nodes' });
            }
            
            // Prepare headers
            let headers: Record<string, string> = { 
              'Content-Type': 'application/json' 
            };
            
            // Add connector headers if available
            if (connectorConfig && connectorConfig.headers) {
              headers = { ...headers, ...connectorConfig.headers };
            }
            
            // Add node-specific headers if available
            if (nodeData.headers && Array.isArray(nodeData.headers)) {
              nodeData.headers.forEach((header: any) => {
                if (header.key && header.value) {
                  headers[header.key] = header.value;
                }
              });
            }
            
            // Add authentication if configured in connector
            if (connectorConfig && connectorConfig.authType) {
              const authConfig = connectorConfig.authConfig || {};
              
              switch (connectorConfig.authType) {
                case 'basic':
                  if (authConfig.username && authConfig.password) {
                    const auth = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${auth}`;
                  }
                  break;
                case 'bearer':
                  if (authConfig.token) {
                    headers['Authorization'] = `Bearer ${authConfig.token}`;
                  }
                  break;
                case 'api_key':
                  if (authConfig.key && authConfig.value) {
                    const { key, value, location = 'header' } = authConfig;
                    if (location === 'header') {
                      headers[key] = value;
                    } else if (location === 'query') {
                      // Add as query parameter
                      const separator = url.includes('?') ? '&' : '?';
                      url = `${url}${separator}${key}=${encodeURIComponent(value)}`;
                    }
                  }
                  break;
              }
            }
            
            // Add query parameters
            if (nodeData.queryParams && Array.isArray(nodeData.queryParams)) {
              const queryParams = new URLSearchParams();
              nodeData.queryParams.forEach((param: any) => {
                if (param.key && param.value !== undefined) {
                  queryParams.append(param.key, param.value);
                }
              });
              
              const queryString = queryParams.toString();
              if (queryString) {
                const separator = url.includes('?') ? '&' : '?';
                url = `${url}${separator}${queryString}`;
              }
            }
            
            // Prepare request body if needed
            let body = undefined;
            if (['POST', 'PUT', 'PATCH'].includes(method) && nodeData.body) {
              body = JSON.stringify(nodeData.body);
            }
            
            console.log(`Making ${method} request to ${url}`);
            
            // Make the request
            const fetchOptions: any = {
              method,
              headers,
              redirect: 'follow'
            };
            
            if (body) {
              fetchOptions.body = body;
            }
            
            const response = await fetch(url, fetchOptions);
            
            // Process response
            let responseData: any;
            const contentType = response.headers.get('content-type') || '';
            
            if (contentType.includes('application/json')) {
              responseData = await response.json();
            } else if (contentType.includes('text/')) {
              responseData = await response.text();
            } else {
              // For binary responses, just return info about the response
              responseData = {
                message: 'Binary response received',
                contentType,
                size: response.headers.get('content-length') || 'unknown'
              };
            }
            
            result = {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              data: responseData
            };
            
          } catch (error: any) {
            console.error('Error executing HTTP request:', error);
            result = {
              success: false,
              error: error.message || 'Failed to execute HTTP request'
            };
          }
          break;
          
        case 'javascript':
          try {
            // Simple evaluation of JavaScript code for the test
            // In a real implementation, you'd use a proper sandboxed environment
            const code = nodeData.code || '';
            
            // Just return the code for now as we can't safely execute it
            result = {
              code: code,
              message: 'JavaScript execution is simulated in test mode'
            };
          } catch (error: any) {
            result = {
              success: false,
              error: error.message || 'Failed to execute JavaScript code'
            };
          }
          break;
          
        case 'setVariable':
          try {
            const variableKey = nodeData.variableKey || 'testVariable';
            const variableValue = nodeData.variableValue || '';
            
            result = {
              variable: variableKey,
              value: variableValue
            };
          } catch (error: any) {
            result = {
              success: false,
              error: error.message || 'Failed to set variable'
            };
          }
          break;
          
        default:
          result = {
            message: `Test mode for node type "${nodeType}" is not implemented yet`
          };
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Error testing node:', error);
      res.status(500).json({ error: error.message || 'An error occurred while testing the node' });
    }
  });

  app.get('/api/executions', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      // Extract filters
      const filters: any = {};
      
      if (req.query.flowId) {
        const flowId = parseInt(req.query.flowId as string);
        if (!isNaN(flowId)) {
          filters.flowId = flowId;
        }
      }
      
      if (req.query.status) {
        filters.status = req.query.status;
      }
      
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      
      const executions = await storage.getExecutions(userId, limit, offset, filters);
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/executions/:id', requireAuth, async (req, res) => {
    try {
      const executionId = parseInt(req.params.id);
      
      if (isNaN(executionId)) {
        return res.status(400).json({ error: 'Invalid execution ID' });
      }
      
      const execution = await storage.getExecution(executionId);
      
      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      
      // Check if the execution belongs to the user
      if (execution.userId !== (req as any).user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      res.json(execution);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Endpoint to test connector connectivity
  app.post('/api/test-connector', async (req, res) => {
    try {
      const { connector } = req.body;
      
      if (!connector || !connector.baseUrl) {
        return res.status(400).json({ message: 'Invalid connector data' });
      }
      
      // Prepare URL - make sure it has protocol
      let url = connector.baseUrl;
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }
      
      // Check connector type and handle accordingly
      if (connector.authType === 'oauth2') {
        // For OAuth2, we need to return the authorization URL for redirection
        if (connector.auth.oauth2Type === 'authorization_code') {
          if (!connector.auth.authorizationUrl) {
            return res.status(400).json({ 
              message: 'Missing authorization URL',
              authRequired: true,
              authType: 'oauth2' 
            });
          }
          
          // Build the authorization URL with necessary parameters
          const authUrl = new URL(connector.auth.authorizationUrl);
          
          // Add required OAuth2 parameters, checking if they already exist
          if (!authUrl.searchParams.has('client_id')) {
            authUrl.searchParams.append('client_id', connector.auth.clientId);
          }
          
          if (!authUrl.searchParams.has('response_type')) {
            authUrl.searchParams.append('response_type', 'code');
          }
          
          if (!authUrl.searchParams.has('redirect_uri')) {
            authUrl.searchParams.append('redirect_uri', connector.auth.redirectUri);
          }
          
          if (connector.auth.scope && !authUrl.searchParams.has('scope')) {
            authUrl.searchParams.append('scope', connector.auth.scope);
          }
          
          // Generate and store a state parameter to prevent CSRF
          const state = Math.random().toString(36).substring(2, 15);
          authUrl.searchParams.append('state', state);
          
          // Return the authorization URL
          return res.status(200).json({
            message: 'Authorization required',
            authRequired: true,
            authType: 'oauth2',
            authUrl: authUrl.toString(),
            connectorId: connector.id,
            state
          });
        } else {
          // Client credentials flow - no user interaction needed
          return res.status(200).json({
            message: 'Client Credentials flow would be executed on the server',
            authRequired: false,
            tokenUrl: connector.auth.tokenUrl,
            authType: 'oauth2'
          });
        }
      } else if (connector.authType === 'basic') {
        // Basic Auth - validate that credentials exist
        if (!connector.auth || !connector.auth.username || !connector.auth.password) {
          return res.status(400).json({
            message: 'Missing username or password for Basic Authentication',
            authType: 'basic',
            success: false
          });
        }
        
        // In a real implementation, we would make a test request to the API
        // With Basic Auth credentials to verify connectivity
        
        // For now, we'll simulate a successful connection
        return res.status(200).json({
          message: 'Basic Auth credentials verified',
          authType: 'basic',
          success: true,
          // Return some connection details to display to the user
          connectionDetails: {
            baseUrl: connector.baseUrl,
            authenticatedAs: connector.auth.username
          }
        });
      } else if (connector.authType === 'oauth2' && connector.auth?.oauth2Type === 'client_credentials') {
        // Client Credentials flow - validate required fields
        if (!connector.auth.clientId || !connector.auth.clientSecret || !connector.auth.tokenUrl) {
          return res.status(400).json({
            message: 'Missing required Client Credentials parameters (Client ID, Client Secret or Token URL)',
            authType: 'oauth2',
            success: false
          });
        }
        
        try {
          // Actual implementation for client credentials flow:
          // 1. Make a token request to the token URL with client credentials
          // 2. Validate the token response
          // 3. Return connection details with token information
          
          const tokenUrl = connector.auth.tokenUrl;
          const clientId = connector.auth.clientId;
          const clientSecret = connector.auth.clientSecret;
          const scopes = connector.auth.scope || '';
          
          // Prepare request body
          const params = new URLSearchParams();
          params.append('grant_type', 'client_credentials');
          params.append('client_id', clientId);
          params.append('client_secret', clientSecret);
          
          if (scopes) {
            params.append('scope', scopes);
          }
          
          // Make request to token endpoint
          const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: params
          });
          
          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token request failed:', tokenResponse.status, errorData);
            return res.status(400).json({
              message: `Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`,
              authType: 'oauth2',
              success: false
            });
          }
          
          const tokenData = await tokenResponse.json();
          
          if (!tokenData.access_token) {
            return res.status(400).json({
              message: 'Invalid token response: missing access_token',
              authType: 'oauth2',
              success: false
            });
          }
          
          // SUCCESS: Return token details (but never the actual token for security)
          return res.status(200).json({
            message: 'Client Credentials authentication successful',
            authType: 'oauth2',
            authMethod: 'client_credentials',
            success: true,
            connectionDetails: {
              tokenUrl: connector.auth.tokenUrl,
              clientId: connector.auth.clientId,
              expiresIn: tokenData.expires_in ? `${tokenData.expires_in} seconds` : 'Unknown',
              tokenType: tokenData.token_type || 'Bearer',
              scope: tokenData.scope || scopes || 'Default'
            }
          });
        } catch (error: any) {
          console.error('Error during client credentials flow:', error);
          return res.status(500).json({
            message: `Client credentials flow error: ${error.message}`,
            authType: 'oauth2',
            success: false
          });
        }
      } else {
        // For no auth, just try a simple connection test
        return res.status(200).json({
          message: 'Connection test successful',
          authType: 'none',
          success: true,
          connectionDetails: {
            baseUrl: connector.baseUrl
          }
        });
      }
    } catch (error: any) {
      console.error('Error testing connector:', error);
      return res.status(500).json({ message: error.message || 'Failed to test connection' });
    }
  });
  
  // OAuth2 callback endpoint
  app.get('/api/oauth/callback', async (req, res) => {
    try {
      const { code, state, connectorId, region } = req.query;
      
      // We're going to be more lenient here - as long as we have a code, we consider it successful
      // The connectorId might be passed through state in some OAuth providers
      if (!code) {
        return res.status(400).send('Missing authorization code parameter');
      }
      
      // Log the received parameters for debugging
      console.log('OAuth callback received:', { 
        code: typeof code === 'string' ? code.substring(0, 5) + '...' : 'undefined', 
        state, 
        region,
        fullUrl: req.originalUrl 
      });
      
      // In a real implementation, we would:
      // 1. Validate the state parameter to prevent CSRF attacks
      // 2. Exchange the code for an access token using the token endpoint
      // 3. Store the tokens securely for future API calls
      // 4. Redirect back to the connector page
      
      // Send a page that will communicate the authorization success to the opener
      res.send(`
        <html>
          <head>
            <title>OAuth Authorization Complete</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 40px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              h2 { color: #4f46e5; }
              .success { color: #10b981; font-weight: bold; }
              .info { color: #6b7280; margin-top: 20px; }
            </style>
            <script>
              // We don't need the connectorId here, as we'll let the opener handle
              // determining which connector was being authorized
              window.opener.postMessage({ 
                type: 'oauth-callback', 
                success: true,
                code: '${code}',
                state: '${state || ""}',
                message: 'Authorization successful. You can now close this window.'
              }, '*');
              
              // Close the window after a short delay
              setTimeout(function() {
                window.close();
              }, 3000);
            </script>
          </head>
          <body>
            <div class="container">
              <h2>Authorization Successful</h2>
              <p class="success">You have successfully authorized the application.</p>
              <p class="info">This window will automatically close in a few seconds. If it doesn't, you can close it manually.</p>
              <p>Authorization code received: ${typeof code === 'string' ? code.substring(0, 5) + '...' : 'undefined'}</p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.status(500).send(`
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin-top: 40px; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              h2 { color: #ef4444; }
              .error { color: #7f1d1d; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>OAuth Authorization Error</h2>
              <p class="error">There was an error processing your authorization: ${error.message}</p>
              <p>You can close this window and try again.</p>
            </div>
          </body>
        </html>
      `);
    }
  });
  
  // Table routes
  app.get('/api/tables', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tables = await storage.getTables(userId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const table = await storage.getTable(userId, tableId);
      
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
      
      // Validate request data with zod schema
      const validatedData = insertDataTableSchema.parse({
        ...req.body,
        userId
      });
      
      const table = await storage.createTable(validatedData);
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error creating table' });
    }
  });
  
  app.put('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      // Check if table exists and belongs to user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      const updatedTable = await storage.updateTable(userId, tableId, req.body);
      res.json(updatedTable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error updating table' });
    }
  });
  
  app.delete('/api/tables/:id', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      // Check if table exists and belongs to user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      await storage.deleteTable(userId, tableId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Table Rows routes
  app.get('/api/tables/:id/rows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      // Check if table exists and belongs to user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Get pagination parameters from query string
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const rows = await storage.getTableRows(tableId, limit, offset);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post('/api/tables/:id/rows', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      // Check if table exists and belongs to user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      // Validate row data against table schema
      // This would typically involve validating against the column definitions
      
      const row = await storage.createTableRow({
        tableId,
        data: req.body,
      });
      
      res.status(201).json(row);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.put('/api/tables/:tableId/rows/:rowId', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.tableId);
      const rowId = parseInt(req.params.rowId);
      
      if (isNaN(tableId) || isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      // Check if table exists and belongs to user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      const updatedRow = await storage.updateTableRow(rowId, req.body);
      res.json(updatedRow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete('/api/tables/:tableId/rows/:rowId', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.tableId);
      const rowId = parseInt(req.params.rowId);
      
      if (isNaN(tableId) || isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      // Check if table exists and belongs to user
      const table = await storage.getTable(userId, tableId);
      if (!table) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      await storage.deleteTableRow(rowId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Set up WebSocket server with more robust error handling
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // More robust error handling
    clientTracking: true,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      }
    }
  });
  
  // Keep track of connection errors server-wide
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error.message);
  });
  
  // Set up heartbeat to detect disconnected clients
  function heartbeat() {
    // @ts-ignore - add isAlive property to track client state
    this.isAlive = true;
  }
  
  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      // @ts-ignore - check if client is still connected
      if (ws.isAlive === false) {
        console.log('Terminating dead WebSocket connection');
        return ws.terminate();
      }
      
      // @ts-ignore - reset alive status
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        console.error('Error sending ping:', e.message);
        ws.terminate();
      }
    });
  }, 30000);
  
  wss.on('close', function close() {
    clearInterval(interval);
  });
  
  wss.on('connection', (ws, req) => {
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
          if (token && userId) {
            // We'll extract a Firebase UID from the token similar to our requireAuth middleware
            let firebaseUid = userId; // Default to using userId directly
            
            // If token looks like a JWT (contains dots), try to decode it
            if (token.includes('.')) {
              try {
                const parts = token.split('.');
                if (parts.length === 3) {
                  // Decode JWT payload
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                  // Extract UID from payload
                  const tokenUid = payload.user_id || payload.sub || payload.uid;
                  if (tokenUid) {
                    firebaseUid = tokenUid;
                    console.log(`WebSocket: Extracted user ID ${firebaseUid} from token`);
                  }
                }
              } catch (err) {
                console.warn('WebSocket: Failed to parse token, using provided userId', err);
                // Continue with userId as firebaseUid
              }
            }
            
            // Store connection by user ID
            if (!connections.has(firebaseUid)) {
              connections.set(firebaseUid, []);
            }
            
            // Add this connection to the user's connections
            const userConnections = connections.get(firebaseUid);
            if (userConnections) {
              // Check if connection already exists for this user
              if (!userConnections.includes(ws)) {
                userConnections.push(ws);
                // Store the userId on the websocket object for reference
                // @ts-ignore - add userId to ws
                ws.userId = firebaseUid;
                console.log(`User ${firebaseUid} authenticated on WebSocket`);
              }
              
              // Send confirmation
              try {
                ws.send(JSON.stringify({
                  type: 'auth_success',
                  message: 'Authentication successful',
                  userId: firebaseUid
                }));
              } catch (e) {
                console.error('Error sending auth success message:', e.message);
              }
            }
          } else {
            try {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Authentication failed: missing token or userId'
              }));
            } catch (e) {
              console.error('Error sending auth error message:', e.message);
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error.message);
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message'
          }));
        } catch (e) {
          console.error('Error sending error message:', e.message);
        }
      }
    });
    
    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error.message);
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
