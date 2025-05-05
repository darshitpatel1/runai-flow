import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { 
  GitBranchIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";

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
  // Define a minimal default data structure to handle missing properties
  const safeData = {
    label: data?.label || 'If-Else',
    type: data?.type || 'comparison',
    comparison: data?.comparison || { left: '', operator: '==', right: '' },
    expression: data?.expression || '',
    exists: data?.exists || ''
  };
  
  // Format the condition for display
  const getConditionDisplay = () => {
    if (safeData.type === 'comparison' && safeData.comparison) {
      return `${safeData.comparison.left || '?'} ${safeData.comparison.operator} ${safeData.comparison.right || '?'}`;
    } else if (safeData.type === 'expression') {
      return safeData.expression || 'No expression';
    } else if (safeData.type === 'exists') {
      return `${safeData.exists || '?'} exists`;
    }
    return 'No condition';
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
            <GitBranchIcon className="w-4 h-4 mr-2 text-orange-500" />
            <CardTitle className="text-sm font-medium">
              {safeData.label}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 text-xs">
          <div className="text-muted-foreground">
            Condition: <span className="font-mono">{getConditionDisplay()}</span>
          </div>
          <div className="flex mt-2 text-xs justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" /> True
            </div>
            <div className="flex items-center">
              <XCircle className="h-3 w-3 text-red-500 mr-1" /> False
            </div>
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

      {/* True handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-green-500"
        style={{ top: '40%' }}
      />

      {/* False handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-red-500"
        style={{ top: '60%' }}
      />
    </>
  );
}
