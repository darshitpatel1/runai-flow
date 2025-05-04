import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

interface ExecutionDetailProps {
  execution: any;
  flowData?: any;
}

export function ExecutionDetail({ execution, flowData }: ExecutionDetailProps) {
  const [selectedTab, setSelectedTab] = useState('flow');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Parse the execution logs into a more structured format
  const parsedLogs = execution.logs || [];
  
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Group logs by node
  const logsByNode: Record<string, any[]> = {};
  const nodeStatuses: Record<string, 'success' | 'error' | 'running' | 'pending'> = {};
  
  // Initialize with nodes from the flow
  if (flowData?.nodes) {
    flowData.nodes.forEach((node: any) => {
      logsByNode[node.id] = [];
      nodeStatuses[node.id] = 'pending';
    });
  }
  
  // Process logs
  parsedLogs.forEach((log: any) => {
    if (log.nodeId) {
      if (!logsByNode[log.nodeId]) {
        logsByNode[log.nodeId] = [];
      }
      logsByNode[log.nodeId].push(log);
      
      // Update node status based on logs
      if (log.type === 'error') {
        nodeStatuses[log.nodeId] = 'error';
      } else if (log.type === 'success') {
        nodeStatuses[log.nodeId] = 'success';
      } else if (log.type === 'http' && nodeStatuses[log.nodeId] !== 'error') {
        nodeStatuses[log.nodeId] = 'running';
      }
    }
  });
  
  const getNodeStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'running':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-300" />;
    }
  };
  
  // Function to pretty-print response data
  const formatResponseData = (message: string, nodeData?: any) => {
    if (message.startsWith('Response Data:')) {
      try {
        const jsonStr = message.replace('Response Data: ', '');
        const json = JSON.parse(jsonStr);
        const isWorkdayConnector = nodeData?.connector === 'workday';
        
        // Special handling for structured data with arrays
        if (json.data?.Report_Entry || (json.data && Array.isArray(json.data.items))) {
          return (
            <div className="mt-2">
              <div className="text-xs text-blue-500 font-semibold mb-1">Response Data:</div>
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-xs">
                <h4 className="font-semibold mb-2">{isWorkdayConnector ? "Location Details:" : "Response Details:"}</h4>
                
                {/* Process Workday-specific location data */}
                {json.data?.Report_Entry && json.data.Report_Entry.map((entry: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-blue-400 pl-2 mb-2">
                    <div className="grid grid-cols-2 gap-1">
                      {Object.keys(entry).filter(key => typeof entry[key] !== 'object').map(key => (
                        <React.Fragment key={key}>
                          <div className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</div>
                          <div>{String(entry[key])}</div>
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {/* Display nested objects */}
                    {Object.keys(entry).filter(key => typeof entry[key] === 'object' && entry[key] !== null).map(key => (
                      <div key={key} className="mt-2">
                        <h5 className="font-medium mb-1">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</h5>
                        <div className="pl-2">
                          {Object.keys(entry[key]).map(subKey => (
                            <div key={subKey}>{subKey}: {String(entry[key][subKey])}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {/* Process regular array items from API responses */}
                {json.data?.items && Array.isArray(json.data.items) && json.data.items.map((item: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-blue-400 pl-2 mb-2">
                    <div className="grid grid-cols-2 gap-1">
                      {Object.keys(item).filter(key => typeof item[key] !== 'object').map(key => (
                        <React.Fragment key={key}>
                          <div className="font-medium">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</div>
                          <div>{String(item[key])}</div>
                        </React.Fragment>
                      ))}
                    </div>
                    
                    {/* Display nested objects */}
                    {Object.keys(item).filter(key => typeof item[key] === 'object' && item[key] !== null).map(key => (
                      <div key={key} className="mt-2">
                        <h5 className="font-medium mb-1">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</h5>
                        <div className="pl-2">
                          {Object.keys(item[key]).map(subKey => (
                            <div key={subKey}>{subKey}: {String(item[key][subKey])}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                  <div className="text-xs text-slate-500">Request ID: {json.id}</div>
                  <div className="text-xs text-slate-500">Timestamp: {json.timestamp}</div>
                </div>
              </div>
            </div>
          );
        }
        
        // Default JSON formatting for other responses
        return (
          <div className="mt-2">
            <div className="text-xs text-blue-500 font-semibold mb-1">Response Data:</div>
            <pre className="whitespace-pre-wrap break-all bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-xs">
              {JSON.stringify(json, null, 2)}
            </pre>
          </div>
        );
      } catch (e) {
        return message;
      }
    }
    
    if (message.startsWith('Request Body:')) {
      try {
        const jsonStr = message.replace('Request Body: ', '');
        const json = JSON.parse(jsonStr);
        
        // Check if it's a Workday query
        if (json.query && typeof json.query === 'string' && json.query.includes('SELECT')) {
          return (
            <div className="mt-2">
              <div className="text-xs text-purple-500 font-semibold mb-1">Request Body:</div>
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-xs">
                <div className="font-medium mb-1">SQL Query:</div>
                <pre className="bg-slate-200 dark:bg-slate-700 p-2 rounded text-xs text-blue-600 dark:text-blue-400 mb-2">
                  {json.query}
                </pre>
                
                {Object.keys(json).filter(key => key !== 'query').map(key => (
                  <div key={key} className="grid grid-cols-2 gap-1">
                    <div className="font-medium">{key}:</div>
                    <div>{JSON.stringify(json[key])}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        
        // Default JSON formatting
        return (
          <div className="mt-2">
            <div className="text-xs text-purple-500 font-semibold mb-1">Request Body:</div>
            <pre className="whitespace-pre-wrap break-all bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-xs">
              {JSON.stringify(json, null, 2)}
            </pre>
          </div>
        );
      } catch (e) {
        return message;
      }
    }
    
    return message;
  };
  
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flow">Flow Visualization</TabsTrigger>
          <TabsTrigger value="logs">Raw Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="flow" className="p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Execution Results</h3>
            
            {/* Visual representation of flow execution */}
            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="space-y-2">
                {flowData?.nodes?.map((node: any) => (
                  <div key={node.id} className="border rounded-md overflow-hidden">
                    <div 
                      className={`flex items-center px-3 py-2 cursor-pointer justify-between ${
                        nodeStatuses[node.id] === 'error' 
                          ? 'bg-red-50 dark:bg-red-900/20' 
                          : nodeStatuses[node.id] === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20'
                            : 'bg-slate-50 dark:bg-slate-800/50'
                      }`}
                      onClick={() => toggleNodeExpansion(node.id)}
                    >
                      <div className="flex items-center gap-2">
                        {getNodeStatusIcon(nodeStatuses[node.id])}
                        <span className="font-medium">{node.data.label}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {node.type}
                        </Badge>
                      </div>
                      <div>
                        {expandedNodes[node.id] ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    
                    {expandedNodes[node.id] && (
                      <div className="px-4 py-2 border-t">
                        {logsByNode[node.id]?.length > 0 ? (
                          <div className="space-y-2">
                            {logsByNode[node.id].map((log: any, index: number) => (
                              <div key={index} className="text-sm">
                                <div className="flex items-start">
                                  <span className={`
                                    text-xs px-1.5 py-0.5 rounded mr-2 
                                    ${log.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' : 
                                      log.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 
                                      log.type === 'http' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200' :
                                      'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'}
                                  `}>
                                    {log.type}
                                  </span>
                                  <div className="flex-1">
                                    {formatResponseData(log.message, node.data)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground italic">
                            No logs available for this node
                          </div>
                        )}
                        
                        {/* Node configuration details */}
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="text-xs font-medium mb-2">Node Configuration</h4>
                          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(node.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Overall execution details */}
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Execution Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Started:</span>{' '}
                  {execution.startedAt?.toDate 
                    ? new Date(execution.startedAt.toDate()).toLocaleString() 
                    : "Unknown"}
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>{' '}
                  {execution.duration ? `${execution.duration}ms` : "Unknown"}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge className={`
                    ${execution.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 
                      execution.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : 
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'}
                  `}>
                    {execution.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Execution ID:</span>{' '}
                  <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
                    {execution.id}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="p-4">
          <ScrollArea className="h-64 rounded-md border p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(parsedLogs, null, 2)}
            </pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}