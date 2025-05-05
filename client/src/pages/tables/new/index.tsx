import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ArrowLeft, Plus, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

// Form schema for table creation
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
  id: "",
  name: "",
  type: "text" as const,
  required: false,
  options: [],
  default: null,
};

export default function NewTablePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State to manage column options for select-type columns
  const [optionInputs, setOptionInputs] = useState<Record<number, string>>({});
  
  // Setup form
  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      description: "",
      columns: [{ ...defaultColumnValues }],
    },
  });
  
  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (data: TableFormValues) => {
      const response = await apiRequest('/api/tables', {
        method: 'POST',
        data,
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Table created",
        description: "The table has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      navigate(`/tables/${data.id}`);
    },
    onError: (error: any) => {
      console.error("Failed to create table:", error);
      toast({
        title: "Error",
        description: "Failed to create table. Please check column configuration.",
        variant: "destructive",
      });
    }
  });
  
  // Add column handler
  const addColumn = () => {
    const columns = form.getValues("columns") || [];
    form.setValue("columns", [...columns, { ...defaultColumnValues }]);
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
      // Process based on column type
      let processedColumn = { ...column };
      
      // Default value handling based on type
      let defaultValue = column.default;
      
      if (column.type === 'text' || column.type === 'select') {
        defaultValue = typeof defaultValue === 'string' ? defaultValue : '';
      } else if (column.type === 'number') {
        defaultValue = typeof defaultValue === 'number' ? defaultValue : null;
      } else if (column.type === 'boolean') {
        defaultValue = typeof defaultValue === 'boolean' ? defaultValue : false;
      } else if (column.type === 'date') {
        defaultValue = defaultValue instanceof Date ? defaultValue : null;
      }
      
      processedColumn.default = defaultValue;
      
      // Only include options for select-type columns
      if (column.type !== 'select') {
        processedColumn.options = [];
      }
      
      return processedColumn;
    });
    
    createTableMutation.mutate({
      ...values,
      columns: cleanedColumns,
    });
  };
  
  // Generate a slug from the table name
  const generateColumnId = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 32); // Limit length
  };
  
  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex flex-col mb-6">
          <Button 
            variant="link" 
            className="text-sm text-muted-foreground hover:text-foreground w-fit p-0 mb-2"
            onClick={() => navigate("/tables")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Tables
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create New Table</h1>
          <p className="text-muted-foreground mt-1">Define your table structure with columns and data types</p>
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
                {form.watch("columns")?.map((_, index) => (
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
                                  // Auto-generate column ID when name changes
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
                              />
                            </FormControl>
                            <FormDescription>
                              Unique identifier for this column
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
                          
                          {!(form.watch(`columns.${index}.options`)?.length) && (
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
                onClick={() => navigate("/tables")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTableMutation.isPending}
              >
                {createTableMutation.isPending ? "Creating..." : "Create Table"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}