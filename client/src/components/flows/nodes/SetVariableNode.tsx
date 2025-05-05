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
import {
  MoreVertical,
  Plus,
  Trash,
  Variable
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

interface VariableAssignment {
  id: string;
  name: string;
  value: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "expression";
}

interface SetVariableNodeData {
  label: string;
  variables: VariableAssignment[];
  description?: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function SetVariableNode({ id, data, isConnectable, selected }: NodeProps) {
  const [nodeData, setNodeData] = useState<SetVariableNodeData>(data);
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState<{
    variableId: string;
  } | null>(null);

  // Update parent data when nodeData changes
  useEffect(() => {
    if (data.onChange) {
      data.onChange(id, nodeData);
    }
  }, [id, nodeData, data]);

  const handleAddVariable = () => {
    setNodeData((prev) => ({
      ...prev,
      variables: [
        ...prev.variables,
        {
          id: generateId(),
          name: "",
          value: "",
          type: "string"
        },
      ],
    }));
  };

  const handleVariableNameChange = (id: string, name: string) => {
    setNodeData((prev) => ({
      ...prev,
      variables: prev.variables.map((variable) =>
        variable.id === id ? { ...variable, name } : variable
      ),
    }));
  };

  const handleVariableValueChange = (id: string, value: string) => {
    setNodeData((prev) => ({
      ...prev,
      variables: prev.variables.map((variable) =>
        variable.id === id ? { ...variable, value } : variable
      ),
    }));
  };

  const handleVariableTypeChange = (id: string, type: VariableAssignment["type"]) => {
    setNodeData((prev) => ({
      ...prev,
      variables: prev.variables.map((variable) =>
        variable.id === id ? { ...variable, type } : variable
      ),
    }));
  };

  const handleRemoveVariable = (id: string) => {
    setNodeData((prev) => ({
      ...prev,
      variables: prev.variables.filter((variable) => variable.id !== id),
    }));
  };

  const openVariableDialog = (variableId: string) => {
    setCurrentEditField({ variableId });
    setVariableDialogOpen(true);
  };

  const handleVariableSelect = (variablePath: string) => {
    if (!currentEditField) return;
    
    const { variableId } = currentEditField;
    handleVariableValueChange(variableId, variablePath);
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
            <div className="w-4 h-4 mr-2 flex items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">
              V
            </div>
            <CardTitle className="text-sm font-medium">
              {data.label || "Set Variables"}
            </CardTitle>
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

        <CardContent className="px-3 py-2 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs">Variables</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleAddVariable}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Variable
              </Button>
            </div>

            {nodeData.variables.length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {nodeData.variables.map((variable) => (
                  <div key={variable.id} className="space-y-2 border p-2 rounded-md">
                    <div className="flex justify-between">
                      <div className="space-y-1 flex-1 mr-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Variable name"
                          value={variable.name}
                          onChange={(e) =>
                            handleVariableNameChange(variable.id, e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1 w-[110px]">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={variable.type}
                          onValueChange={(value) =>
                            handleVariableTypeChange(
                              variable.id,
                              value as VariableAssignment["type"]
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                            <SelectItem value="array">Array</SelectItem>
                            <SelectItem value="expression">Expression</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs">Value</Label>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-6 w-6"
                            onClick={() => openVariableDialog(variable.id)}
                          >
                            <Variable className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVariable(variable.id)}
                            className="h-6 w-6 text-red-500"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {variable.type === "expression" || variable.type === "object" || variable.type === "array" ? (
                        <Textarea
                          placeholder={
                            variable.type === "expression"
                              ? "{{nodes.http.output.data.items.map(i => i.name)}}"
                              : variable.type === "object"
                              ? '{"key": "value"}'
                              : '["item1", "item2"]'
                          }
                          value={variable.value}
                          onChange={(e) =>
                            handleVariableValueChange(variable.id, e.target.value)
                          }
                          className="min-h-[60px] text-xs font-mono"
                        />
                      ) : (
                        <Input
                          placeholder={
                            variable.type === "string"
                              ? "Text value"
                              : variable.type === "number"
                              ? "123"
                              : "true/false"
                          }
                          value={variable.value}
                          onChange={(e) =>
                            handleVariableValueChange(variable.id, e.target.value)
                          }
                          className="h-8 text-xs"
                          type={variable.type === "number" ? "number" : "text"}
                        />
                      )}

                      {variable.type === "expression" && (
                        <p className="text-xs text-muted-foreground">
                          Use {{ }} for JavaScript expressions referencing other nodes
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                No variables added yet. Click "Add Variable" to start.
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="px-3 py-2 border-t flex justify-between items-center text-xs text-muted-foreground">
          <div>Set Variables</div>
          <div>{nodeData.variables.length} variable(s)</div>
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

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-primary"
      />

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