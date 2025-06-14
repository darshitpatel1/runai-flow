import { storage } from "./storage";
import { firebaseSync } from "./firebase-sync";

interface TokenRefreshService {
  start(): void;
  stop(): void;
  refreshExpiredTokens(): Promise<void>;
}

class AutoTokenRefreshService implements TokenRefreshService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  private readonly REFRESH_BUFFER = 10 * 60 * 1000; // Refresh 10 minutes before expiry
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      console.log('Token refresh service is already running');
      return;
    }

    console.log('Starting automatic token refresh service...');
    this.isRunning = true;
    
    // Run immediately on start
    this.refreshExpiredTokens().catch(console.error);
    
    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.refreshExpiredTokens().catch(console.error);
    }, this.CHECK_INTERVAL);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Token refresh service stopped');
  }

  async refreshExpiredTokens(): Promise<void> {
    try {
      console.log('Checking for tokens that need refresh...');
      
      // Check Firebase connectors that need refresh
      const firebaseConnectors = await firebaseSync.getOAuthConnectorsNeedingRefresh();
      
      for (const { userId, connectorName, auth } of firebaseConnectors) {
        try {
          console.log(`Refreshing token for Firebase connector: ${connectorName} (user: ${userId})`);
          await this.refreshFirebaseConnectorToken(userId, connectorName, auth);
        } catch (error) {
          console.error(`Error refreshing Firebase connector ${connectorName}:`, error);
        }
      }
      
      // Also check PostgreSQL connectors
      const users = await this.getAllUsers();
      for (const user of users) {
        try {
          const connectors = await storage.getConnectors(user.id);
          
          for (const connector of connectors) {
            await this.checkAndRefreshConnectorToken(user.id, connector);
          }
        } catch (error) {
          console.error(`Error processing PostgreSQL connectors for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in token refresh service:', error);
    }
  }

  private async getAllUsers(): Promise<Array<{ id: number }>> {
    try {
      const { db } = await import('../db');
      const { users } = await import('../shared/schema');
      
      const allUsers = await db.select({ id: users.id }).from(users);
      return allUsers;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  private async checkAndRefreshConnectorToken(userId: number, connector: any): Promise<void> {
    const { id: connectorId, authType, authConfig } = connector;
    
    if (authType !== 'oauth2' || !authConfig) {
      return;
    }

    const auth = authConfig as any;
    
    if (!auth.accessToken || !auth.refreshToken) {
      return;
    }

    if (this.shouldRefreshToken(auth)) {
      console.log(`Refreshing token for connector ${connectorId} (user ${userId})`);
      
      try {
        await this.refreshConnectorToken(userId, connectorId, auth);
        console.log(`Successfully refreshed token for connector ${connectorId}`);
      } catch (error) {
        console.error(`Failed to refresh token for connector ${connectorId}:`, error);
        await this.markConnectorForReauth(userId, connectorId);
      }
    }
  }

  private shouldRefreshToken(auth: any): boolean {
    if (!auth.tokenExpiresAt) {
      return false;
    }

    const expiryTime = new Date(auth.tokenExpiresAt).getTime();
    const currentTime = Date.now();
    const bufferTime = this.REFRESH_BUFFER;

    return (expiryTime - currentTime) <= bufferTime;
  }

  private async refreshConnectorToken(userId: number, connectorId: number, auth: any): Promise<void> {
    if (!auth.tokenUrl || !auth.refreshToken) {
      throw new Error('Missing token URL or refresh token');
    }

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
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      throw new Error('No access token received from refresh');
    }

    const updatedAuth = {
      ...auth,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || auth.refreshToken,
      tokenExpiresAt: tokenData.expires_in ? 
        new Date(Date.now() + (tokenData.expires_in * 1000)) : null,
      lastRefreshed: new Date(),
      needsReauth: false
    };

    await storage.updateConnector(userId, connectorId, {
      authConfig: updatedAuth
    });
  }

  private async markConnectorForReauth(userId: number, connectorId: number): Promise<void> {
    try {
      const connector = await storage.getConnector(userId, connectorId);
      if (connector && connector.authConfig) {
        const updatedAuth = {
          ...connector.authConfig,
          needsReauth: true,
          lastRefreshError: new Date()
        };

        await storage.updateConnector(userId, connectorId, {
          authConfig: updatedAuth
        });
      }
    } catch (error) {
      console.error(`Failed to mark connector ${connectorId} for reauth:`, error);
    }
  }

  async refreshSpecificConnector(userId: number, connectorId: number): Promise<boolean> {
    try {
      const connector = await storage.getConnector(userId, connectorId);
      if (!connector) {
        throw new Error('Connector not found');
      }

      await this.checkAndRefreshConnectorToken(userId, connector);
      return true;
    } catch (error) {
      console.error(`Manual refresh failed for connector ${connectorId}:`, error);
      return false;
    }
  }

  async refreshFirebaseConnectorToken(userId: string, connectorName: string, auth: any): Promise<void> {
    if (!auth.tokenUrl || !auth.refreshToken) {
      throw new Error('Missing token URL or refresh token');
    }

    console.log(`Attempting to refresh token for ${connectorName} with refresh token: ${auth.refreshToken.substring(0, 10)}...`);

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
      console.error(`Token refresh failed for ${connectorName}:`, errorText);
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    console.log(`Token refresh response for ${connectorName}:`, {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    if (!tokenData.access_token) {
      throw new Error('No access token received from refresh');
    }

    const updatedAuth = {
      ...auth,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || auth.refreshToken,
      tokenExpiresAt: tokenData.expires_in ? 
        new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString() : auth.tokenExpiresAt,
      lastRefreshed: new Date().toISOString(),
      lastAuthenticated: new Date().toISOString()
    };

    const { firebaseSync } = await import('./firebase-sync');
    await firebaseSync.syncConnectorFromPostgres(userId, connectorName, updatedAuth);
    
    console.log(`Successfully refreshed token for ${connectorName}, new expiry: ${updatedAuth.tokenExpiresAt}`);
  }
}

export const tokenRefreshService = new AutoTokenRefreshService();

export async function ensureValidToken(userId: number, connectorId: number): Promise<boolean> {
  try {
    const connector = await storage.getConnector(userId, connectorId);
    if (!connector || connector.authType !== 'oauth2') {
      return true;
    }

    const auth = connector.authConfig as any;
    if (!auth?.accessToken) {
      return false;
    }

    if (auth.tokenExpiresAt) {
      const expiryTime = new Date(auth.tokenExpiresAt).getTime();
      const currentTime = Date.now();
      const bufferTime = 60 * 1000; // 1 minute buffer

      if ((expiryTime - currentTime) <= bufferTime) {
        return await tokenRefreshService.refreshSpecificConnector(userId, connectorId);
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring valid token:', error);
    return false;
  }
}

export async function getValidAccessToken(userId: number, connectorId: number): Promise<string | null> {
  const isValid = await ensureValidToken(userId, connectorId);
  if (!isValid) {
    return null;
  }

  const connector = await storage.getConnector(userId, connectorId);
  const auth = connector?.authConfig as any;
  return auth?.accessToken || null;
}