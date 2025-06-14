import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkTokenStatus, refreshConnectorToken, type TokenStatus } from '@/lib/token-utils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';

export function useTokenStatus(connectorId: number, enabled: boolean = true) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['token-status', connectorId, user?.uid],
    queryFn: () => checkTokenStatus(connectorId, user!.uid),
    enabled: enabled && !!user?.uid && !!connectorId,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });
}

export function useTokenRefresh() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectorId }: { connectorId: number }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return refreshConnectorToken(connectorId, user.uid);
    },
    onSuccess: (success, { connectorId }) => {
      if (success) {
        toast({
          title: "Token Refreshed",
          description: "Connector authentication has been renewed successfully.",
        });
        
        // Invalidate and refetch token status
        queryClient.invalidateQueries({
          queryKey: ['token-status', connectorId]
        });
        
        // Also invalidate connector list to update any status indicators
        queryClient.invalidateQueries({
          queryKey: ['connectors']
        });
      } else {
        toast({
          title: "Refresh Failed",
          description: "Unable to refresh the authentication token. Re-authentication may be required.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Token refresh error:', error);
      toast({
        title: "Refresh Error",
        description: "An error occurred while refreshing the token.",
        variant: "destructive",
      });
    }
  });
}

export function useAutoTokenRefresh(connectorId: number, tokenStatus?: TokenStatus) {
  const refreshMutation = useTokenRefresh();
  
  // Automatically refresh tokens that are about to expire
  useEffect(() => {
    if (!tokenStatus || tokenStatus.authType !== 'oauth2') return;
    
    if (tokenStatus.status === 'expiring_soon' && tokenStatus.hasRefreshToken) {
      // Auto-refresh tokens that expire in less than 5 minutes
      if (tokenStatus.expiresIn && tokenStatus.expiresIn < 5 * 60) {
        console.log(`Auto-refreshing token for connector ${connectorId} (expires in ${tokenStatus.expiresIn}s)`);
        refreshMutation.mutate({ connectorId });
      }
    }
  }, [tokenStatus, connectorId, refreshMutation]);
  
  return refreshMutation;
}