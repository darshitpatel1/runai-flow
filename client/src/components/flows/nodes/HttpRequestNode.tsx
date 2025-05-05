import { memo } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { NodeContextMenu } from "../NodeContextMenu";
import { DatabaseIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";

interface HttpRequestNodeProps {
  id: string;
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
    skipped?: boolean;
    skipEnabled?: boolean;
    testResult?: any;
    _lastTestResult?: any; // Alternative location for test result data
    onNodeDelete?: (nodeId: string) => void;
    onNodeSkip?: (nodeId: string) => void;
  };
  selected: boolean;
}

export const HttpRequestNode = memo(({ id, data, selected }: HttpRequestNodeProps) => {
  const { setNodes, setEdges } = useReactFlow();
  
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-primary'} 
    ${data.selected ? 'node-highlight' : ''}
    min-w-[320px] w-[320px]
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
      }
    ));
  };
  
  // Show visual indicators for various states
  const isSkipped = data.skipped ?? false;
  
  // Check if there's test data available
  const hasTestData = !!(data.testResult || data._lastTestResult);
  
  // Determine if the test was successful
  const isSuccessfulTest = hasTestData && (
    (data.testResult?.status?.toString().startsWith('2') || 
     data._lastTestResult?.status?.toString().startsWith('2'))
  );
  
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary-light to-primary flex items-center justify-center text-white mr-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
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
          {data.method && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full text-xs">
              {data.method}
            </span>
          )}
          
          {data.connector && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-full text-slate-800 dark:text-slate-200 text-xs">
              {data.connector}
            </span>
          )}
          
          {data.status && (
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              data.status.startsWith('2') 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                : data.status.startsWith('4') || data.status.startsWith('5')
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
            }`}>
              {data.status}
            </span>
          )}
          
          {/* Test Data Indicator */}
          {hasTestData && (
            <span 
              className={`px-2 py-0.5 flex items-center gap-1 rounded-full text-xs ${
                isSuccessfulTest
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100' 
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
              }`}
              title="This node has test result data available"
            >
              {isSuccessfulTest ? (
                <>
                  <CheckCircleIcon className="h-3 w-3" />
                  Test Data
                </>
              ) : (
                <>
                  <DatabaseIcon className="h-3 w-3" />
                  Test Data
                </>
              )}
            </span>
          )}
        </div>
        
        {data.endpoint && (
          <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-mono truncate">
            {data.endpoint}
          </div>
        )}
        
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
    </div>
  );
});

HttpRequestNode.displayName = "HttpRequestNode";