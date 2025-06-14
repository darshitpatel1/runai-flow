import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, TableIcon, CalendarIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataTable } from "@shared/schema";

export default function TablesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for table name filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Query tables
  const { data: tables, isLoading, error } = useQuery({
    queryKey: ['/api/tables'],
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
  
  // Format date for display
  const formatDate = (date: string | Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Tables</h1>
            <p className="text-muted-foreground mt-1">Create and manage your data tables</p>
          </div>
          <Link href="/tables/new">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Table
            </Button>
          </Link>
        </div>
        
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
              <Link key={table.id} href={`/tables/${table.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-all">
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
                </Card>
              </Link>
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
    </AppLayout>
  );
}