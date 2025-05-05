import { useState, useEffect, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useReactFlow, Node } from "reactflow";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VariableSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectVariable: (variablePath: string) => void;
  // Optional manual nodes for when used outside ReactFlow context
  manualNodes?: any[];
}

export function VariableSelector({ open, onClose, onSelectVariable, manualNodes }: VariableSelectorProps) {
  // Safely try to use ReactFlow context, but don't crash if it's not available
  const reactFlowInstance = (() => {
    try {
      return useReactFlow();
    } catch (e) {
      return { getNodes: () => [] };
    }
  })();
  
  const [search, setSearch] = useState("");
  const [variables, setVariables] = useState<Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    variableName: string;
    path: string;
    source: "variable" | "testResult";
  }>>([]);

  // Get nodes either from ReactFlow context or the manualNodes prop
  const getNodes = useCallback(() => {
    // First check for manually provided nodes (used when outside ReactFlow context)
    if (manualNodes && Array.isArray(manualNodes) && manualNodes.length > 0) {
      console.log("Using manually provided nodes:", manualNodes);
      return manualNodes;
    }
    
    // Then try to get nodes from ReactFlow
    try {
      if (!reactFlowInstance) {
        console.warn("ReactFlow instance not available");
        return [];
      }
      
      const flowNodes = reactFlowInstance.getNodes();
      
      if (!flowNodes || !Array.isArray(flowNodes)) {
        console.warn("No valid nodes from ReactFlow");
        return [];
      }
      
      // Check if any node has allNodes data that contains other nodes
      // This is the case when a node's config panel is open
      for (const node of flowNodes) {
        if (node?.data?.allNodes && Array.isArray(node.data.allNodes) && node.data.allNodes.length > 0) {
          console.log("Found allNodes data in node:", node.id);
          return node.data.allNodes;
        }
      }
      
      return flowNodes;
    } catch (e) {
      console.warn("Failed to get nodes from ReactFlow", e);
      return [];
    }
  }, [manualNodes, reactFlowInstance]);

  // Collect all available variables from nodes
  const collectVariables = useCallback(() => {
    // Get nodes from either manual nodes or ReactFlow
    const nodes = getNodes();
    console.log("Variable Selector - Nodes:", nodes);
    
    const variableList: Array<{
      nodeId: string;
      nodeName: string;
      nodeType: string;
      variableName: string;
      path: string;
      source: "variable" | "testResult";
    }> = [];
    
    // Helper function to process a node's variables
    const processNodeVariables = (node: any) => {
      // Check if it's a SetVariable node with a variableKey
      if (node.type === 'setVariable' && node.data?.variableKey) {
        // Check if this variable is already in the list
        const exists = variableList.some(v => 
          v.source === "variable" && v.path === `vars.${node.data.variableKey}`
        );
        
        if (!exists) {
          variableList.push({
            nodeId: node.id,
            nodeName: node.data.label || "Set Variable",
            nodeType: "setVariable",
            variableName: node.data.variableKey || "variable",
            path: `vars.${node.data.variableKey}`,
            source: "variable"
          });
          console.log("Found variable:", node.data.variableKey);
        }
      }
      
      // First check for test results - look in both places
      const testResult = node.data?.testResult || node.data?._lastTestResult;
      if (testResult) {
        console.log("Found test result in node:", node.id, node.data?.label || "Unknown");
        
        try {
          // For each test result, generate variables for its properties
          const paths = generateVariablePaths(testResult);
          console.log("Generated paths:", paths);
          
          paths.forEach(path => {
            // Extract variable name - get the last part of the path
            const variableName = path.split('.').pop() || 'result';
            
            // Check if this test result path is already in the list
            const exists = variableList.some(v => 
              v.source === "testResult" && v.path === `${node.id}.result.${path}`
            );
            
            if (!exists) {
              variableList.push({
                nodeId: node.id,
                nodeName: node.data?.label || node.type || "Node",
                nodeType: node.type || "unknown",
                variableName: variableName,
                path: `${node.id}.result.${path}`,
                source: "testResult"
              });
            }
          });
        } catch (error) {
          console.error("Error processing test result:", error);
        }
      }
      
      // Add expected response variables for HTTP nodes even without test
      if (node.type === 'httpRequest') {
        // Add common HTTP response properties
        const commonPaths = [
          { name: 'status', path: `${node.id}.result.status` },
          { name: 'statusText', path: `${node.id}.result.statusText` },
          { name: 'headers', path: `${node.id}.result.headers` },
          { name: 'body', path: `${node.id}.result.body` },
          { name: 'data', path: `${node.id}.result.body.data` },
          { name: 'items', path: `${node.id}.result.body.items` },
          { name: 'results', path: `${node.id}.result.body.results` },
        ];
        
        // Add these common response paths as variables
        commonPaths.forEach(item => {
          // Check if this path is already in the list
          const exists = variableList.some(v => v.path === item.path);
          
          if (!exists) {
            variableList.push({
              nodeId: node.id,
              nodeName: node.data?.label || "HTTP Request",
              nodeType: "httpRequest",
              variableName: item.name,
              path: item.path,
              source: "testResult"
            });
          }
        });
      }
    };
    
    // First process all the direct nodes
    nodes.forEach(processNodeVariables);
    
    // Then check if any node contains allNodes data (which has other nodes)
    nodes.forEach((node: any) => {
      if (node.data?.allNodes && Array.isArray(node.data.allNodes)) {
        console.log("Found allNodes data in node:", node.id);
        // Process other nodes saved in this node's data
        node.data.allNodes.forEach((otherNode: any) => {
          // Skip the current node to avoid duplicates
          if (otherNode.id === node.id) return;
          processNodeVariables(otherNode);
        });
      }
    });
    
    console.log("Final variable list:", variableList);
    setVariables(variableList);
  }, [getNodes]);

  // Effect to collect variables when the dialog opens
  useEffect(() => {
    if (open) {
      collectVariables();
    }
  }, [open, collectVariables]);

  // Function to generate dot notation paths for all properties in an object
  const generateVariablePaths = (obj: any, prefix = ""): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    let paths: string[] = [];
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        paths.push(newPrefix);
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          paths = [...paths, ...generateVariablePaths(obj[key], newPrefix)];
        }
        
        // Handle arrays specifically
        if (Array.isArray(obj[key])) {
          paths.push(`${newPrefix}.length`);
          
          // Add paths for the first few array items as examples
          if (obj[key].length > 0) {
            paths.push(`${newPrefix}[0]`);
            
            // If the first item is an object, also include its paths
            if (typeof obj[key][0] === 'object' && obj[key][0] !== null) {
              const itemPaths = generateVariablePaths(obj[key][0], `${newPrefix}[0]`);
              paths = [...paths, ...itemPaths];
            }
          }
        }
      }
    }
    
    return paths;
  };

  // Filter variables based on search
  const filteredVariables = variables.filter(v => 
    v.variableName.toLowerCase().includes(search.toLowerCase()) ||
    v.nodeName.toLowerCase().includes(search.toLowerCase()) ||
    v.path.toLowerCase().includes(search.toLowerCase())
  );

  // Group variables by node for better organization
  const variablesByNode: Record<string, typeof variables> = {};
  
  // First, collect all the nodes and their positions to determine order
  const nodeOrder: Record<string, number> = {};
  let nodeIndex = 0;
  
  // Get all nodes from the graph in their current order
  const nodes = getNodes();
  if (Array.isArray(nodes)) {
    // Sort nodes by their vertical position (top to bottom)
    const sortedNodes = [...nodes].sort((a, b) => {
      // Use y position for sort order, with default to 0 if undefined
      const posA = a?.position?.y || 0;
      const posB = b?.position?.y || 0;
      return posA - posB;
    });
    
    // Assign index to each node based on its sorted position
    sortedNodes.forEach((node, index) => {
      if (node && node.id) {
        nodeOrder[node.id] = index;
      }
    });
  }
  
  // Now organize variables by node
  filteredVariables.forEach(variable => {
    if (!variablesByNode[variable.nodeId]) {
      variablesByNode[variable.nodeId] = [];
    }
    variablesByNode[variable.nodeId].push(variable);
  });
  
  // Convert to array for sorting
  const nodeVariableEntries = Object.entries(variablesByNode);
  
  // Sort nodes by their vertical position in the flow
  nodeVariableEntries.sort((a, b) => {
    const orderA = nodeOrder[a[0]] ?? Number.MAX_SAFE_INTEGER;
    const orderB = nodeOrder[b[0]] ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  // Position the selector to appear beside the settings panel on the left
  return (
    <div className={`fixed z-50 top-0 left-0 w-full h-full ${open ? 'block' : 'hidden'}`} onClick={onClose}>
      <div 
        className="absolute right-[25rem] top-32 w-80 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg shadow-lg p-4"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Available Variables</h3>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Search variables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />

          <div className="h-96 overflow-y-auto pr-2">
            {nodeVariableEntries.length > 0 ? (
              <div className="space-y-4">
                {nodeVariableEntries.map(([nodeId, nodeVariables]) => (
                  <div key={nodeId} className="border dark:border-slate-700 rounded-lg p-3 overflow-hidden">
                    <h3 className="text-sm font-medium mb-2 flex items-center flex-wrap">
                      <span className="mr-1 truncate max-w-[120px]">{nodeVariables[0].nodeName}</span> 
                      <Badge variant="outline" className="shrink-0">{nodeVariables[0].nodeType}</Badge>
                      {nodeOrder[nodeId] !== undefined && (
                        <Badge variant="outline" className="ml-auto text-xs shrink-0">
                          Step {nodeOrder[nodeId] + 1}
                        </Badge>
                      )}
                    </h3>
                    <div className="space-y-1">
                      {nodeVariables.map((variable, idx) => (
                        <div
                          key={`${variable.nodeId}-${idx}`}
                          className="flex items-start p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                          onClick={() => {
                            onSelectVariable(`{{${variable.path}}}`);
                            onClose();
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex flex-wrap items-center">
                              <span className="truncate mr-1">{variable.variableName}</span>
                              {variable.source === "testResult" && (
                                <Badge className="shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800">
                                  Test Result
                                </Badge>
                              )}
                              {variable.source === "variable" && (
                                <Badge className="shrink-0 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-800">
                                  Variable
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate break-all">
                              {`{{${variable.path}}}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : search ? (
              <div className="text-center py-10 text-muted-foreground">
                No variables found matching "{search}"
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                No variables available. Create variables using Set Variable nodes or by testing other nodes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}