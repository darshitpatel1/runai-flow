import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreVertical,
  GitBranchIcon,
  CheckCircle,
  XCircle,
  Variable,
} from "lucide-react";
import { VariableSelectDialog } from "../VariableSelectDialog";
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

const NODE_WIDTH = 320;

interface IfElseNodeData {
  label: string;
  condition: string;
  type: "comparison" | "expression" | "exists";
  comparison?: {
    left: string;
    operator: "==" | "!=" | ">" | ">=" | "<" | "<=" | "contains" | "startsWith" | "endsWith";
    right: string;
  };
  expression?: string;
  exists?: string;
  description?: string;
  nodes?: any[]; // Used for variable selection
  onChange?: (id: string, data: any) => void; // Handler for data changes
}

export default function IfElseNode({ id, data, isConnectable, selected }: NodeProps) {
  // Initialize with defaults to avoid type issues
  const defaultData: IfElseNodeData = {
    ...data,
    label: data.label || "If-Else",
    condition: data.condition || "",
    type: data.type || "comparison"
  };
  
  const [nodeData, setNodeData] = useState<IfElseNodeData>(defaultData);
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState<{
    field: string;
    subField?: string;
  } | null>(null);

  // Update parent data when nodeData changes
  useEffect(() => {
    if (data.onChange) {
      data.onChange(id, nodeData);
    }
  }, [id, nodeData, data]);

  // Update condition string based on comparison values
  useEffect(() => {
    // Clone nodeData to modify without type issues
    const updatedData = { ...nodeData };
    let conditionChanged = false;
    
    if (nodeData.type === "comparison" && nodeData.comparison) {
      const { left, operator, right } = nodeData.comparison;
      
      // Only update if we have all parts of the comparison
      if (left && operator && right) {
        let conditionStr = "";
        
        if (operator === "contains") {
          conditionStr = `${left}.includes(${right})`;
        } else if (operator === "startsWith") {
          conditionStr = `${left}.startsWith(${right})`;
        } else if (operator === "endsWith") {
          conditionStr = `${left}.endsWith(${right})`;
        } else {
          conditionStr = `${left} ${operator} ${right}`;
        }
        
        if (conditionStr !== nodeData.condition) {
          updatedData.condition = conditionStr;
          conditionChanged = true;
        }
      }
    } else if (nodeData.type === "expression" && nodeData.expression) {
      if (nodeData.expression !== nodeData.condition) {
        updatedData.condition = nodeData.expression;
        conditionChanged = true;
      }
    } else if (nodeData.type === "exists" && nodeData.exists) {
      const conditionStr = `!!${nodeData.exists}`;
      if (conditionStr !== nodeData.condition) {
        updatedData.condition = conditionStr;
        conditionChanged = true;
      }
    }
    
    // Only update state if the condition actually changed
    if (conditionChanged) {
      setNodeData(updatedData);
    }
  }, [nodeData.type, nodeData.comparison, nodeData.expression, nodeData.exists]);

  const handleConditionTypeChange = (type: IfElseNodeData["type"]) => {
    setNodeData((prev) => ({ 
      ...prev, 
      type,
      comparison: type === "comparison" ? prev.comparison || { left: "", operator: "==", right: "" } : undefined,
      expression: type === "expression" ? prev.expression || "" : undefined,
      exists: type === "exists" ? prev.exists || "" : undefined,
    }));
  };

  // We need to define a type to ensure TypeScript understands the field parameter
  type ComparisonField = "left" | "operator" | "right";
  
  const handleComparisonChange = (field: ComparisonField, value: string) => {
    setNodeData((prev) => ({
      ...prev,
      comparison: {
        ...(prev.comparison || { left: "", operator: "==" as const, right: "" }),
        [field]: value,
      },
    }));
  };

  const handleExpressionChange = (expression: string) => {
    setNodeData((prev) => ({
      ...prev,
      expression,
    }));
  };

  const handleExistsChange = (exists: string) => {
    setNodeData((prev) => ({
      ...prev,
      exists,
    }));
  };

  const openVariableDialog = (field: string, subField?: string) => {
    setCurrentEditField({ field, subField });
    setVariableDialogOpen(true);
  };

  const handleVariableSelect = (variablePath: string) => {
    if (!currentEditField) return;
    
    const { field, subField } = currentEditField;
    
    if (field === "comparison" && subField) {
      if (subField === "left" || subField === "right") {
        handleComparisonChange(subField, variablePath);
      }
    } else if (field === "expression") {
      handleExpressionChange(variablePath);
    } else if (field === "exists") {
      handleExistsChange(variablePath);
    }
  };

  const renderConditionEditor = () => {
    if (nodeData.type === "comparison") {
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Left Side</Label>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-6 w-6"
                onClick={() => openVariableDialog("comparison", "left")}
              >
                <Variable className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              placeholder="e.g., {{nodes.http.output.data.count}}"
              value={nodeData.comparison?.left || ""}
              onChange={(e) => handleComparisonChange("left", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs">Operator</Label>
            <Select
              value={nodeData.comparison?.operator || "=="}
              onValueChange={(value) => 
                handleComparisonChange("operator", value as any)
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="==">Equals (==)</SelectItem>
                <SelectItem value="!=">Not Equals (!=)</SelectItem>
                <SelectItem value=">">Greater Than (&gt;)</SelectItem>
                <SelectItem value=">=">Greater Than or Equal (&gt;=)</SelectItem>
                <SelectItem value="<">Less Than (&lt;)</SelectItem>
                <SelectItem value="<=">Less Than or Equal (&lt;=)</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="startsWith">Starts With</SelectItem>
                <SelectItem value="endsWith">Ends With</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Right Side</Label>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-6 w-6"
                onClick={() => openVariableDialog("comparison", "right")}
              >
                <Variable className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              placeholder="e.g., 10 or {{nodes.variables.output.threshold}}"
              value={nodeData.comparison?.right || ""}
              onChange={(e) => handleComparisonChange("right", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      );
    } else if (nodeData.type === "expression") {
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Expression</Label>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-6 w-6"
              onClick={() => openVariableDialog("expression")}
            >
              <Variable className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Textarea
            placeholder="e.g., {{nodes.http.output.data.success && nodes.http.output.data.count > 10}}"
            value={nodeData.expression || ""}
            onChange={(e) => handleExpressionChange(e.target.value)}
            className="min-h-[80px] text-xs font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Write a JavaScript expression that evaluates to true or false
          </p>
        </div>
      );
    } else if (nodeData.type === "exists") {
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs">Check if exists</Label>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="h-6 w-6"
              onClick={() => openVariableDialog("exists")}
            >
              <Variable className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Input
            placeholder="e.g., {{nodes.http.output.data.items}}"
            value={nodeData.exists || ""}
            onChange={(e) => handleExistsChange(e.target.value)}
            className="h-8 text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Branch based on whether this value exists (is not null or undefined)
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <Card
        className={`border-2 ${
          selected ? "border-blue-500" : "border-border"
        } shadow-md bg-background`}
        style={{ width: NODE_WIDTH }}
      >
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center">
            <GitBranchIcon className="w-4 h-4 mr-2 text-primary" />
            <CardTitle className="text-sm font-medium">{data.label || "If-Else"}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Skip</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="px-3 py-2">
          <p className="text-sm text-center mb-2">Configure this node in the settings panel</p>
          <p className="text-xs text-muted-foreground text-center mb-2">
            Click the node and use the right sidebar to set up the condition
          </p>
        </CardContent>

        <CardFooter className="px-3 py-2 border-t flex justify-between items-center text-xs text-muted-foreground">
          <div>If-Else</div>
          <div className="max-w-[200px] truncate">
            {nodeData.condition ? nodeData.condition : "Configure condition..."}
          </div>
        </CardFooter>
      </Card>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-primary"
      />

      {/* True output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        isConnectable={isConnectable}
        className="top-1/3 w-2 h-2 rounded-full border-2 bg-background border-green-500"
        style={{ top: '40%' }}
      />

      {/* False output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        isConnectable={isConnectable}
        className="top-2/3 w-2 h-2 rounded-full border-2 bg-background border-red-500"
        style={{ top: '60%' }}
      />

      {/* True label */}
      <div 
        className="absolute -right-8 text-xs flex items-center text-green-600 font-medium"
        style={{ top: '38%' }}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        True
      </div>

      {/* False label */}
      <div 
        className="absolute -right-8 text-xs flex items-center text-red-600 font-medium"
        style={{ top: '58%' }}
      >
        <XCircle className="h-3 w-3 mr-1" />
        False
      </div>

      {/* Variable selection dialog */}
      <VariableSelectDialog
        open={variableDialogOpen}
        onOpenChange={setVariableDialogOpen}
        onSelect={handleVariableSelect}
        nodes={data.nodes || []}
        currentNodeId={id}
      />
    </>
  );
}