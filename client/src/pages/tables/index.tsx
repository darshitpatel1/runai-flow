import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, TableIcon, CalendarIcon, FolderIcon, PencilIcon, TrashIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataTable, Folder } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function TablesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for table name filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Folder state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Add to folder state
  const [addToFolderDialogOpen, setAddToFolderDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DataTable | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isAddingToFolder, setIsAddingToFolder] = useState(false);
  
  // Query tables
  const { data: tables, isLoading, error } = useQuery({
    queryKey: ['/api/tables'],
    enabled: !!user,
  });

  // Query folders
  const { data: folders } = useQuery({
    queryKey: ['/api/folders'],
    enabled: !!user,
  });

  // Folder mutations
  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return await apiRequest('/api/folders', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder created",
        description: "The folder has been created successfully",
      });
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string } }) => {
      return await apiRequest(`/api/folders/${id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder updated",
        description: "The folder has been updated successfully",
      });
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      return await apiRequest(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      toast({
        title: "Folder deleted",
        description: "The folder has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting folder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addToFolderMutation = useMutation({
    mutationFn: async ({ tableId, folderId }: { tableId: number; folderId: number | null }) => {
      return await apiRequest(`/api/tables/${tableId}/add-to-folder`, {
        method: 'POST',
        data: { folderId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Table moved to folder",
        description: "The table has been moved to the folder successfully",
      });
      setAddToFolderDialogOpen(false);
      setSelectedTable(null);
      setSelectedFolderId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error moving table",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle errors with useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load tables",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Filter tables by name and exclude tables that are in folders
  const filteredTables = tables && Array.isArray(tables) 
    ? tables.filter((table: DataTable) => 
        table.name.toLowerCase().includes(searchQuery.toLowerCase()) && !table.folderId
      ) 
    : [];
  
  // Format date for display
  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // Folder handlers
  const openFolderDialog = (folder?: Folder) => {
    if (folder) {
      setEditingFolder(folder);
      setFolderName(folder.name);
    } else {
      setEditingFolder(null);
      setFolderName("");
    }
    setFolderDialogOpen(true);
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingFolder(true);
    
    if (editingFolder) {
      updateFolderMutation.mutate({ id: editingFolder.id, data: { name: folderName } });
    } else {
      createFolderMutation.mutate({ name: folderName });
    }
    
    setIsCreatingFolder(false);
  };

  const openAddToFolderDialog = (table: DataTable) => {
    setSelectedTable(table);
    setSelectedFolderId("");
    setAddToFolderDialogOpen(true);
  };

  const handleAddToFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    
    setIsAddingToFolder(true);
    const folderId = selectedFolderId === "none" ? null : parseInt(selectedFolderId);
    addToFolderMutation.mutate({ tableId: selectedTable.id, folderId });
    setIsAddingToFolder(false);
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Tables</h1>
            <p className="text-muted-foreground mt-1">Create and manage your data tables</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => openFolderDialog()}
            >
              <FolderIcon className="h-4 w-4" />
              New Folder
            </Button>
            <Link href="/tables/new">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Table
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Folders section */}
        {folders && folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Folders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {folders.map((folder: Folder & { tables?: DataTable[] }) => (
                <Card key={folder.id} className="overflow-hidden">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderIcon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">
                          {folder.name}
                        </CardTitle>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openFolderDialog(folder)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this folder? Tables in this folder will be moved to the main view.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFolderMutation.mutate(folder.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground mb-2">
                      {folder.tables?.length || 0} tables
                    </p>
                    {folder.tables && folder.tables.length > 0 && (
                      <div className="space-y-1">
                        {folder.tables.map((table: DataTable) => (
                          <div 
                            key={`table-${table.id}`} 
                            className="flex items-center gap-2 text-sm p-1 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 group cursor-pointer"
                            onClick={() => {
                              window.location.href = `/tables/${table.id}`;
                            }}
                          >
                            <TableIcon className="h-3 w-3 text-primary" />
                            <span className="truncate">
                              {table.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tables section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            All Tables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredTables.length > 0 ? (
              // Display tables
              filteredTables.map((table: DataTable) => (
                <Card key={table.id} className="cursor-pointer hover:shadow-md transition-all overflow-hidden">
                  <Link href={`/tables/${table.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center">
                        <TableIcon className="h-5 w-5 mr-2 text-primary" />
                        {table.name}
                      </CardTitle>
                      {table.description && (
                        <CardDescription className="line-clamp-2">{table.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        Updated {formatDate(table.updatedAt)}
                      </div>
                      <div className="mt-2 text-sm">
                        {Array.isArray(table.columns) && 
                          `${table.columns.length} column${table.columns.length !== 1 ? 's' : ''}`}
                      </div>
                    </CardContent>
                  </Link>
                  <div className="px-6 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAddToFolderDialog(table);
                      }}
                    >
                      <FolderIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              // No tables found
              <div className="col-span-3 py-12 text-center">
                <TableIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No tables found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get started by creating your first data table.
                </p>
                <Link href="/tables/new">
                  <Button className="mt-4">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Create Table
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Folder Dialog */}
        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFolder ? "Edit Folder" : "Create New Folder"}
              </DialogTitle>
              <DialogDescription>
                {editingFolder ? "Update the folder name" : "Enter a name for your new folder"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateFolder}>
              <div className="space-y-4 my-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Name</Label>
                  <Input
                    id="folder-name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="Enter folder name"
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isCreatingFolder}>
                  {isCreatingFolder ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      {editingFolder ? "Updating..." : "Creating..."}
                    </>
                  ) : editingFolder ? (
                    "Update Folder"
                  ) : (
                    "Create Folder"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add to Folder Dialog */}
        <Dialog open={addToFolderDialogOpen} onOpenChange={setAddToFolderDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Table to Folder</DialogTitle>
              <DialogDescription>
                Select a folder for "{selectedTable?.name}" or remove it from its current folder
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddToFolder}>
              <div className="space-y-4 my-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-select">Folder</Label>
                  <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No folder (main view)</SelectItem>
                      {folders && folders.map((folder: Folder) => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddToFolderDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isAddingToFolder}>
                  {isAddingToFolder ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    "Move Table"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}