import { useState, useEffect } from "react";
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
import { ArrowLeft, Save, Trash2Icon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, ColumnDefinition } from "@shared/schema";

export default function EditRowPage() {
  const [, params] = useRoute('/tables/:id/edit-row/:rowId');
  const [, navigate] = useLocation();
  const tableId = params?.id ? parseInt(params.id) : null;
  const rowId = params?.rowId ? parseInt(params.rowId) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get table data
  const { data: table, isLoading: isTableLoading } = useQuery({
    queryKey: ['/api/tables', tableId],
    enabled: !!tableId && !!user,
  });
  
  // Get table rows to find the current row
  const { data: tableRows, isLoading: isRowsLoading } = useQuery({
    queryKey: ['/api/tables', tableId, 'rows'],
    enabled: !!tableId && !!user,
  });
  
  // Extract current row data
  const currentRow = tableRows?.find((row: any) => row.id === rowId);
  
  // Create form schema based on table columns
  const [formSchema, setFormSchema] = useState<any>(z.object({}));
  
  useEffect(() => {
    if (table && table.columns) {
      try {
        const columns = table.columns as ColumnDefinition[];
        
        // Build schema based on column types
        const schemaObj: any = {};
        
        columns.forEach((column: ColumnDefinition) => {
          const { id, name, type, required } = column;
          
          let fieldSchema: any;
          
          switch (type) {
            case 'text':
              fieldSchema = z.string();
              break;
            case 'number':
              fieldSchema = z.coerce.number();
              break;
            case 'boolean':
              fieldSchema = z.boolean();
              break;
            case 'date':
              fieldSchema = z.string();
              break;
            case 'select':
              fieldSchema = z.string();
              break;
            default:
              fieldSchema = z.string();
          }
          
          // Make field optional if not required
          if (!required) {
            fieldSchema = fieldSchema.optional();
          }
          
          schemaObj[id] = fieldSchema;
        });
        
        setFormSchema(z.object(schemaObj));
      } catch (error) {
        console.error("Error creating form schema:", error);
        toast({
          title: "Error",
          description: "Failed to create form from table schema",
          variant: "destructive",
        });
      }
    }
  }, [table, toast]);
  
  // Update row mutation
  const updateRowMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/tables/${tableId}/rows/${rowId}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Row updated",
        description: "The row has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables', tableId, 'rows'] });
      navigate(`/tables/${tableId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update row",
        variant: "destructive",
      });
    }
  });
  
  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: async () => {
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
      navigate(`/tables/${tableId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      });
    }
  });
  
  // Setup form
  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: "onChange",
  });
  
  // Initialize form with row data when available
  useEffect(() => {
    if (table?.columns && currentRow?.data) {
      try {
        const columns = table.columns as ColumnDefinition[];
        const rowData = currentRow.data;
        
        // Create a defaultValues object from row data
        const defaultValues: any = {};
        
        columns.forEach((column: ColumnDefinition) => {
          const value = rowData[column.id];
          
          // Set the value if it exists, otherwise use appropriate default
          if (value !== undefined) {
            defaultValues[column.id] = value;
          } else {
            // Set appropriate empty values based on type
            switch (column.type) {
              case 'text':
              case 'select':
                defaultValues[column.id] = '';
                break;
              case 'number':
                defaultValues[column.id] = 0;
                break;
              case 'boolean':
                defaultValues[column.id] = false;
                break;
              case 'date':
                defaultValues[column.id] = '';
                break;
            }
          }
        });
        
        form.reset(defaultValues);
      } catch (error) {
        console.error("Error setting form values:", error);
      }
    }
  }, [table, currentRow, form]);
  
  // Handle form submission
  const onSubmit = (values: any) => {
    updateRowMutation.mutate(values);
  };
  
  // Handle row deletion
  const handleDeleteRow = () => {
    if (confirm("Are you sure you want to delete this row? This action cannot be undone.")) {
      deleteRowMutation.mutate();
    }
  };
  
  // Format date for date inputs
  const formatDateForInput = (date: string | null): string => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
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
  
  if (!table || !currentRow) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold">Row not found</h2>
            <p className="text-muted-foreground mt-2">The row you're looking for doesn't exist.</p>
            <Button 
              className="mt-4" 
              onClick={() => navigate(tableId ? `/tables/${tableId}` : "/tables")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to {table ? table.name : 'Tables'}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  const columns = (table.columns || []) as ColumnDefinition[];
  
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
            <h1 className="text-3xl font-bold tracking-tight">Edit Row</h1>
            <p className="text-muted-foreground mt-1">Modify row values for table {table.name}</p>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={handleDeleteRow}
            disabled={deleteRowMutation.isPending}
          >
            <Trash2Icon className="mr-2 h-4 w-4" />
            Delete Row
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Row Data</CardTitle>
            <CardDescription>Edit the values for each column</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {columns.map((column) => (
                    <FormField
                      key={column.id}
                      control={form.control}
                      name={column.id}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{column.name}{column.required && <span className="text-red-500 ml-1">*</span>}</FormLabel>
                          <FormControl>
                            {column.type === 'text' && (
                              <Input 
                                placeholder={`Enter ${column.name.toLowerCase()}`} 
                                {...field} 
                                value={field.value || ''} 
                              />
                            )}
                            
                            {column.type === 'number' && (
                              <Input 
                                type="number" 
                                placeholder={`Enter ${column.name.toLowerCase()}`} 
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? "0" : e.target.value;
                                  field.onChange(Number(value));
                                }}
                                value={field.value === 0 || field.value ? field.value : ''}
                              />
                            )}
                            
                            {column.type === 'date' && (
                              <Input 
                                type="date" 
                                {...field} 
                                value={formatDateForInput(field.value)}
                              />
                            )}
                            
                            {column.type === 'boolean' && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${column.id}-checkbox`}
                                  checked={!!field.value}
                                  onCheckedChange={field.onChange}
                                />
                                <label
                                  htmlFor={`${column.id}-checkbox`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {column.name}
                                </label>
                              </div>
                            )}
                            
                            {column.type === 'select' && (
                              <Select
                                value={field.value?.toString() || ''}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${column.name.toLowerCase()}`} />
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                
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
                    disabled={updateRowMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateRowMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}