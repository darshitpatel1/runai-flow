import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  username: text("username"),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Connectors Table
export const connectors = pgTable("connectors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  authType: text("auth_type").default("none").notNull(), // 'none', 'basic', 'oauth2'
  authConfig: jsonb("auth_config"), // JSON for auth settings
  headers: jsonb("headers"), // default headers as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Flows Table
export const flows = pgTable("flows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  nodes: jsonb("nodes").notNull(), // flow nodes configuration as JSON
  edges: jsonb("edges").notNull(), // flow edges configuration as JSON
  active: boolean("active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Flow Executions Table
export const executions = pgTable("executions", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").references(() => flows.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull(), // 'success', 'failed', 'running'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  duration: integer("duration"), // in milliseconds
  logs: jsonb("logs"), // execution logs as JSON
  input: jsonb("input"), // input payload
  output: jsonb("output") // output result
});

// Execution Logs Table (for detailed logging)
export const executionLogs = pgTable("execution_logs", {
  id: serial("id").primaryKey(),
  executionId: integer("execution_id").references(() => executions.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  nodeId: text("node_id"),
  level: text("level").notNull(), // 'info', 'warn', 'error'
  message: text("message").notNull(),
  data: jsonb("data") // additional log data as JSON
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  connectors: many(connectors),
  flows: many(flows),
  executions: many(executions)
}));

export const connectorsRelations = relations(connectors, ({ one }) => ({
  user: one(users, {
    fields: [connectors.userId],
    references: [users.id]
  })
}));

export const flowsRelations = relations(flows, ({ one, many }) => ({
  user: one(users, {
    fields: [flows.userId],
    references: [users.id]
  }),
  executions: many(executions)
}));

export const executionsRelations = relations(executions, ({ one, many }) => ({
  flow: one(flows, {
    fields: [executions.flowId],
    references: [flows.id]
  }),
  user: one(users, {
    fields: [executions.userId],
    references: [users.id]
  }),
  logs: many(executionLogs)
}));

export const executionLogsRelations = relations(executionLogs, ({ one }) => ({
  execution: one(executions, {
    fields: [executionLogs.executionId],
    references: [executions.id]
  })
}));

// Validation Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email("Must provide a valid email")
});

export const insertConnectorSchema = createInsertSchema(connectors);
export const insertFlowSchema = createInsertSchema(flows);
export const insertExecutionSchema = createInsertSchema(executions);
export const insertExecutionLogSchema = createInsertSchema(executionLogs);

// Types
export type User = typeof users.$inferSelect;
export type Connector = typeof connectors.$inferSelect;
export type Flow = typeof flows.$inferSelect;
export type Execution = typeof executions.$inferSelect;
export type ExecutionLog = typeof executionLogs.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertConnector = z.infer<typeof insertConnectorSchema>;
export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type InsertExecutionLog = z.infer<typeof insertExecutionLogSchema>;
