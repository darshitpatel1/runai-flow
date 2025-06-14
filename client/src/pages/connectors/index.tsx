import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConnectorForm } from "@/components/connectors/ConnectorForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusIcon, Loader2Icon, TrashIcon, PencilIcon, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Connectors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [connectors, setConnectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConnector, setEditingConnector] = useState<any>(null);
  const [testingConnections, setTestingConnections] = useState<Record<string, boolean>>({});
  const [connectionResults, setConnectionResults] = useState<Record<string, boolean>>({});
  // Keep track of which connector is associated with which state parameter
  const [authStates, setAuthStates] = useState<Record<string, string>>({});
  // Store connection status persistently
  const [persistentConnections, setPersistentConnections] = useState<Record<string, boolean>>({});
  
  // Get edit parameter from URL - use useMemo to ensure it updates when location changes
  const editId = useMemo(() => {
    console.log('=== URL DEBUG ===');
    console.log('Full location:', location);
    console.log('URL includes ?:', location.includes('?'));
    
    if (!location.includes('?')) {
      console.log('No query parameters found');
      return null;
    }
    
    const urlParts = location.split('?');
    console.log('URL split result:', urlParts);
    
    const queryString = urlParts[1];
    console.log('Query string:', queryString);
    
    const params = new URLSearchParams(queryString);
    const id = params.get('edit');
    console.log('Edit ID extracted:', id);
    console.log('All params:', Object.fromEntries(params.entries()));
    console.log('================');
    
    return id;
  }, [location]);
  
  useEffect(() => {
    const fetchConnectors = async () => {
      if (!user) return;
      
      try {
        const connectorsRef = collection(db, "users", user.uid, "connectors");
        const snapshot = await getDocs(connectorsRef);
        const connectorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConnectors(connectorsData);
      } catch (error: any) {
        toast({
          title: "Error loading connectors",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnectors();
  }, [user, toast]);

  // Separate useEffect to handle edit dialog opening when URL changes
  useEffect(() => {
    if (editId && connectors.length > 0) {
      console.log('Edit ID found in URL:', editId);
      const connectorToEdit = connectors.find(connector => connector.id === editId);
      if (connectorToEdit) {
        console.log('Found connector to edit:', connectorToEdit);
        setEditingConnector(connectorToEdit);
        setOpenDialog(true);
      } else {
        console.log('Connector not found in data:', connectors);
      }
    }
  }, [editId, connectors]);
  
  const handleCreateConnector = async (connectorData: any) => {
    if (!user) return;
    
    try {
      const connectorsRef = collection(db, "users", user.uid, "connectors");
      const docRef = await addDoc(connectorsRef, {
        ...connectorData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const newConnector = {
        id: docRef.id,
        ...connectorData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setConnectors([...connectors, newConnector]);
      setOpenDialog(false);
      
      toast({
        title: "Connector created",
        description: `Successfully created connector: ${connectorData.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating connector",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleUpdateConnector = async (connectorData: any) => {
    if (!user || !editingConnector) return;
    
    try {
      const connectorRef = doc(db, "users", user.uid, "connectors", editingConnector.id);
      await updateDoc(connectorRef, {
        ...connectorData,
        updatedAt: new Date()
      });
      
      setConnectors(connectors.map(c => 
        c.id === editingConnector.id 
          ? { ...c, ...connectorData, updatedAt: new Date() } 
          : c
      ));
      
      setOpenDialog(false);
      setEditingConnector(null);
      
      // Remove edit parameter from URL
      setLocation("/connectors");
      
      toast({
        title: "Connector updated",
        description: `Successfully updated connector: ${connectorData.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating connector",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteConnector = async (connectorId: string) => {
    if (!user) return;
    
    try {
      const connectorRef = doc(db, "users", user.uid, "connectors", connectorId);
      await deleteDoc(connectorRef);
      
      setConnectors(connectors.filter(c => c.id !== connectorId));
      
      toast({
        title: "Connector deleted",
        description: "Successfully deleted the connector",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting connector",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const openEditDialog = (connector: any) => {
    setEditingConnector(connector);
    setOpenDialog(true);
    // Update URL to include edit parameter
    setLocation(`/connectors?edit=${connector.id}`);
  };
  
  const closeDialog = () => {
    setOpenDialog(false);
    setEditingConnector(null);
    
    // Always remove edit parameter from URL when closing dialog
    setLocation("/connectors");
  };
  
  const testConnectorConnection = async (connectorId: string) => {
    if (!user) return;
    
    try {
      // Set loading state for this connector
      setTestingConnections(prev => ({ ...prev, [connectorId]: true }));
      
      // Find the connector
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        throw new Error("Connector not found");
      }
      
      // For OAuth connectors with expired tokens, try to refresh first
      let connectorToTest = connector;
      if (connector.authType === 'oauth2' && connector.auth?.tokenExpiresAt) {
        const expiryTime = new Date(connector.auth.tokenExpiresAt).getTime();
        const currentTime = Date.now();
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
        
        if ((expiryTime - currentTime) <= bufferTime && connector.auth.refreshToken) {
          console.log(`Token expired for ${connector.name}, refreshing before test...`);
          
          try {
            const refreshResponse = await fetch('/api/oauth-refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                connectorName: connector.name,
                userId: user.uid,
                auth: connector.auth
              })
            });

            const refreshData = await refreshResponse.json();
            
            if (refreshData.success) {
              // Update the connector with new auth data
              const updatedAuth = {
                ...connector.auth,
                accessToken: refreshData.accessToken || connector.auth.accessToken,
                tokenExpiresAt: refreshData.tokenExpiresAt,
                lastRefreshed: refreshData.lastRefreshed
              };
              
              connectorToTest = { ...connector, auth: updatedAuth };
              
              // Update Firebase with the new tokens
              const connectorRef = doc(db, "users", user.uid, "connectors", connectorId);
              await updateDoc(connectorRef, {
                auth: updatedAuth,
                updatedAt: new Date()
              });
              
              // Update local state
              setConnectors(prev => prev.map(c => 
                c.id === connectorId ? connectorToTest : c
              ));
              
              console.log(`Successfully refreshed token for ${connector.name}`);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
      }

      // Send the request to the server which will make the actual API call
      const response = await fetch('/api/test-connector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connector: connectorToTest
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to connect");
      }
      
      // Check if OAuth2 authorization is required - specifically for auth code flow
      if (data.authRequired && data.authType === 'oauth2' && 
          connector.auth && connector.auth.oauth2Type === 'authorization_code') {
        
        // Store the state parameter and associate it with this connector ID
        if (data.state) {
          setAuthStates(prev => ({ ...prev, [data.state]: connectorId }));
        }
        
        // Open the authorization URL in a new window
        const authWindow = window.open(data.authUrl, '_blank', 'width=800,height=600');
        
        if (!authWindow) {
          throw new Error("Please allow popups to complete OAuth authorization");
        }
        
        // Listen for the callback message from the OAuth window
        const handleOAuthCallback = (event: MessageEvent) => {
          // Validate the message source and format
          if (event.data && event.data.type === 'oauth-callback') {
            // Remove the event listener
            window.removeEventListener('message', handleOAuthCallback);
            
            // Determine which connector this callback is for
            let targetConnectorId = connectorId;
            
            // If we have a state parameter, use it to look up the connector ID
            if (event.data.state && authStates[event.data.state]) {
              targetConnectorId = authStates[event.data.state];
              
              // Clean up the auth state
              setAuthStates(prev => {
                const newState = { ...prev };
                delete newState[event.data.state];
                return newState;
              });
            }
            
            if (event.data.success && event.data.code) {
              // Exchange authorization code for access token automatically
              (async () => {
                try {
                  const exchangeResponse = await fetch('/api/oauth-exchange', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      code: event.data.code,
                      connectorId: targetConnectorId,
                      userId: user?.uid,
                      connectorConfig: connectors.find(c => c.id === targetConnectorId)
                    })
                  });

                  const exchangeData = await exchangeResponse.json();

                  if (exchangeResponse.ok && exchangeData.success) {
                    // Update UI to show successful connection
                    setConnectionResults(prev => ({ ...prev, [targetConnectorId]: true }));

                    // Also update the persistent connection state
                    setPersistentConnections(prev => {
                      const newState = { ...prev, [targetConnectorId]: true };
                      
                      // Save to localStorage for persistence across page refreshes
                      try {
                        localStorage.setItem('connectorStatus', JSON.stringify(newState));
                      } catch (err) {
                        console.error('Failed to save connector status to localStorage:', err);
                      }
                      
                      return newState;
                    });
                    
                    // Find the connector name for the toast
                    const targetConnector = connectors.find(c => c.id === targetConnectorId);
                    const connectorName = targetConnector ? targetConnector.name : "the connector";
                    
                    toast({
                      title: "OAuth Connection Complete",
                      description: `Successfully authenticated and connected to ${connectorName}`,
                    });

                    // Update connector in Firestore with the OAuth tokens
                    if (user && targetConnector && exchangeData.tokens) {
                      try {
                        const connectorRef = doc(db, "users", user.uid, "connectors", targetConnectorId);
                        updateDoc(connectorRef, {
                          auth: {
                            ...targetConnector.auth,
                            ...exchangeData.tokens
                          },
                          connectionStatus: 'connected',
                          updatedAt: new Date()
                        }).catch(err => console.error('Failed to update connector with tokens:', err));
                      } catch (err) {
                        console.error('Failed to update connector in Firestore:', err);
                      }
                    }
                  } else {
                    throw new Error(exchangeData.error || 'Token exchange failed');
                  }
                } catch (error: any) {
                  console.error('OAuth token exchange error:', error);
                  setConnectionResults(prev => ({ ...prev, [targetConnectorId]: false }));
                  
                  toast({
                    title: "Authentication Failed",
                    description: error.message || "Failed to complete OAuth authentication",
                    variant: "destructive",
                  });
                }
              })();
            } else {
              // Show error
              setConnectionResults(prev => ({ ...prev, [targetConnectorId]: false }));
              
              // Update the persistent connection state to reflect failure
              setPersistentConnections(prev => {
                const newState = { ...prev, [targetConnectorId]: false };
                
                // Save to localStorage for persistence across page refreshes
                try {
                  localStorage.setItem('connectorStatus', JSON.stringify(newState));
                } catch (err) {
                  console.error('Failed to save connector status to localStorage:', err);
                }
                
                return newState;
              });
              
              toast({
                title: "OAuth Authorization Failed",
                description: event.data.message || "Authorization failed",
                variant: "destructive",
              });
            }
            
            // Clear loading state
            setTestingConnections(prev => {
              const newState = { ...prev };
              delete newState[targetConnectorId];
              return newState;
            });
          }
        };
        
        window.addEventListener('message', handleOAuthCallback);
        
        // Set a timeout to clean up if the OAuth window is closed without completing
        setTimeout(() => {
          // Check if the window was closed
          if (authWindow.closed) {
            window.removeEventListener('message', handleOAuthCallback);
            
            setConnectionResults(prev => ({ ...prev, [connectorId]: false }));
            
            toast({
              title: "OAuth Authorization Cancelled",
              description: "The authorization window was closed before completion",
              variant: "destructive",
            });
            
            // Clear loading state
            setTestingConnections(prev => {
              const newState = { ...prev };
              delete newState[connectorId];
              return newState;
            });
          }
        }, 60000); // 1 minute timeout
        
        return;
      }
      
      // For Basic Auth, OAuth2 Client Credentials, or other non-window flows
      // We can directly check the result
      if (data.success) {
        // If we get here, the connection was successful
        setConnectionResults(prev => ({ ...prev, [connectorId]: true }));
        
        // Also update the persistent connection state
        setPersistentConnections(prev => {
          const newState = { ...prev, [connectorId]: true };
          
          // Save to localStorage for persistence across page refreshes
          try {
            localStorage.setItem('connectorStatus', JSON.stringify(newState));
          } catch (err) {
            console.error('Failed to save connector status to localStorage:', err);
          }
          
          return newState;
        });
        
        // Save connection details if available
        if (data.connectionDetails) {
          // We want to store these details for display in the connector UI
          try {
            const connectorRef = doc(db, "users", user.uid, "connectors", connectorId);
            updateDoc(connectorRef, {
              connectionStatus: 'connected',
              connectionDetails: data.connectionDetails,
              updatedAt: new Date()
            }).catch(err => console.error('Failed to update connector status:', err));
            
            // Update local state
            setConnectors(connectors.map(c => {
              if (c.id === connectorId) {
                return {
                  ...c,
                  connectionStatus: 'connected',
                  connectionDetails: data.connectionDetails,
                  updatedAt: new Date()
                };
              }
              return c;
            }));
          } catch (err) {
            console.error('Failed to update connector in Firestore:', err);
          }
        } else {
          // Update just the connection status 
          if (user) {
            try {
              const connectorRef = doc(db, "users", user.uid, "connectors", connectorId);
              updateDoc(connectorRef, {
                connectionStatus: 'connected', 
                updatedAt: new Date()
              }).catch(err => console.error('Failed to update connector status:', err));
            } catch (err) {
              console.error('Failed to update connector in Firestore:', err);
            }
          }
        }
        
        // Determine auth type for message
        let authTypeMsg = "";
        if (connector.authType === "basic") {
          authTypeMsg = " using Basic Auth";
        } else if (connector.authType === "oauth2" && connector.auth?.oauth2Type === "client_credentials") {
          authTypeMsg = " using OAuth Client Credentials";
        }
        
        // Enhanced message if we have connection details
        let enhancedMsg = "";
        if (data.connectionDetails) {
          if (connector.authType === "basic" && data.connectionDetails.authenticatedAs) {
            enhancedMsg = ` (Authenticated as ${data.connectionDetails.authenticatedAs})`;
          } else if (connector.authType === "oauth2" && data.connectionDetails.expiresIn) {
            enhancedMsg = ` (Valid for ${data.connectionDetails.expiresIn})`;
          }
        }
        
        toast({
          title: "Connection successful",
          description: `Successfully connected to ${connector.name}${authTypeMsg}${enhancedMsg}`,
        });
      } else {
        throw new Error(data.message || "Unknown response from server");
      }
    } catch (error: any) {
      // If there was an error, the connection failed
      setConnectionResults(prev => ({ ...prev, [connectorId]: false }));
      
      // Update the persistent connection state to reflect failure
      setPersistentConnections(prev => {
        const newState = { ...prev, [connectorId]: false };
        
        // Save to localStorage for persistence across page refreshes
        try {
          localStorage.setItem('connectorStatus', JSON.stringify(newState));
        } catch (err) {
          console.error('Failed to save connector status to localStorage:', err);
        }
        
        return newState;
      });
      
      toast({
        title: "Connection failed",
        description: error.message || "Could not connect to the API",
        variant: "destructive",
      });
    } finally {
      // Clear loading state (except for OAuth2 flow which has its own cleanup)
      if (!testingConnections[connectorId]) return;
      
      setTestingConnections(prev => {
        const newState = { ...prev };
        delete newState[connectorId];
        return newState;
      });
    }
  };
  
  // Load persistent connection status from localStorage on mount
  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem('connectorStatus');
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        setPersistentConnections(parsed);
        setConnectionResults(parsed); // Also set to current connection results
      }
    } catch (err) {
      console.error('Failed to load connector status from localStorage:', err);
    }
  }, []);
  
  // Add event listener for when the component mounts
  useEffect(() => {
    // Add global event listener for OAuth callbacks
    const handleOAuthCallback = (event: MessageEvent) => {
      if (event.data && event.data.type === 'oauth-callback') {
        console.log('Received OAuth callback:', event.data);
        
        // Handle case where connector-specific listener didn't catch it
        // This could happen if the page was refreshed during OAuth flow
        if (event.data.state && authStates[event.data.state]) {
          const connectorId = authStates[event.data.state];
          
          // Clean up the auth state
          setAuthStates(prev => {
            const newState = { ...prev };
            delete newState[event.data.state];
            return newState;
          });
          
          if (event.data.success) {
            // Update UI to show successful connection
            setConnectionResults(prev => ({ ...prev, [connectorId]: true }));
            
            // Also update the persistent connection state
            setPersistentConnections(prev => {
              const newState = { ...prev, [connectorId]: true };
              
              // Save to localStorage for persistence across page refreshes
              try {
                localStorage.setItem('connectorStatus', JSON.stringify(newState));
              } catch (err) {
                console.error('Failed to save connector status to localStorage:', err);
              }
              
              return newState;
            });
            
            // Find the connector name for the toast
            const connector = connectors.find(c => c.id === connectorId);
            const connectorName = connector ? connector.name : "the connector";
            
            toast({
              title: "OAuth Authorization Successful",
              description: `Successfully connected to ${connectorName}`,
            });
            
            // Update connector in Firestore to store connection status
            if (user && connector) {
              try {
                const connectorRef = doc(db, "users", user.uid, "connectors", connectorId);
                updateDoc(connectorRef, {
                  connectionStatus: 'connected',
                  updatedAt: new Date()
                }).catch(err => console.error('Failed to update connector status:', err));
              } catch (err) {
                console.error('Failed to update connector in Firestore:', err);
              }
            }
          } else {
            // Show error
            setConnectionResults(prev => ({ ...prev, [connectorId]: false }));
            
            // Update the persistent connection state to reflect failure
            setPersistentConnections(prev => {
              const newState = { ...prev, [connectorId]: false };
              
              // Save to localStorage for persistence across page refreshes
              try {
                localStorage.setItem('connectorStatus', JSON.stringify(newState));
              } catch (err) {
                console.error('Failed to save connector status to localStorage:', err);
              }
              
              return newState;
            });
            
            toast({
              title: "OAuth Authorization Failed",
              description: event.data.message || "Authorization failed",
              variant: "destructive",
            });
          }
          
          // Clear loading state
          setTestingConnections(prev => {
            const newState = { ...prev };
            delete newState[connectorId];
            return newState;
          });
        }
      }
    };
    
    window.addEventListener('message', handleOAuthCallback);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('message', handleOAuthCallback);
    };
  }, [connectors, authStates, toast]);
  
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">API Connectors</h1>
            <p className="text-muted-foreground">Manage your API connections for flows</p>
          </div>
          
          <Dialog open={openDialog} onOpenChange={(open) => {
            if (!open) {
              closeDialog();
            } else {
              setOpenDialog(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                New Connector
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConnector ? "Edit Connector" : "Create New Connector"}
                </DialogTitle>
                <DialogDescription>
                  {editingConnector 
                    ? "Update your API connector settings"
                    : "Configure a new API connection for your automation flows"}
                </DialogDescription>
              </DialogHeader>
              <ConnectorForm 
                initialData={editingConnector}
                onSubmit={editingConnector ? handleUpdateConnector : handleCreateConnector}
                onCancel={closeDialog}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : connectors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {connectors.map(connector => (
              <Card key={connector.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{connector.name}</span>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(connector)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Connector</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{connector.name}"? This action cannot be undone and may break flows that use this connector.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteConnector(connector.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardTitle>
                  <CardDescription className="truncate">
                    {connector.baseUrl}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {connector.authType || "No Auth"}
                    </Badge>
                    {connector.authType === "oauth2" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100">
                        OAuth 2.0
                      </Badge>
                    )}
                    {connector.authType === "basic" && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                        Basic Auth
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Created: {connector.createdAt?.toDate ? new Date(connector.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                  </div>
                  
                  <Button 
                    variant={connectionResults[connector.id] === true || persistentConnections[connector.id] === true ? "outline" : 
                            connectionResults[connector.id] === false || persistentConnections[connector.id] === false ? "destructive" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => testConnectorConnection(connector.id)}
                    disabled={testingConnections[connector.id]}
                  >
                    {testingConnections[connector.id] ? (
                      <>
                        <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : connectionResults[connector.id] === true || persistentConnections[connector.id] === true ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Connection Successful
                      </>
                    ) : connectionResults[connector.id] === false || persistentConnections[connector.id] === false ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Connection Failed
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center p-6">
            <div className="mb-4">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No connectors yet</h3>
            <p className="text-muted-foreground mb-4">Create your first API connector to get started</p>
            <Button onClick={() => setOpenDialog(true)}>Create Connector</Button>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
