import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  ChevronRight, 
  Code, 
  Variable, 
  Clock, 
  ArrowRight,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VariableGroup {
  name: string;
  icon: React.ReactNode;
  variables: Variable[];
}

interface Variable {
  name: string;
  path: string;
  type: string;
  value?: any;
  description?: string;
}

interface NodeVariable {
  nodeId: string;
  nodeName: string;
  variableGroups: VariableGroup[];
}

interface VariableSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (variablePath: string) => void;
  nodes: any[];
  currentNodeId: string;
  nodeVariableDefinitions?: Record<string, any>;
}

export function VariableSelectDialog({
  open,
  onOpenChange,
  onSelect,
  nodes,
  currentNodeId,
  nodeVariableDefinitions = {}
}: VariableSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [nodeVariables, setNodeVariables] = useState<NodeVariable[]>([]);
  const [selectedTab, setSelectedTab] = useState("nodes");
  
  useEffect(() => {
    // Generate variables available from previous nodes
    const getNodesBeforeCurrent = () => {
      // Find index of current node
      const nodeIndex = nodes.findIndex(node => node.id === currentNodeId);
      
      if (nodeIndex === -1) return [];
      
      // Return all nodes that come before the current node in the flow
      // We're only including nodes that the current node could potentially get data from
      return nodes.filter((_, index) => index < nodeIndex);
    };
    
    const previousNodes = getNodesBeforeCurrent();
    
    const variablesFromNodes = previousNodes.map(node => {
      let variableGroups: VariableGroup[] = [];
      
      // If we have definitions for this node type, use them
      if (nodeVariableDefinitions[node.type]) {
        variableGroups = nodeVariableDefinitions[node.type](node);
      } else {
        // Default variable groups if no specific definition exists
        variableGroups = [
          {
            name: "Output",
            icon: <ArrowRight size={16} />,
            variables: [
              {
                name: "All Data",
                path: `nodes.${node.id}.output`,
                type: "object",
                description: "All data output from this node"
              }
            ]
          }
        ];
      }
      
      return {
        nodeId: node.id,
        nodeName: node.data.label || node.type,
        variableGroups
      };
    });
    
    // System variables available to all nodes
    const systemVariables: NodeVariable = {
      nodeId: "system",
      nodeName: "System Variables",
      variableGroups: [
        {
          name: "Date & Time",
          icon: <Clock size={16} />,
          variables: [
            {
              name: "Current Date",
              path: "system.date.current",
              type: "date",
              description: "Current date in ISO format"
            },
            {
              name: "Current Time",
              path: "system.time.current", 
              type: "string",
              description: "Current time in HH:MM:SS format"
            },
            {
              name: "Timestamp",
              path: "system.timestamp",
              type: "number",
              description: "Current timestamp in milliseconds"
            }
          ]
        },
        {
          name: "Flow",
          icon: <Code size={16} />,
          variables: [
            {
              name: "Flow ID",
              path: "system.flow.id",
              type: "string",
              description: "ID of the current flow"
            },
            {
              name: "Execution ID",
              path: "system.execution.id",
              type: "string", 
              description: "ID of the current execution"
            }
          ]
        }
      ]
    };
    
    setNodeVariables([systemVariables, ...variablesFromNodes]);
  }, [nodes, currentNodeId, nodeVariableDefinitions]);
  
  const filteredNodeVariables = nodeVariables.map(nodeVar => {
    const filteredGroups = nodeVar.variableGroups.map(group => {
      const filteredVars = group.variables.filter(variable => 
        variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variable.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variable.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      return {
        ...group,
        variables: filteredVars
      };
    }).filter(group => group.variables.length > 0);
    
    return {
      ...nodeVar,
      variableGroups: filteredGroups
    };
  }).filter(nodeVar => nodeVar.variableGroups.length > 0);
  
  const handleVariableSelect = (variablePath: string) => {
    onSelect(`{{${variablePath}}}`);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] h-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Variable</DialogTitle>
          <DialogDescription>
            Choose a variable to insert from available nodes or create an expression
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative my-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="nodes" className="flex-1 flex flex-col" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-2">
            <TabsTrigger value="nodes">From Nodes</TabsTrigger>
            <TabsTrigger value="expressions">Expressions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nodes" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[370px] pr-4">
              {filteredNodeVariables.length > 0 ? (
                filteredNodeVariables.map((nodeVar) => (
                  <div key={nodeVar.nodeId} className="mb-4">
                    <h3 className="text-sm font-medium mb-2 flex items-center">
                      {nodeVar.nodeId === "system" ? (
                        <Variable className="mr-2 h-4 w-4 text-blue-500" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      )}
                      {nodeVar.nodeName}
                    </h3>
                    
                    <div className="pl-5 space-y-3">
                      {nodeVar.variableGroups.map((group, idx) => (
                        <div key={`${nodeVar.nodeId}-${idx}`}>
                          <div className="text-xs text-muted-foreground flex items-center mb-1">
                            {group.icon}
                            <span className="ml-1">{group.name}</span>
                          </div>
                          
                          <div className="space-y-1">
                            {group.variables.map((variable) => (
                              <div 
                                key={variable.path}
                                className="pl-4 py-1.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer group"
                                onClick={() => handleVariableSelect(variable.path)}
                              >
                                <div>
                                  <div className="flex items-center">
                                    <span className="font-medium text-sm">{variable.name}</span>
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {variable.type}
                                    </Badge>
                                  </div>
                                  {variable.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {variable.description}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="opacity-0 group-hover:opacity-100">
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? (
                    <p>No variables found matching "{searchQuery}"</p>
                  ) : (
                    <p>No previous nodes available to reference</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="expressions" className="flex-1">
            <div className="flex flex-col h-full">
              <div className="mb-2">
                <label className="text-sm font-medium">Custom Expression</label>
                <div className="mt-1 relative">
                  <Code className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="{{2 + 2}}" 
                    className="pl-8 font-mono"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use JavaScript expressions with handlebar syntax: {{expression}}
                </p>
              </div>
              
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-2">Examples</h3>
                <div className="space-y-2">
                  {[
                    { 
                      expressionText: "{{nodes.node_1.output.value + 10}}", 
                      description: "Add 10 to a value from a previous node" 
                    },
                    { 
                      expressionText: "{{nodes.node_1.output.items.map(i => i.name)}}", 
                      description: "Extract all names from an array of items" 
                    },
                    { 
                      expressionText: "{{nodes.node_1.output.success ? 'Completed' : 'Failed'}}", 
                      description: "Conditional output based on a success flag" 
                    },
                    { 
                      expressionText: "{{JSON.stringify(nodes.node_1.output.data)}}", 
                      description: "Convert an object to a JSON string" 
                    }
                  ].map((example, i) => (
                    <div 
                      key={i}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                      onClick={() => handleVariableSelect(example.expressionText.slice(2, -2))}
                    >
                      <code className="text-sm font-mono text-green-600 dark:text-green-400">
                        {example.expressionText}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {example.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}