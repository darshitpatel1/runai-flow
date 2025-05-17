// Firebase Admin SDK initialization with minimal error handling
import * as admin from 'firebase-admin';
import { COLLECTIONS } from '@shared/firestore-schema';

// Create a simple Firebase Admin initialization
try {
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'demo-project'
    });
    console.log('Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Get Firestore database
const db = admin.firestore();

// Helper function to normalize a document
function normalizeDoc(doc: any) {
  if (!doc || !doc.exists) return null;
  
  const data = doc.data();
  
  // Convert Firebase timestamps to JavaScript dates
  if (data) {
    Object.keys(data).forEach(key => {
      if (data[key] && typeof data[key].toDate === 'function') {
        data[key] = data[key].toDate();
      }
    });
  }
  
  return {
    id: doc.id,
    ...data
  };
}

// Simple mock implementation for development
export const firestoreStorage = {
  // User methods
  async getUserByFirebaseUid(firebaseUid: string) {
    try {
      console.log(`Looking up user with Firebase UID: ${firebaseUid}`);
      
      // For testing, we'll create a mock user
      return {
        id: '1',
        firebaseUid,
        email: 'user@example.com',
        displayName: 'Test User',
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting user by Firebase UID:', error);
      return null;
    }
  },
  
  async createUser(userData: any) {
    try {
      console.log('Creating user:', userData);
      
      // Just return a mock user with the provided data
      return {
        id: '1',
        ...userData,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },
  
  async updateUser(userId: string, userData: any) {
    try {
      console.log(`Updating user ${userId}:`, userData);
      
      // Return mock updated user
      return {
        id: userId,
        firebaseUid: 'firebase-uid',
        email: 'user@example.com',
        ...userData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },
  
  // Table methods
  async getTables(userId: string) {
    try {
      console.log(`Getting tables for user ${userId}`);
      
      // Return mock tables
      return [
        {
          id: '1',
          userId,
          name: 'Sample Table 1',
          description: 'A sample table for testing',
          columns: [
            { id: 'col1', name: 'ID', type: 'text' },
            { id: 'col2', name: 'Name', type: 'text' },
            { id: 'col3', name: 'Age', type: 'number' }
          ],
          createdAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  },
  
  async getTable(userId: string, tableId: string) {
    try {
      console.log(`Getting table ${tableId} for user ${userId}`);
      
      // Return mock table
      return {
        id: tableId,
        userId,
        name: 'Sample Table',
        description: 'A sample table for testing',
        columns: [
          { id: 'col1', name: 'ID', type: 'text' },
          { id: 'col2', name: 'Name', type: 'text' },
          { id: 'col3', name: 'Age', type: 'number' }
        ],
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting table:', error);
      return null;
    }
  },
  
  async createTable(tableData: any) {
    try {
      console.log('Creating table:', tableData);
      
      // Return mock created table
      return {
        id: Date.now().toString(),
        ...tableData,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating table:', error);
      return null;
    }
  },
  
  async updateTable(userId: string, tableId: string, tableData: any) {
    try {
      console.log(`Updating table ${tableId} for user ${userId}:`, tableData);
      
      // Return mock updated table
      return {
        id: tableId,
        userId,
        ...tableData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating table:', error);
      return null;
    }
  },
  
  async deleteTable(userId: string, tableId: string) {
    try {
      console.log(`Deleting table ${tableId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting table:', error);
      return false;
    }
  },
  
  async getTableRows(tableId: string, limit = 100, offset = 0) {
    try {
      console.log(`Getting rows for table ${tableId} with limit ${limit} and offset ${offset}`);
      
      // Generate mock rows
      const rows = Array.from({ length: 5 }, (_, i) => ({
        id: `row-${i + 1}`,
        tableId,
        data: {
          col1: `ID-${i + 1}`,
          col2: `Name ${i + 1}`,
          col3: (25 + i)
        },
        createdAt: new Date()
      }));
      
      return { rows, total: 5 };
    } catch (error) {
      console.error('Error getting table rows:', error);
      return { rows: [], total: 0 };
    }
  },
  
  async createTableRow(rowData: any) {
    try {
      console.log('Creating table row:', rowData);
      
      // Return mock created row
      return {
        id: Date.now().toString(),
        ...rowData,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating table row:', error);
      return null;
    }
  },
  
  async updateTableRow(rowId: string, data: any) {
    try {
      console.log(`Updating row ${rowId} with data:`, data);
      
      // Return mock updated row
      return {
        id: rowId,
        data,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating table row:', error);
      return null;
    }
  },
  
  async deleteTableRow(rowId: string) {
    try {
      console.log(`Deleting row ${rowId}`);
      return true;
    } catch (error) {
      console.error('Error deleting table row:', error);
      return false;
    }
  },
  
  // Flow methods
  async getFlows(userId: string) {
    try {
      console.log(`Getting flows for user ${userId}`);
      
      // Return mock flows
      return [
        {
          id: '1',
          userId,
          name: 'Sample Flow 1',
          description: 'A sample flow for testing',
          nodes: [{ id: 'node1', type: 'http', position: { x: 100, y: 100 } }],
          edges: [],
          createdAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Error getting flows:', error);
      return [];
    }
  },
  
  async getFlow(userId: string, flowId: string) {
    try {
      console.log(`Getting flow ${flowId} for user ${userId}`);
      
      // Return mock flow
      return {
        id: flowId,
        userId,
        name: 'Sample Flow',
        description: 'A sample flow for testing',
        nodes: [{ id: 'node1', type: 'http', position: { x: 100, y: 100 } }],
        edges: [],
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting flow:', error);
      return null;
    }
  },
  
  async createFlow(flowData: any) {
    try {
      console.log('Creating flow:', flowData);
      
      // Return mock created flow
      return {
        id: Date.now().toString(),
        ...flowData,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating flow:', error);
      return null;
    }
  },
  
  async updateFlow(userId: string, flowId: string, flowData: any) {
    try {
      console.log(`Updating flow ${flowId} for user ${userId}:`, flowData);
      
      // Return mock updated flow
      return {
        id: flowId,
        userId,
        ...flowData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating flow:', error);
      return null;
    }
  },
  
  async deleteFlow(userId: string, flowId: string) {
    try {
      console.log(`Deleting flow ${flowId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting flow:', error);
      return false;
    }
  },
  
  // Connector methods
  async getConnectors(userId: string) {
    try {
      console.log(`Getting connectors for user ${userId}`);
      
      // Return mock connectors
      return [
        {
          id: '1',
          userId,
          name: 'Sample API',
          baseUrl: 'https://api.example.com',
          authType: 'none',
          createdAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Error getting connectors:', error);
      return [];
    }
  },
  
  async getConnector(userId: string, connectorId: string) {
    try {
      console.log(`Getting connector ${connectorId} for user ${userId}`);
      
      // Return mock connector
      return {
        id: connectorId,
        userId,
        name: 'Sample API',
        baseUrl: 'https://api.example.com',
        authType: 'none',
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error getting connector:', error);
      return null;
    }
  },
  
  async createConnector(connectorData: any) {
    try {
      console.log('Creating connector:', connectorData);
      
      // Return mock created connector
      return {
        id: Date.now().toString(),
        ...connectorData,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating connector:', error);
      return null;
    }
  },
  
  async updateConnector(userId: string, connectorId: string, connectorData: any) {
    try {
      console.log(`Updating connector ${connectorId} for user ${userId}:`, connectorData);
      
      // Return mock updated connector
      return {
        id: connectorId,
        userId,
        ...connectorData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating connector:', error);
      return null;
    }
  },
  
  async deleteConnector(userId: string, connectorId: string) {
    try {
      console.log(`Deleting connector ${connectorId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting connector:', error);
      return false;
    }
  },
  
  // Execution methods
  async createExecution(executionData: any) {
    try {
      console.log('Creating execution:', executionData);
      
      // Return mock created execution
      return {
        id: Date.now().toString(),
        ...executionData,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error creating execution:', error);
      return null;
    }
  },
  
  async updateExecution(executionId: string, executionData: any) {
    try {
      console.log(`Updating execution ${executionId}:`, executionData);
      
      // Return mock updated execution
      return {
        id: executionId,
        ...executionData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error updating execution:', error);
      return null;
    }
  },
  
  async getExecutions(userId: string, queryParams: any = {}) {
    try {
      console.log(`Getting executions for user ${userId} with params:`, queryParams);
      
      // Return mock executions
      return [
        {
          id: '1',
          userId,
          flowId: queryParams.flowId || '1',
          status: 'success',
          startedAt: new Date(Date.now() - 60000),
          finishedAt: new Date(),
          createdAt: new Date(Date.now() - 60000)
        }
      ];
    } catch (error) {
      console.error('Error getting executions:', error);
      return [];
    }
  },
  
  async getExecution(executionId: string) {
    try {
      console.log(`Getting execution ${executionId}`);
      
      // Return mock execution
      return {
        id: executionId,
        flowId: '1',
        userId: '1',
        status: 'success',
        startedAt: new Date(Date.now() - 60000),
        finishedAt: new Date(),
        createdAt: new Date(Date.now() - 60000)
      };
    } catch (error) {
      console.error('Error getting execution:', error);
      return null;
    }
  },
  
  async addExecutionLog(logData: any) {
    try {
      console.log('Adding execution log:', logData);
      
      // Return mock created log
      return {
        id: Date.now().toString(),
        ...logData,
        timestamp: logData.timestamp || new Date(),
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error adding execution log:', error);
      return null;
    }
  },
  
  async getExecutionLogs(executionId: string) {
    try {
      console.log(`Getting logs for execution ${executionId}`);
      
      // Return mock logs
      return [
        {
          id: '1',
          executionId,
          nodeId: 'node1',
          level: 'info',
          message: 'Execution started',
          timestamp: new Date(Date.now() - 60000),
          createdAt: new Date(Date.now() - 60000)
        },
        {
          id: '2',
          executionId,
          nodeId: 'node1',
          level: 'info',
          message: 'Execution completed',
          timestamp: new Date(),
          createdAt: new Date()
        }
      ];
    } catch (error) {
      console.error('Error getting execution logs:', error);
      return [];
    }
  }
};