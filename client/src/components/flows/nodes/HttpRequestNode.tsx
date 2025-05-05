import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface HeaderParam {
  id: string;
  key: string;
  value: string;
}

interface QueryParam {
  id: string;
  key: string;
  value: string;
}

interface HttpRequestNodeData {
  label: string;
  method: string;
  url: string;
  headers: HeaderParam[];
  queryParams: QueryParam[];
  body: string;
  authType: string;
  authConfig: any;
  description?: string;
  responseType?: string;
}

export default function HttpRequestNode({ id, data, isConnectable, selected }: NodeProps) {
  // Define a minimal default data structure to handle missing properties
  const safeData = {
    label: data?.label || 'HTTP Request',
    method: data?.method || 'GET',
    url: data?.url || ''
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
            <Globe className="w-4 h-4 mr-2 text-primary" />
            <CardTitle className="text-sm font-medium">
              {safeData.label}
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 text-xs">
          <div className="text-muted-foreground">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {safeData.method}
            </Badge>{' '}
            <span className="truncate block mt-1">
              {safeData.url || 'No URL specified'}
            </span>
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
