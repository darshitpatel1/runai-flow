import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, EditIcon, Trash2Icon, ArrowLeft, DownloadIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { DataTable, TableRow, ColumnDefinition } from "@shared/schema";

export default function TableDetailPage() {
  const [, params] = useRoute('/tables/:id');
  const tableId = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  // Get table data
  const { data: table, isLoading: isTableLoading } = useQuery({
    queryKey: ['/api/tables', tableId],
    enabled: !!tableId && !!user,
  });
  
  // Get table rows
  const { data: tableRows, isLoading: isRowsLoading } = useQuery({
    queryKey: ['/api/tables', tableId, 'rows'],
    enabled: !!tableId && !!user,
  });
  
  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: number) => {
      return await apiRequest(`/api/tables/${tableId}/rows/${rowId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Row deleted",
        description: "The row has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables', tableId, 'rows'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      });
    }
  });
  
  // Filtered and paginated rows
  const filteredRows = useMemo(() => {
    if (!tableRows) return [];
    
    return tableRows.filter((row: TableRow) => {
      if (!searchQuery.trim()) return true;
      
      // Search in row data
      const query = searchQuery.toLowerCase();
      const data = row.data || {};
      
      return Object.values(data).some(value => 
        value && value.toString().toLowerCase().includes(query)
      );
    });
  }, [tableRows, searchQuery]);
  
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRows, currentPage, rowsPerPage]);
  
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  
  // Handler for row deletion
  const handleDeleteRow = (rowId: number) => {
    if (confirm('Are you sure you want to delete this row?')) {
      deleteRowMutation.mutate(rowId);
    }
  };
  
  // Generate CSV download
  const generateCsv = () => {
    if (!table || !tableRows || tableRows.length === 0) return;
    
    const columns = (table.columns || []) as ColumnDefinition[];
    const headers = columns.map(col => col.name).join(',');
    
    const rows = tableRows.map((row: TableRow) => {
      const data = row.data || {};
      return columns
        .map(col => {
          let value = data[col.id] || '';
          // Quote values that contain commas
          if (typeof value === 'string' && value.includes(',')) {
            value = `"${value}"`;
          }
          return value;
        })
        .join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const isLoading = isTableLoading || isRowsLoading;
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-8"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 mb-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!table) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold">Table not found</h2>
            <p className="text-muted-foreground mt-2">The table you're looking for doesn't exist.</p>
            <Link href="/tables">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tables
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  const columns = (table.columns || []) as ColumnDefinition[];
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <Link href="/tables" className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Tables
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{table.name}</h1>
            {table.description && (
              <p className="text-muted-foreground mt-1">{table.description}</p>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="outline" onClick={generateCsv} disabled={!tableRows || tableRows.length === 0}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Link href={`/tables/${tableId}/edit`}>
              <Button variant="outline">
                <EditIcon className="mr-2 h-4 w-4" />
                Edit Table
              </Button>
            </Link>
            <Link href={`/tables/${tableId}/add-row`}>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="mb-6">
          <Input
            placeholder="Search rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        {/* Data table */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>{table.name} Data</CardTitle>
            <CardDescription>
              {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {columns.length === 0 ? (
              <div className="text-center py-8">
                <p>This table has no columns defined yet.</p>
                <Link href={`/tables/${tableId}/edit`}>
                  <Button variant="outline" className="mt-2">
                    <EditIcon className="mr-2 h-4 w-4" />
                    Edit Table Structure
                  </Button>
                </Link>
              </div>
            ) : paginatedRows.length === 0 ? (
              <div className="text-center py-8">
                <p>No data found{searchQuery ? ' matching your search' : ''}.</p>
                <Link href={`/tables/${tableId}/add-row`}>
                  <Button className="mt-2">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add Row
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {columns.map((column: ColumnDefinition) => (
                        <th key={column.id} className="px-4 py-3 text-left font-medium">
                          {column.name}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row: TableRow) => (
                      <tr key={row.id} className="border-b hover:bg-muted/50">
                        {columns.map((column: ColumnDefinition) => (
                          <td key={`${row.id}-${column.id}`} className="px-4 py-3">
                            {formatCellValue(row.data?.[column.id], column.type)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link href={`/tables/${tableId}/edit-row/${row.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 mr-1">
                              <EditIcon className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => handleDeleteRow(row.id)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

// Helper function to format cell values based on column type
function formatCellValue(value: any, type?: string) {
  if (value === undefined || value === null) return '';
  
  switch (type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      return new Date(value).toLocaleDateString();
    default:
      return value.toString();
  }
}