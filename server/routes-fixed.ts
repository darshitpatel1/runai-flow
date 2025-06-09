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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Auth routes - simplified for reliability
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Just return success for development
      res.json({ message: "User registered successfully" });
    } catch (error: any) {
      console.error('Registration error:', error);
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
      console.error('Error creating connector:', error);
      res.status(500).json({ error: 'Error creating connector' });
    }
  });

  // Data tables routes
  app.get('/api/tables', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const tables = await storage.getTables(userId);
      res.json(tables);
    } catch (error: any) {
      console.error('Error fetching tables:', error);
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
      console.error('Error fetching table:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tables', simpleAuth, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      
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
        console.error('Validation error creating table:', error.errors);
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating table:', error);
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
      console.error('Error updating table:', error);
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
      console.error('Error deleting table:', error);
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
      res.json(rows);
    } catch (error: any) {
      console.error('Error fetching table rows:', error);
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
        tableId,
        data: req.body.data
      });
      
      const row = await storage.createTableRow(validatedData);
      res.status(201).json(row);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating table row:', error);
      res.status(500).json({ error: 'Error creating table row' });
    }
  });

  app.put('/api/tables/:id/rows/:rowId', simpleAuth, async (req, res) => {
    try {
      const rowId = parseInt(req.params.rowId);
      
      if (isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid row ID' });
      }
      
      const updatedRow = await storage.updateTableRow(rowId, req.body.data);
      
      if (!updatedRow) {
        return res.status(404).json({ error: 'Row not found' });
      }
      
      res.json(updatedRow);
    } catch (error: any) {
      console.error('Error updating table row:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/tables/:id/rows/:rowId', simpleAuth, async (req, res) => {
    try {
      const rowId = parseInt(req.params.rowId);
      
      if (isNaN(rowId)) {
        return res.status(400).json({ error: 'Invalid row ID' });
      }
      
      await storage.deleteTableRow(rowId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting table row:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}