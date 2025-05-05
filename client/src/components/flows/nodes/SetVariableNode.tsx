import { memo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";
import { Code2Icon } from "lucide-react";

interface SetVariableNodeProps {
  id: string;
  data: {
    label: string;
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
  selected: boolean;
}

export const SetVariableNode = memo(({ id, data, selected }: SetVariableNodeProps) => {
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
    border-2 ${selected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-violet-500'} 
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
        
        {data.variableKey && (
          <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-mono">
            {data.variableKey} = {data.variableValue || ""}
          </div>
        )}
        
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2 py-0.5 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100 rounded-full">
            Variable
          </span>
          {data.useTransform && (
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
});

SetVariableNode.displayName = "SetVariableNode";
