import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayIcon, XIcon, Loader2Icon } from "lucide-react";

// Define log message structure
export interface LogMessage {
  timestamp: Date;
  type: string; 
  message: string;
  nodeId?: string; // Make nodeId optional
}

interface ConsoleOutputProps {
  logs: LogMessage[];
  isRunning: boolean;
  onRunTest: () => void;
}

export function ConsoleOutput({ logs, isRunning, onRunTest }: ConsoleOutputProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState("all");
  const consoleRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Filter logs based on selected filter
  const filteredLogs = logs.filter(log => {
    if (logFilter === "all") return true;
    if (logFilter === "errors" && log.type === "error") return true;
    if (logFilter === "http" && log.type === "http") return true;
    if (logFilter === "custom" && log.type === "log") return true;
    return false;
  });
  
  const clearLogs = () => {
    // This would need to be implemented via a prop or state in the parent component
    // For now, just show a message that it's not implemented
    alert("Clear functionality would be implemented here");
  };
  
  // Helper to format the timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  // Get log type styles
  const getLogTypeStyles = (type: string) => {
    switch (type) {
      case "info":
        return "text-blue-500";
      case "error":
        return "text-red-500";
      case "success":
        return "text-green-500";
      case "http":
        return "text-purple-500";
      case "log":
        return "text-yellow-500";
      default:
        return "text-slate-500";
    }
  };
  
  return (
    <div className="h-48 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex space-x-2">
          <Button 
            size="sm"
            className="flex items-center gap-1 h-8"
            onClick={onRunTest}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2Icon className="h-3 w-3 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="h-3 w-3" />
                Run Test
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs px-2"
            onClick={clearLogs}
          >
            Clear
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Label htmlFor="auto-scroll" className="text-xs">Auto-scroll</Label>
            <Switch 
              id="auto-scroll" 
              checked={autoScroll} 
              onCheckedChange={setAutoScroll}
              className="scale-75"
            />
          </div>
          
          <Select value={logFilter} onValueChange={setLogFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Log Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logs</SelectItem>
              <SelectItem value="errors">Errors Only</SelectItem>
              <SelectItem value="http">HTTP Requests</SelectItem>
              <SelectItem value="custom">Custom Logs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div 
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-slate-50 dark:bg-slate-900"
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => (
            <div key={index} className="mb-1 flex">
              <span className="text-slate-400 inline-block w-20">
                [{formatTime(log.timestamp)}]
              </span>
              <span className={getLogTypeStyles(log.type)}>
                {log.type.toUpperCase()}
              </span>
              <span className="text-slate-700 dark:text-slate-300 ml-2">
                {log.message.startsWith('Response Data:') ? (
                  <div className="pl-2 border-l-2 border-blue-400 mt-1">
                    <div className="text-xs text-blue-500 font-semibold mb-1">Response Data:</div>
                    <pre className="whitespace-pre-wrap break-all bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                      {(() => {
                        try {
                          const jsonData = JSON.parse(log.message.replace('Response Data: ', ''));
                          return JSON.stringify(jsonData, null, 2);
                        } catch (e) {
                          return log.message.replace('Response Data: ', '');
                        }
                      })()}
                    </pre>
                  </div>
                ) : log.message.startsWith('Request Body:') ? (
                  <div className="pl-2 border-l-2 border-purple-400 mt-1">
                    <div className="text-xs text-purple-500 font-semibold mb-1">Request Body:</div>
                    <pre className="whitespace-pre-wrap break-all bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                      {(() => {
                        try {
                          const jsonData = JSON.parse(log.message.replace('Request Body: ', ''));
                          return JSON.stringify(jsonData, null, 2);
                        } catch (e) {
                          return log.message.replace('Request Body: ', '');
                        }
                      })()}
                    </pre>
                  </div>
                ) : log.message.startsWith('HTTP Response:') ? (
                  <div className="pl-2 border-l-2 border-green-400 mt-1">
                    <div className="text-xs text-green-500 font-semibold mb-1">HTTP Response:</div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                      {log.message.replace('HTTP Response: ', '')}
                    </div>
                  </div>
                ) : log.type === 'error' ? (
                  <div className="pl-2 border-l-2 border-red-400 mt-1">
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                      {log.message}
                    </div>
                  </div>
                ) : (
                  log.message
                )}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-slate-400">
            <p>No logs to display. Run your flow to see execution details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
