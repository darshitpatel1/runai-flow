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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  MoreVertical,
  RepeatIcon,
  ArrowRight,
  ArrowRightLeft,
  ChevronRight,
  Variable,
} from "lucide-react";
import { VariableSelectDialog } from "../VariableSelectDialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

export default function LoopNode({ id, data, isConnectable, selected }: NodeProps) {
  const [nodeData, setNodeData] = useState<LoopNodeData>(data);
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
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

  const handleLoopTypeChange = (type: "foreach" | "while" | "times") => {
    setNodeData((prev) => ({ 
      ...prev, 
      type,
      data: {
        ...prev.data,
        collection: type === "foreach" ? prev.data.collection || "" : undefined,
        varName: type === "foreach" ? prev.data.varName || "item" : undefined,
        condition: type === "while" ? prev.data.condition || "" : undefined,
        times: type === "times" ? prev.data.times || "10" : undefined,
      }
    }));
  };

  const handleCollectionChange = (collection: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        collection,
      },
    }));
  };

  const handleVarNameChange = (varName: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        varName,
      },
    }));
  };

  const handleConditionChange = (condition: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        condition,
      },
    }));
  };

  const handleTimesChange = (times: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        times,
      },
    }));
  };

  const handleBatchProcessingToggle = (enabled: boolean) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        limitOffset: enabled
          ? prev.data.limitOffset || { 
              enabled: true, 
              limit: "10", 
              offset: "0", 
              offsetVar: "offset" 
            }
          : { ...prev.data.limitOffset, enabled: false },
      },
    }));
  };

  const handleLimitChange = (limit: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        limitOffset: {
          ...prev.data.limitOffset!,
          limit,
        },
      },
    }));
  };

  const handleOffsetChange = (offset: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        limitOffset: {
          ...prev.data.limitOffset!,
          offset,
        },
      },
    }));
  };

  const handleOffsetVarChange = (offsetVar: string) => {
    setNodeData((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        limitOffset: {
          ...prev.data.limitOffset!,
          offsetVar,
        },
      },
    }));
  };

  const handleMaxIterationsChange = (maxIterations: string) => {
    setNodeData((prev) => ({
      ...prev,
      maxIterations,
    }));
  };

  const openVariableDialog = (field: string, subField?: string) => {
    setCurrentEditField({ field, subField });
    setVariableDialogOpen(true);
  };

  const handleVariableSelect = (variablePath: string) => {
    if (!currentEditField) return;
    
    const { field, subField } = currentEditField;
    
    if (field === "collection") {
      handleCollectionChange(variablePath);
    } else if (field === "condition") {
      handleConditionChange(variablePath);
    } else if (field === "times") {
      handleTimesChange(variablePath);
    } else if (field === "limitOffset" && subField) {
      if (subField === "limit") {
        handleLimitChange(variablePath);
      } else if (subField === "offset") {
        handleOffsetChange(variablePath);
      }
    } else if (field === "maxIterations") {
      handleMaxIterationsChange(variablePath);
    }
  };

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-2">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Loop Type</Label>
                <Select
                  value={nodeData.type}
                  onValueChange={(value) => handleLoopTypeChange(value as any)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select loop type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foreach">ForEach</SelectItem>
                    <SelectItem value="while">While</SelectItem>
                    <SelectItem value="times">Fixed Times</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nodeData.type === "foreach" && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs">Collection</Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-6 w-6"
                        onClick={() => openVariableDialog("collection")}
                      >
                        <Variable className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder="e.g., {{nodes.node_1.output.data.items}}"
                        value={nodeData.data.collection || ""}
                        onChange={(e) => handleCollectionChange(e.target.value)}
                        className="h-8 text-xs pr-8"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <Label className="text-xs">Item Variable Name</Label>
                    </div>
                    <Input
                      placeholder="e.g., item"
                      value={nodeData.data.varName || ""}
                      onChange={(e) => handleVarNameChange(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This name will be used to access each item inside the loop
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center">
                      <Switch
                        className="mr-2"
                        checked={!!nodeData.data.limitOffset?.enabled}
                        onCheckedChange={handleBatchProcessingToggle}
                      />
                      Batch Processing
                    </Label>
                    
                    {nodeData.data.limitOffset?.enabled && (
                      <div className="pl-6 space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Limit</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="10"
                                value={nodeData.data.limitOffset.limit}
                                onChange={(e) => handleLimitChange(e.target.value)}
                                className="h-8 text-xs pr-7"
                                min="1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="absolute right-0 top-0 h-full p-1"
                                onClick={() => openVariableDialog("limitOffset", "limit")}
                              >
                                <Variable className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Offset</Label>
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="0"
                                value={nodeData.data.limitOffset.offset}
                                onChange={(e) => handleOffsetChange(e.target.value)}
                                className="h-8 text-xs pr-7"
                                min="0"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                className="absolute right-0 top-0 h-full p-1"
                                onClick={() => openVariableDialog("limitOffset", "offset")}
                              >
                                <Variable className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Offset Variable</Label>
                          <Input
                            placeholder="offset"
                            value={nodeData.data.limitOffset.offsetVar}
                            onChange={(e) => handleOffsetVarChange(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            This variable will track the current offset position
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {nodeData.type === "while" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Condition</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-6 w-6"
                      onClick={() => openVariableDialog("condition")}
                    >
                      <Variable className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="e.g., {{nodes.http_request.output.data.hasMore}}"
                    value={nodeData.data.condition || ""}
                    onChange={(e) => handleConditionChange(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Loop will continue as long as this condition is true
                  </p>
                </div>
              )}

              {nodeData.type === "times" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Iterations</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-6 w-6"
                      onClick={() => openVariableDialog("times")}
                    >
                      <Variable className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="10"
                      value={nodeData.data.times || ""}
                      onChange={(e) => handleTimesChange(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Loop will run exactly this many times
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Max Iterations</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-6 w-6"
                    onClick={() => openVariableDialog("maxIterations")}
                  >
                    <Variable className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="100"
                  value={nodeData.maxIterations || ""}
                  onChange={(e) => handleMaxIterationsChange(e.target.value)}
                  className="h-8 text-xs"
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Safety limit to prevent infinite loops (0 = no limit)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Available Output Variables</Label>
                <div className="space-y-1">
                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          number
                        </Badge>
                        <span className="text-xs font-medium">iterations</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total number of iterations executed
                    </p>
                  </div>

                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          number
                        </Badge>
                        <span className="text-xs font-medium">index</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current iteration index (starts at 0)
                    </p>
                  </div>

                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          array
                        </Badge>
                        <span className="text-xs font-medium">results</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Array of all results collected from each iteration
                    </p>
                  </div>

                  {nodeData.type === "foreach" && nodeData.data.limitOffset?.enabled && (
                    <div className="p-2 bg-secondary rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-2 py-0 h-5">
                            number
                          </Badge>
                          <span className="text-xs font-medium">{nodeData.data.limitOffset.offsetVar}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current offset value for batch processing
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="px-3 py-2 border-t flex justify-between items-center text-xs text-muted-foreground">
          <div>Loop</div>
          <div>{getLoopSummary()}</div>
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

      {/* Body output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="body"
        isConnectable={isConnectable}
        className="left-1/2 !-bottom-1 -translate-x-1/2 w-2 h-2 rounded-full border-2 bg-background border-primary"
      />

      {/* Loop done output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="next"
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