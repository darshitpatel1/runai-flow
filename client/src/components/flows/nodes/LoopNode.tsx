import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  MoreVertical,
  RepeatIcon,
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { VariableSelectDialog } from "../VariableSelectDialog";

const NODE_WIDTH = 320;

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
  const [nodeData, setNodeData] = useState<LoopNodeData>({
    ...data,
    label: data.label || "Loop",
    type: data.type || "foreach",
    data: {
      collection: data.data?.collection || "",
      varName: data.data?.varName || "item",
      condition: data.data?.condition || "",
      times: data.data?.times || "10",
      limitOffset: data.data?.limitOffset || {
        enabled: false,
        limit: "10",
        offset: "0",
        offsetVar: "offset"
      },
    }
  });
  
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

  // Get the loop summary for the footer
  const getLoopSummary = () => {
    if (nodeData.type === "foreach") {
      return `ForEach ${nodeData.data.varName || "item"} in ${nodeData.data.collection || "..."}`;
    } else if (nodeData.type === "while") {
      return `While ${nodeData.data.condition || "..."}`;
    } else if (nodeData.type === "times") {
      return `Repeat ${nodeData.data.times || "X"} times`;
    }
    return "Loop";
  };

  const handleVariableSelect = (variablePath: string) => {
    if (!currentEditField) return;
    
    const { field, subField } = currentEditField;
    
    // Handle variable selection based on field
    // This implementation is simplified as we've moved config to the sidebar
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
            <RepeatIcon className="w-4 h-4 mr-2 text-primary" />
            <CardTitle className="text-sm font-medium">{data.label || "Loop"}</CardTitle>
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
            Click the node and use the right sidebar to set up the loop
          </p>
        </CardContent>

        <CardFooter className="px-3 py-2 border-t flex justify-between items-center text-xs text-muted-foreground">
          <div>Loop</div>
          <div className="max-w-[200px] truncate">
            {getLoopSummary()}
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

      {/* Loop output handle - elements go through this in each iteration */}
      <Handle
        type="source"
        position={Position.Right}
        id="loop"
        isConnectable={isConnectable}
        className="top-1/3 w-2 h-2 rounded-full border-2 bg-background border-primary"
        style={{ top: '40%' }}
      />

      {/* Exit output handle - flow continues from here after loop completes */}
      <Handle
        type="source"
        position={Position.Right}
        id="exit"
        isConnectable={isConnectable}
        className="top-2/3 w-2 h-2 rounded-full border-2 bg-background border-primary"
        style={{ top: '60%' }}
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