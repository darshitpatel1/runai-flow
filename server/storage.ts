import { db } from '@db';
import { users, connectors, dataTables, tableRows, folders } from '@shared/schema';
import { eq, and, desc } from "drizzle-orm";

export const storage = {
  // Table operations
  async getTables(userId: number) {
    return await db.query.dataTables.findMany({
      where: eq(dataTables.userId, userId),
      orderBy: [desc(dataTables.updatedAt)]
    });
  },
  
  async getTable(userId: number, tableId: number) {
    return await db.query.dataTables.findFirst({
      where: and(
        eq(dataTables.userId, userId),
        eq(dataTables.id, tableId)
      )
    });
  },
  
  async createTable(tableData: {
    userId: number;
    name: string;
    description?: string;
    columns: any;
  }) {
    const [newTable] = await db.insert(dataTables).values({
      userId: tableData.userId,
      name: tableData.name,
      description: tableData.description,
      columns: tableData.columns,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return newTable;
  },
  
  async updateTable(userId: number, tableId: number, tableData: Partial<{
    name: string;
    description: string;
    columns: any;
    folderId: number | null;
  }>) {
    const [updatedTable] = await db.update(dataTables)
      .set({
        ...tableData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(dataTables.id, tableId),
          eq(dataTables.userId, userId)
        )
      )
      .returning();
    
    return updatedTable;
  },
  
  async deleteTable(userId: number, tableId: number) {
    // Delete all rows first (cascade is not automatic)
    await db.delete(tableRows)
      .where(eq(tableRows.tableId, tableId));
      
    // Then delete the table
    return await db.delete(dataTables)
      .where(
        and(
          eq(dataTables.id, tableId),
          eq(dataTables.userId, userId)
        )
      )
      .returning();
  },
  
  async getTableRows(tableId: number, limit: number = 100, offset: number = 0) {
    return await db.query.tableRows.findMany({
      where: eq(tableRows.tableId, tableId),
      orderBy: [desc(tableRows.updatedAt)],
      limit,
      offset
    });
  },
  
  async createTableRow(rowData: {
    tableId: number;
    data: any;
  }) {
    const [newRow] = await db.insert(tableRows).values({
      tableId: rowData.tableId,
      data: rowData.data,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return newRow;
  },
  
  async updateTableRow(rowId: number, data: any) {
    const [updatedRow] = await db.update(tableRows)
      .set({
        data,
        updatedAt: new Date()
      })
      .where(eq(tableRows.id, rowId))
      .returning();
    
    return updatedRow;
  },
  
  async deleteTableRow(rowId: number) {
    return await db.delete(tableRows)
      .where(eq(tableRows.id, rowId))
      .returning();
  },
  
  // User operations
  async getUserByFirebaseUid(firebaseUid: string) {
    return await db.query.users.findFirst({
      where: eq(users.firebaseUid, firebaseUid)
    });
  },
  
  async createUser(userData: { firebaseUid: string; email: string; displayName?: string; photoUrl?: string }) {
    const [user] = await db.insert(users).values({
      firebaseUid: userData.firebaseUid,
      email: userData.email,
      displayName: userData.displayName,
      photoUrl: userData.photoUrl,
    }).returning();
    
    return user;
  },
  
  async updateUser(userId: number, userData: Partial<{ email: string; displayName: string; photoUrl: string }>) {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  },

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email)
    });
  },

  async updateUserFirebaseUid(userId: number, firebaseUid: string) {
    const [updatedUser] = await db.update(users)
      .set({ firebaseUid })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  },
  
  // Connector operations
  async getConnectors(userId: number) {
    return await db.query.connectors.findMany({
      where: eq(connectors.userId, userId),
      orderBy: desc(connectors.createdAt)
    });
  },
  
  async getConnector(userId: number, connectorId: number) {
    return await db.query.connectors.findFirst({
      where: and(
        eq(connectors.userId, userId),
        eq(connectors.id, connectorId)
      )
    });
  },
  
  async createConnector(connectorData: {
    userId: number;
    name: string;
    baseUrl: string;
    authType: string;
    authConfig?: any;
    headers?: any;
  }) {
    const [connector] = await db.insert(connectors).values({
      userId: connectorData.userId,
      name: connectorData.name,
      baseUrl: connectorData.baseUrl,
      authType: connectorData.authType,
      authConfig: connectorData.authConfig,
      headers: connectorData.headers
    }).returning();
    
    return connector;
  },
  
  async updateConnector(userId: number, connectorId: number, connectorData: Partial<{
    name: string;
    baseUrl: string;
    authType: string;
    authConfig: any;
    headers: any;
  }>) {
    const [updatedConnector] = await db.update(connectors)
      .set({ 
        ...connectorData, 
        updatedAt: new Date()
      })
      .where(and(
        eq(connectors.userId, userId),
        eq(connectors.id, connectorId)
      ))
      .returning();
    
    return updatedConnector;
  },
  
  async deleteConnector(userId: number, connectorId: number) {
    return await db.delete(connectors)
      .where(and(
        eq(connectors.userId, userId),
        eq(connectors.id, connectorId)
      ))
      .returning();
  },

  // Folder operations
  async getFolders(userId: number) {
    return await db.query.folders.findMany({
      where: and(
        eq(folders.userId, userId),
        eq(folders.type, 'table')
      ),
      orderBy: [desc(folders.createdAt)],
      with: {
        tables: true
      }
    });
  },

  async createFolder(folderData: {
    userId: number;
    name: string;
    type?: string;
  }) {
    const [newFolder] = await db.insert(folders).values({
      userId: folderData.userId,
      name: folderData.name,
      type: folderData.type || 'table',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return newFolder;
  },

  async updateFolder(userId: number, folderId: number, folderData: Partial<{
    name: string;
  }>) {
    const [updatedFolder] = await db.update(folders)
      .set({
        ...folderData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(folders.id, folderId),
          eq(folders.userId, userId)
        )
      )
      .returning();
    
    return updatedFolder;
  },

  async deleteFolder(userId: number, folderId: number) {
    // First, remove folderId from any tables in this folder
    await db.update(dataTables)
      .set({ folderId: null })
      .where(eq(dataTables.folderId, folderId));
      
    // Then delete the folder
    return await db.delete(folders)
      .where(
        and(
          eq(folders.id, folderId),
          eq(folders.userId, userId)
        )
      )
      .returning();
  },

};
