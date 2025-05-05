import React from 'react';
import { NodeContextMenu } from '../NodeContextMenu';

interface CustomNodeWrapperProps {
  id: string;
  selected: boolean;
  data: any;
  children: React.ReactNode;
  onNodeDelete: (nodeId: string) => void;
  onNodeSkip: (nodeId: string) => void;
}

export function CustomNodeWrapper({ 
  id, 
  selected,
  data,
  children,
  onNodeDelete,
  onNodeSkip
}: CustomNodeWrapperProps) {
  const skipEnabled = data.skipEnabled ?? true;
  const isSkipped = data.skipped ?? false;
  
  return (
    <div className="relative">
      {/* Add a visual indicator if the node is skipped */}
      {isSkipped && (
        <div className="absolute inset-0 bg-amber-100 dark:bg-amber-950 bg-opacity-40 dark:bg-opacity-40 rounded-lg flex items-center justify-center z-10">
          <div className="bg-amber-500 dark:bg-amber-600 text-white px-2 py-1 rounded text-xs font-medium">
            Skipped
          </div>
        </div>
      )}
      
      {/* Node Context Menu */}
      <NodeContextMenu 
        nodeId={id} 
        onDelete={onNodeDelete}
        onSkip={onNodeSkip}
      />
      
      {/* Original Node Content */}
      <div className={isSkipped ? 'opacity-50' : ''}>
        {children}
      </div>
    </div>
  );
}