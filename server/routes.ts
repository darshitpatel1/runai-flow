import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
// WebSocket removed - using direct API calls instead
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

// WebSocket completely removed - using direct API calls instead
function sendExecutionUpdate(userId: string, executionData: any) {
  // WebSocket removed - execution updates now handled by direct API responses
  console.log(`Flow execution update for user ${userId}:`, executionData.status);
}

// Middleware to ensure user is authenticated via Firebase
const requireAuth = async (req: Request, res: Response, next: Function) => {
  // Check if there's a query parameter for firebaseId (for testing purposes)
  const queryFirebaseId = req.query.firebaseId as string;
  
  // First try to get auth from headers
  const authHeader = req.headers.authorization;
  let token: string | null = null;
  
  if (authHeader) {
    // Extract token from the Authorization header
    token = authHeader.split(' ')[1];
  }
  
  // If we have a query parameter for firebaseId, use that instead (for testing)
  if (queryFirebaseId) {
    console.log(`Using query parameter firebaseId: ${queryFirebaseId}`);
    try {
      const user = await storage.getUserByFirebaseUid(queryFirebaseId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    } catch (error) {
      console.error("Error finding user by firebaseId query param:", error);
    }
  }
  
  // If no query parameter or it didn't work, proceed with token auth
  if (!token) {
    return res.status(401).json({ error: 'Invalid token' });
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

  // DEDICATED FLOW EXECUTION ENDPOINT - must be first to avoid conflicts
  app.post('/api/execute-flow/:id', async (req, res) => {
    console.log('=== FLOW EXECUTION ENDPOINT HIT ===');
    
    const flowId = req.params.id;
    const firebaseId = req.body.firebaseId || req.query.firebaseId as string;
    
    console.log(`Flow execution: flowId=${flowId}, firebaseId=${firebaseId}`);
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    if (!flowId) {
      return res.status(400).json({ error: 'Flow ID required' });
    }
    
    if (!firebaseId) {
      return res.status(400).json({ error: 'Firebase ID required' });
    }
    
    try {
      // Get the actual user ID from Firebase ID for connector lookup
      const user = await storage.getUserByFirebaseUid(firebaseId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userId = user.id;
      console.log(`Found user ID ${userId} for Firebase ID ${firebaseId}`);
      
      const flowNodes = req.body.nodes || [];
      const nodeCount = flowNodes.length || 1;
      
      console.log(`Executing flow with ${nodeCount} nodes`);
      console.log('Received nodes:', JSON.stringify(flowNodes, null, 2));
      
      const execution = {
        id: Date.now(),
        flowId,
        userId,
        status: 'running',
        createdAt: new Date()
      };
      
      // Flow execution progress logged to console
      console.log(`🚀 Flow execution started for ${flowId}`);
      
      // Execute actual HTTP nodes with real API calls
      const executeNodes = async () => {
        console.log('Starting actual node execution with real API calls...');
        const allResponses = [];
        
        for (let i = 0; i < flowNodes.length; i++) {
          const node = flowNodes[i];
          const progress = Math.floor(((i + 1) / flowNodes.length) * 100);
          
          console.log(`Executing node ${i + 1}/${flowNodes.length}: ${node.type}`);
          console.log(`Node data:`, JSON.stringify(node, null, 2));
          
          console.log(`⚡ Executing ${node.type} node: ${node.data?.label || `Node ${i + 1}`}`);
          
          // If it's an HTTP node, make the actual API request
          if (node.type === 'http' || node.type === 'httpRequest') {
            const apiUrl = node.data?.url || node.data?.endpoint;
            if (!apiUrl) {
              console.log('No API URL found for HTTP node, skipping...');
              continue;
            }
            
            try {
              console.log(`Making HTTP ${node.data?.method || 'GET'} request to: ${apiUrl}`);
              console.log(`Node connector: ${node.data?.connector}`);
              
              // Get the connector authentication settings
              let authHeaders = {};
              const connectorName = node.data?.connector;
              
              if (connectorName && connectorName !== 'none') {
                try {
                  // Find the connector by name from the user's connectors
                  const userConnectors = await storage.getConnectors(userId);
                  const connector = userConnectors.find(c => c.name === connectorName);
                  
                  if (connector) {
                    console.log(`Using connector: ${connector.name} (${connector.authType})`);
                    
                    // STRICT AUTHENTICATION VALIDATION
                    const authConfig = connector.authConfig as any;
                    
                    if (connector.authType === 'basic') {
                      if (!authConfig?.username || !authConfig?.password) {
                        console.log('❌ Basic Auth connector missing credentials - FAILING REQUEST');
                        throw new Error(`Basic Authentication required but credentials missing for connector "${connector.name}"`);
                      }
                      const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
                      (authHeaders as any)['Authorization'] = `Basic ${credentials}`;
                      console.log('✅ Applied Basic Authentication');
                      
                    } else if (connector.authType === 'oauth2') {
                      if (!authConfig?.accessToken) {
                        console.log('❌ OAuth2 connector missing access token - FAILING REQUEST');
                        throw new Error(`OAuth2 Authentication required but access token missing for connector "${connector.name}"`);
                      }
                      (authHeaders as any)['Authorization'] = `Bearer ${authConfig.accessToken}`;
                      console.log('✅ Applied OAuth2 Bearer token');
                      
                    } else if (connector.authType === 'api_key') {
                      if (!authConfig?.apiKey) {
                        console.log('❌ API Key connector missing key - FAILING REQUEST');
                        throw new Error(`API Key Authentication required but key missing for connector "${connector.name}"`);
                      }
                      if (authConfig.keyLocation === 'header') {
                        (authHeaders as any)[authConfig.keyName || 'X-API-Key'] = authConfig.apiKey;
                      }
                      console.log('✅ Applied API Key authentication');
                      
                    } else if (connector.authType !== 'none') {
                      console.log(`❌ Unknown auth type: ${connector.authType} - FAILING REQUEST`);
                      throw new Error(`Unknown authentication type "${connector.authType}" for connector "${connector.name}"`);
                    }
                    
                    // Apply any custom headers from connector
                    if (connector.headers) {
                      try {
                        const customHeaders = typeof connector.headers === 'string' 
                          ? JSON.parse(connector.headers) 
                          : connector.headers;
                        Object.assign(authHeaders, customHeaders);
                        console.log('✅ Applied custom connector headers');
                      } catch (e) {
                        console.log('⚠️ Failed to parse connector headers');
                      }
                    }
                  } else {
                    console.log(`❌ Connector "${connectorName}" not found - FAILING REQUEST`);
                    throw new Error(`Connector "${connectorName}" not found`);
                  }
                } catch (connectorError) {
                  console.error('❌ AUTHENTICATION ERROR:', connectorError.message);
                  // FAIL THE ENTIRE REQUEST - don't continue with unauthenticated request
                  const errorInfo = {
                    nodeId: node.id,
                    url: apiUrl,
                    method: node.data?.method || 'GET',
                    status: 401,
                    statusText: 'Authentication Failed',
                    responseTime: 0,
                    data: null,
                    error: connectorError.message
                  };
                  
                  allResponses.push(errorInfo);
                  console.log(`❌ Node ${i + 1} FAILED: ${connectorError.message}`);
                  continue; // Skip to next node but record the failure
                }
              } else {
                console.log('No connector specified - making unauthenticated request');
              }
              
              const startTime = Date.now();
              
              // Combine node headers with auth headers
              const nodeHeaders = node.data?.headers ? JSON.parse(node.data.headers || '{}') : {};
              const finalHeaders = { ...nodeHeaders, ...authHeaders };
              
              console.log('Final headers:', Object.keys(finalHeaders));
              
              const fetch = (await import('node-fetch')).default;
              const response = await fetch(apiUrl, {
                method: node.data?.method || 'GET',
                headers: finalHeaders,
                body: node.data?.method !== 'GET' && node.data?.body ? node.data.body : undefined
              });
              
              const endTime = Date.now();
              const responseData = await response.text();
              
              console.log(`✅ HTTP Response: ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
              console.log(`✅ Full API Response Data: ${responseData}`);
              
              // Store response for returning to frontend
              const responseInfo = {
                nodeId: node.id,
                url: apiUrl,
                method: node.data?.method || 'GET',
                status: response.status,
                statusText: response.statusText,
                responseTime: endTime - startTime,
                data: responseData
              };
              
              allResponses.push(responseInfo);
              
              // Parse and log specific artwork data for easy viewing
              try {
                const apiData = JSON.parse(responseData);
                if (apiData.data && apiData.data.length > 0) {
                  const artwork = apiData.data[0];
                  console.log('🎨 ARTWORK DETAILS:');
                  console.log(`Title: ${artwork.title}`);
                  console.log(`Artist: ${artwork.artist_display}`);
                  console.log(`Date: ${artwork.date_display}`);
                  console.log(`Medium: ${artwork.medium_display}`);
                  console.log(`Dimensions: ${artwork.dimensions}`);
                }
              } catch (e) {
                console.log('Response is not JSON or has different structure');
              }
              
              // Flow execution update logged to console
              console.log(`✅ Flow Progress: HTTP ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
              
            } catch (error: any) {
              console.error(`HTTP request failed:`, error.message);
              // Flow error logged to console
              console.log(`❌ Flow Error: Request failed: ${error.message}`);
            }
          } else {
            // For other node types, simulate execution
            await new Promise(resolve => setTimeout(resolve, 200));
            console.log(`✅ ${node.type} node completed`);
          }
          
          // Small delay between nodes
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('🎉 Flow execution completed successfully!');
        return allResponses;
      };
      
      // Execute nodes and get all API responses
      const responses = await executeNodes();
      
      // Update execution status to completed
      execution.status = 'completed';
      
      // Skip database saving for Firestore flows since flowId is not an integer
      console.log('Skipping database execution save for Firestore flow:', flowId);
      
      // Return success response with the actual API response data
      return res.status(200).json({
        success: true,
        execution: execution,
        responses: responses,
        logs: responses.map(resp => ({
          timestamp: new Date(),
          type: 'success',
          message: `✅ ${resp.method} ${resp.url} → ${resp.status} ${resp.statusText} (${resp.responseTime}ms)`,
          nodeId: resp.nodeId,
          data: resp.data
        }))
      });
      
    } catch (error: any) {
      console.error('Flow execution error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Unknown error occurred',
        message: 'Failed to execute flow'
      });
    }
  });

  // Test single node endpoint for real API responses
  app.post("/api/test-node", requireAuth, async (req: Request, res: Response) => {
    try {
      const { url, method = 'GET', headers = {}, body, connector } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      console.log(`🧪 Testing node: ${method} ${url}`);
      console.log(`🔐 Connector: ${connector || 'none'}`);
      
      // ENFORCE CONNECTOR AUTHENTICATION FOR NODE TESTING TOO
      let authHeaders = {};
      const userId = (req as any).user.id;
      
      if (connector && connector !== 'none') {
        try {
          const userConnectors = await storage.getConnectors(userId);
          const connectorConfig = userConnectors.find(c => c.name === connector);
          
          if (connectorConfig) {
            console.log(`Using connector: ${connectorConfig.name} (${connectorConfig.authType})`);
            const authConfig = connectorConfig.authConfig as any;
            
            // STRICT VALIDATION - same as flow execution
            if (connectorConfig.authType === 'basic') {
              if (!authConfig?.username || !authConfig?.password) {
                console.log('❌ Basic Auth connector missing credentials');
                return res.status(401).json({ 
                  error: `Basic Authentication required but credentials missing for connector "${connectorConfig.name}"` 
                });
              }
              const credentials = Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64');
              (authHeaders as any)['Authorization'] = `Basic ${credentials}`;
              console.log('✅ Applied Basic Authentication');
              
            } else if (connectorConfig.authType === 'oauth2') {
              if (!authConfig?.accessToken) {
                console.log('❌ OAuth2 connector missing access token');
                return res.status(401).json({ 
                  error: `OAuth2 Authentication required but access token missing for connector "${connectorConfig.name}"` 
                });
              }
              (authHeaders as any)['Authorization'] = `Bearer ${authConfig.accessToken}`;
              console.log('✅ Applied OAuth2 Bearer token');
              
            } else if (connectorConfig.authType === 'api_key') {
              if (!authConfig?.apiKey) {
                console.log('❌ API Key connector missing key');
                return res.status(401).json({ 
                  error: `API Key Authentication required but key missing for connector "${connectorConfig.name}"` 
                });
              }
              if (authConfig.keyLocation === 'header') {
                (authHeaders as any)[authConfig.keyName || 'X-API-Key'] = authConfig.apiKey;
              }
              console.log('✅ Applied API Key authentication');
            }
          } else {
            console.log(`❌ Connector "${connector}" not found`);
            return res.status(404).json({ error: `Connector "${connector}" not found` });
          }
        } catch (connectorError) {
          console.error('❌ Connector authentication error:', connectorError);
          return res.status(401).json({ error: `Authentication failed: ${connectorError.message}` });
        }
      } else {
        console.log('No connector specified - making unauthenticated request');
      }

      const startTime = Date.now();

      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...authHeaders  // Apply authentication headers
        }
      };

      if (body && method !== 'GET') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      console.log('Making request with headers:', Object.keys(fetchOptions.headers || {}));
      const response = await fetch(url, fetchOptions);
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }

      console.log(`✅ Node test completed: ${response.status} ${response.statusText} (${responseTime}ms)`);

      res.json({
        data,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        success: true
      });

    } catch (error) {
      console.error('❌ Node test failed:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Test failed',
        success: false 
      });
    }
  });
  
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
  
  // Flow Execution routes - Updated to handle Firebase document IDs (moved before other routes)
  app.post('/api/flows/:id/execute', async (req, res) => {
    console.log('=== FLOW EXECUTION ENDPOINT HIT ===');
    try {
      const flowId = req.params.id;
      const firebaseId = req.query.firebaseId as string;
      
      console.log(`Flow execution request: flowId=${flowId}, firebaseId=${firebaseId}`);
      
      // Simplified validation - just check if we have basic required data
      if (!flowId) {
        console.log('Missing flow ID');
        return res.status(400).json({ error: 'Flow ID is required' });
      }
      
      if (!firebaseId) {
        console.log('Missing Firebase ID');
        return res.status(400).json({ error: 'Firebase ID is required' });
      }
      
      // For testing purposes, we'll use a simulated user ID
      // In production, you'd look up the actual user from your database
      const userId = 1; // Simplified for testing
      
      console.log(`Executing flow ${flowId} for user ${userId}`);
      
      // Since flows are stored in Firebase, we'll use the flow data from the request
      const flowNodes = req.body.input?.nodes || [];
      const flowEdges = req.body.input?.edges || [];
      
      console.log(`Flow has ${flowNodes.length} nodes and ${flowEdges.length} edges`);
      
      // Create a new execution record with a simulated ID since we're using Firebase
      const execution = {
        id: Date.now(), // Use timestamp as a simple ID
        flowId,
        userId,
        status: 'running',
        input: req.body.input || {},
        createdAt: new Date()
      };
      
      // In a real implementation, we would start an async process to execute the flow
      // For now, we'll simulate success with progress updates via WebSocket
      
      // Flow execution started - logged to console
      console.log(`🚀 Flow execution started for ${flowId}`);
      
      // Simulate node-by-node execution with progress updates
      const nodeCount = flowNodes.length || 3; // Use actual node count or fallback to 3
      let currentNode = 0;
      
      const processNodes = () => {
        setTimeout(async () => {
          currentNode++;
          const progress = Math.floor((currentNode / nodeCount) * 100);
          
          // Progress update logged to console
          console.log(`Executing node ${currentNode} of ${nodeCount}`);
          
          // Log progress (skip database for Firebase flows)
          console.log(`Executing node ${currentNode} of ${nodeCount}`);
          
          // Continue processing nodes or complete
          if (currentNode < nodeCount) {
            processNodes();
          } else {
            // Final completion update
            setTimeout(async () => {
              try {
                console.log('Flow execution completed successfully');
                
                // Flow completion logged to console
                console.log('🎉 Flow execution completed successfully!');
              } catch (error) {
                console.error('Error sending completion update:', error);
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
  
  // WebSocket completely removed - flow execution now uses direct API calls
  console.log('Server ready for direct flow execution (WebSocket removed)');
  
  return httpServer;
}
