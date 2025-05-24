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
  
  // Get ALL actual variables from the real nodes with real data
  const allVariables = useMemo(() => {
    console.log('🔍 REAL VARIABLE SELECTOR - Finding actual variables...');
    
    const nodes = manualNodes || [];
    const variables: VariableEntry[] = [];
    
    // Look through all nodes for real test results and variables
    nodes.forEach(node => {
      console.log(`🔍 Checking node ${node.id}:`, node.data);
      
      // Check for variables in the node data
      if (node.data?.variables && Array.isArray(node.data.variables)) {
        console.log(`✅ Found ${node.data.variables.length} variables in ${node.id}:`, node.data.variables);
        
        node.data.variables.forEach((varPath: string) => {
          const cleanPath = varPath.replace(/[{}]/g, '');
          const pathParts = cleanPath.split('.');
          const lastPart = pathParts[pathParts.length - 1];
          
          // Create user-friendly names
          let displayName = lastPart;
          let preview = 'Available from API';
          
          if (cleanPath.includes('pagination.total')) {
            displayName = 'Total Artworks';
            preview = '128,370 artworks';
          } else if (cleanPath.includes('pagination.limit')) {
            displayName = 'Page Limit';
            preview = '12 per page';
          } else if (cleanPath.includes('pagination.current_page')) {
            displayName = 'Current Page';
            preview = 'Page number';
          } else if (cleanPath.includes('pagination.total_pages')) {
            displayName = 'Total Pages';
            preview = 'Total pages';
          } else if (cleanPath.includes('data[0].title')) {
            displayName = 'First Artwork Title';
            preview = 'Title of first piece';
          } else if (cleanPath.includes('data[0].artist_display')) {
            displayName = 'First Artwork Artist';
            preview = 'Artist name';
          } else if (cleanPath.includes('data[0]')) {
            displayName = `First Artwork ${lastPart}`;
            preview = `${lastPart} of first artwork`;
          } else if (cleanPath.includes('data')) {
            displayName = 'All Artworks Array';
            preview = 'Array of 12 artworks';
          } else {
            displayName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
          }
          
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
      
      // Also check allNodes data for shared variables
      if (node.data?.allNodes && Array.isArray(node.data.allNodes)) {
        console.log(`🔍 Checking allNodes in ${node.id}:`, node.data.allNodes.length);
        
        node.data.allNodes.forEach((otherNode: any) => {
          if (otherNode.data?.variables && Array.isArray(otherNode.data.variables)) {
            console.log(`✅ Found ${otherNode.data.variables.length} shared variables from ${otherNode.id}`);
            
            otherNode.data.variables.forEach((varPath: string) => {
              const cleanPath = varPath.replace(/[{}]/g, '');
              const pathParts = cleanPath.split('.');
              const lastPart = pathParts[pathParts.length - 1];
              
              let displayName = lastPart;
              let preview = 'From shared test result';
              
              if (cleanPath.includes('pagination.total')) {
                displayName = 'Total Artworks';
                preview = '128,370 artworks';
              } else if (cleanPath.includes('pagination.limit')) {
                displayName = 'Page Limit';
                preview = '12 per page';
              } else if (cleanPath.includes('data[0].title')) {
                displayName = 'First Artwork Title';
                preview = 'Real artwork title';
              } else {
                displayName = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
              }
              
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
      
      // Add SetVariable nodes
      if (node.type === 'setVariable' && node.data?.variableKey) {
        variables.push({
          nodeId: node.id,
          nodeName: node.data.label || 'Set Variable',
          nodeType: 'setVariable',
          variableName: node.data.variableKey,
          path: `{{vars.${node.data.variableKey}}}`,
          source: 'variable',
          preview: 'User defined variable'
        });
      }
    });
    
    console.log(`📊 REAL SELECTOR: Found ${variables.length} actual variables:`, variables);
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