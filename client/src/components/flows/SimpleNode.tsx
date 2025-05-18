import React from 'react';
import { Handle, Position } from 'reactflow';

// Custom node renderers for each node type
export function HttpRequestNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-violet-100 dark:bg-violet-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600 dark:text-violet-400">
            <path d="M18 10h-4V6"></path><path d="M14 10 21 3"></path><path d="M21 14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'HTTP Request'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.url || 'No URL specified'}</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export function SetVariableNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
            <path d="M8 2h8"></path><path d="M12 14v-4"></path><path d="M12 19.5v.5"></path><path d="M6 8.535V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-.535"></path><path d="M4 14.495a16.88 16.88 0 0 1-1.5 7.5"></path><path d="M2 16c2.755 0 5.455-.508 8-1.492"></path><path d="M4 8.992C6.566 8.012 9.262 7.5 12 7.5"></path><path d="M22 16c-2.755 0-5.455-.508-8-1.492"></path><path d="M18 9c.9.6 1.78 1.252 3.5 2"></path>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'Set Variable'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.variableName || 'No variable name'}</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export function IfElseNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-amber-100 dark:bg-amber-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
            <path d="M16 16v-4a4 4 0 1 0-8 0v4"></path><path d="M12 12h.01"></path>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'If/Else'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.condition || 'No condition'}</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      <Handle type="source" position={Position.Right} id="true" className="w-3 h-3 bg-green-500" />
      <Handle type="source" position={Position.Left} id="false" className="w-3 h-3 bg-red-500" />
    </div>
  );
}

export function LogNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'Log'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.message || 'No message'}</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export function DelayNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-orange-100 dark:bg-orange-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-400">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'Delay'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.duration || '0'} seconds</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export function LoopNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600 dark:text-cyan-400">
            <path d="M17 2.1l4 4-4 4"></path><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8M7 21.9l-4-4 4-4"></path><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"></path>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'Loop'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.loopType || 'No type'}</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export function StopJobNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className="rounded-full w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="9" x2="15" y1="9" y2="15"></line><line x1="15" x2="9" y1="9" y2="15"></line>
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{data?.label || 'Stop Job'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{data?.reason || 'No reason specified'}</div>
        </div>
      </div>
      
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
    </div>
  );
}