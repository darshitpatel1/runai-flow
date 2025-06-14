import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  PlusIcon, 
  TableIcon, 
  CalendarIcon, 
  FolderIcon, 
  TrashIcon, 
  PencilIcon,
  MoreVerticalIcon,
  FolderPlusIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataTable, Folder } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const { data: tables, isLoading: tablesLoading, error } = useQuery({
    queryKey: ['/api/tables'],
    enabled: !!user,
  });

  // Query folders
  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['/api/folders', 'table'],
    queryFn: () => apiRequest('/api/folders?type=table'),
    enabled: !!user,
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
  
  // Filter tables by name
  const filteredTables = tables && Array.isArray(tables) 
    ? tables.filter((table: DataTable) => 
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) 
    : [];

  // Get tables that are not in any folder
  const tablesInFolders = new Set();
  if (folders && Array.isArray(folders)) {
    folders.forEach((folder: Folder) => {
      if (Array.isArray(folder.items)) {
        folder.items.forEach((item: any) => {
          if (item.type === 'table') {
            tablesInFolders.add(item.id);
          }
        });
      }
    });
  }

  const unfolderizedTables = filteredTables.filter((table: DataTable) => 
    !tablesInFolders.has(table.id)
  );
  
  // Format date for display
  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; type: string }) => 
      apiRequest('/api/folders', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder created",
        description: "New folder has been created successfully",
      });
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating folder",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  // Update folder mutation
  const updateFolderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) => 
      apiRequest(`/api/folders/${id}`, { method: 'PUT', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder updated",
        description: "Folder has been updated successfully",
      });
      setFolderDialogOpen(false);
      setFolderName("");
      setEditingFolder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating folder",
        description: error.message || "Failed to update folder",
        variant: "destructive",
      });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/folders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Folder deleted",
        description: "Folder has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting folder",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      });
    },
  });

  // Add to folder mutation
  const addToFolderMutation = useMutation({
    mutationFn: ({ folderId, item }: { folderId: number; item: { itemId: number; itemType: string; itemName: string } }) => 
      apiRequest(`/api/folders/${folderId}/items`, { method: 'POST', data: item }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Added to folder",
        description: "Table has been added to the folder successfully",
      });
      setAddToFolderDialogOpen(false);
      setSelectedTable(null);
      setSelectedFolderId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error adding to folder",
        description: error.message || "Failed to add table to folder",
        variant: "destructive",
      });
    },
  });

  // Remove from folder mutation
  const removeFromFolderMutation = useMutation({
    mutationFn: ({ folderId, itemId, itemType }: { folderId: number; itemId: number; itemType: string }) => 
      apiRequest(`/api/folders/${folderId}/items/${itemId}?type=${itemType}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      toast({
        title: "Removed from folder",
        description: "Table has been removed from the folder",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing from folder",
        description: error.message || "Failed to remove table from folder",
        variant: "destructive",
      });
    },
  });

  // Handle folder creation/update
  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsCreatingFolder(true);
    if (editingFolder) {
      updateFolderMutation.mutate({ id: editingFolder.id, data: { name: folderName } });
    } else {
      createFolderMutation.mutate({ name: folderName, type: 'table' });
    }
    setIsCreatingFolder(false);
  };

  // Handle folder deletion
  const handleDeleteFolder = (folderId: number) => {
    deleteFolderMutation.mutate(folderId);
  };

  // Open add to folder dialog
  const openAddToFolderDialog = (table: DataTable) => {
    setSelectedTable(table);
    setSelectedFolderId("");
    setAddToFolderDialogOpen(true);
  };

  // Handle add to folder
  const handleAddToFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !selectedFolderId) return;

    setIsAddingToFolder(true);
    addToFolderMutation.mutate({
      folderId: parseInt(selectedFolderId),
      item: {
        itemId: selectedTable.id,
        itemType: 'table',
        itemName: selectedTable.name
      }
    });
    setIsAddingToFolder(false);
  };

  // Handle remove from folder
  const handleRemoveFromFolder = (folderId: number, itemId: number, itemType: string) => {
    removeFromFolderMutation.mutate({ folderId, itemId, itemType });
  };

  // Open folder creation dialog
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

  const isLoading = tablesLoading || foldersLoading;
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Tables</h1>
            <p className="text-muted-foreground mt-1">Create and manage your data tables</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openFolderDialog()}>
              <FolderPlusIcon className="mr-2 h-4 w-4" />
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

        <div className="space-y-8">
          {/* Folders Section */}
          {folders && Array.isArray(folders) && folders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Folders</h2>
              <div className="space-y-4">
                {folders.map((folder: Folder) => (
                  <Card key={folder.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FolderIcon className="h-5 w-5 mr-2 text-blue-500" />
                          <CardTitle className="text-lg">{folder.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openFolderDialog(folder)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFolder(folder.id)}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(folder.items as any[])?.length || 0} tables
                      </p>
                    </CardHeader>
                    <CardContent>
                      {(folder.items as any[])?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(folder.items as any[]).map((item: any) => (
                            <Card key={`${item.type}-${item.id}`} className="relative group">
                              <Link href={`/tables/${item.id}`}>
                                <CardHeader className="pb-2">
                                  <CardTitle className="flex items-center text-sm">
                                    <TableIcon className="h-4 w-4 mr-2 text-primary" />
                                    {item.name}
                                  </CardTitle>
                                </CardHeader>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveFromFolder(folder.id, item.id, item.type)}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderIcon className="mx-auto h-8 w-8 mb-2" />
                          <p className="text-sm">This folder is empty</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Tables Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">All Tables</h2>
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
              ) : unfolderizedTables.length > 0 ? (
                // Display tables not in folders
                unfolderizedTables.map((table: DataTable) => (
                  <Card key={table.id} className="group relative">
                    <Link href={`/tables/${table.id}`}>
                      <div className="cursor-pointer hover:shadow-md transition-all">
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
                      </div>
                    </Link>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAddToFolderDialog(table)}>
                          <FolderIcon className="mr-2 h-4 w-4" />
                          Add to Folder
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        </div>

        {/* Folder Dialog */}
        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFolder ? "Edit Folder" : "Create New Folder"}
              </DialogTitle>
              <DialogDescription>
                {editingFolder 
                  ? "Update the folder name." 
                  : "Create a new folder to organize your tables."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFolderSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="folder-name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="folder-name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="col-span-3"
                    placeholder="Enter folder name..."
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFolderDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingFolder}>
                  {isCreatingFolder ? "Saving..." : editingFolder ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add to Folder Dialog */}
        <Dialog open={addToFolderDialogOpen} onOpenChange={setAddToFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Table to Folder</DialogTitle>
              <DialogDescription>
                Select a folder to add "{selectedTable?.name}" to.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddToFolder}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="folder-select" className="text-right">
                    Folder
                  </Label>
                  <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a folder..." />
                    </SelectTrigger>
                    <SelectContent>
                      {folders && Array.isArray(folders) && folders.map((folder: Folder) => (
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
                <Button type="submit" disabled={isAddingToFolder || !selectedFolderId}>
                  {isAddingToFolder ? "Adding..." : "Add to Folder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}