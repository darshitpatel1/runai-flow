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
      
      const updatedConnector = await storage.updateConnector(userId, connectorId, req.body);
      
      if (!updatedConnector) {
        return res.status(404).json({ error: 'Connector not found' });
      }
      
      res.json(updatedConnector);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete('/api/connectors/:id', requireAuth, async (req, res) => {
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

  // Data tables routes
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
      
      // Validate request data
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
      
      const updatedTable = await storage.updateTable(userId, tableId, req.body);
      
      if (!updatedTable) {
        return res.status(404).json({ error: 'Table not found' });
      }
      
      res.json(updatedTable);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/tables/:id', requireAuth, async (req, res) => {
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
  app.get('/api/tables/:id/rows', requireAuth, async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      
      if (isNaN(tableId)) {
        return res.status(400).json({ error: 'Invalid table ID' });
      }
      
      const rows = await storage.getTableRows(tableId, limit, offset);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tables/:id/rows', requireAuth, async (req, res) => {
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

  app.put('/api/tables/rows/:id', requireAuth, async (req, res) => {
    try {
      const rowId = parseInt(req.params.id);
      
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

  app.delete('/api/tables/rows/:id', requireAuth, async (req, res) => {
    try {
      const rowId = parseInt(req.params.id);
      
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