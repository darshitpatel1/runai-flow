import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Minimize2, Maximize2 } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { LogMessage } from '@/components/flows/ConsoleOutput';

interface ExecutionProgressProps {
  flowId: string | number;
  executionId?: string | number;
  onLogsUpdate?: (logs: LogMessage[]) => void;
}

type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';

// Local storage key for execution progress state
const EXECUTION_PROGRESS_MINIMIZED_KEY = 'runai_execution_progress_minimized';

export function ExecutionProgress({ 
  flowId, 
  executionId,
  onLogsUpdate
}: ExecutionProgressProps) {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to execute');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [minimized, setMinimized] = useState(() => {
    const savedState = localStorage.getItem(EXECUTION_PROGRESS_MINIMIZED_KEY);
    return savedState ? JSON.parse(savedState) : false;
  });

  // Connect to WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket({
    onMessage: (data) => {
      console.log('WebSocket message received:', data);
    }
  });

  // Save minimized state to localStorage
  useEffect(() => {
    localStorage.setItem(EXECUTION_PROGRESS_MINIMIZED_KEY, JSON.stringify(minimized));
  }, [minimized]);

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  // Process incoming WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'execution_update') {
      const executionData = lastMessage.data;
      
      // Only process messages for the current flow
      if (executionData?.flowId && executionData.flowId.toString() === flowId.toString()) {
        // Update execution status
        if (executionData.status) {
          setStatus(executionData.status === 'completed' 
            ? 'completed' 
            : executionData.status === 'failed' 
              ? 'failed' 
              : 'running');
        }
        
        // Update progress
        if (typeof executionData.progress === 'number') {
          setProgress(executionData.progress);
        }
        
        // Update status message
        if (executionData.message) {
          setStatusMessage(executionData.message);
        }
        
        // Add log entry for execution status
        const newLog: LogMessage = {
          timestamp: new Date(executionData.timestamp) || new Date(),
          type: executionData.status === 'failed' ? 'error' : executionData.status === 'completed' ? 'success' : 'info',
          message: executionData.message || 'Execution update received',
          nodeId: executionData.currentNode ? `node_${executionData.currentNode}` : undefined
        };
        
        // If there's API response data, add it as a separate detailed log
        const logsToAdd = [newLog];
        if (executionData.responseData) {
          const responseLog: LogMessage = {
            timestamp: new Date(),
            type: 'response',
            message: `API Response: ${executionData.responseData}`,
            nodeId: executionData.currentNode ? `node_${executionData.currentNode}` : undefined
          };
          logsToAdd.push(responseLog);
        }
        
        setLogs(prevLogs => {
          const updatedLogs = [...prevLogs, ...logsToAdd];
          
          // Notify parent component about log updates (THIS IS CRITICAL!)
          if (onLogsUpdate) {
            onLogsUpdate(updatedLogs);
          }
          
          return updatedLogs;
        });
      }
    }
  }, [lastMessage, flowId, onLogsUpdate]);

  // Status indicator badge
  const StatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-blue-500 text-white flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Running
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500 text-white flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500 text-white flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500 text-white flex items-center gap-1">
            {isConnected ? (
              <>
                <CheckCircle className="w-3 h-3" />
                Ready
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3" />
                Disconnected
              </>
            )}
          </Badge>
        );
    }
  };

  return (
    <div className={`rounded-md border transition-all duration-200 ${minimized ? 'p-2' : 'p-4 space-y-3'} bg-white dark:bg-black max-w-[calc(100%-60px)]`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Execution Progress</h3>
          {minimized && <StatusBadge />}
        </div>
        <div className="flex items-center gap-2">
          {!minimized && <StatusBadge />}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 p-0"
            onClick={toggleMinimize}
          >
            {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </Button>
        </div>
      </div>
      
      {!minimized && (
        <>
          <Progress value={progress} className="h-2" />
          
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {statusMessage}
            {progress > 0 && progress < 100 && (
              <span className="font-medium ml-1">{progress}%</span>
            )}
          </div>
          
          {!isConnected && (
            <div className="text-xs text-amber-500 flex items-center gap-1 mt-1">
              <AlertTriangle className="w-3 h-3" />
              Waiting for connection...
            </div>
          )}
        </>
      )}
    </div>
  );
}