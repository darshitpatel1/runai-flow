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
      nodes.map((node) => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, skipped: !node.data.skipped } }
          : node
      )
    );
  };
  
  // Choose color based on stop type
  const getColors = () => {
    switch (data.stopType) {
      case 'error':
        return {
          bgFrom: 'from-red-500',
          bgTo: 'to-red-600',
          textBg: 'bg-red-100',
          textColor: 'text-red-800',
          darkTextBg: 'dark:bg-red-900',
          darkTextColor: 'dark:text-red-100',
          border: 'border-red-500'
        };
      case 'cancel':
        return {
          bgFrom: 'from-amber-500',
          bgTo: 'to-amber-600',
          textBg: 'bg-amber-100',
          textColor: 'text-amber-800',
          darkTextBg: 'dark:bg-amber-900',
          darkTextColor: 'dark:text-amber-100',
          border: 'border-amber-500'
        };
      case 'success':
      default:
        return {
          bgFrom: 'from-green-500',
          bgTo: 'to-green-600',
          textBg: 'bg-green-100',
          textColor: 'text-green-800',
          darkTextBg: 'dark:bg-green-900',
          darkTextColor: 'dark:text-green-100',
          border: 'border-green-500'
        };
    }
  };
  
  const colors = getColors();
  
  // Handle border color in a more direct way to avoid template string issues
  let borderClass = colors.border;
  let ringClass = '';
  
  if (selected) {
    // Apply specific ring class based on stop type
    if (data.stopType === 'error') {
      ringClass = 'ring-2 ring-red-500/20';
    } else if (data.stopType === 'cancel') {
      ringClass = 'ring-2 ring-amber-500/20';
    } else {
      ringClass = 'ring-2 ring-green-500/20';
    }
  }
  
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${borderClass} ${ringClass}
    ${data.selected ? 'node-highlight' : ''}
    min-w-[280px] w-[280px]
    transform-gpu
  `;
  
  // Show a visual indicator if the node is skipped
  const isSkipped = data.skipped ?? false;
  
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
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${colors.bgFrom} ${colors.bgTo} flex items-center justify-center text-white mr-2`}>
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
        
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 ${colors.textBg} ${colors.textColor} ${colors.darkTextBg} ${colors.darkTextColor} rounded-full text-xs font-semibold flex items-center`}>
              {data.stopType === 'error' ? 'Stop with Error' : 
               data.stopType === 'cancel' ? 'Cancel Flow' : 
               'Complete Successfully'}
            </span>
          </div>
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
          style={{
            width: '12px',
            height: '12px',
            top: '-6px',
            background: data.stopType === 'error' ? '#ef4444' : 
                        data.stopType === 'cancel' ? '#f59e0b' : '#22c55e'
          }}
        />
      </div>
    </div>
  );
});

StopJobNode.displayName = "StopJobNode";