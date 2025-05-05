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
}

export function VariableSelector({ open, onClose, onSelectVariable }: VariableSelectorProps) {
  const { getNodes } = useReactFlow();
  const [search, setSearch] = useState("");
  const [variables, setVariables] = useState<Array<{
    nodeId: string;
    nodeName: string;
    nodeType: string;
    variableName: string;
    path: string;
    source: "variable" | "testResult";
  }>>([]);

  // Collect all available variables from nodes
  const collectVariables = useCallback(() => {
    const nodes = getNodes();
    const variableList: Array<{
      nodeId: string;
      nodeName: string;
      nodeType: string;
      variableName: string;
      path: string;
      source: "variable" | "testResult";
    }> = [];

    // First pass, collect all set variable nodes
    nodes.forEach(node => {
      if (node.type === 'setVariable' && node.data.variableKey) {
        variableList.push({
          nodeId: node.id,
          nodeName: node.data.label || "Set Variable",
          nodeType: "setVariable",
          variableName: node.data.variableKey || "variable", // Ensure we have a fallback
          path: `vars.${node.data.variableKey}`,
          source: "variable"
        });
      }
    });

    // Second pass, collect all test results from all nodes
    nodes.forEach(node => {
      if (node.data.testResult) {
        // For each test result, generate variables for its properties
        generateVariablePaths(node.data.testResult).forEach(path => {
          const variableName = path.split('.').pop() || 'result';
          variableList.push({
            nodeId: node.id,
            nodeName: node.data.label || node.type || "Node",
            nodeType: node.type || "unknown",
            variableName: variableName,
            path: `${node.id}.result.${path}`,
            source: "testResult"
          });
        });
      }
    });

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
  filteredVariables.forEach(variable => {
    if (!variablesByNode[variable.nodeId]) {
      variablesByNode[variable.nodeId] = [];
    }
    variablesByNode[variable.nodeId].push(variable);
  });

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Available Variables</DialogTitle>
          <DialogDescription>
            Select a variable to use in this field
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search variables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />

          <ScrollArea className="h-96">
            {Object.keys(variablesByNode).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(variablesByNode).map(([nodeId, nodeVariables]) => (
                  <div key={nodeId} className="border dark:border-slate-700 rounded-lg p-3">
                    <h3 className="text-sm font-medium mb-2">
                      {nodeVariables[0].nodeName} <Badge variant="outline" className="ml-1">{nodeVariables[0].nodeType}</Badge>
                    </h3>
                    <div className="space-y-1">
                      {nodeVariables.map((variable, idx) => (
                        <div
                          key={`${variable.nodeId}-${idx}`}
                          className="flex items-center p-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                          onClick={() => {
                            onSelectVariable(`{{${variable.path}}}`);
                            onClose();
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {variable.variableName}
                              {variable.source === "testResult" && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800">
                                  Test Result
                                </Badge>
                              )}
                              {variable.source === "variable" && (
                                <Badge className="ml-2 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-800">
                                  Variable
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}