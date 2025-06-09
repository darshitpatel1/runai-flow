import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Edit, MoreHorizontal, PlusIcon, Settings, Trash2, Download, Filter, Check, X } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";

import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<{rowId: number, columnId: string, columnType: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const queryClient = useQueryClient();
  
  // New row state
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  
  // Column filtering state
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [isFilteringOpen, setIsFilteringOpen] = useState(false);
  
  // Update cell mutation
  const updateCellMutation = useMutation({
    mutationFn: async ({ rowId, data }: { rowId: number, data: any }) => {
      return await apiRequest(`/api/tables/${tableId}/rows/${rowId}`, {
        method: 'PUT',
        data: { data },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}/rows`] });
      toast({
        title: "Cell updated",
        description: "The cell has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cell",
        variant: "destructive",
      });
    }
  });
  
  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: number) => {
      return await apiRequest(`/api/tables/${tableId}/rows/${rowId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}/rows`] });
      toast({
        title: "Row deleted",
        description: "The row has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      });
    }
  });
  
  // Add row mutation
  const addRowMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/tables/${tableId}/rows`, {
        method: 'POST',
        data: { data },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tables/${tableId}/rows`] });
      toast({
        title: "Row added",
        description: "New row has been added successfully",
      });
      setIsAddingRow(false);
      setNewRowData({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add new row",
        variant: "destructive",
      });
    }
  });
  
  // Get all tables (we'll filter to find the specific one)
  const { data: tables, isLoading: isTableLoading, error: tableError } = useQuery({
    queryKey: ['/api/tables'],
    enabled: !!user,
  });
  
  // Find the specific table by ID
  const table = useMemo(() => {
    if (!tables || !Array.isArray(tables) || !tableId) return null;
    console.log("Finding table with ID:", tableId, "from tables:", tables);
    const foundTable = tables.find(t => t.id === tableId) || null;
    console.log("Found table:", foundTable);
    return foundTable;
  }, [tables, tableId]);
  
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
  
  // Filter rows based on search query and column filters
  const filterRows = () => {
    if (!tableRows || !Array.isArray(tableRows)) return [];
    
    // Start with all rows
    let result = [...tableRows];
    
    // Apply search query if exists
    if (searchQuery.trim()) {
      result = result.filter((row: TableRowType) => {
        const rowData = row.data;
        // Search in all column values
        return Object.values(rowData).some(value => 
          value !== null && 
          value !== undefined && 
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }
    
    // Apply column filters if any
    if (Object.keys(columnFilters).length > 0) {
      result = result.filter((row: TableRowType) => {
        return Object.entries(columnFilters).every(([columnId, filterValue]) => {
          if (!filterValue) return true; // Skip empty filters
          
          // Find the column to get its type
          const column = columns.find(col => col.id === columnId);
          if (!column) return true;
          
          // Get the cell value, handle nested data
          let cellValue = row.data && typeof row.data === 'object' 
            ? (row.data.data && typeof row.data.data === 'object'
              ? row.data.data[columnId]  // For nested data.data
              : row.data[columnId])      // For direct data
            : undefined;
          
          // Convert to string for comparison
          const cellValueStr = cellValue !== null && cellValue !== undefined 
            ? String(cellValue).toLowerCase() 
            : '';
          
          return cellValueStr.includes(filterValue.toLowerCase());
        });
      });
    }
    
    return result;
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
  
  // Function to start editing a cell
  const startEditing = (rowId: number, columnId: string, columnType: string, initialValue: any) => {
    setEditingCell({ rowId, columnId, columnType });
    setEditValue(String(initialValue === null || initialValue === undefined ? '' : initialValue));
  };
  
  // Function to cancel editing
  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };
  
  // Function to save the edited cell value
  const saveEditedCell = () => {
    if (!editingCell) return;
    
    const { rowId, columnId, columnType } = editingCell;
    
    // Find the row
    const row = tableRows?.find((r: TableRowType) => r.id === rowId);
    if (!row) {
      cancelEditing();
      return;
    }
    
    // Deep clone the data object to avoid mutating state
    const rowData = { ...(row.data || {}) };
    
    // Prepare the new value according to column type
    let newValue: any = editValue;
    switch (columnType) {
      case 'number':
        newValue = editValue === '' ? null : Number(editValue);
        break;
      case 'boolean':
        newValue = editValue === 'true';
        break;
      case 'date':
        if (editValue) {
          try {
            // Make sure it's a valid date
            newValue = new Date(editValue).toISOString();
          } catch (e) {
            // Invalid date, keep as string
          }
        } else {
          newValue = null;
        }
        break;
    }
    
    // Update the row data
    rowData[columnId] = newValue;
    
    // Send update to server
    updateCellMutation.mutate({ 
      rowId, 
      data: rowData
    });
    
    // Reset editing state
    cancelEditing();
  };
  
  const isLoading = isTableLoading || isRowsLoading;
  const filteredRows = useMemo(() => filterRows(), [tableRows, searchQuery, columnFilters, columns]);
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
              variant="outline"
              onClick={() => {
                if (!tableRows || !columns) return;
                
                // Generate CSV content
                const header = columns.map(col => col.name).join(',');
                
                const rows = tableRows.map((row: TableRowType) => {
                  return columns.map(col => {
                    const value = row.data?.[col.id] ?? '';
                    // Quote values that contain commas
                    return typeof value === 'string' && value.includes(',') 
                      ? `"${value}"` 
                      : value;
                  }).join(',');
                }).join('\n');
                
                const csvContent = `${header}\n${rows}`;
                
                // Create a Blob with the CSV content
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                
                // Create a URL for the Blob
                const url = URL.createObjectURL(blob);
                
                // Create a link element to trigger the download
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${table.name.replace(/\s+/g, '_')}_export.csv`);
                document.body.appendChild(link);
                
                // Trigger the download
                link.click();
                
                // Clean up
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                toast({
                  title: "CSV Export",
                  description: "Your data has been exported to CSV successfully",
                });
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            
            <Button 
              onClick={() => setIsAddingRow(true)}
              disabled={isAddingRow}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {isAddingRow ? "Adding Row..." : "Add Row"}
            </Button>
          </div>
        </div>
        
        <Card>
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
            <div className="flex items-center gap-3">
              <CardTitle>Table Data</CardTitle>
              {Object.keys(columnFilters).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setColumnFilters({})}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters ({Object.keys(columnFilters).length})
                </Button>
              )}
            </div>
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
                          <div className="flex flex-col">
                            <div 
                              className={`flex items-center gap-2 cursor-pointer hover:text-primary ${columnFilters[column.id] ? 'text-blue-500' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const popupDiv = document.createElement('div');
                                popupDiv.className = 'absolute mt-1 bg-card border rounded-md shadow-md z-50 p-2 w-64';
                                popupDiv.style.left = `${e.currentTarget.getBoundingClientRect().left}px`;
                                popupDiv.style.top = `${e.currentTarget.getBoundingClientRect().bottom + window.scrollY}px`;
                                
                                const handleClickOutside = (evt: MouseEvent) => {
                                  if (!popupDiv.contains(evt.target as Node)) {
                                    document.body.removeChild(popupDiv);
                                    document.removeEventListener('click', handleClickOutside, true);
                                  }
                                };
                                
                                // Create filter input
                                const inputElement = document.createElement('input');
                                inputElement.className = 'w-full p-2 text-sm border rounded-md mb-2 bg-background text-foreground';
                                inputElement.placeholder = `Filter ${column.name}...`;
                                inputElement.value = columnFilters[column.id] || '';
                                inputElement.addEventListener('input', (inputEvent) => {
                                  const inputEl = inputEvent.target as HTMLInputElement;
                                  const newFilters = { ...columnFilters };
                                  if (inputEl.value) {
                                    newFilters[column.id] = inputEl.value;
                                  } else {
                                    delete newFilters[column.id];
                                  }
                                  setColumnFilters(newFilters);
                                });
                                
                                // Create buttons
                                const buttonDiv = document.createElement('div');
                                buttonDiv.className = 'flex justify-between';
                                
                                // Clear button
                                const clearButton = document.createElement('button');
                                clearButton.className = 'px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80';
                                clearButton.textContent = 'Clear';
                                clearButton.addEventListener('click', () => {
                                  const newFilters = { ...columnFilters };
                                  delete newFilters[column.id];
                                  setColumnFilters(newFilters);
                                  document.body.removeChild(popupDiv);
                                });
                                
                                // Apply button
                                const applyButton = document.createElement('button');
                                applyButton.className = 'px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90';
                                applyButton.textContent = 'Apply';
                                applyButton.addEventListener('click', () => {
                                  document.body.removeChild(popupDiv);
                                });
                                
                                buttonDiv.appendChild(clearButton);
                                buttonDiv.appendChild(applyButton);
                                
                                popupDiv.appendChild(inputElement);
                                popupDiv.appendChild(buttonDiv);
                                document.body.appendChild(popupDiv);
                                
                                // Focus the input
                                inputElement.focus();
                                
                                // Add event listener to handle clicks outside
                                setTimeout(() => {
                                  document.addEventListener('click', handleClickOutside, true);
                                }, 100);
                              }}
                            >
                              {column.name}
                              {column.required && (
                                <Badge variant="outline" className="ml-1 font-normal">
                                  Required
                                </Badge>
                              )}
                              {columnFilters[column.id] && (
                                <Filter className="h-3.5 w-3.5 ml-1 text-blue-500" />
                              )}
                            </div>
                            {columnFilters[column.id] && (
                              <div className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                <span className="truncate max-w-[120px]">"{columnFilters[column.id]}"</span>
                              </div>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAddingRow && (
                      <TableRow className="bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="icon"
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => {
                                // Save the new row
                                addRowMutation.mutate(newRowData);
                              }}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon"
                              variant="ghost" 
                              className="h-7 w-7"
                              onClick={() => {
                                // Cancel adding row
                                setIsAddingRow(false);
                                setNewRowData({});
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        {columns.map((column: ColumnDefinition) => (
                          <TableCell key={column.id}>
                            {column.type === 'text' && (
                              <Input
                                placeholder={column.name}
                                className="w-full h-8 p-2 text-sm"
                                value={newRowData[column.id] || ''}
                                onChange={(e) => setNewRowData({
                                  ...newRowData,
                                  [column.id]: e.target.value
                                })}
                              />
                            )}
                            
                            {column.type === 'number' && (
                              <Input
                                type="number"
                                placeholder={column.name}
                                className="w-full h-8 p-2 text-sm"
                                value={newRowData[column.id] || ''}
                                onChange={(e) => setNewRowData({
                                  ...newRowData,
                                  [column.id]: e.target.value === '' ? null : Number(e.target.value)
                                })}
                              />
                            )}
                            
                            {column.type === 'boolean' && (
                              <Checkbox
                                checked={!!newRowData[column.id]}
                                onCheckedChange={(checked) => setNewRowData({
                                  ...newRowData,
                                  [column.id]: !!checked
                                })}
                                className="mx-2"
                              />
                            )}
                            
                            {column.type === 'date' && (
                              <Input
                                type="date"
                                className="w-full h-8 p-2 text-sm"
                                value={newRowData[column.id] || ''}
                                onChange={(e) => setNewRowData({
                                  ...newRowData,
                                  [column.id]: e.target.value
                                })}
                              />
                            )}
                            
                            {column.type === 'select' && (
                              <Select
                                value={newRowData[column.id] || ''}
                                onValueChange={(value) => setNewRowData({
                                  ...newRowData,
                                  [column.id]: value
                                })}
                              >
                                <SelectTrigger className="w-full h-8 text-sm">
                                  <SelectValue placeholder={`Select ${column.name}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(column.options || []).map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                    
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
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this row? This action cannot be undone.")) {
                                      deleteRowMutation.mutate(row.id);
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700 focus:text-red-700"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Row
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          {columns.map((column: ColumnDefinition) => {
                            // Get cell value, handling potential nesting
                            const cellValue = row.data && typeof row.data === 'object' 
                              ? (row.data.data && typeof row.data.data === 'object'
                                ? row.data.data[column.id]  // For nested data.data
                                : row.data[column.id])      // For direct data
                              : undefined;
                            
                            // Check if this cell is being edited
                            const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id;
                            
                            return (
                              <TableCell 
                                key={column.id} 
                                className="truncate max-w-[300px] relative group p-1"
                                onClick={() => {
                                  // Start editing when cell is clicked (except for boolean which toggles directly)
                                  if (column.type !== 'boolean' && !isEditing) {
                                    startEditing(row.id, column.id, column.type || 'text', cellValue);
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-1">
                                    {column.type === 'text' && (
                                      <Input
                                        className="w-full h-8 p-1 text-sm"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveEditedCell();
                                          } else if (e.key === 'Escape') {
                                            cancelEditing();
                                          }
                                        }}
                                      />
                                    )}
                                    
                                    {column.type === 'number' && (
                                      <Input
                                        type="number"
                                        className="w-full h-8 p-1 text-sm"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveEditedCell();
                                          } else if (e.key === 'Escape') {
                                            cancelEditing();
                                          }
                                        }}
                                      />
                                    )}
                                    
                                    {column.type === 'date' && (
                                      <Input
                                        type="date"
                                        className="w-full h-8 p-1 text-sm"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveEditedCell();
                                          } else if (e.key === 'Escape') {
                                            cancelEditing();
                                          }
                                        }}
                                      />
                                    )}
                                    
                                    {column.type === 'select' && (
                                      <Select
                                        value={editValue}
                                        onValueChange={(value) => {
                                          setEditValue(value);
                                          // Automatically save after selection
                                          setTimeout(() => saveEditedCell(), 100);
                                        }}
                                      >
                                        <SelectTrigger className="w-full h-8 p-1 text-sm">
                                          <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {(column.options || []).map((option) => (
                                            <SelectItem key={option} value={option}>
                                              {option}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                    
                                    <div className="flex gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={saveEditedCell}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                        onClick={cancelEditing}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between cursor-pointer">
                                    {column.type === 'boolean' ? (
                                      <Checkbox
                                        checked={!!cellValue}
                                        onCheckedChange={(checked) => {
                                          // For boolean fields, toggle directly without entering edit mode
                                          startEditing(row.id, column.id, column.type, checked);
                                          setEditValue(String(checked));
                                          setTimeout(() => saveEditedCell(), 0);
                                        }}
                                        className="m-2"
                                      />
                                    ) : (
                                      <div className="truncate hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md w-full">
                                        {formatCellValue(cellValue, column.type)}
                                      </div>
                                    )}
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="opacity-0 group-hover:opacity-100 h-6 w-6 ml-2 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(row.id, column.id, column.type || 'text', cellValue);
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
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
                                onClick={() => setIsAddingRow(true)}
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