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



// Data Tables (for table management feature)
export const dataTables = pgTable("data_tables", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  columns: jsonb("columns").notNull(), // column definitions as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Table Rows (actual data stored in the tables)
export const tableRows = pgTable("table_rows", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").references(() => dataTables.id).notNull(),
  data: jsonb("data").notNull(), // row data as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  connectors: many(connectors),
  dataTables: many(dataTables)
}));

export const connectorsRelations = relations(connectors, ({ one }) => ({
  user: one(users, {
    fields: [connectors.userId],
    references: [users.id]
  })
}));



export const dataTablesRelations = relations(dataTables, ({ one, many }) => ({
  user: one(users, {
    fields: [dataTables.userId],
    references: [users.id]
  }),
  rows: many(tableRows)
}));

export const tableRowsRelations = relations(tableRows, ({ one }) => ({
  table: one(dataTables, {
    fields: [tableRows.tableId],
    references: [dataTables.id]
  })
}));

// Validation Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email("Must provide a valid email")
});

export const insertConnectorSchema = createInsertSchema(connectors);
export const insertDataTableSchema = createInsertSchema(dataTables, {
  name: (schema) => schema.min(1, "Table name is required")
});
export const insertTableRowSchema = createInsertSchema(tableRows);

// Types
export type User = typeof users.$inferSelect;
export type Connector = typeof connectors.$inferSelect;
export type DataTable = typeof dataTables.$inferSelect;
export type TableRow = typeof tableRows.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertConnector = z.infer<typeof insertConnectorSchema>;
export type InsertDataTable = z.infer<typeof insertDataTableSchema>;
export type InsertTableRow = z.infer<typeof insertTableRowSchema>;

// Define a structure for column definition
export const columnTypeSchema = z.enum(['text', 'number', 'boolean', 'date', 'select']);

export const columnDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: columnTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select type
  default: z.any().optional()
});

export type ColumnDefinition = z.infer<typeof columnDefinitionSchema>;
export type ColumnType = z.infer<typeof columnTypeSchema>;
