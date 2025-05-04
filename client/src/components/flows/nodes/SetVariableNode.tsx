import { memo } from "react";
import { Handle, Position } from "reactflow";

interface SetVariableNodeProps {
  data: {
    label: string;
    variableKey?: string;
    variableValue?: string;
    selected?: boolean;
  };
  selected: boolean;
}

export const SetVariableNode = memo(({ data, selected }: SetVariableNodeProps) => {
  const nodeClassName = `
    bg-white dark:bg-slate-700 rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-violet-500'} 
    ${data.selected ? 'node-highlight' : ''}
  `;
  
  return (
    <div className={nodeClassName}>
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="font-medium">{data.label}</h3>
        <div className="ml-auto">
          <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      {data.variableKey && (
        <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 font-mono">
          {data.variableKey} = {data.variableValue || ""}
        </div>
      )}
      
      <div className="flex items-center space-x-2 text-xs">
        <span className="px-2 py-0.5 bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100 rounded-full">
          Variable
        </span>
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
  );
});

SetVariableNode.displayName = "SetVariableNode";
