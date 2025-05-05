import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PlusCircle, Save, TrashIcon, ArrowUpDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DataTable, ColumnDefinition, columnTypeSchema } from "@shared/schema";

// Form schema for table details
const tableFormSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  description: z.string().optional(),
  columns: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Column name is required"),
      type: columnTypeSchema,
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      default: z.any().optional(),
    })
  ).min(1, "At least one column is required"),
});

type TableFormValues = z.infer<typeof tableFormSchema>;

export default function TableEditPage() {
  const [, params] = useRoute('/tables/:id/edit');
  const [, navigate] = useLocation();
  const isNewTable = params?.id === 'new';
  const tableId = isNewTable ? null : Number(params?.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for column options (for select type)
  const [columnOptionsInputs, setColumnOptionsInputs] = useState<{ [key: string]: string }>({});
  
  // Generate a unique column ID
  const generateColumnId = () => `col_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Get table data for editing
  const { data: table, isLoading } = useQuery({
    queryKey: ['/api/tables', tableId],
    enabled: !!tableId && !!user && !isNewTable,
  });
  
  // Create/Update table mutation
  const tableMutation = useMutation({
    mutationFn: async (data: TableFormValues) => {
      if (isNewTable) {
        return await apiRequest('/api/tables', {
          method: 'POST',
          data,
        });
      } else {
        return await apiRequest(`/api/tables/${tableId}`, {
          method: 'PUT',
          data,
        });
      }
    },
    onSuccess: (data) => {
      toast({
        title: isNewTable ? "Table created" : "Table updated",
        description: isNewTable 
          ? "Your new table has been created successfully" 
          : "Table has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tables', tableId] });
      
      // Redirect to the table detail page
      navigate(isNewTable ? `/tables/${data.id}` : `/tables/${tableId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: isNewTable ? "Failed to create table" : "Failed to update table",
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
      
      // Redirect to tables list
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
  
  // Setup form
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: '',
      description: '',
      columns: [
        {
          id: generateColumnId(),
          name: '',
          type: 'text',
          required: false,
        },
      ],
    },
  });
  
  // Initialize form with table data when available
  useState(() => {
    if (table) {
      form.reset({
        name: table.name,
        description: table.description || '',
        columns: Array.isArray(table.columns) 
          ? table.columns.map((col: ColumnDefinition) => ({
              id: col.id,
              name: col.name,
              type: col.type,
              required: col.required || false,
              options: col.options || [],
              default: col.default,
            }))
          : [{ id: generateColumnId(), name: '', type: 'text', required: false }],
      });
      
      // Initialize column options inputs
      const optionsState: {[key: string]: string} = {};
      if (Array.isArray(table.columns)) {
        table.columns.forEach((col: ColumnDefinition) => {
          if (col.type === 'select' && Array.isArray(col.options)) {
            optionsState[col.id] = col.options.join(', ');
          }
        });
      }
      setColumnOptionsInputs(optionsState);
    }
  }, [table]);
  
  // Handle form submission
  const onSubmit = (values: TableFormValues) => {
    // Process column options from comma-separated string to array
    const processedValues = {
      ...values,
      columns: values.columns.map(col => {
        if (col.type === 'select') {
          return {
            ...col,
            options: columnOptionsInputs[col.id]
              ? columnOptionsInputs[col.id].split(',').map(opt => opt.trim()).filter(Boolean)
              : [],
          };
        }
        return col;
      }),
    };
    
    tableMutation.mutate(processedValues);
  };
  
  // Add a new column
  const addColumn = () => {
    const columns = form.getValues('columns');
    form.setValue('columns', [
      ...columns,
      {
        id: generateColumnId(),
        name: '',
        type: 'text',
        required: false,
      },
    ]);
  };
  
  // Remove a column
  const removeColumn = (index: number) => {
    const columns = form.getValues('columns');
    if (columns.length <= 1) {
      toast({
        title: "Error",
        description: "You cannot remove all columns",
        variant: "destructive",
      });
      return;
    }
    
    const removedColumn = columns[index];
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    form.setValue('columns', newColumns);
    
    // Remove from options state if it exists
    if (removedColumn.id in columnOptionsInputs) {
      const newOptionsState = { ...columnOptionsInputs };
      delete newOptionsState[removedColumn.id];
      setColumnOptionsInputs(newOptionsState);
    }
  };
  
  // Move column up
  const moveColumnUp = (index: number) => {
    if (index === 0) return;
    const columns = form.getValues('columns');
    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[index - 1];
    newColumns[index - 1] = temp;
    form.setValue('columns', newColumns);
  };
  
  // Move column down
  const moveColumnDown = (index: number) => {
    const columns = form.getValues('columns');
    if (index === columns.length - 1) return;
    const newColumns = [...columns];
    const temp = newColumns[index];
    newColumns[index] = newColumns[index + 1];
    newColumns[index + 1] = temp;
    form.setValue('columns', newColumns);
  };
  
  // Handle delete table
  const handleDeleteTable = () => {
    if (confirm("Are you sure you want to delete this table? This will delete all data in the table and cannot be undone.")) {
      deleteTableMutation.mutate();
    }
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <a 
              href={isNewTable ? "/tables" : `/tables/${tableId}`} 
              className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
              onClick={(e) => {
                e.preventDefault();
                navigate(isNewTable ? "/tables" : `/tables/${tableId}`);
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {isNewTable ? "Back to Tables" : "Back to Table Details"}
            </a>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNewTable ? "Create New Table" : `Edit Table: ${table?.name}`}
            </h1>
          </div>
          
          {!isNewTable && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteTable}
              disabled={deleteTableMutation.isPending}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Delete Table
            </Button>
          )}
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{isNewTable ? "New Table Details" : "Edit Table Details"}</CardTitle>
            <CardDescription>
              {isNewTable 
                ? "Define your table structure with columns and data types" 
                : "Modify your table structure and settings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Table Name and Description */}
                <div className="grid gap-4 md:grid-cols-2">
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
                </div>
                
                {/* Columns Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Columns</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addColumn}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Column
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {form.watch('columns').map((column, index) => (
                      <Card key={column.id} className="relative">
                        <CardContent className="pt-4">
                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                              <FormField
                                control={form.control}
                                name={`columns.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Column Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter column name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="w-full md:w-40">
                              <FormField
                                control={form.control}
                                name={`columns.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={(value: any) => {
                                        field.onChange(value);
                                        // Clear options if changing from select type
                                        if (field.value === 'select' && value !== 'select') {
                                          const newOptionsState = { ...columnOptionsInputs };
                                          delete newOptionsState[column.id];
                                          setColumnOptionsInputs(newOptionsState);
                                        }
                                      }}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select type" />
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
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="w-full md:w-28">
                              <FormField
                                control={form.control}
                                name={`columns.${index}.required`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel>Required</FormLabel>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          {/* Options for select type */}
                          {form.watch(`columns.${index}.type`) === 'select' && (
                            <div className="mt-4">
                              <FormLabel>Options (Comma-separated)</FormLabel>
                              <Input
                                placeholder="Option 1, Option 2, Option 3"
                                value={columnOptionsInputs[column.id] || ''}
                                onChange={(e) => {
                                  setColumnOptionsInputs({
                                    ...columnOptionsInputs,
                                    [column.id]: e.target.value,
                                  });
                                }}
                              />
                              <FormDescription className="text-xs mt-1">
                                Enter options as comma-separated values
                              </FormDescription>
                            </div>
                          )}
                          
                          {/* Column Actions */}
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveColumnUp(index)}
                              disabled={index === 0}
                            >
                              <ArrowUpDown className="h-4 w-4 rotate-90" />
                              <span className="sr-only">Move Up</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => moveColumnDown(index)}
                              disabled={index === form.watch('columns').length - 1}
                            >
                              <ArrowUpDown className="h-4 w-4 rotate-270" />
                              <span className="sr-only">Move Down</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeColumn(index)}
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {/* Form Actions */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(isNewTable ? "/tables" : `/tables/${tableId}`)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={tableMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {tableMutation.isPending 
                      ? (isNewTable ? "Creating..." : "Saving...") 
                      : (isNewTable ? "Create Table" : "Save Changes")
                    }
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