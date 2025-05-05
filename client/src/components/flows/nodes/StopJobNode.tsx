import { memo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";

interface StopJobNodeProps {
  id: string;
  data: {
    label: string;
    errorMessage?: string;
    stopType?: 'success' | 'error' | 'cancel';
    selected?: boolean;
    skipped?: boolean;
    skipEnabled?: boolean;
    onNodeDelete?: (nodeId: string) => void;
    onNodeSkip?: (nodeId: string) => void;
  };
  selected: boolean;
}

export const StopJobNode = memo(({ id, data, selected }: StopJobNodeProps) => {
  const { setNodes, setEdges } = useReactFlow();
  
  // Choose color based on stop type
  const getBorderColor = () => {
    switch (data.stopType) {
      case 'error':
        return 'border-red-500';
      case 'cancel':
        return 'border-amber-500';
      case 'success':
      default:
        return 'border-green-500';
    }
  };
  
  const borderColor = getBorderColor();
  
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${selected ? `${borderColor} ring-2 ring-primary/20` : borderColor} 
    ${data.selected ? 'node-highlight' : ''}
    min-w-[280px] w-[280px]
  `;
  
  const handleNodeDelete = (nodeId: string) => {
    if (data.onNodeDelete) {
      data.onNodeDelete(nodeId);
      return;
    }
    
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) => edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    ));
  };
  
  const handleNodeSkip = (nodeId: string) => {
    if (data.onNodeSkip) {
      data.onNodeSkip(nodeId);
      return;
    }
    
    setNodes((nodes) => 
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              skipped: !node.data.skipped
            }
          };
        }
        return node;
      })
    );
  };
  
  // Show a visual indicator if the node is skipped
  const isSkipped = data.skipped ?? false;
  
  // Determine icon background color
  const getIconBgClass = () => {
    switch (data.stopType) {
      case 'error':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'cancel':
        return 'bg-gradient-to-r from-amber-500 to-amber-600';
      case 'success':
      default:
        return 'bg-gradient-to-r from-green-500 to-green-600';
    }
  };
  
  // Determine badge background color
  const getBadgeClass = () => {
    switch (data.stopType) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'cancel':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
      case 'success':
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    }
  };
  
  const handleColor = data.stopType === 'error' ? '#ef4444' : 
                      data.stopType === 'cancel' ? '#f59e0b' : '#22c55e';
  
  return (
    <div className="relative">
      {isSkipped && (
        <div className="absolute inset-0 bg-amber-100 dark:bg-amber-950 bg-opacity-40 dark:bg-opacity-40 rounded-2xl flex items-center justify-center z-10">
          <div className="bg-amber-500 dark:bg-amber-600 text-white px-2 py-1 rounded text-xs font-medium">
            Skipped
          </div>
        </div>
      )}
      
      <div className={`${nodeClassName} ${isSkipped ? 'opacity-50' : ''}`}>
        <div className="flex items-center mb-2">
          <div className={`w-8 h-8 rounded-lg ${getIconBgClass()} flex items-center justify-center text-white mr-2`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="font-medium">{data.label}</h3>
          <div className="ml-auto">
            <NodeContextMenu
              nodeId={id}
              onDelete={handleNodeDelete}
              onSkip={handleNodeSkip}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
          <span className={`px-2 py-0.5 rounded-full text-xs ${getBadgeClass()}`}>
            {data.stopType === 'error' ? 'Stop with Error' : 
             data.stopType === 'cancel' ? 'Cancel Flow' : 
             'Complete Successfully'}
          </span>
        </div>
        
        {data.stopType === 'error' && data.errorMessage && (
          <div className="text-xs px-2 py-1 bg-red-50 dark:bg-red-950 dark:border dark:border-red-800 rounded-lg mb-2 font-mono overflow-hidden text-ellipsis">
            Error: {data.errorMessage}
          </div>
        )}
        
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 -top-1.5"
          style={{ background: handleColor }}
        />
      </div>
    </div>
  );
});

StopJobNode.displayName = "StopJobNode";