import { memo } from "react";
import { Handle, Position } from "reactflow";
import { MoreHorizontal } from "lucide-react";

interface DelayNodeProps {
  data: {
    label: string;
    delayAmount?: string;
    delayType?: 'seconds' | 'minutes' | 'hours' | 'cron';
    cronExpression?: string;
    selected?: boolean;
    id?: string;
    skipped?: boolean;
  };
  id: string;
  selected: boolean;
}

export const DelayNode = memo(({ data, id, selected }: DelayNodeProps) => {
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-rose-500'} 
    ${data.selected ? 'node-highlight' : ''}
    ${data.skipped ? 'opacity-60' : ''}
    min-w-[200px]
  `;
  
  const showContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Dispatch a custom event that will be caught by the flow builder
    const event = new CustomEvent('node:contextmenu', {
      bubbles: true,
      detail: { nodeId: id, x: e.clientX, y: e.clientY }
    });
    e.currentTarget.dispatchEvent(event);
  };
  
  // Generate a friendly display of the delay
  const getDelayDisplay = () => {
    if (data.delayType === 'cron' && data.cronExpression) {
      return `CRON: ${data.cronExpression}`;
    } else if (data.delayAmount) {
      return `Delay: ${data.delayAmount} ${data.delayType || 'seconds'}`;
    }
    return null;
  };
  
  const delayDisplay = getDelayDisplay();
  
  return (
    <div className={nodeClassName}>
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-medium">{data.label}</h3>
        <div className="ml-auto context-menu-trigger" onClick={showContextMenu}>
          <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {delayDisplay && (
        <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-mono">
          {delayDisplay}
        </div>
      )}
      
      <div className="flex items-center space-x-2 text-xs">
        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100 rounded-full">
          {data.delayType === 'cron' ? 'Scheduled' : 'Delay'}
        </span>
        
        {data.skipped && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 rounded-full">
            Skipped
          </span>
        )}
      </div>
      
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 -top-1.5 !bg-rose-500"
      />
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 -bottom-1.5 !bg-rose-500"
      />
    </div>
  );
});

DelayNode.displayName = "DelayNode";
