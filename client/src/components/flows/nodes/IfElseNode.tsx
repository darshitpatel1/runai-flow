import { memo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";

interface IfElseNodeProps {
  data: {
    label: string;
    condition?: string;
    selected?: boolean;
    variable?: string;
    operator?: string;
    value?: string;
    skipped?: boolean;
    skipEnabled?: boolean;
    onNodeDelete?: (nodeId: string) => void;
    onNodeSkip?: (nodeId: string) => void;
  };
  id: string;
  selected: boolean;
}

export const IfElseNode = memo(({ data, id, selected }: IfElseNodeProps) => {
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
    border-2 ${selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500'} 
    ${data.selected ? 'node-highlight' : ''}
    min-w-[280px] w-[280px]
  `;
  
  // Show a visual indicator if the node is skipped
  const isSkipped = data.skipped ?? false;

  const getConditionDisplay = () => {
    if (data.condition) {
      return data.condition;
    }
    
    if (data.variable && data.operator && data.value !== undefined) {
      // Format the condition based on operator
      let operatorDisplay = '';
      switch(data.operator) {
        case 'equals':
          operatorDisplay = '==';
          break;
        case 'notEquals':
          operatorDisplay = '!=';
          break;
        case 'contains':
          operatorDisplay = 'contains';
          break;
        case 'notContains':
          operatorDisplay = 'not contains';
          break;
        case 'greaterThan':
          operatorDisplay = '>';
          break;
        case 'lessThan':
          operatorDisplay = '<';
          break;
        default:
          operatorDisplay = data.operator;
      }
      
      return `${data.variable} ${operatorDisplay} ${data.value}`;
    }
    
    return '';
  };
  
  const conditionDisplay = getConditionDisplay();
  
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-semibold flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              True
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full text-xs font-semibold flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              False
            </span>
          </div>
        </div>
        
        {conditionDisplay && (
          <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-semibold">
            If: {conditionDisplay}
          </div>
        )}
        
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 -top-1.5 !bg-amber-500"
        />
        
        {/* Output Handle - True */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-3 h-3 -bottom-1.5 left-1/3 !bg-green-500"
        />
        
        {/* Output Handle - False */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="w-3 h-3 -bottom-1.5 left-2/3 !bg-red-500"
        />
      </div>
    </div>
  );
});

IfElseNode.displayName = "IfElseNode";