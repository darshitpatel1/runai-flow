import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-websocket';
import { LogMessage } from '@/components/flows/ConsoleOutput';

interface ExecutionProgressProps {
  flowId: string | number;
  executionId?: string | number;
  onLogsUpdate?: (logs: LogMessage[]) => void;
}

type ExecutionStatus = 'idle' | 'running' | 'completed' | 'failed';

export function ExecutionProgress({ 
  flowId, 
  executionId,
  onLogsUpdate
}: ExecutionProgressProps) {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to execute');
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Connect to WebSocket for real-time updates
  const { lastMessage, isConnected } = useWebSocket({
    onMessage: (data) => {
      console.log('WebSocket message received:', data);
    }
  });

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
        
        // Add log entry
        const newLog: LogMessage = {
          timestamp: new Date(executionData.timestamp) || new Date(),
          type: executionData.status === 'failed' ? 'error' : 'info',
          message: executionData.message || 'Execution update received',
          nodeId: executionData.currentNode ? `node_${executionData.currentNode}` : undefined
        };
        
        setLogs(prevLogs => {
          const updatedLogs = [...prevLogs, newLog];
          
          // Notify parent component about log updates
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
    <div className="rounded-md border p-4 space-y-3 bg-white dark:bg-slate-800">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Execution Progress</h3>
        <StatusBadge />
      </div>
      
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
    </div>
  );
}