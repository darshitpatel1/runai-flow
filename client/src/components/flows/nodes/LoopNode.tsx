import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { RepeatIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LoopNodeData {
  label: string;
  type: "foreach" | "while" | "times";
  data: {
    collection?: string;
    varName?: string;
    condition?: string;
    times?: string;
    limitOffset?: {
      enabled: boolean;
      limit: string;
      offset: string;
      offsetVar: string;
    };
  };
  batchSize?: string;
  maxIterations?: string;
  description?: string;
  onChange?: (id: string, data: any) => void;
  nodes?: any[];
}

export default function LoopNode({ id, data, isConnectable, selected }: NodeProps) {
  // Define a minimal default data structure to handle missing properties
  const safeData = {
    label: data?.label || 'Loop',
    type: data?.type || 'foreach',
    data: {
      collection: data?.data?.collection || '',
      varName: data?.data?.varName || 'item',
      condition: data?.data?.condition || '',
      times: data?.data?.times || '10',
      limitOffset: data?.data?.limitOffset || {
        enabled: false,
        limit: '10',
        offset: '0',
        offsetVar: 'offset'
      }
    },
    maxIterations: data?.maxIterations || '100'
  };
  
  // Format the loop description for display
  const getLoopDescription = () => {
    if (safeData.type === 'foreach') {
      return `For each ${safeData.data.varName} in ${safeData.data.collection || '?'}`;
    } else if (safeData.type === 'while') {
      return `While ${safeData.data.condition || '?'}`;
    } else if (safeData.type === 'times') {
      return `${safeData.data.times || '?'} times`;
    }
    return 'Loop';
  };

  // Show limit/offset info if enabled
  const getLimitOffsetText = () => {
    if (safeData.type === 'foreach' && safeData.data.limitOffset?.enabled) {
      return `Limit: ${safeData.data.limitOffset.limit} / Offset: ${safeData.data.limitOffset.offset}`;
    }
    return null;
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
            <RepeatIcon className="w-4 h-4 mr-2 text-purple-500" />
            <CardTitle className="text-sm font-medium">
              {safeData.label}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 text-xs">
          <div className="text-muted-foreground mb-1">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
              {safeData.type}
            </Badge>
          </div>
          <div className="font-mono text-xs">
            {getLoopDescription()}
          </div>
          {getLimitOffsetText() && (
            <div className="mt-1 text-xs text-muted-foreground">
              {getLimitOffsetText()}
            </div>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            Max iterations: {safeData.maxIterations}
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

      {/* Loop body output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="body"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-purple-500"
        style={{ top: '40%' }}
      />

      {/* Loop complete output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="complete"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-primary"
        style={{ top: '60%' }}
      />
    </>
  );
}
