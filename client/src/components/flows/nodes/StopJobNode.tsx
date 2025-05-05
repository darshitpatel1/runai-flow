import { memo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";
import { ChevronsRight, StopCircle } from "lucide-react";

interface StopJobNodeProps {
  id: string;
  data: {
    label: string;
    stopType?: 'success' | 'error';
    errorMessage?: string;
    skipped?: boolean;
    skipEnabled?: boolean;
    onNodeDelete?: (nodeId: string) => void;
    onNodeSkip?: (nodeId: string) => void;
    onConfigureNode?: (nodeId: string) => void;
  };
  selected: boolean;
}

export const StopJobNode = memo(({ id, data, selected }: StopJobNodeProps) => {
  const { setNodes, setEdges } = useReactFlow();
  
  const nodeClassName = `
    bg-gradient-to-r from-red-500 to-red-600 rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-red-400 ring-2 ring-red-400/20' : 'border-red-500'} 
    ${data.skipped ? 'opacity-50' : ''}
    min-w-[280px] w-[280px] text-white
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
  
  const handleOpenConfiguration = () => {
    if (data.onConfigureNode) {
      data.onConfigureNode(id);
    }
  };

  return (
    <>
      <div className={nodeClassName} onClick={handleOpenConfiguration}>
        <Handle
          id="target"
          type="target"
          position={Position.Left}
          className="w-2 h-2 rounded-full bg-gray-300"
        />
        
        <div className="flex items-center mb-2">
          <div className="bg-white/20 p-2 rounded mr-2">
            <StopCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold flex items-center justify-between">
              <span>{data.label || "Stop Job"}</span>
              {data.stopType && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                  data.stopType === 'success' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {data.stopType === 'success' ? 'Success' : 'Error'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {data.stopType === 'error' && data.errorMessage && (
          <div className="text-xs bg-white/10 rounded p-2 mb-2 break-all">
            <div className="font-semibold mb-1">Error Message:</div>
            {data.errorMessage}
          </div>
        )}
        
        <div className="text-xs bg-white/10 rounded px-2 py-1 flex items-center">
          <ChevronsRight className="h-3 w-3 mr-1" />
          <span>Job execution will end here</span>
        </div>
        
        {/* Skipped indicator */}
        {data.skipped && (
          <div className="absolute inset-0 bg-red-950 bg-opacity-40 rounded-lg flex items-center justify-center z-10">
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
              Skipped
            </div>
          </div>
        )}
      </div>
      
      {selected && (
        <NodeContextMenu 
          nodeId={id} 
          onDelete={handleNodeDelete} 
          onSkip={handleNodeSkip} 
        />
      )}
    </>
  );
});