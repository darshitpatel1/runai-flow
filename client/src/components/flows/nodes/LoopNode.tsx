import { memo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";

interface LoopNodeProps {
  id: string;
  data: {
    label: string;
    arrayPath?: string;
    itemCount?: number;
    loopType?: 'forEach' | 'while';
    conditionExpression?: string;
    batchSize?: number;
    selected?: boolean;
    skipped?: boolean;
    skipEnabled?: boolean;
    onNodeDelete?: (nodeId: string) => void;
    onNodeSkip?: (nodeId: string) => void;
  };
  selected: boolean;
}

export const LoopNode = memo(({ id, data, selected }: LoopNodeProps) => {
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
  
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-green-500 ring-2 ring-green-500/20' : 'border-green-500'} 
    ${data.selected ? 'node-highlight' : ''}
    min-w-[320px] w-[320px]
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center text-white mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-semibold flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {data.loopType === 'while' ? 'While Condition' : 'For Each Item'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {data.loopType !== 'while' && (
              <span className="px-2 py-1 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 rounded-full text-xs">
                {data.itemCount || 0} items
              </span>
            )}
            {data.batchSize && data.batchSize > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs">
                Batch: {data.batchSize}
              </span>
            )}
          </div>
        </div>
        
        {data.loopType === 'while' && data.conditionExpression && (
          <div className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-950 dark:border dark:border-amber-800 rounded-lg mb-2 font-mono overflow-hidden text-ellipsis">
            Condition: {data.conditionExpression}
          </div>
        )}
        
        {data.loopType !== 'while' && data.arrayPath && (
          <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-semibold">
            Array: {data.arrayPath}
          </div>
        )}
        
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 -top-1.5 !bg-green-500"
        />
        
        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 -bottom-1.5 !bg-green-500"
        />
      </div>
    </div>
  );
});

LoopNode.displayName = "LoopNode";