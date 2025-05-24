import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Eye, Database, Code, Hash, Calendar, Type, List, FileText, Activity } from 'lucide-react';
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
  dataType?: "string" | "number" | "boolean" | "array" | "object" | "date" | "null";
  rawValue?: any;
};

export function VariableSelectorNew({ open, onClose, onSelectVariable, currentNodeId, manualNodes }: VariableSelectorNewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper function to get icon based on data type
  const getDataTypeIcon = (dataType: string, variableName: string) => {
    // First check for specific field names
    if (variableName.toLowerCase().includes('date') || variableName.toLowerCase().includes('time')) {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
    if (variableName.toLowerCase().includes('id') || variableName.toLowerCase().includes('uuid')) {
      return <Hash className="h-4 w-4 text-purple-500" />;
    }
    if (variableName.toLowerCase().includes('title') || variableName.toLowerCase().includes('name')) {
      return <Type className="h-4 w-4 text-green-500" />;
    }
    
    // Then by data type
    switch (dataType) {
      case 'string':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'number':
        return <Hash className="h-4 w-4 text-blue-500" />;
      case 'boolean':
        return <Code className="h-4 w-4 text-orange-500" />;
      case 'array':
        return <List className="h-4 w-4 text-purple-500" />;
      case 'object':
        return <Database className="h-4 w-4 text-indigo-500" />;
      case 'date':
        return <Calendar className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // Helper function to detect data type from value
  const detectDataType = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') {
      // Check if it's a date string
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      return 'string';
    }
    return typeof value;
  };
  
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
      
      console.log(`🔍 DETAILED CHECK for node ${node.id}:`, {
        testResult: !!node.data?.testResult,
        _lastTestResult: !!node.data?._lastTestResult,
        _rawTestData: !!node.data?._rawTestData,
        variables: node.data?.variables,
        variablesLength: node.data?.variables?.length,
        hasAllNodes: !!node.data?.allNodes,
        allNodesLength: node.data?.allNodes?.length,
        nodeDataKeys: Object.keys(node.data || {}),
        fullNodeData: node.data
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
              // Get preview value and data type from test result
              let preview = 'No preview';
              let dataType = 'string';
              let rawValue = null;
              
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
                
                rawValue = value;
                dataType = detectDataType(value);
                
                // Create smart previews based on data type
                if (typeof value === 'string') {
                  if (value.length > 60) {
                    preview = `"${value.substring(0, 60)}..."`;
                  } else {
                    preview = `"${value}"`;
                  }
                } else if (typeof value === 'number') {
                  preview = value.toLocaleString();
                } else if (typeof value === 'boolean') {
                  preview = value ? 'true' : 'false';
                } else if (Array.isArray(value)) {
                  if (value.length === 0) {
                    preview = 'Empty array';
                  } else if (value.length <= 3) {
                    preview = `[${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`;
                  } else {
                    preview = `Array with ${value.length} items`;
                  }
                } else if (value && typeof value === 'object') {
                  const keys = Object.keys(value);
                  if (keys.length <= 3) {
                    preview = `{${keys.join(', ')}}`;
                  } else {
                    preview = `Object with ${keys.length} properties`;
                  }
                } else if (value === null) {
                  preview = 'null';
                } else if (value === undefined) {
                  preview = 'undefined';
                } else {
                  preview = String(value);
                }
              } catch (error) {
                preview = 'Preview unavailable';
                dataType = 'unknown';
              }
              
              console.log(`✅ Creating variable: ${displayName} = ${preview}`);
              
              variableList.push({
                nodeId: node.id,
                nodeName: node.data?.label || `HTTP Request`,
                nodeType: node.type || "unknown",
                variableName: displayName,
                path: `{{${fullPath}}}`,
                source: "testResult",
                preview: preview,
                dataType: dataType as any,
                rawValue: rawValue
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
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredVariables.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {allVariables.length === 0 ? (
                <div>
                  <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No variables available</p>
                  <p className="text-xs mt-1 text-gray-400">Test your API nodes to generate variables from real data</p>
                </div>
              ) : (
                <div>
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No variables match your search</p>
                </div>
              )}
            </div>
          ) : (
            filteredVariables.map((variable, index) => (
              <div
                key={`${variable.nodeId}-${index}`}
                className="group p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
                onClick={() => handleSelectVariable(variable)}
              >
                {/* Header with Icon, Name and Source Badge */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getDataTypeIcon(variable.dataType || 'string', variable.variableName)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {variable.variableName}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        variable.source === 'testResult' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      }`}>
                        {variable.source === 'testResult' ? 'Live API Data' : 'Variable'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      from {variable.nodeName}
                    </p>
                  </div>
                </div>
                
                {/* Enhanced Preview with Real Data */}
                {variable.preview && (
                  <div className="mb-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-3 w-3 text-blue-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Live Preview</span>
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
                        {variable.dataType || 'string'}
                      </span>
                    </div>
                    <div className="text-sm font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 p-2 rounded border break-all">
                      {variable.preview}
                    </div>
                  </div>
                )}
                
                {/* Variable Path */}
                <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Code className="h-3 w-3 text-gray-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Variable Path</span>
                  </div>
                  <div className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
                    {variable.path}
                  </div>
                </div>
                
                {/* Use Button with Enhanced Styling */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                  <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                    <Database className="h-4 w-4" />
                    Use This Variable
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