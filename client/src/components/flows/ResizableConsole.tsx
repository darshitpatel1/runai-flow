import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayIcon, Loader2Icon, ChevronUp, ChevronDown } from "lucide-react";

export interface LogMessage {
  timestamp: Date;
  type: string; 
  message: string;
  nodeId?: string;
}

interface ResizableConsoleProps {
  logs: LogMessage[];
  isRunning: boolean;
  onRunTest: () => void;
  flowId?: string | number;
}

const CONSOLE_COLLAPSED_KEY = 'runai_console_collapsed';
const CONSOLE_HEIGHT_KEY = 'runai_console_height';

export function ResizableConsole({ logs, isRunning, onRunTest, flowId }: ResizableConsoleProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilter, setLogFilter] = useState("all");
  const [collapsed, setCollapsed] = useState(() => {
    const savedState = localStorage.getItem(CONSOLE_COLLAPSED_KEY);
    return savedState ? JSON.parse(savedState) : false;
  });
  const [height, setHeight] = useState(() => {
    const savedHeight = localStorage.getItem(CONSOLE_HEIGHT_KEY);
    return savedHeight ? parseInt(savedHeight) : 192; // Default 192px (h-48)
  });
  const [isResizing, setIsResizing] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem(CONSOLE_COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem(CONSOLE_HEIGHT_KEY, height.toString());
  }, [height]);

  // Handle resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setHeight(Math.max(100, Math.min(600, newHeight))); // Min 100px, Max 600px
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

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
      className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex flex-col transition-all duration-300"
      style={{ height: collapsed ? '48px' : `${height}px` }}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          ref={resizeRef}
          className="h-1 bg-slate-200 dark:bg-slate-700 hover:bg-blue-500 cursor-row-resize transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />
      )}

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
                <span className="text-slate-400 inline-block w-20 flex-shrink-0">
                  [{formatTime(log.timestamp)}]
                </span>
                <span className={`${getLogTypeStyles(log.type)} flex-shrink-0 mr-2`}>
                  {log.type.toUpperCase()}
                </span>
                <div className="text-slate-700 dark:text-slate-300 break-words break-all min-w-0 flex-1">
                  {log.message.includes('🎨 API Response Data:') ? (
                    <div className="border-l-2 border-green-400 pl-2 mt-1">
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