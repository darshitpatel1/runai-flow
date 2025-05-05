import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

interface VariableAssignment {
  id: string;
  name: string;
  value: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "expression";
}

export default function SetVariableNode({ id, data, isConnectable, selected }: NodeProps) {
  // Define a minimal default data structure to handle missing properties
  const safeData = {
    label: data?.label || 'Set Variables',
    variables: data?.variables || []
  };
  
  // Simple node version for the flow visual without all settings controls
  return (
    <>
      <Card
        className={`border-2 ${selected ? "border-blue-500" : "border-border"} shadow-md bg-background`}
        style={{ width: 220 }}
      >
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 flex items-center justify-center rounded-full bg-indigo-500 text-white text-xs font-bold">
              V
            </div>
            <CardTitle className="text-sm font-medium">
              {safeData.label}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 text-xs text-center">
          <div className="text-muted-foreground">
            {Array.isArray(safeData.variables) && safeData.variables.length > 0 ? (
              <div>{safeData.variables.length} variable(s) defined</div>
            ) : (
              <div>No variables defined</div>
            )}
          </div>
        </CardContent>
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
    </>
  );
}