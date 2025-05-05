import { memo } from "react";
import { Handle, Position } from "reactflow";
import { MoreHorizontal } from "lucide-react";

interface IfElseNodeProps {
  data: {
    label: string;
    condition?: string;
    selected?: boolean;
    variable?: string;
    operator?: string;
    value?: string;
    id?: string; // Add id to the data interface
  };
  id: string; // Add id to the props
  selected: boolean;
}

export const IfElseNode = memo(({ data, id, selected }: IfElseNodeProps) => {
  const nodeClassName = `
    bg-white dark:bg-black rounded-2xl shadow-lg p-3 
    border-2 ${selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-amber-500'} 
    ${data.selected ? 'node-highlight' : ''}
    min-w-[280px] w-[280px]
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

  const getConditionDisplay = () => {
    if (data.condition) {
      return data.condition;
    }
    
    if (data.variable && data.operator && data.value !== undefined) {
      // Format the condition based on operator
      let operatorDisplay = '';
      switch(data.operator) {
        case 'equals':
          operatorDisplay = '==';
          break;
        case 'notEquals':
          operatorDisplay = '!=';
          break;
        case 'contains':
          operatorDisplay = 'contains';
          break;
        case 'notContains':
          operatorDisplay = 'not contains';
          break;
        case 'greaterThan':
          operatorDisplay = '>';
          break;
        case 'lessThan':
          operatorDisplay = '<';
          break;
        default:
          operatorDisplay = data.operator;
      }
      
      return `${data.variable} ${operatorDisplay} ${data.value}`;
    }
    
    return '';
  };
  
  const conditionDisplay = getConditionDisplay();
  
  return (
    <div className={nodeClassName}>
      <div className="flex items-center mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white mr-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-medium">{data.label}</h3>
        <div className="ml-auto context-menu-trigger" onClick={showContextMenu}>
          <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full text-xs font-semibold flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            True
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full text-xs font-semibold flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            False
          </span>
        </div>
      </div>
      
      {conditionDisplay && (
        <div className="text-xs px-2 py-1 bg-slate-100 dark:bg-black dark:border dark:border-slate-700 rounded-lg mb-2 font-semibold">
          If: {conditionDisplay}
        </div>
      )}
      
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 -top-1.5 !bg-amber-500"
      />
      
      {/* Output Handle - True */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 -bottom-1.5 left-1/3 !bg-green-500"
      />
      
      {/* Output Handle - False */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 -bottom-1.5 left-2/3 !bg-red-500"
      />
    </div>
  );
});

IfElseNode.displayName = "IfElseNode";
