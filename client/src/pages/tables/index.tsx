import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  PlusIcon,
  TableIcon,
  CalendarIcon,
  FolderIcon,
  Loader2Icon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataTable } from "@shared/schema";
import { db } from "@/lib/firebase";

export default function TablesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State for table name filter
  const [searchQuery, setSearchQuery] = useState("");

  // Add to folder state
  const [addToFolderDialogOpen, setAddToFolderDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DataTable | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isAddingToFolder, setIsAddingToFolder] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);

  // Query tables
  const {
    data: tables,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/tables"],
    enabled: !!user,
  });

  // Load Firebase folders
  useEffect(() => {
    const loadFolders = async () => {
      if (!user) return;

      try {
        const foldersRef = collection(db, "users", user.uid, "folders");
        const foldersSnapshot = await getDocs(foldersRef);
        const foldersData = foldersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFolders(foldersData);
      } catch (error) {
        console.error("Error loading folders:", error);
      }
    };

    loadFolders();
  }, [user]);

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
  const filteredTables =
    tables && Array.isArray(tables)
      ? tables.filter((table: DataTable) =>
          table.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [];

  // Format date for display
  const formatDate = (date: string | Date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // Folder handlers
  const openAddToFolderDialog = (table: DataTable) => {
    setSelectedTable(table);
    setSelectedFolderId("");
    setAddToFolderDialogOpen(true);
  };

  const handleAddToFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !user) return;

    // Add validation for selectedFolderId
    if (!selectedFolderId) {
      toast({
        title: "No folder selected",
        description: "Please select a folder or choose 'Remove from folder'",
        variant: "destructive",
      });
      return;
    }

    setIsAddingToFolder(true);

    try {
      // Check if table is already in the selected folder by checking Firebase
      if (selectedFolderId !== "none") {
        try {
          const { getDoc } = await import("firebase/firestore");
          const tableRef = doc(
            db,
            "users",
            user.uid,
            "tables",
            selectedTable.id.toString(),
          );
          const tableDoc = await getDoc(tableRef);
          
          if (tableDoc.exists() && String(tableDoc.data().folderId) === String(selectedFolderId)) {
            const folderName = folders.find(f => f.id === selectedFolderId)?.name || "folder";
            toast({
              title: "Table already in folder",
              description: `This table is already in ${folderName}`,
              variant: "destructive",
            });
            setAddToFolderDialogOpen(false);
            setIsAddingToFolder(false);
            return;
          }
        } catch (error) {
          console.warn("Could not check existing folder assignment:", error);
        }
      }

      console.log("Starting table assignment:", {
        tableId: selectedTable.id,
        selectedFolderId,
        tableName: selectedTable.name,
        userUid: user.uid,
        currentFolderId: selectedTable.folderId
      });

      // Always use setDoc to ensure the document exists
      const { setDoc } = await import("firebase/firestore");
      const tableRef = doc(
        db,
        "users",
        user.uid,
        "tables",
        selectedTable.id.toString(),
      );

      const tableData: any = {
        id: selectedTable.id,
        name: selectedTable.name,
        type: "table",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (selectedFolderId === "none") {
        tableData.folderId = null;
      } else {
        tableData.folderId = selectedFolderId;
      }

      console.log("Writing to Firebase:", {
        documentPath: `users/${user.uid}/tables/${selectedTable.id}`,
        tableData
      });

      await setDoc(tableRef, tableData, { merge: true });

      console.log("Firebase write successful");

      // Show appropriate success messages
      if (selectedFolderId === "none") {
        toast({
          title: "Table moved",
          description: "The table has been removed from its folder",
        });
      } else {
        const folderName = folders.find(f => f.id === selectedFolderId)?.name || "folder";
        toast({
          title: "Table moved",
          description: `The table has been added to ${folderName}`,
        });
      }

      setAddToFolderDialogOpen(false);
      setSelectedTable(null);
      setSelectedFolderId("");
    } catch (error: any) {
      console.error("Error assigning table to folder:", error);
      toast({
        title: "Error moving table",
        description: error.message || "Failed to update table assignment",
        variant: "destructive",
      });
    }

    setIsAddingToFolder(false);
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Tables</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your data tables
            </p>
          </div>
          <Link href="/tables/new">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Table
            </Button>
          </Link>
        </div>

        {/* Tables section */}
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
              <Card key={table.id} className="overflow-hidden">
                <Link href={`/tables/${table.id}`}>
                  <div className="cursor-pointer hover:shadow-md transition-all">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center">
                        <TableIcon className="h-5 w-5 mr-2 text-primary" />
                        {table.name}
                      </CardTitle>
                      {table.description && (
                        <CardDescription className="line-clamp-2">
                          {table.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground flex items-center">
                        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                        Updated {formatDate(table.updatedAt)}
                      </div>
                      <div className="mt-2 text-sm flex items-center justify-between">
                        <span>
                          {Array.isArray(table.columns) &&
                            `${table.columns.length} column${table.columns.length !== 1 ? "s" : ""}`}
                        </span>
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
                    </CardContent>
                  </div>
                </Link>
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

        {/* Add to Folder Dialog */}
        <Dialog
          open={addToFolderDialogOpen}
          onOpenChange={setAddToFolderDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Table to Folder</DialogTitle>
              <DialogDescription>
                Select a folder to include this table.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddToFolder}>
              <div className="space-y-4 my-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-select">Folder</Label>
                  <Select
                    value={selectedFolderId}
                    onValueChange={setSelectedFolderId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No folder (main view)
                      </SelectItem>
                      {folders.map((folder: any) => (
                        <SelectItem key={folder.id} value={folder.id}>
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
