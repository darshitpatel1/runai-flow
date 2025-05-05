import { useState, useEffect } from "react";
import { Link } from "wouter";
import { doc, collection, getDocs, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, ArrowRightIcon, SettingsIcon, PlayIcon, Loader2Icon, FolderIcon, TrashIcon, PencilIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  
  // Flow settings state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Folder state
  const [folders, setFolders] = useState<any[]>([]);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Open settings dialog for a flow
  const openFlowSettings = (flow: any) => {
    setSelectedFlow(flow);
    setFlowName(flow.name);
    setFlowDescription(flow.description || "");
    setEditDialogOpen(true);
  };
  
  // Handle flow update
  const handleUpdateFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedFlow) return;
    
    setIsUpdating(true);
    try {
      const flowRef = doc(db, "users", user.uid, "flows", selectedFlow.id);
      await updateDoc(flowRef, {
        name: flowName,
        description: flowDescription,
        updatedAt: new Date()
      });
      
      // Update local state
      setFlows(flows.map(flow => 
        flow.id === selectedFlow.id 
          ? { 
              ...flow, 
              name: flowName, 
              description: flowDescription,
              updatedAt: { toDate: () => new Date() }
            } 
          : flow
      ));
      
      toast({
        title: "Flow updated",
        description: "Flow details have been successfully updated"
      });
      
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error updating flow",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle flow deletion
  const handleDeleteFlow = async () => {
    if (!user || !selectedFlow) return;
    
    setIsDeleting(true);
    try {
      const flowRef = doc(db, "users", user.uid, "flows", selectedFlow.id);
      await deleteDoc(flowRef);
      
      // Update local state
      setFlows(flows.filter(flow => flow.id !== selectedFlow.id));
      
      toast({
        title: "Flow deleted",
        description: "The flow has been permanently deleted"
      });
      
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error deleting flow",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Open folder creation dialog
  const openFolderDialog = (folder: any = null) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
    } else {
      setEditingFolder(null);
      setFolderName("");
    }
    setFolderDialogOpen(true);
  };
  
  // Handle folder creation or update
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsCreatingFolder(true);
    try {
      if (editingFolder) {
        // Update existing folder
        const folderRef = doc(db, "users", user.uid, "folders", editingFolder.id);
        await updateDoc(folderRef, {
          name: folderName,
          updatedAt: new Date()
        });
        
        // Update local state
        setFolders(folders.map(folder => 
          folder.id === editingFolder.id 
            ? { 
                ...folder, 
                name: folderName,
                updatedAt: { toDate: () => new Date() }
              } 
            : folder
        ));
        
        toast({
          title: "Folder updated",
          description: "Folder has been successfully updated"
        });
      } else {
        // Create new folder
        const foldersRef = collection(db, "users", user.uid, "folders");
        const newFolder = {
          name: folderName,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const docRef = await addDoc(foldersRef, newFolder);
        
        // Update local state
        setFolders([...folders, {
          id: docRef.id,
          ...newFolder,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() }
        }]);
        
        toast({
          title: "Folder created",
          description: "New folder has been created"
        });
      }
      
      setFolderDialogOpen(false);
    } catch (error: any) {
      toast({
        title: editingFolder ? "Error updating folder" : "Error creating folder",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };
  
  // Handle folder deletion
  const handleDeleteFolder = async (folderId: string) => {
    if (!user) return;
    
    try {
      const folderRef = doc(db, "users", user.uid, "folders", folderId);
      await deleteDoc(folderRef);
      
      // Update local state
      setFolders(folders.filter(folder => folder.id !== folderId));
      
      toast({
        title: "Folder deleted",
        description: "The folder has been permanently deleted"
      });
    } catch (error: any) {
      toast({
        title: "Error deleting folder",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        // Fetch flows
        const flowsQuery = query(collection(db, "users", user.uid, "flows"));
        const flowsSnapshot = await getDocs(flowsQuery);
        const flowsData = flowsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFlows(flowsData);
        
        // Fetch connectors
        const connectorsQuery = query(collection(db, "users", user.uid, "connectors"));
        const connectorsSnapshot = await getDocs(connectorsQuery);
        const connectorsData = connectorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConnectors(connectorsData);
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, toast]);
  
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.displayName || 'User'}</h1>
            <p className="text-muted-foreground">Manage your automation flows and connectors</p>
          </div>
          
          <div className="flex mt-4 md:mt-0 space-x-3">
            <Link href="/flow-builder">
              <Button className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                New Flow
              </Button>
            </Link>
            <Link href="/connectors">
              <Button variant="outline" className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                New Connector
              </Button>
            </Link>
          </div>
        </div>
        
        <Tabs defaultValue="flows" className="space-y-6">
          <TabsList>
            <TabsTrigger value="flows">My Flows</TabsTrigger>
            <TabsTrigger value="connectors">My Connectors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="flows">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : flows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {flows.map(flow => (
                  <Card key={flow.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle>{flow.name}</CardTitle>
                      <CardDescription className="flex items-center">
                        Last modified: {new Date(flow.updatedAt?.toDate()).toLocaleDateString()}
                        {flow.active && (
                          <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100">
                            Active
                          </Badge>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {flow.description || "No description provided"}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Link href={`/flow-builder/${flow.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          Edit <ArrowRightIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <PlayIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openFlowSettings(flow)}
                        >
                          <SettingsIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center p-6">
                <div className="mb-4">
                  <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">No flows yet</h3>
                <p className="text-muted-foreground mb-4">Create your first automation flow to get started</p>
                <Link href="/flow-builder">
                  <Button>Create Flow</Button>
                </Link>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="connectors">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : connectors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {connectors.map(connector => (
                  <Card key={connector.id}>
                    <CardHeader>
                      <CardTitle>{connector.name}</CardTitle>
                      <CardDescription>
                        {connector.baseUrl}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">
                          {connector.authType || "No Auth"}
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Link href={`/connectors?edit=${connector.id}`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                      <Button variant="ghost" size="sm">Test</Button>
                    </CardFooter>
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
                <Link href="/connectors">
                  <Button>Create Connector</Button>
                </Link>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Flow Settings Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Flow Settings</DialogTitle>
            <DialogDescription>
              Update flow details or delete the flow
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateFlow}>
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name">Name</Label>
                <Input 
                  id="flow-name" 
                  value={flowName} 
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Enter flow name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="flow-description">Description</Label>
                <Textarea 
                  id="flow-description" 
                  value={flowDescription} 
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Describe what this flow does"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter className="flex justify-between items-center">
              <div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      type="button" 
                      variant="destructive"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <TrashIcon className="mr-2 h-4 w-4" />
                          Delete Flow
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Flow</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the flow from your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteFlow} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
