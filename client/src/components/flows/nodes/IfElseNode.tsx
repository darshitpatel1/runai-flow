import { memo } from "react";
import { Handle, Position } from "reactflow";

interface IfElseNodeProps {
  data: {
    label: string;
    condition?: string;
    selected?: boolean;
  };
  selected: boolean;
}

export const IfElseNode = memo(({ data, selected }: IfElseNodeProps) => {
  const nodeClassName = `
    bg-white dark:bg-slate-700 rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500'} 
    ${data.selected ? 'node-highlight' : ''}
  `;
  
  return (
    <div className={nodeClassName}>
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      
      {data.condition && (
        <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 font-mono">
          {data.condition}
        </div>
      )}
      
      <div className="flex items-center space-x-2 text-xs">
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 rounded-full">
          True | False
        </span>
      </div>
      
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
  );
});

IfElseNode.displayName = "IfElseNode";
