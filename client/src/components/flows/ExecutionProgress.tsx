import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Minimize2, Maximize2 } from 'lucide-react';
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

  // Execute flow using direct API calls
  const executeFlow = async () => {
    if (status === 'running') return;
    
    setStatus('running');
    setProgress(0);
    setStatusMessage('Starting execution...');
    
    const newLog: LogMessage = {
      timestamp: new Date(),
      type: 'info',
      message: 'Flow execution started'
    };
    setLogs([newLog]);
    onLogsUpdate?.([newLog]);
    
    try {
      // Call the execution API with required firebaseId parameter
      const response = await fetch(`/api/execute-flow/${flowId}?firebaseId=D95yn62H6FSy8xaafJmBF6rdEk93`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }
      
      const result = await response.text();
      
      // Show real API response in console
      const responseLog: LogMessage = {
        timestamp: new Date(),
        type: 'success',
        message: `API Response: ${result}`
      };
      
      setLogs(prev => [...prev, responseLog]);
      onLogsUpdate?.([...logs, responseLog]);
      setProgress(100);
      setStatus('completed');
      setStatusMessage('Execution completed successfully');
      
    } catch (error: any) {
      const errorLog: LogMessage = {
        timestamp: new Date(),
        type: 'error',
        message: `Execution failed: ${error.message}`
      };
      
      setLogs(prev => [...prev, errorLog]);
      onLogsUpdate?.([...logs, errorLog]);
      setStatus('failed');
      setStatusMessage('Execution failed');
    }
  };

  // Save minimized state to localStorage
  useEffect(() => {
    localStorage.setItem(EXECUTION_PROGRESS_MINIMIZED_KEY, JSON.stringify(minimized));
  }, [minimized]);

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  // Auto-start execution when component mounts
  useEffect(() => {
    if (executionId && status === 'idle') {
      executeFlow();
    }
  }, [executionId]);

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
            <CheckCircle className="w-3 h-3" />
            Ready
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
          
          {status === 'running' && (
            <div className="text-xs text-blue-500 flex items-center gap-1 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Executing flow...
            </div>
          )}
        </>
      )}
    </div>
  );
}