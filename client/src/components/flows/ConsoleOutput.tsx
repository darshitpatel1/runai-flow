import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayIcon, XIcon, Loader2Icon, ChevronUp, ChevronDown } from "lucide-react";

// Define log message structure
export interface LogMessage {
  timestamp: Date;
  type: string; 
  message: string;
  nodeId?: string;
}

interface ConsoleOutputProps {
  logs: LogMessage[];
  isRunning: boolean;
  onRunTest: () => void;
  flowId?: string | number;
}

// Local storage key for console state
const CONSOLE_COLLAPSED_KEY = 'runai_console_collapsed';

export function ConsoleOutput({ logs, isRunning, onRunTest, flowId }: ConsoleOutputProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState("all");
  const [collapsed, setCollapsed] = useState(() => {
    const savedState = localStorage.getItem(CONSOLE_COLLAPSED_KEY);
    return savedState ? JSON.parse(savedState) : false;
  });
  const consoleRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(CONSOLE_COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);
  
  // Filter logs based on selected filter
  const filteredLogs = logs.filter(log => {
    if (logFilter === "all") return true;
    if (logFilter === "errors" && log.type === "error") return true;
    if (logFilter === "http" && log.type === "http") return true;
    if (logFilter === "custom" && !["error", "http", "info"].includes(log.type)) return true;
    return false;
  });
  
  const clearLogs = () => {
    // This would need to be implemented by the parent component
  };
  
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
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
  
  const formatJsonResponse = (message: string) => {
    if (message.includes('🎨 API Response Data:')) {
      try {
        const jsonStart = message.indexOf('\n') + 1;
        const jsonData = message.substring(jsonStart);
        const parsed = JSON.parse(jsonData);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return message.substring(message.indexOf('\n') + 1);
      }
    }
    return message;
  };
  
  return (
    <div 
      className={`border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex flex-col transition-all duration-300 ${
        collapsed ? 'h-12' : 'h-48'
      }`}
    >
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 text-xs px-2"
            onClick={onRunTest} 
            disabled={isRunning}
          >
            {isRunning ? (
              <><Loader2Icon className="w-3 h-3 mr-1 animate-spin" /> Running</>
            ) : (
              <><PlayIcon className="w-3 h-3 mr-1" /> Run Test</>
            )}
          </Button>
          
          {!collapsed && (
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs px-2"
              onClick={clearLogs}
            >
              Clear
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!collapsed && (
            <>
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
            </>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapse}
            className="h-8 w-8 p-0"
          >
            {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </div>
      
      {!collapsed && (
        <div 
          ref={consoleRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-slate-50 dark:bg-black"
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
                <div className="text-slate-700 dark:text-slate-300 ml-2 break-words break-all min-w-0 flex-1">
                  {log.message.includes('🎨 API Response Data:') ? (
                    <div className="pl-2 border-l-2 border-green-400 mt-1">
                      <div className="text-xs text-green-500 font-semibold mb-1">🎨 API Response Data:</div>
                      <pre className="whitespace-pre-wrap break-all bg-slate-100 dark:bg-gray-900 border dark:border-slate-700 p-2 rounded-md text-xs overflow-x-auto max-w-full">
                        {formatJsonResponse(log.message)}
                      </pre>
                    </div>
                  ) : (
                    <span className="break-words break-all">{log.message}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-slate-400">
              <p>No logs to display. Run your flow to see execution details.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}