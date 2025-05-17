// Firestore schema and collections definitions
import { z } from 'zod';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  FLOWS: 'flows',
  TABLES: 'tables',
  TABLE_ROWS: 'table_rows',
  DATA_TABLES: 'data_tables', // Added this as it seems to be referenced in client code
  CONNECTORS: 'connectors',
  EXECUTIONS: 'executions',
  EXECUTION_LOGS: 'execution_logs'
};

// Schema definitions
export const userSchema = z.object({
  id: z.string().optional(),
  firebaseUid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoUrl: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const columnDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'date', 'object', 'array']),
  required: z.boolean().default(false),
  defaultValue: z.any().optional()
});

export const dataTableSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  columns: z.array(columnDefinitionSchema),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const tableRowSchema = z.object({
  id: z.string().optional(),
  tableId: z.string(),
  data: z.record(z.any()),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const connectorSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string(),
  type: z.string(),
  config: z.record(z.any()),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const flowSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const executionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  flowId: z.string(),
  status: z.enum(['queued', 'running', 'success', 'error', 'cancelled']),
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const executionLogSchema = z.object({
  id: z.string().optional(),
  executionId: z.string(),
  nodeId: z.string(),
  level: z.enum(['debug', 'info', 'warning', 'error']),
  message: z.string(),
  timestamp: z.date(),
  data: z.any().optional(),
  createdAt: z.date().optional()
});

// Types
export type User = z.infer<typeof userSchema>;
export type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;
export type DataTable = z.infer<typeof dataTableSchema>;
export type TableRow = z.infer<typeof tableRowSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type Execution = z.infer<typeof executionSchema>;
export type ExecutionLog = z.infer<typeof executionLogSchema>;