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

  // Copy exact collectVariables logic from working popup
  const allVariables = useMemo(() => {
    console.log('🔍 WORKING LOGIC - Using exact popup variable collection...');
    
    const nodes = manualNodes || [];
    const variableList: VariableEntry[] = [];
    
    // Helper function to process a node's variables (exact copy from popup)
    const processNodeVariables = (node: any) => {
      // Skip invalid nodes
      if (!node || !node.id) return;
      
      console.log(`🔍 Processing node ${node.id} (${node.type}):`, node.data);
      
      // Check if it's a SetVariable node with a variableKey
      if (node.type === 'setVariable' && node.data?.variableKey) {
        const exists = variableList.some(v => 
          v.source === "variable" && v.path === `vars.${node.data.variableKey}`
        );
        
        if (!exists) {
          console.log(`✅ Adding SetVariable: ${node.data.variableKey}`);
          variableList.push({
            nodeId: node.id,
            nodeName: node.data.label || "Set Variable",
            nodeType: "setVariable",
            variableName: node.data.variableKey || "variable",
            path: `vars.${node.data.variableKey}`,
            source: "variable"
          });
        }
      }
      
      // Check for test results and variables from tested nodes
      const testResult = node.data?.testResult || node.data?._lastTestResult || node.data?._rawTestData;
      const existingVariables = node.data?.variables;
      
      console.log(`🔍 Checking for test results in node ${node.id}:`, {
        testResult: !!node.data?.testResult,
        _lastTestResult: !!node.data?._lastTestResult,
        _rawTestData: !!node.data?._rawTestData,
        variables: node.data?.variables,
        allData: node.data
      });
      
      // If we have pre-generated variables, use those instead of regenerating
      if (existingVariables && Array.isArray(existingVariables) && existingVariables.length > 0) {
        console.log(`✅ Found pre-generated variables for ${node.id}:`, existingVariables);
        
        existingVariables.forEach((varPath: string) => {
          // Clean up the variable path if it already has {{}}
          const cleanPath = varPath.replace(/[{}]/g, '');
          
          // Create user-friendly display name
          const pathParts = cleanPath.replace(`${node.id}.result.`, '').split('.');
          const displayName = pathParts.map(part => {
            if (part === 'pagination') return 'Page Info';
            if (part === 'total') return 'Total Count';
            if (part === 'data') return 'Artworks';
            if (part.includes('[0]')) return part.replace('[0]', ' (First)');
            return part.charAt(0).toUpperCase() + part.slice(1);
          }).join(' → ');
          
          variableList.push({
            nodeId: node.id,
            nodeName: node.data?.label || `HTTP Request`,
            nodeType: node.type || "unknown",
            variableName: displayName,
            path: varPath, // Use the original path with {{}}
            source: "testResult",
            preview: "Available from test"
          });
        });
        return; // Skip the rest if we found pre-generated variables
      }
      
      if (testResult) {
        try {
          console.log(`🎯 Processing test results for node ${node.id}:`, testResult);
          
          // For each test result, generate variables for its properties
          const paths = generateVariablePaths(testResult);
          console.log(`📋 Generated ${paths.length} variable paths:`, paths);
          
          paths.forEach(path => {
            // Create user-friendly display name
            const displayName = path.split('.').map(part => {
              if (part === 'length') return 'Count';
              if (part === 'data') return 'Artworks';
              if (part === 'pagination') return 'Page Info';
              if (part.includes('[0]')) return part.replace('[0]', ' (First)');
              if (part === 'title') return 'Title';
              if (part === 'artist_title') return 'Artist';
              if (part === 'date_display') return 'Date';
              if (part === 'total') return 'Total Count';
              if (part === 'limit') return 'Items Per Page';
              if (part === 'offset') return 'Page Offset';
              
              // Convert snake_case to readable
              return part.replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }).join(' → ');
            
            // Check if this test result path is already in the list
            const fullPath = `${node.id}.result.${path}`;
            const exists = variableList.some(v => 
              v.source === "testResult" && v.path === fullPath
            );
            
            if (!exists) {
              // Get preview value from test result
              let preview = 'No preview';
              try {
                const pathParts = path.split('.');
                let value = testResult;
                for (const part of pathParts) {
                  if (part.includes('[') && part.includes(']')) {
                    const arrayName = part.split('[')[0];
                    const index = parseInt(part.split('[')[1].split(']')[0]);
                    value = value[arrayName][index];
                  } else {
                    value = value[part];
                  }
                }
                if (typeof value === 'string') {
                  preview = value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
                } else if (typeof value === 'number') {
                  preview = value.toLocaleString();
                } else if (typeof value === 'boolean') {
                  preview = value ? 'true' : 'false';
                } else if (Array.isArray(value)) {
                  preview = `Array (${value.length} items)`;
                } else if (value && typeof value === 'object') {
                  preview = `Object (${Object.keys(value).length} properties)`;
                } else {
                  preview = String(value);
                }
              } catch (error) {
                preview = 'Preview unavailable';
              }
              
              console.log(`✅ Creating variable: ${displayName} = ${preview}`);
              
              variableList.push({
                nodeId: node.id,
                nodeName: node.data?.label || `HTTP Request`,
                nodeType: node.type || "unknown",
                variableName: displayName,
                path: `{{${fullPath}}}`,
                source: "testResult",
                preview: preview
              });
            }
          });
        } catch (error) {
          // Silent error handling
        }
      }
    };
    
    // First process all the direct nodes
    nodes.forEach(processNodeVariables);
    
    // Then check if any node contains allNodes data (which has other nodes)
    nodes.forEach((node: any) => {
      if (node.data?.allNodes && Array.isArray(node.data.allNodes)) {
        // Process other nodes saved in this node's data
        node.data.allNodes.forEach((otherNode: any) => {
          // Skip the current node to avoid duplicates
          if (otherNode.id === node.id) return;
          processNodeVariables(otherNode);
        });
      }
    });
    
    console.log(`📊 WORKING LOGIC: Found ${variableList.length} variables!`);
    return variableList;
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
      {/* Sliding Sidebar - NO DARK OVERLAY */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
        transform transition-transform duration-300 ease-in-out z-50 shadow-xl
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