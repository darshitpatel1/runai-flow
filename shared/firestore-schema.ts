import { z } from "zod";

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  CONNECTORS: 'connectors',
  FLOWS: 'flows',
  EXECUTIONS: 'executions',
  EXECUTION_LOGS: 'executionLogs',
  DATA_TABLES: 'dataTables',
  TABLE_ROWS: 'tableRows'
};

// Users schema
export const userSchema = z.object({
  id: z.string(), // Firestore document ID (same as Firebase auth UID)
  username: z.string().optional(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoUrl: z.string().optional(),
  createdAt: z.date()
});

// Connectors schema
export const connectorSchema = z.object({
  id: z.string(), // Firestore document ID
  userId: z.string().nonempty(), // Reference to user
  name: z.string().nonempty(),
  baseUrl: z.string().nonempty(),
  authType: z.string().default('none'), // 'none', 'basic', 'oauth2'
  authConfig: z.record(z.any()).optional(), // JSON for auth settings
  headers: z.record(z.any()).optional(), // default headers as JSON
  createdAt: z.date(),
  updatedAt: z.date()
});

// Flows schema
export const flowSchema = z.object({
  id: z.string(), // Firestore document ID
  userId: z.string().nonempty(), // Reference to user
  name: z.string().nonempty(),
  description: z.string().optional(),
  nodes: z.array(z.record(z.any())), // flow nodes configuration as array
  edges: z.array(z.record(z.any())), // flow edges configuration as array
  active: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Flow Executions schema
export const executionSchema = z.object({
  id: z.string(), // Firestore document ID
  flowId: z.string().nonempty(), // Reference to flow
  userId: z.string().nonempty(), // Reference to user
  status: z.string().nonempty(), // 'success', 'failed', 'running'
  startedAt: z.date(),
  finishedAt: z.date().optional(),
  duration: z.number().optional(), // in milliseconds
  logs: z.array(z.record(z.any())).optional(), // execution logs as array
  input: z.record(z.any()).optional(), // input payload
  output: z.record(z.any()).optional() // output result
});

// Execution Logs schema
export const executionLogSchema = z.object({
  id: z.string(), // Firestore document ID
  executionId: z.string().nonempty(), // Reference to execution
  timestamp: z.date(),
  nodeId: z.string().optional(),
  level: z.string().nonempty(), // 'info', 'warn', 'error'
  message: z.string().nonempty(),
  data: z.record(z.any()).optional() // additional log data
});

// Data Tables schema (for table management feature)
export const dataTableSchema = z.object({
  id: z.string(), // Firestore document ID
  userId: z.string().nonempty(), // Reference to user
  name: z.string().nonempty(),
  description: z.string().optional(),
  columns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(), // 'text', 'number', 'boolean', 'date', 'select'
    options: z.array(z.string()).optional() // for select type
  })),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Table Rows schema (actual data stored in the tables)
export const tableRowSchema = z.object({
  id: z.string(), // Firestore document ID
  tableId: z.string().nonempty(), // Reference to data table
  data: z.record(z.any()), // row data as object
  createdAt: z.date(),
  updatedAt: z.date()
});

// Types derived from schemas
export type User = z.infer<typeof userSchema>;
export type Connector = z.infer<typeof connectorSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type Execution = z.infer<typeof executionSchema>;
export type ExecutionLog = z.infer<typeof executionLogSchema>;
export type DataTable = z.infer<typeof dataTableSchema>;
export type TableRow = z.infer<typeof tableRowSchema>;

// Column type enum
export const columnTypeSchema = z.enum(['text', 'number', 'boolean', 'date', 'select']);
export type ColumnType = z.infer<typeof columnTypeSchema>;

// Column definition
export const columnDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: columnTypeSchema,
  options: z.array(z.string()).optional()
});
export type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;