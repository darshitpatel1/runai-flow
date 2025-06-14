import { apiRequest } from './queryClient';

export interface TokenStatus {
  authType: string;
  status: 'valid' | 'expired' | 'expiring_soon' | 'no_token' | 'not_applicable';
  message: string;
  expiresIn?: number;
  expiresAt?: string;
  lastRefreshed?: string;
  hasRefreshToken?: boolean;
  needsReauth?: boolean;
}

export async function checkTokenStatus(connectorId: number, userId: string): Promise<TokenStatus> {
  try {
    const response = await fetch(`/api/connectors/${connectorId}/token-status?userId=${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to check token status:', error);
    throw error;
  }
}

export async function refreshConnectorToken(connectorId: number, userId: string): Promise<boolean> {
  try {
    const response = await apiRequest('/api/oauth-refresh', {
      method: 'POST',
      data: {
        connectorId,
        userId
      }
    });
    return response.success === true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return false;
  }
}

export function getTokenStatusBadge(status: TokenStatus['status']): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  text: string;
} {
  switch (status) {
    case 'valid':
      return { variant: 'default', text: 'Connected' };
    case 'expiring_soon':
      return { variant: 'secondary', text: 'Expires Soon' };
    case 'expired':
      return { variant: 'destructive', text: 'Expired' };
    case 'no_token':
      return { variant: 'destructive', text: 'Not Authenticated' };
    case 'not_applicable':
      return { variant: 'outline', text: 'Non-OAuth' };
    default:
      return { variant: 'outline', text: 'Unknown' };
  }
}

export function formatTimeUntilExpiry(expiresIn: number): string {
  if (expiresIn <= 0) return 'Expired';
  
  const hours = Math.floor(expiresIn / 3600);
  const minutes = Math.floor((expiresIn % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function shouldShowRefreshButton(status: TokenStatus): boolean {
  return status.authType === 'oauth2' && 
         status.hasRefreshToken === true && 
         (status.status === 'expired' || status.status === 'expiring_soon');
}

export function shouldShowReauthButton(status: TokenStatus): boolean {
  return status.authType === 'oauth2' && 
         (status.needsReauth === true || 
          (status.status === 'expired' && !status.hasRefreshToken) ||
          status.status === 'no_token');
}