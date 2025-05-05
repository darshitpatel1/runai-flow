import React from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";
import { Code2Icon } from "lucide-react";

interface SetVariableNodeProps {
  id: string;
  data: {
    label?: string;
    variableKey?: string;
    variableValue?: string;
    useTransform?: boolean;
    transformScript?: string;
    selected?: boolean;
    skipped?: boolean;
    skipEnabled?: boolean;
    onNodeDelete?: (nodeId: string) => void;
    onNodeSkip?: (nodeId: string) => void;
  };
  selected?: boolean;
}

// Safe function to handle node deletion
function safeDeleteNode(nodeId: string, data: any, setNodes: any, setEdges: any) {
  try {
    // First check if there's a custom delete handler
    if (typeof data?.onNodeDelete === 'function') {
      data.onNodeDelete(nodeId);
      return;
    }
    
    // If no custom handler, use standard delete
    if (setNodes && typeof setNodes === 'function') {
      setNodes((nodes: any[]) => {
        try {
          return Array.isArray(nodes) 
            ? nodes.filter((node) => node?.id !== nodeId)
            : nodes;
        } catch (error) {
          console.error("Error filtering nodes:", error);
          return nodes || [];
        }
      });
    }
    
    if (setEdges && typeof setEdges === 'function') {
      setEdges((edges: any[]) => {
        try {
          return Array.isArray(edges)
            ? edges.filter((edge) => edge?.source !== nodeId && edge?.target !== nodeId)
            : edges;
        } catch (error) {
          console.error("Error filtering edges:", error);
          return edges || [];
        }
      });
    }
  } catch (error) {
    console.error("Error in safeDeleteNode:", error);
  }
}

// Safe function to handle node skipping
function safeSkipNode(nodeId: string, data: any, setNodes: any) {
  try {
    // First check if there's a custom skip handler
    if (typeof data?.onNodeSkip === 'function') {
      data.onNodeSkip(nodeId);
      return;
    }
    
    // If no custom handler, use standard skip
    if (setNodes && typeof setNodes === 'function') {
      setNodes((nodes: any[]) => {
        try {
          if (!Array.isArray(nodes)) return nodes || [];
          
          return nodes.map((node) => {
            // Skip nodes that don't have the correct structure
            if (!node || node.id !== nodeId) return node;
            
            // Create a safe copy of node data
            const safeData = node.data || {};
            return {
              ...node,
              data: {
                ...safeData,
                skipped: !(safeData.skipped ?? false)
              }
            };
          });
        } catch (error) {
          console.error("Error updating nodes for skip:", error);
          return nodes || [];
        }
      });
    }
  } catch (error) {
    console.error("Error in safeSkipNode:", error);
  }
}

// Functional component with error boundary
function SetVariableNodeContent({ id, data, selected }: SetVariableNodeProps) {
  const reactFlowInstance = useReactFlow();
  
  // Extract methods safely with defaults
  const setNodes = reactFlowInstance?.setNodes || ((nodes: any) => {});
  const setEdges = reactFlowInstance?.setEdges || ((edges: any) => {});
  
  // Safe data access with defaults
  const nodeLabel = data?.label || "Set Variable";
  const variableKey = data?.variableKey || "";
  const variableValue = data?.variableValue || "";
  const useTransform = data?.useTransform || false;
  const isSkipped = data?.skipped || false;
  
  // Safe handlers
  const handleNodeDelete = React.useCallback(() => {
    safeDeleteNode(id, data, setNodes, setEdges);
  }, [id, data, setNodes, setEdges]);
  
  const handleNodeSkip = React.useCallback(() => {
    safeSkipNode(id, data, setNodes);
  }, [id, data, setNodes]);
  
  // Generate class name with safety checks
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-violet-500'} 
    ${data?.selected ? 'node-highlight' : ''}
    min-w-[320px] w-[320px]
  `;
  
  return (
    <div className="relative transform-gpu" style={{ width: 320, minWidth: 320 }}>
      {isSkipped && (
        <div className="absolute inset-0 bg-amber-100 dark:bg-amber-950 bg-opacity-40 dark:bg-opacity-40 rounded-2xl flex items-center justify-center z-10">
          <div className="bg-amber-500 dark:bg-amber-600 text-white px-2 py-1 rounded text-xs font-medium">
            Skipped
          </div>
        </div>
      )}
      <div className={`${nodeClassName} ${isSkipped ? 'opacity-50' : ''}`}>
        <div className="flex items-center mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="font-medium">{nodeLabel}</h3>
          <div className="ml-auto">
            <NodeContextMenu
              nodeId={id}
              onDelete={handleNodeDelete}
              onSkip={handleNodeSkip}
            />
          </div>
        </div>
        
        {variableKey && (
          <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-mono">
            {variableKey} = {variableValue}
          </div>
        )}
        
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2 py-0.5 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100 rounded-full">
            Variable
          </span>
          {useTransform && (
            <span className="px-2 py-0.5 flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100 rounded-full">
              <Code2Icon className="h-3 w-3" />
              Transform
            </span>
          )}
        </div>
        
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 -top-1.5 !bg-violet-500"
        />
        
        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 -bottom-1.5 !bg-violet-500"
        />
      </div>
    </div>
  );
}

// Error boundary wrapped component
class SetVariableNodeWithErrorBoundary extends React.Component<SetVariableNodeProps, { hasError: boolean }> {
  constructor(props: SetVariableNodeProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error in SetVariableNode:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when error occurs
      return (
        <div className="bg-white dark:bg-black rounded-2xl shadow-lg p-3 border-2 border-red-500 min-w-[320px] w-[320px]">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white mr-2">
              ⚠️
            </div>
            <h3 className="font-medium text-red-700 dark:text-red-300">Error: Set Variable</h3>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            There was an error rendering this node. Try reloading the page.
          </p>
          
          {/* Handles must be rendered even in error state */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 -top-1.5 !bg-violet-500"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 -bottom-1.5 !bg-violet-500"
          />
        </div>
      );
    }

    return <SetVariableNodeContent {...this.props} />;
  }
}

// Use memo to prevent unnecessary re-renders
export const SetVariableNode = React.memo(SetVariableNodeWithErrorBoundary);

SetVariableNode.displayName = "SetVariableNode";