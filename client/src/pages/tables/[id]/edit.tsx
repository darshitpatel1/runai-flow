import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Save, Trash2Icon, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, ColumnDefinition } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
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

// Form schema for table editing
const tableFormSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  description: z.string().optional(),
  columns: z.array(z.object({
    id: z.string().min(1, "Column ID is required"),
    name: z.string().min(1, "Column name is required"),
    type: z.enum(['text', 'number', 'boolean', 'date', 'select']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional().nullable(),
    default: z.any().optional().nullable(),
  })).min(1, "At least one column is required"),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

const defaultColumnValues = {
  id: "column_" + Date.now().toString(36),
  name: "",
  type: "text" as const,
  required: false,
  options: [],
  default: null,
};

export default function TableEditPage() {
  const [, params] = useRoute('/tables/:id/edit');
  const [, navigate] = useLocation();
  const tableId = params?.id ? parseInt(params.id) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // State to manage column options for select-type columns
  const [optionInputs, setOptionInputs] = useState<Record<number, string>>({});
  
  // Get table data
  const { data: tables, isLoading: isTablesLoading } = useQuery({
    queryKey: ['/api/tables'],
    enabled: !!tableId && !!user,
  });
  
  // Get the specific table from the tables data
  const table = useMemo(() => {
    if (!tables || !Array.isArray(tables)) return undefined;
    return tables.find(t => t.id === tableId);
  }, [tables, tableId]);
  
  const isLoading = isTablesLoading || !table;
  
  // Setup form
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      description: "",
      columns: [{ ...defaultColumnValues }],
    },
  });
  
  // Debug function to inspect table structure
  useEffect(() => {
    if (table) {
      console.log("Table data in edit form:", table);
      console.log("Table columns type:", typeof table.columns);
      console.log("Is columns array?", Array.isArray(table.columns));
      
      if (typeof table.columns === 'string') {
        try {
          const parsed = JSON.parse(table.columns);
          console.log("Parsed columns from string:", parsed);
        } catch (e) {
          console.error("Failed to parse columns string:", e);
        }
      }
    }
  }, [table]);
  
  // Update form values when table data is loaded
  useEffect(() => {
    if (table) {      
      // Parse columns data which could be in different formats
      let parsedColumns;
      
      try {
        if (Array.isArray(table.columns)) {
          parsedColumns = table.columns;
        } else if (typeof table.columns === 'string') {
          parsedColumns = JSON.parse(table.columns);
        } else if (typeof table.columns === 'object' && table.columns !== null) {
          parsedColumns = [table.columns];
        } else {
          parsedColumns = [{ ...defaultColumnValues }];
        }
        
        console.log("Parsed columns:", parsedColumns);
        
        form.reset({
          name: table.name,
          description: table.description || "",
          columns: Array.isArray(parsedColumns) 
            ? parsedColumns.map((col: ColumnDefinition) => ({
                id: col.id || generateColumnId(col.name || "column"),
                name: col.name || "",
                type: col.type || "text",
                required: !!col.required,
                options: Array.isArray(col.options) ? col.options : [],
                default: col.default || null,
              }))
            : [{ ...defaultColumnValues }],
        });
      } catch (error) {
        console.error("Error parsing table columns:", error);
        form.reset({
          name: table.name,
          description: table.description || "",
          columns: [{ ...defaultColumnValues }],
        });
        
        toast({
          title: "Warning",
          description: "There was an issue loading the table columns. Starting with a default column.",
          variant: "destructive",
        });
      }
    }
  }, [table, form, toast]);
  
  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: async (data: TableFormValues) => {
      return await apiRequest(`/api/tables/${tableId}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Table updated",
        description: "The table has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables', tableId] });
      navigate(`/tables/${tableId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update table",
        variant: "destructive",
      });
    }
  });
  
  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tables/${tableId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Table deleted",
        description: "The table has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      navigate('/tables');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete table",
        variant: "destructive",
      });
    }
  });
  
  // Add column handler
  const addColumn = () => {
    const columns = form.getValues("columns") || [];
    form.setValue("columns", [...columns, { 
      ...defaultColumnValues,
      id: "column_" + Date.now().toString(36) // Ensure unique ID on every new column
    }]);
  };
  
  // Remove column handler
  const removeColumn = (index: number) => {
    const columns = form.getValues("columns") || [];
    if (columns.length > 1) {
      form.setValue("columns", columns.filter((_, i) => i !== index));
    } else {
      toast({
        title: "Cannot remove column",
        description: "A table must have at least one column",
        variant: "destructive",
      });
    }
  };
  
  // Add option to a select-type column
  const addOption = (columnIndex: number) => {
    const option = optionInputs[columnIndex]?.trim();
    if (!option) return;
    
    const columns = form.getValues("columns");
    const columnOptions = columns[columnIndex].options || [];
    
    if (columnOptions.includes(option)) {
      toast({
        title: "Duplicate option",
        description: "This option already exists",
        variant: "destructive",
      });
      return;
    }
    
    form.setValue(`columns.${columnIndex}.options`, [...columnOptions, option]);
    
    // Clear the input
    setOptionInputs({
      ...optionInputs,
      [columnIndex]: "",
    });
  };
  
  // Remove option from a select-type column
  const removeOption = (columnIndex: number, optionIndex: number) => {
    const columns = form.getValues("columns");
    const columnOptions = columns[columnIndex].options || [];
    
    form.setValue(
      `columns.${columnIndex}.options`,
      columnOptions.filter((_, i) => i !== optionIndex)
    );
  };
  
  // Handle option input change
  const handleOptionInputChange = (columnIndex: number, value: string) => {
    setOptionInputs({
      ...optionInputs,
      [columnIndex]: value,
    });
  };
  
  // Handle form submission
  const onSubmit = (values: TableFormValues) => {
    // Clean up column data before submission
    const cleanedColumns = values.columns.map((column) => {
      // Only include options for select-type columns
      if (column.type !== 'select') {
        return { ...column, options: [] };
      }
      
      // Ensure default values match the column type
      let defaultValue = column.default;
      
      switch (column.type) {
        case 'text':
        case 'select':
          defaultValue = typeof defaultValue === 'string' ? defaultValue : '';
          break;
        case 'number':
          defaultValue = typeof defaultValue === 'number' ? defaultValue : null;
          break;
        case 'boolean':
          defaultValue = typeof defaultValue === 'boolean' ? defaultValue : false;
          break;
        case 'date':
          defaultValue = defaultValue instanceof Date ? defaultValue : null;
          break;
      }
      
      return { ...column, default: defaultValue };
    });
    
    updateTableMutation.mutate({
      ...values,
      columns: cleanedColumns,
    });
  };
  
  // Handle table deletion
  const handleDeleteTable = () => {
    deleteTableMutation.mutate();
  };
  
  // Generate a slug from the column name
  const generateColumnId = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 32); // Limit length
  };
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full mb-8"></div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
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
              onClick={() => navigate('/tables')}
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <Button 
              variant="link" 
              className="text-sm text-muted-foreground hover:text-foreground p-0 mb-2"
              onClick={() => navigate(`/tables/${tableId}`)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to {table.name}
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Table</h1>
            <p className="text-muted-foreground mt-1">Modify your table structure and settings</p>
          </div>
          
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete Table
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the table
                  "{table.name}" and all of its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTable}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Table Information</CardTitle>
                <CardDescription>Basic information about your table</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter table name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter a description for this table" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Columns</CardTitle>
                <CardDescription>Define your table's columns and data types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {form.watch("columns").map((column, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => removeColumn(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`columns.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Column Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter column name" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Auto-generate column ID when name changes if it's empty
                                  if (e.target.value && !form.getValues(`columns.${index}.id`)) {
                                    form.setValue(
                                      `columns.${index}.id`, 
                                      generateColumnId(e.target.value)
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`columns.${index}.id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Column ID</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter column ID" 
                                {...field} 
                                disabled={index < (table.columns?.length || 0)} // Disable existing column IDs
                              />
                            </FormControl>
                            <FormDescription>
                              {index < (table.columns?.length || 0) 
                                ? "ID cannot be changed for existing columns" 
                                : "Unique identifier for this column"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`columns.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data Type</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Reset options when changing type from select
                                if (value !== 'select') {
                                  form.setValue(`columns.${index}.options`, []);
                                }
                              }}
                              disabled={index < (table.columns?.length || 0)} // Disable existing column types
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select data type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="select">Select (Dropdown)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {index < (table.columns?.length || 0) 
                                ? "Type cannot be changed for existing columns" 
                                : "The data type for this column"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`columns.${index}.required`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Required</FormLabel>
                              <FormDescription>
                                This field must have a value
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Select Options (Only for select type columns) */}
                    {form.watch(`columns.${index}.type`) === 'select' && (
                      <div className="space-y-2">
                        <FormLabel>Options</FormLabel>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Enter option"
                            value={optionInputs[index] || ''}
                            onChange={(e) => handleOptionInputChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addOption(index);
                              }
                            }}
                          />
                          <Button 
                            type="button" 
                            onClick={() => addOption(index)}
                          >
                            Add
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(form.watch(`columns.${index}.options`) || []).map((option, optionIndex) => (
                            <div 
                              key={optionIndex}
                              className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center text-sm"
                            >
                              {option}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 ml-1"
                                onClick={() => removeOption(index, optionIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          
                          {!form.watch(`columns.${index}.options`)?.length && (
                            <div className="text-sm text-muted-foreground">
                              No options added yet
                            </div>
                          )}
                        </div>
                        
                        <FormMessage>
                          {form.formState.errors.columns?.[index]?.options?.message}
                        </FormMessage>
                      </div>
                    )}
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addColumn}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Column
                </Button>
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/tables/${tableId}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateTableMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateTableMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}