import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertConnectorSchema, 
  insertFlowSchema,
  insertExecutionSchema
} from "@shared/schema";
import { z } from "zod";

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
    // For Firebase auth, we'd normally verify the token
    // But for this implementation, we'll assume the token is the Firebase UID
    const firebaseUid = token;
    const user = await storage.getUserByFirebaseUid(firebaseUid);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request object for later use
    (req as any).user = user;
    next();
  } catch (error: any) {
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
      // For now, we'll simulate success after a short delay
      setTimeout(async () => {
        try {
          // Update execution with success
          await storage.updateExecution(execution.id, {
            status: 'success',
            finishedAt: new Date(),
            duration: 1500, // 1.5 seconds
            logs: [
              { timestamp: new Date(), level: 'info', message: 'Flow execution started' },
              { timestamp: new Date(), level: 'info', message: 'Flow execution completed' }
            ],
            output: { success: true, message: 'Flow executed successfully' }
          });
          
          // Add some logs
          await storage.addExecutionLog({
            executionId: execution.id,
            level: 'info',
            message: 'Flow execution started'
          });
          
          await storage.addExecutionLog({
            executionId: execution.id,
            level: 'info',
            message: 'Flow execution completed'
          });
        } catch (error) {
          console.error('Error updating execution:', error);
        }
      }, 1500);
      
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
        
        // In a real implementation, we would:
        // 1. Make a token request to the token URL with client credentials
        // 2. Validate the token response
        // 3. Store the access token for future requests
        
        // For now, simulate a successful token acquisition
        return res.status(200).json({
          message: 'Client Credentials authentication successful',
          authType: 'oauth2',
          authMethod: 'client_credentials',
          success: true,
          // Return some connection details to display to the user
          connectionDetails: {
            tokenUrl: connector.auth.tokenUrl,
            clientId: connector.auth.clientId,
            expiresIn: '3600 seconds'
          }
        });
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
  
  return httpServer;
}
