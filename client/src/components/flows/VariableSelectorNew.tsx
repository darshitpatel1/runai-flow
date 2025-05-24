import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
interface VariableSelectorNewProps {
  open: boolean;
  onClose: () => void;
  onSelectVariable: (variablePath: string) => void;
  currentNodeId?: string;
  manualNodes?: any[];
}

type VariableEntry = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  variableName: string;
  path: string;
  source: "variable" | "testResult";
  preview?: string;
};

export function VariableSelectorNew({ open, onClose, onSelectVariable, currentNodeId, manualNodes }: VariableSelectorNewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Copy the exact working generateVariablePaths function from NodeConfiguration
  const generateVariablePaths = (obj: any, prefix = ""): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    let paths: string[] = [];
    
    const traverse = (current: any, path: string, depth = 0) => {
      if (depth > 3) return; // Limit depth to prevent too many variables
      
      if (current === null || current === undefined) {
        paths.push(`{{${path}}}`);
        return;
      }
      
      if (Array.isArray(current)) {
        paths.push(`{{${path}}}`); // Add the array itself
        paths.push(`{{${path}.length}}`); // Add length property
        
        if (current.length > 0) {
          paths.push(`{{${path}[0]}}`); // Add first item access
          
          // If first item is object, add its useful properties
          if (typeof current[0] === 'object' && current[0] !== null) {
            const keys = Object.keys(current[0]).slice(0, 8); // Limit to 8 properties
            keys.forEach(key => {
              const value = current[0][key];
              if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                paths.push(`{{${path}[0].${key}}}`);
              }
            });
          }
        }
      } else if (typeof current === 'object') {
        if (path) paths.push(`{{${path}}}`); // Add the object itself
        
        // Add useful scalar properties
        Object.keys(current).slice(0, 15).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          const value = current[key];
          
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            paths.push(`{{${newPath}}}`);
          } else if (value !== null && typeof value === 'object') {
            traverse(value, newPath, depth + 1);
          }
        });
      } else {
        paths.push(`{{${path}}}`);
      }
    };
    
    traverse(obj, prefix);
    
    // Remove duplicates and return limited set
    return Array.from(new Set(paths)).slice(0, 25);
  };

  // Get ALL actual variables from the real nodes with real data
  const allVariables = useMemo(() => {
    console.log('🔍 DIRECT VARIABLE SELECTOR - Using existing test data...');
    
    const nodes = manualNodes || [];
    const variables: VariableEntry[] = [];
    
    // Look for nodes with test results and generate variables directly
    nodes.forEach(node => {
      console.log(`🔍 Checking node ${node.id} for test results:`, node.data);
      
      // Check for existing generated variables first
      if (node.data?.variables && Array.isArray(node.data.variables)) {
        console.log(`✅ Using pre-generated variables from ${node.id}:`, node.data.variables);
        
        node.data.variables.forEach((varPath: string) => {
          const cleanPath = varPath.replace(/[{}]/g, '');
          const lastPart = cleanPath.split('.').pop() || 'Variable';
          
          variables.push({
            nodeId: node.id,
            nodeName: node.data?.label || 'HTTP Request',
            nodeType: node.type || 'httpRequest',
            variableName: lastPart,
            path: varPath,
            source: 'testResult',
            preview: 'From test result'
          });
        });
      }
      
      // Also generate fresh variables from test results
      if (node.data?.testResult || node.data?._rawTestData) {
        const testData = node.data.testResult || node.data._rawTestData;
        console.log(`✅ Generating fresh variables from test data for ${node.id}:`, testData);
        
        const freshVariables = generateVariablePaths(testData, `${node.id}.result`);
        console.log(`✅ Generated ${freshVariables.length} fresh variables:`, freshVariables);
        
        freshVariables.forEach(varPath => {
          const cleanPath = varPath.replace(/[{}]/g, '');
          const lastPart = cleanPath.split('.').pop() || 'Variable';
          
          variables.push({
            nodeId: node.id,
            nodeName: node.data?.label || 'HTTP Request',
            nodeType: node.type || 'httpRequest',
            variableName: lastPart,
            path: varPath,
            source: 'testResult',
            preview: 'Fresh from API'
          });
        });
      }
      
      // Check allNodes for shared test results
      if (node.data?.allNodes && Array.isArray(node.data.allNodes)) {
        node.data.allNodes.forEach((otherNode: any) => {
          if (otherNode.data?.testResult || otherNode.data?._rawTestData) {
            const testData = otherNode.data.testResult || otherNode.data._rawTestData;
            console.log(`✅ Found shared test data from ${otherNode.id}`);
            
            const sharedVariables = generateVariablePaths(testData, `${otherNode.id}.result`);
            sharedVariables.forEach(varPath => {
              const cleanPath = varPath.replace(/[{}]/g, '');
              const lastPart = cleanPath.split('.').pop() || 'Variable';
              
              variables.push({
                nodeId: otherNode.id,
                nodeName: otherNode.data?.label || 'HTTP Request',
                nodeType: otherNode.type || 'httpRequest',
                variableName: lastPart,
                path: varPath,
                source: 'testResult',
                preview: 'From shared test'
              });
            });
          }
        });
      }
    });
    
    console.log(`📊 DIRECT SELECTOR: Found ${variables.length} total variables:`, variables);
    return variables;
  }, [manualNodes]);
  
  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!searchTerm) return allVariables;
    
    return allVariables.filter(variable =>
      variable.variableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.nodeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allVariables, searchTerm]);
  
  const handleSelectVariable = (variable: VariableEntry) => {
    onSelectVariable(variable.path);
    onClose();
  };
  
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Available Variables</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Variables List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {filteredVariables.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {allVariables.length === 0 ? (
                  <div>
                    <p className="text-sm">No variables available.</p>
                    <p className="text-xs mt-1">Test your HTTP nodes to create variables.</p>
                  </div>
                ) : (
                  <p className="text-sm">No variables match your search.</p>
                )}
              </div>
            ) : (
              filteredVariables.map((variable, index) => (
                <div
                  key={`${variable.nodeId}-${index}`}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleSelectVariable(variable)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {variable.variableName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        from {variable.nodeName}
                      </p>
                      {variable.preview && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {variable.preview}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        variable.source === 'testResult' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {variable.source === 'testResult' ? 'Test' : 'Var'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-300 mt-2 break-all">
                    {variable.path}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {/* Close Button */}
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}