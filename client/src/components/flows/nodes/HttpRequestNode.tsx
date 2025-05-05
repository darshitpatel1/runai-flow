import { memo } from "react";
import { Handle, Position } from "reactflow";

interface HttpRequestNodeProps {
  data: {
    label: string;
    method?: string;
    endpoint?: string;
    connector?: string;
    status?: string;
    selected?: boolean;
    body?: string;
    headers?: Record<string, string>[];
    queryParams?: Record<string, string>[];
    parseJson?: boolean;
    failOnError?: boolean;
  };
  selected: boolean;
}

export const HttpRequestNode = memo(({ data, selected }: HttpRequestNodeProps) => {
  const nodeClassName = `
    bg-white dark:bg-slate-700 rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-primary'} 
    ${data.selected ? 'node-highlight' : ''}
    min-w-[280px] w-[280px]
  `;
  
  return (
    <div className={nodeClassName}>
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-light to-primary flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="font-medium">{data.label}</h3>
        {data.method && (
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs">
            {data.method}
          </span>
        )}
        <div className="ml-auto">
          <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
      
      {data.connector && (
        <div className="flex items-center space-x-2 text-xs mb-2">
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-800 dark:text-slate-200">
            Connector: {data.connector}
          </span>
        </div>
      )}
      
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {data.status && (
          <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full">
            Success: {data.status}
          </span>
        )}
        {data.connector && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
            Using: {data.connector}
          </span>
        )}
        {data.parseJson && (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 rounded-full">
            Parse JSON
          </span>
        )}
      </div>
      
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 -top-1.5 !bg-primary"
      />
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 -bottom-1.5 !bg-primary"
      />
    </div>
  );
});

HttpRequestNode.displayName = "HttpRequestNode";
