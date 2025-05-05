import { useState } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NodeType {
  type: string;
  name: string;
  description: string;
  category: string;
  gradientFrom: string;
  gradientTo: string;
  icon: React.ReactNode;
}

export function NodePanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  
  const nodeTypes: NodeType[] = [
    {
      type: "httpRequest",
      name: "HTTP Request",
      description: "Connect to any API",
      category: "Integration",
      gradientFrom: "from-primary-light",
      gradientTo: "to-primary",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      )
    },
    {
      type: "ifElse",
      name: "IF/ELSE",
      description: "Conditional branching",
      category: "Logic",
      gradientFrom: "from-amber-500",
      gradientTo: "to-orange-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: "loop",
      name: "LOOP",
      description: "Iterate through arrays",
      category: "Logic",
      gradientFrom: "from-emerald-500",
      gradientTo: "to-green-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    {
      type: "setVariable",
      name: "SET VARIABLE",
      description: "Store & transform data",
      category: "Data",
      gradientFrom: "from-violet-500",
      gradientTo: "to-purple-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      type: "log",
      name: "LOG",
      description: "Debug and trace",
      category: "Utilities",
      gradientFrom: "from-cyan-500",
      gradientTo: "to-blue-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: "delay",
      name: "DELAY/SCHEDULE",
      description: "Time-based actions",
      category: "Utilities",
      gradientFrom: "from-rose-500",
      gradientTo: "to-pink-500",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: "stopJob",
      name: "STOP JOB",
      description: "End execution with success or error",
      category: "Flow Control",
      gradientFrom: "from-red-500",
      gradientTo: "to-red-600",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10l0 4 M15 10l0 4" />
        </svg>
      )
    }
  ];
  
  // Filter nodes based on search term
  const filteredNodes = searchTerm
    ? nodeTypes.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : nodeTypes;
    
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };
  
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };
  
  return (
    <div className={`border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        {!collapsed ? (
          <>
            <h2 className="font-medium text-sm">Flow Nodes</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleCollapse}
              className="w-8 h-8 p-0"
            >
              <ChevronLeft size={16} />
            </Button>
          </>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleCollapse}
            className="w-8 h-8 p-0 mx-auto"
          >
            <ChevronRight size={16} />
          </Button>
        )}
      </div>
      
      {!collapsed && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Search nodes..." 
              className="pl-9 text-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}
      
      <div className={`flex-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-4'} space-y-3`}>
        {filteredNodes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(event) => onDragStart(event, node.type, { label: node.name })}
            className={`node cursor-move rounded-xl text-white shadow-md hover:shadow-lg ${
              collapsed ? 'p-2 flex justify-center' : 'p-3 flex items-center'
            }`}
            style={{
              background: `linear-gradient(to right, var(--${node.gradientFrom.split('-')[1]}), var(--${node.gradientTo.split('-')[1]}))`
            }}
          >
            <div className={`bg-white bg-opacity-20 p-2 rounded-lg ${collapsed ? '' : 'mr-3'}`}>
              {node.icon}
            </div>
            {!collapsed && (
              <div>
                <h3 className="font-medium text-sm">{node.name}</h3>
                <p className="text-xs opacity-80">{node.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
