import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Edit, MoreHorizontal, PlusIcon, Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { DataTable, ColumnDefinition, TableRow as TableRowType } from "@shared/schema";
import { Input } from "@/components/ui/input";

export default function TableDetailPage() {
  const [, params] = useRoute('/tables/:id');
  const [, navigate] = useLocation();
  const tableId = params?.id ? parseInt(params.id) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get table data
  const { data: table, isLoading: isTableLoading, error: tableError } = useQuery({
    queryKey: ['/api/tables', tableId],
    enabled: !!tableId && !!user,
  });
  
  // Get table rows
  const { data: tableRows, isLoading: isRowsLoading, error: rowsError } = useQuery({
    queryKey: [`/api/tables/${tableId}/rows`],
    enabled: !!tableId && !!user,
  });
  
  // Make sure columns is properly parsed as an array
  const columns = useMemo(() => {
    if (!table) return [];
    
    return Array.isArray(table.columns) 
      ? table.columns 
      : (typeof table.columns === 'string' 
          ? JSON.parse(table.columns) 
          : (table.columns ? [table.columns] : [])) as ColumnDefinition[];
  }, [table]);
  
  // Debug function to show table structure in console
  useEffect(() => {
    if (table) {
      console.log("Table data received:", table);
      console.log("Table ID:", table.id);
      console.log("Columns data:", table.columns);
      console.log("Columns array type:", Array.isArray(table.columns));
      console.log("Columns after parsing:", columns);
      
      if (tableRows && tableRows.length > 0) {
        console.log("Table rows received:", tableRows);
        console.log("First row data:", tableRows[0]);
        console.log("Row data structure:", tableRows[0].data);
        if (tableRows[0].data?.data) {
          console.log("Nested data structure detected", tableRows[0].data.data);
        }
      }
    }
  }, [table, tableRows, columns]);
  
  // Handle errors with useEffect
  useEffect(() => {
    if (tableError) {
      toast({
        title: "Error",
        description: "Failed to load table",
        variant: "destructive",
      });
    }
    
    if (rowsError) {
      toast({
        title: "Error",
        description: "Failed to load table rows",
        variant: "destructive",
      });
    }
  }, [tableError, rowsError, toast]);
  
  // Filter rows based on search query
  const filterRows = () => {
    if (!tableRows || !Array.isArray(tableRows)) return [];
    
    if (!searchQuery.trim()) return tableRows;
    
    return tableRows.filter((row: TableRowType) => {
      const rowData = row.data;
      // Search in all column values
      return Object.values(rowData).some(value => 
        value !== null && 
        value !== undefined && 
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };
  
  // Get paginated rows
  const getPaginatedRows = () => {
    const filteredRows = filterRows();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredRows.slice(startIndex, endIndex);
  };
  
  // Format cell value based on column type
  const formatCellValue = (value: any, type?: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'date':
        try {
          return new Date(value).toLocaleDateString();
        } catch (e) {
          return value;
        }
      default:
        return String(value);
    }
  };
  
  const isLoading = isTableLoading || isRowsLoading;
  const filteredRows = useMemo(() => filterRows(), [tableRows, searchQuery]);
  const paginatedRows = useMemo(() => getPaginatedRows(), [filteredRows, page, pageSize]);
  const totalPages = useMemo(() => Math.ceil(filteredRows.length / pageSize), [filteredRows, pageSize]);
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            </div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
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
            <Button 
              className="mt-4" 
              onClick={() => navigate("/tables")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tables
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex flex-col mb-2">
          <Button 
            variant="link" 
            className="text-sm text-muted-foreground hover:text-foreground w-fit p-0 mb-2"
            onClick={() => navigate("/tables")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Tables
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{table.name}</h1>
            {table.description && (
              <p className="text-muted-foreground mt-1">{table.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/tables/${tableId}/edit`)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Edit Table
            </Button>
            
            <Button 
              onClick={() => navigate(`/tables/${tableId}/add-row`)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
            <CardTitle>Table Data</CardTitle>
            
            <div className="w-full md:w-1/3">
              <Input
                placeholder="Search data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Actions</TableHead>
                      {columns.map((column: ColumnDefinition) => (
                        <TableHead key={column.id} className="min-w-[150px]">
                          <div className="flex items-center gap-2">
                            {column.name}
                            {column.required && (
                              <Badge variant="outline" className="ml-1 font-normal">
                                Required
                              </Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.length > 0 ? (
                      paginatedRows.map((row: TableRowType) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/tables/${tableId}/edit-row/${row.id}`)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Row
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          {columns.map((column: ColumnDefinition) => (
                            <TableCell key={column.id} className="truncate max-w-[300px]">
                              {formatCellValue(
                                // Handle potential nesting in row.data
                                row.data && typeof row.data === 'object' 
                                  ? (row.data.data && typeof row.data.data === 'object'
                                    ? row.data.data[column.id]  // For nested data.data
                                    : row.data[column.id])      // For direct data
                                  : undefined,
                                column.type
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length + 1} className="text-center py-8">
                          {searchQuery ? (
                            <div>
                              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                              <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => setSearchQuery('')}
                              >
                                Clear search
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-muted-foreground">No data available</p>
                              <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => navigate(`/tables/${tableId}/add-row`)}
                              >
                                Add your first row
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="mt-4 flex justify-end">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNum = page;
                      // Show 2 pages before and after current page, or adjust if at the start/end
                      if (page < 3) {
                        pageNum = i + 1;
                      } else if (page > totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      // Only show valid page numbers
                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={pageNum === page}
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}