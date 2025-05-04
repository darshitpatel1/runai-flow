import { memo } from "react";
import { Handle, Position } from "reactflow";

interface LogNodeProps {
  data: {
    label: string;
    message?: string;
    logLevel?: string;
    selected?: boolean;
  };
  selected: boolean;
}

export const LogNode = memo(({ data, selected }: LogNodeProps) => {
  const nodeClassName = `
    bg-white dark:bg-slate-700 rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-500'} 
    ${data.selected ? 'node-highlight' : ''}
  `;
  
  return (
    <div className={nodeClassName}>
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      
      {data.message && (
        <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-2 font-mono">
          {data.message}
        </div>
      )}
      
      <div className="flex items-center space-x-2 text-xs">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
          Log Level: {data.logLevel || "Info"}
        </span>
      </div>
      
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 -top-1.5 !bg-blue-500"
      />
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 -bottom-1.5 !bg-blue-500"
      />
    </div>
  );
});

LogNode.displayName = "LogNode";
