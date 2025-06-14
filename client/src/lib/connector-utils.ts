import { updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

export interface ConnectorApiResponse {
  success: boolean;
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  tokenRefreshed: boolean;
  updatedAuth?: any;
}

export async function useConnectorApi(
  connector: any,
  userId: string,
  endpoint: string = '',
  method: string = 'GET',
  data: any = null
): Promise<ConnectorApiResponse> {
  try {
    const response = await fetch('/api/use-connector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        endpoint,
        method,
        data,
        connector // Pass the entire Firebase connector object
      })
    });

    const result = await response.json();

    // If token was refreshed, update Firebase with new auth data
    if (result.tokenRefreshed && result.updatedAuth && connector.id) {
      try {
        const connectorRef = doc(db, "users", userId, "connectors", connector.id);
        await updateDoc(connectorRef, {
          auth: result.updatedAuth,
          updatedAt: new Date()
        });
        console.log(`Updated Firebase with refreshed auth for connector ${connector.name}`);
      } catch (updateError) {
        console.error('Failed to update Firebase with refreshed auth:', updateError);
      }
    }

    return result;
  } catch (error) {
    console.error('Connector API call failed:', error);
    throw error;
  }
}

export async function testConnectorWithAutoRefresh(
  connector: any,
  userId: string
): Promise<{ success: boolean; message?: string; details?: any }> {
  try {
    const testResponse = await fetch('/api/test-connector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        connector
      })
    });

    const result = await testResponse.json();
    
    // Handle token refresh if needed
    if (result.tokenRefreshed && result.updatedAuth && connector.id) {
      try {
        const connectorRef = doc(db, "users", userId, "connectors", connector.id);
        await updateDoc(connectorRef, {
          auth: result.updatedAuth,
          updatedAt: new Date()
        });
      } catch (updateError) {
        console.error('Failed to update Firebase with refreshed auth:', updateError);
      }
    }

    return {
      success: result.success,
      message: result.message,
      details: result.details
    };
  } catch (error) {
    console.error('Connector test failed:', error);
    return {
      success: false,
      message: 'Connection test failed'
    };
  }
}

export async function refreshConnectorToken(
  connectorName: string,
  userId: string,
  auth: any
): Promise<{ success: boolean; updatedAuth?: any; message?: string }> {
  try {
    const response = await fetch('/api/oauth-refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connectorName,
        userId,
        auth
      })
    });

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        updatedAuth: result,
        message: result.message
      };
    }

    return {
      success: false,
      message: result.error || 'Token refresh failed'
    };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return {
      success: false,
      message: 'Network error during token refresh'
    };
  }
}

export function isTokenExpired(auth: any, bufferMinutes: number = 5): boolean {
  if (!auth?.tokenExpiresAt) return false;
  
  const expiryTime = new Date(auth.tokenExpiresAt).getTime();
  const currentTime = Date.now();
  const bufferTime = bufferMinutes * 60 * 1000;
  
  return (expiryTime - currentTime) <= bufferTime;
}

export function getTokenTimeRemaining(auth: any): string {
  if (!auth?.tokenExpiresAt) return 'Unknown';
  
  const expiryTime = new Date(auth.tokenExpiresAt).getTime();
  const currentTime = Date.now();
  const timeRemaining = expiryTime - currentTime;
  
  if (timeRemaining <= 0) return 'Expired';
  
  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}