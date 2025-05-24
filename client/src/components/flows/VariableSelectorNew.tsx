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

  // Generate variables from REAL API data with previews
  const allVariables = useMemo(() => {
    console.log('🔍 LIVE VARIABLE SELECTOR - Using real API data...');
    
    const nodes = manualNodes || [];
    const variables: VariableEntry[] = [];
    
    // Function to get real preview data from test results
    const getPreviewFromPath = (testData: any, path: string): string => {
      try {
        const pathParts = path.split('.');
        let value = testData;
        
        for (const part of pathParts) {
          if (part.includes('[0]')) {
            const arrayKey = part.replace('[0]', '');
            if (value[arrayKey] && Array.isArray(value[arrayKey]) && value[arrayKey].length > 0) {
              value = value[arrayKey][0];
            } else {
              return 'No data';
            }
          } else {
            value = value?.[part];
          }
          
          if (value === undefined || value === null) {
            return 'No data';
          }
        }
        
        if (typeof value === 'string') {
          return value.length > 50 ? `${value.substring(0, 50)}...` : value;
        } else if (typeof value === 'number') {
          return value.toLocaleString();
        } else if (Array.isArray(value)) {
          return `Array with ${value.length} items`;
        } else if (typeof value === 'object') {
          return 'Object data';
        }
        
        return String(value);
      } catch (error) {
        return 'Preview error';
      }
    };
    
    // Look for nodes with test results and generate variables from real data
    nodes.forEach(node => {
      console.log(`🔍 Checking node ${node.id} for live test data:`, node.data);
      
      // Check for test results in allNodes (shared data)
      if (node.data?.allNodes && Array.isArray(node.data.allNodes)) {
        node.data.allNodes.forEach((otherNode: any) => {
          if (otherNode.data?.testResult || otherNode.data?._rawTestData) {
            const testData = otherNode.data.testResult || otherNode.data._rawTestData;
            console.log(`✅ Found live test data from ${otherNode.id}:`, testData);
            
            // Generate variables from the real test data
            const generatedPaths = generateVariablePaths(testData, `${otherNode.id}.result`);
            console.log(`✅ Generated ${generatedPaths.length} live variables:`, generatedPaths);
            
            generatedPaths.forEach(varPath => {
              const cleanPath = varPath.replace(/[{}]/g, '');
              const resultPath = cleanPath.replace(`${otherNode.id}.result.`, '');
              
              // Create user-friendly names
              const pathParts = resultPath.split('.');
              let displayName = pathParts[pathParts.length - 1];
              
              if (resultPath.includes('pagination.total')) {
                displayName = 'Total Count';
              } else if (resultPath.includes('pagination.limit')) {
                displayName = 'Page Limit';
              } else if (resultPath.includes('pagination.current_page')) {
                displayName = 'Current Page';
              } else if (resultPath.includes('data[0].title')) {
                displayName = 'First Artwork Title';
              } else if (resultPath.includes('data[0].artist_display')) {
                displayName = 'First Artist Name';
              } else if (resultPath.includes('data[0]')) {
                const field = pathParts[pathParts.length - 1];
                displayName = `First ${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
              } else if (resultPath.includes('data.length')) {
                displayName = 'Items Count';
              } else if (resultPath === 'data') {
                displayName = 'All Data Array';
              } else {
                displayName = pathParts[pathParts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              }
              
              // Get real preview data
              const preview = getPreviewFromPath(testData, resultPath);
              
              variables.push({
                nodeId: otherNode.id,
                nodeName: otherNode.data?.label || 'HTTP Request',
                nodeType: otherNode.type || 'httpRequest',
                variableName: displayName,
                path: varPath,
                source: 'testResult',
                preview: preview
              });
            });
          }
        });
      }
      
      // Also check direct test results on the node
      if (node.data?.testResult || node.data?._rawTestData) {
        const testData = node.data.testResult || node.data._rawTestData;
        console.log(`✅ Found direct test data on ${node.id}:`, testData);
        
        const generatedPaths = generateVariablePaths(testData, `${node.id}.result`);
        generatedPaths.forEach(varPath => {
          const cleanPath = varPath.replace(/[{}]/g, '');
          const resultPath = cleanPath.replace(`${node.id}.result.`, '');
          const displayName = resultPath.split('.').pop() || 'Variable';
          const preview = getPreviewFromPath(testData, resultPath);
          
          variables.push({
            nodeId: node.id,
            nodeName: node.data?.label || 'HTTP Request',
            nodeType: node.type || 'httpRequest',
            variableName: displayName,
            path: varPath,
            source: 'testResult',
            preview: preview
          });
        });
      }
    });
    
    console.log(`📊 LIVE SELECTOR: Found ${variables.length} variables with real data!`);
    return variables;
  }, [manualNodes, generateVariablePaths]);
  
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
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sliding Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 
        transform transition-transform duration-300 ease-in-out z-50
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Available Variables</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Variables List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                className="group p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all duration-200"
                onClick={() => handleSelectVariable(variable)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {variable.variableName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      from {variable.nodeName}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      variable.source === 'testResult' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {variable.source === 'testResult' ? 'API' : 'Var'}
                    </span>
                  </div>
                </div>
                
                {/* Preview */}
                {variable.preview && (
                  <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Preview: </span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">
                      {variable.preview}
                    </span>
                  </div>
                )}
                
                {/* Variable Path */}
                <div className="text-xs font-mono text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded break-all">
                  {variable.path}
                </div>
                
                {/* Use Button */}
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors duration-200">
                    Use Variable
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}