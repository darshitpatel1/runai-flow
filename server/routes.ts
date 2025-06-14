import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertConnectorSchema, 
  insertDataTableSchema,
  insertTableRowSchema,
  columnDefinitionSchema
} from "@shared/schema";
import { z } from "zod";
import { ensureValidToken, getValidAccessToken } from "./token-refresh-service";

// Simple authentication middleware that works reliably
const simpleAuth = async (req: Request, res: Response, next: Function) => {
  try {
    // For development, use a consistent test user
    const testEmail = "test@example.com";
    const testFirebaseUid = "test-uid-123";
    
    // Try to find existing user
    let user = await storage.getUserByEmail(testEmail);
    
    if (!user) {
      // Create test user if doesn't exist
      try {
        user = await storage.createUser({
          firebaseUid: testFirebaseUid,
          email: testEmail,
          displayName: "Test User",
          photoUrl: ""
        });
      } catch (error: any) {
        if (error.code === '23505') {
          user = await storage.getUserByEmail(testEmail);
        } else {
          throw error;
        }
      }
    }
    
    if (!user) {
      return res.status(500).json({ error: "Could not create or find user" });
    }
    
    (req as any).user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

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
      // Decode the payload (the middle part) - add padding if needed
      let base64Payload = parts[1];
      // Add padding if needed for base64 decoding
      while (base64Payload.length % 4) {
        base64Payload += '=';
      }
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      // Extract the Firebase UID from the payload
      const firebaseUid = payload.user_id || payload.sub || payload.uid;
      
      if (!firebaseUid) {
        console.log('Token payload:', payload);
        return res.status(401).json({ error: 'Could not extract user ID from token' });
      }
      
      // Look up the user by Firebase UID
      const user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (!user) {
        // For development purposes, if the user doesn't exist, we'll create them
        // This helps with testing and development when the frontend and backend states get out of sync
        console.log(`User with Firebase UID ${firebaseUid} not found in database, creating...`);
        if (payload.email) {
          try {
            const newUser = await storage.createUser({
              firebaseUid,
              email: payload.email,
              displayName: payload.name || '',
              photoUrl: payload.picture || ''
            });
            (req as any).user = newUser;
            next();
            return;
          } catch (error: any) {
            // If user already exists by email, try to find them by email
            if (error.code === '23505' && error.constraint === 'users_email_unique') {
              console.log(`User with email ${payload.email} already exists, finding by email...`);
              const existingUser = await storage.getUserByEmail(payload.email);
              if (existingUser) {
                // Update the existing user with the new Firebase UID
                await storage.updateUserFirebaseUid(existingUser.id, firebaseUid);
                (req as any).user = { ...existingUser, firebaseUid };
                next();
                return;
              }
            }
            console.error('Error creating/finding user:', error);
            return res.status(500).json({ error: 'Could not create or find user' });
          }
        } else {
          return res.status(401).json({ error: 'User not found and could not auto-create user' });
        }
      }
      
      // Attach user to request object for later use
      (req as any).user = user;
      next();
    } catch (decodeError) {
      console.error('Error decoding JWT token:', decodeError);
      return res.status(401).json({ error: 'Invalid token format' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
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
  app.get('/api/user', simpleAuth, async (req, res) => {
    res.json((req as any).user);
  });
  
  app.patch('/api/user', simpleAuth, async (req, res) => {
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
  app.get('/api/connectors', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectors = await storage.getConnectors(userId);
      res.json(connectors);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get('/api/connectors/:id', simpleAuth, async (req, res) => {
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
  
  app.post('/api/connectors', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Validate request data
      const validatedData = insertConnectorSchema.parse({
        ...req.body,
        userId
      });
      
      const connector = await storage.createConnector({
        userId: validatedData.userId,
        name: validatedData.name,
        baseUrl: validatedData.baseUrl,
        authType: validatedData.authType || 'none',
        authConfig: validatedData.authConfig,
        headers: validatedData.headers
      });
      res.status(201).json(connector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error creating connector' });
    }
  });
  
  app.put('/api/connectors/:id', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      const updatedConnector = await storage.updateConnector(userId, connectorId, req.body);
      
      if (!updatedConnector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      res.json(updatedConnector);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete('/api/connectors/:id', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const connectorId = parseInt(req.params.id);
      
      if (isNaN(connectorId)) {
        return res.status(400).json({ error: 'Invalid connector ID' });
      }
      
      await storage.deleteConnector(userId, connectorId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test connector endpoint
  app.post('/api/test-connector', async (req, res) => {
    try {
      const { connector } = req.body;
      
      if (!connector) {
        return res.status(400).json({ error: 'Connector data is required' });
      }

      const { name, baseUrl, authType, auth, headers } = connector;

      // For OAuth2 Authorization Code flow, we need to initiate the OAuth flow
      if (authType === 'oauth2' && auth?.oauth2Type === 'authorization_code') {
        // Generate a state parameter for security
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Build clean authorization URL with only essential parameters
        const authUrl = new URL(auth.authorizationUrl);
        
        // Clear any existing parameters to ensure clean URL
        authUrl.search = '';
        
        // Add only essential OAuth2 parameters
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('client_id', auth.clientId);
        authUrl.searchParams.set('state', state);
        
        // Only add optional parameters if they're provided
        if (auth.redirectUri && auth.redirectUri.trim()) {
          authUrl.searchParams.set('redirect_uri', auth.redirectUri);
        }
        
        if (auth.scope && auth.scope.trim()) {
          authUrl.searchParams.set('scope', auth.scope);
        }

        return res.json({
          authRequired: true,
          authType: 'oauth2',
          authUrl: authUrl.toString(),
          state: state
        });
      }

      // For other auth types, test the connection directly
      let testUrl = baseUrl;
      if (!testUrl.endsWith('/')) {
        testUrl += '/';
      }
      
      // Try to make a simple API call to test the connection
      // For most APIs, we can try a basic endpoint like /api/v1/user or similar
      const testEndpoints = [
        'api/v1/user',
        'api/user', 
        'user',
        'me',
        'profile',
        'account',
        'status',
        'health',
        ''
      ];

      let testResponse = null;
      let lastError = null;

      for (const endpoint of testEndpoints) {
        try {
          const fullUrl = testUrl + endpoint;
          const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'RunAI-Connector-Test/1.0'
          };

          // Add custom headers
          if (headers && Array.isArray(headers)) {
            headers.forEach((header: any) => {
              if (header.key && header.value) {
                requestHeaders[header.key] = header.value;
              }
            });
          }

          // Add authentication
          if (authType === 'basic' && auth?.username && auth?.password) {
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            requestHeaders['Authorization'] = `Basic ${credentials}`;
          } else if (authType === 'oauth2' && auth?.oauth2Type === 'client_credentials') {
            // For client credentials flow, we need to get an access token first
            try {
              const tokenResponse = await fetch(auth.tokenUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Authorization': `Basic ${Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64')}`
                },
                body: 'grant_type=client_credentials' + (auth.scope ? `&scope=${encodeURIComponent(auth.scope)}` : '')
              });

              if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                throw new Error(`Token request failed: ${tokenResponse.status} ${errorText}`);
              }

              const tokenData = await tokenResponse.json();
              
              if (!tokenData.access_token) {
                throw new Error('No access token received');
              }

              // Add the access token to headers
              if (auth.tokenLocation === 'header') {
                requestHeaders['Authorization'] = `Bearer ${tokenData.access_token}`;
              } else if (auth.tokenLocation === 'query') {
                const urlWithToken = new URL(fullUrl);
                urlWithToken.searchParams.append('access_token', tokenData.access_token);
                testUrl = urlWithToken.toString();
              }
            } catch (tokenError: any) {
              lastError = `OAuth2 token error: ${tokenError.message}`;
              continue;
            }
          }

          const response = await fetch(fullUrl, {
            method: 'GET',
            headers: requestHeaders
          });

          // Consider any response (even 401/403) as a successful connection
          // since it means we can reach the API
          testResponse = {
            status: response.status,
            statusText: response.statusText,
            endpoint: endpoint || 'root',
            headers: Object.fromEntries(response.headers.entries()),
            note: undefined
          };

          // If we get a successful response, break out of the loop
          if (response.ok) {
            break;
          }

          // If we get a 401/403, it might mean auth is wrong but connection works
          if (response.status === 401 || response.status === 403) {
            testResponse = {
              ...testResponse,
              note: 'Authentication may be incorrect, but connection successful'
            };
            break;
          }

        } catch (error: any) {
          lastError = error.message;
          continue;
        }
      }

      if (testResponse) {
        return res.json({
          success: true,
          message: 'Connection test successful',
          details: testResponse
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Connection test failed',
          error: lastError || 'All test endpoints failed'
        });
      }

    } catch (error: any) {
      console.error('Connector test error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Internal server error during connection test',
        error: error.message 
      });
    }
  });

  // OAuth callback handler for authorization code flow
  app.get('/api/oauth/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'oauth-callback',
                  success: false,
                  error: '${error}',
                  state: '${state}'
                }, '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      if (!code || !state) {
        return res.send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'oauth-callback',
                  success: false,
                  error: 'Missing authorization code or state parameter',
                  state: '${state}'
                }, '*');
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Success - send the code back to the parent window
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'oauth-callback',
                success: true,
                code: '${code}',
                state: '${state}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'oauth-callback',
                success: false,
                error: 'Internal server error',
                state: '${req.query.state}'
              }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    }
  });

  // Exchange OAuth authorization code for access token
  app.post('/api/oauth-exchange', async (req, res) => {
    try {
      const { code, connectorId, userId } = req.body;

      if (!code || !connectorId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // For production OAuth exchange, we need the connector configuration
      // Since the frontend stores connectors in Firebase, we'll accept the connector config in the request
      // This allows us to perform real token exchange with Workday
      
      const { connectorConfig } = req.body;
      if (!connectorConfig || !connectorConfig.auth) {
        return res.status(400).json({ error: 'Connector configuration required for token exchange' });
      }
      
      const auth = connectorConfig.auth;

      // Exchange authorization code for real access token with Workday
      const tokenResponse = await fetch(auth.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: auth.redirectUri || '',
          client_id: auth.clientId
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange failed:', errorText);
        return res.status(400).json({ 
          error: 'Token exchange failed',
          details: errorText 
        });
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.access_token) {
        return res.status(400).json({ error: 'No access token received' });
      }

      // Return the tokens to the frontend for storage
      const tokenInfo = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt: tokenData.expires_in ? 
          new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString() : null,
        lastAuthenticated: new Date().toISOString(),
        tokenType: tokenData.token_type || 'Bearer'
      };

      res.json({
        success: true,
        message: 'OAuth authentication successful',
        tokens: tokenInfo,
        expiresIn: tokenData.expires_in
      });

    } catch (error: any) {
      console.error('OAuth exchange error:', error);
      res.status(500).json({ 
        error: 'Internal server error during token exchange',
        details: error.message 
      });
    }
  });

  // Enhanced token refresh endpoint with Firebase support
  app.post('/api/oauth-refresh', async (req, res) => {
    try {
      const { connectorId, userId, connectorName } = req.body;

      if ((!connectorId && !connectorName) || !userId) {
        return res.status(400).json({ error: 'Missing required parameters (need connectorId or connectorName and userId)' });
      }

      // For Firebase connectors, use connectorName
      if (connectorName) {
        const { firebaseSync } = await import('./firebase-sync');
        
        // Get Firebase connectors for this user
        const firebaseConnectors = await firebaseSync.getAllFirebaseConnectors();
        const userConnector = firebaseConnectors.find(fc => 
          fc.userId === userId && fc.connector.name === connectorName
        );

        if (!userConnector) {
          return res.status(404).json({ error: 'Firebase connector not found' });
        }

        const auth = userConnector.connector.auth;
        if (!auth?.refreshToken) {
          return res.status(400).json({ error: 'No refresh token available' });
        }

        // Perform token refresh directly
        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: auth.refreshToken,
          client_id: auth.clientId
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded'
        };

        if (auth.clientSecret) {
          const credentials = Buffer.from(`${auth.clientId}:${auth.clientSecret}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }

        const response = await fetch(auth.tokenUrl, {
          method: 'POST',
          headers,
          body: body.toString()
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token refresh failed:', errorText);
          return res.status(400).json({ 
            error: 'Token refresh failed',
            details: errorText 
          });
        }

        const tokenData = await response.json();

        if (!tokenData.access_token) {
          return res.status(400).json({ error: 'No access token received from refresh' });
        }

        // Update the auth object
        const updatedAuth = {
          ...auth,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || auth.refreshToken,
          tokenExpiresAt: tokenData.expires_in ? 
            new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString() : auth.tokenExpiresAt,
          lastRefreshed: new Date().toISOString(),
          lastAuthenticated: new Date().toISOString()
        };

        // Sync back to Firebase
        await firebaseSync.syncConnectorFromPostgres(userId, connectorName, updatedAuth);

        return res.json({
          success: true,
          message: 'Token refreshed successfully',
          tokenExpiresAt: updatedAuth.tokenExpiresAt,
          lastRefreshed: updatedAuth.lastRefreshed
        });
      }

      // Fallback to PostgreSQL connector refresh
      const { tokenRefreshService } = await import('./token-refresh-service');
      const success = await tokenRefreshService.refreshSpecificConnector(userId, connectorId);

      if (success) {
        const connector = await storage.getConnector(userId, connectorId);
        const auth = connector?.authConfig as any;
        
        res.json({
          success: true,
          message: 'Token refreshed successfully',
          tokenExpiresAt: auth?.tokenExpiresAt,
          lastRefreshed: auth?.lastRefreshed
        });
      } else {
        res.status(400).json({ 
          error: 'Token refresh failed',
          requiresReauth: true 
        });
      }

    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(500).json({ 
        error: 'Internal server error during token refresh',
        details: error.message 
      });
    }
  });

  // Enhanced test connector with automatic token refresh
  app.post('/api/use-connector', async (req, res) => {
    try {
      const { connectorId, userId, endpoint = '', method = 'GET', data = null } = req.body;

      if (!connectorId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Get the connector configuration
      const connector = await storage.getConnector(userId, connectorId);
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }

      const { baseUrl, authType, authConfig, headers: customHeaders } = connector;
      const auth = authConfig as any;

      // Build the full URL
      let fullUrl = baseUrl;
      if (!fullUrl.endsWith('/') && endpoint && !endpoint.startsWith('/')) {
        fullUrl += '/';
      }
      fullUrl += endpoint;

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RunAI-Connector/1.0'
      };

      // Add custom headers
      if (customHeaders && Array.isArray(customHeaders)) {
        customHeaders.forEach((header: any) => {
          if (header.key && header.value) {
            requestHeaders[header.key] = header.value;
          }
        });
      }

      // Handle authentication
      if (authType === 'basic' && auth?.username && auth?.password) {
        const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        requestHeaders['Authorization'] = `Basic ${credentials}`;
      } else if (authType === 'oauth2') {
        // Use the new automatic token refresh system
        const accessToken = await getValidAccessToken(userId, connectorId);
        
        if (accessToken) {
          requestHeaders['Authorization'] = `Bearer ${accessToken}`;
        } else {
          return res.status(401).json({ 
            error: 'Unable to obtain valid access token',
            requiresReauth: true 
          });
        }
      }

      // Make the API request
      let apiResponse = await fetch(fullUrl, {
        method: method.toUpperCase(),
        headers: requestHeaders,
        body: data && method.toUpperCase() !== 'GET' ? JSON.stringify(data) : undefined
      });

      // Handle 401 Unauthorized responses for OAuth connectors
      if (apiResponse.status === 401 && authType === 'oauth2') {
        console.log(`Received 401 for connector ${connectorId}, attempting token refresh`);
        
        // Try to refresh the token and retry the request
        const { tokenRefreshService } = await import('./token-refresh-service');
        const refreshSuccess = await tokenRefreshService.refreshSpecificConnector(userId, connectorId);
        
        if (refreshSuccess) {
          // Get the new access token and retry the request
          const newAccessToken = await getValidAccessToken(userId, connectorId);
          if (newAccessToken) {
            requestHeaders['Authorization'] = `Bearer ${newAccessToken}`;
            
            // Retry the original request
            apiResponse = await fetch(fullUrl, {
              method: method.toUpperCase(),
              headers: requestHeaders,
              body: data && method.toUpperCase() !== 'GET' ? JSON.stringify(data) : undefined
            });
            
            console.log(`Retried request after token refresh, new status: ${apiResponse.status}`);
          }
        }
        
        // If we still get 401 after refresh attempt, mark for reauth
        if (apiResponse.status === 401) {
          const connector = await storage.getConnector(userId, connectorId);
          if (connector?.authConfig) {
            await storage.updateConnector(userId, connectorId, {
              authConfig: {
                ...connector.authConfig,
                needsReauth: true,
                lastAuthError: new Date()
              }
            });
          }
        }
      }

      const responseData = await apiResponse.text();
      let parsedData;
      
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      res.json({
        success: apiResponse.ok,
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        data: parsedData,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        tokenRefreshed: apiResponse.status !== 401 && authType === 'oauth2' // Indicate if token was refreshed
      });

    } catch (error: any) {
      console.error('Connector usage error:', error);
      res.status(500).json({ 
        error: 'Internal server error during connector usage',
        details: error.message 
      });
    }
  });

  // Check connector token status and health
  app.get('/api/connectors/:connectorId/token-status', async (req, res) => {
    try {
      const connectorId = parseInt(req.params.connectorId);
      const userId = req.query.userId as string;

      if (isNaN(connectorId) || !userId) {
        return res.status(400).json({ error: 'Invalid connector ID or missing user ID' });
      }

      const connector = await storage.getConnector(parseInt(userId), connectorId);
      if (!connector) {
        return res.status(404).json({ error: 'Connector not found' });
      }

      if (connector.authType !== 'oauth2') {
        return res.json({
          authType: connector.authType,
          status: 'not_applicable',
          message: 'Token status only applies to OAuth2 connectors'
        });
      }

      const auth = connector.authConfig as any;
      if (!auth?.accessToken) {
        return res.json({
          authType: 'oauth2',
          status: 'no_token',
          message: 'No access token available',
          needsReauth: true
        });
      }

      let status = 'valid';
      let message = 'Token is valid';
      let expiresIn = null;
      let needsReauth = auth.needsReauth || false;

      if (auth.tokenExpiresAt) {
        const expiryTime = new Date(auth.tokenExpiresAt).getTime();
        const currentTime = Date.now();
        expiresIn = Math.max(0, Math.floor((expiryTime - currentTime) / 1000));

        if (expiryTime <= currentTime) {
          status = 'expired';
          message = 'Token has expired';
          needsReauth = !auth.refreshToken;
        } else if (expiryTime - currentTime <= 10 * 60 * 1000) { // 10 minutes
          status = 'expiring_soon';
          message = 'Token expires within 10 minutes';
        }
      }

      res.json({
        authType: 'oauth2',
        status,
        message,
        expiresIn,
        expiresAt: auth.tokenExpiresAt,
        lastRefreshed: auth.lastRefreshed,
        hasRefreshToken: !!auth.refreshToken,
        needsReauth
      });

    } catch (error: any) {
      console.error('Token status check error:', error);
      res.status(500).json({ 
        error: 'Internal server error during token status check',
        details: error.message 
      });
    }
  });

  // Data tables routes
  app.get('/api/tables', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tables = await storage.getTables(userId);
      res.json(tables);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/tables/:id', simpleAuth, async (req, res) => {
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

  app.post('/api/tables', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
      // Validate request data
      const validatedData = insertDataTableSchema.parse({
        ...req.body,
        userId
      });
      
      const table = await storage.createTable({
        userId: validatedData.userId,
        name: validatedData.name,
        description: validatedData.description || undefined,
        columns: validatedData.columns
      });
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error creating table' });
    }
  });

  app.put('/api/tables/:id', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const updatedTable = await storage.updateTable(userId, tableId, req.body);
      
      if (!updatedTable) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      res.json(updatedTable);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/tables/:id', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      await storage.deleteTable(userId, tableId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Table rows routes
  app.get('/api/tables/:id/rows', simpleAuth, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const rows = await storage.getTableRows(tableId, limit, offset);
      
      // Prevent caching to ensure fresh data after updates
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tables/:id/rows', simpleAuth, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const validatedData = insertTableRowSchema.parse({
        ...req.body,
        tableId
      });
      
      const row = await storage.createTableRow(validatedData);
      res.status(201).json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: 'Error creating row' });
    }
  });

  app.put('/api/tables/:tableId/rows/:id', simpleAuth, async (req, res) => {
    try {
      const tableId = parseInt(req.params.tableId);
      const rowId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      if (isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid row ID' });
      }
      
      const updatedRow = await storage.updateTableRow(rowId, req.body.data);
      
      if (!updatedRow) {
        return res.status(404).json({ error: 'Row not found' });
      }
      
      res.json(updatedRow);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/tables/:tableId/rows/:id', simpleAuth, async (req, res) => {
    try {
      const tableId = parseInt(req.params.tableId);
      const rowId = parseInt(req.params.id);
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      if (isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid row ID' });
      }
      
      await storage.deleteTableRow(rowId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}