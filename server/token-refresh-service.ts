import { storage } from "./storage";

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
      
      // Get all users to check their connectors
      const users = await this.getAllUsers();
      
      for (const user of users) {
        try {
          const connectors = await storage.getConnectors(user.id);
          
          for (const connector of connectors) {
            await this.checkAndRefreshConnectorToken(user.id, connector);
          }
        } catch (error) {
          console.error(`Error processing connectors for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in token refresh service:', error);
    }
  }

  private async getAllUsers(): Promise<Array<{ id: number }>> {
    // This is a simplified approach - in production you might want to optimize this
    // by maintaining a separate table of users with OAuth connectors
    try {
      // Since we don't have a direct getAllUsers method, we'll work with what we have
      // For now, we'll return an empty array and log that we need this functionality
      console.log('Note: getAllUsers not implemented, token refresh will work reactively only');
      return [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  private async checkAndRefreshConnectorToken(userId: number, connector: any): Promise<void> {
    const { id: connectorId, authType, authConfig } = connector;
    
    if (authType !== 'oauth2' || !authConfig) {
      return; // Skip non-OAuth connectors
    }

    const auth = authConfig as any;
    
    if (!auth.accessToken || !auth.refreshToken) {
      return; // Skip connectors without tokens
    }

    // Check if token needs refresh
    if (this.shouldRefreshToken(auth)) {
      console.log(`Refreshing token for connector ${connectorId} (user ${userId})`);
      
      try {
        await this.refreshConnectorToken(userId, connectorId, auth);
        console.log(`Successfully refreshed token for connector ${connectorId}`);
      } catch (error) {
        console.error(`Failed to refresh token for connector ${connectorId}:`, error);
        
        // Mark connector as needing re-authentication
        await this.markConnectorForReauth(userId, connectorId);
      }
    }
  }

  private shouldRefreshToken(auth: any): boolean {
    if (!auth.tokenExpiresAt) {
      return false; // No expiry info, can't determine
    }

    const expiryTime = new Date(auth.tokenExpiresAt).getTime();
    const currentTime = Date.now();
    const bufferTime = this.REFRESH_BUFFER;

    // Refresh if token expires within the buffer time
    return (expiryTime - currentTime) <= bufferTime;
  }

  private async refreshConnectorToken(userId: number, connectorId: number, auth: any): Promise<void> {
    if (!auth.tokenUrl || !auth.refreshToken) {
      throw new Error('Missing token URL or refresh token');
    }

    // Prepare the token refresh request
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
      client_id: auth.clientId
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    // Add client authentication
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

    // Update the connector with new tokens
    const updatedAuth = {
      ...auth,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || auth.refreshToken,
      tokenExpiresAt: tokenData.expires_in ? 
        new Date(Date.now() + (tokenData.expires_in * 1000)) : null,
      lastRefreshed: new Date(),
      needsReauth: false // Clear any previous reauth flag
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

  // Public method to manually refresh a specific connector
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
}

// Export singleton instance
export const tokenRefreshService = new AutoTokenRefreshService();

// Enhanced token refresh utility functions
export async function ensureValidToken(userId: number, connectorId: number): Promise<boolean> {
  try {
    const connector = await storage.getConnector(userId, connectorId);
    if (!connector || connector.authType !== 'oauth2') {
      return true; // Non-OAuth connectors don't need token refresh
    }

    const auth = connector.authConfig as any;
    if (!auth?.accessToken) {
      return false; // No token available
    }

    // Check if token is expired or will expire soon
    if (auth.tokenExpiresAt) {
      const expiryTime = new Date(auth.tokenExpiresAt).getTime();
      const currentTime = Date.now();
      const bufferTime = 60 * 1000; // 1 minute buffer for immediate use

      if ((expiryTime - currentTime) <= bufferTime) {
        // Token is expired or will expire soon, try to refresh
        return await tokenRefreshService.refreshSpecificConnector(userId, connectorId);
      }
    }

    return true; // Token is valid
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