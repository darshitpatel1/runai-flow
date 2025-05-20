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
  
  // Add fixed width and height to prevent node resizing during interactions
  const nodeWidth = data.width || 320; // Default width or use from data if provided
  const nodeHeight = data.height || "auto"; // Default to auto-height or use from data
  
  // Add a stable position class to prevent blinking/flickering during interactions
  const stabilityClass = "transform-gpu"; // Use GPU acceleration for smoother rendering
  
  return (
    <div className={`relative ${stabilityClass}`} style={{ width: nodeWidth, minWidth: nodeWidth }}>
      {/* Add a visual indicator if the node is skipped */}
      {isSkipped && (
        <div className="absolute inset-0 bg-amber-100 dark:bg-amber-950 bg-opacity-40 dark:bg-opacity-40 rounded-lg flex items-center justify-center z-10">
          <div className="bg-amber-500 dark:bg-amber-600 text-white px-2 py-1 rounded text-xs font-medium">
            Skipped
          </div>
        </div>
      )}
      
      {/* Original Node Content with stabilized dimensions */}
      <div className={`${isSkipped ? 'opacity-50' : ''} transition-opacity duration-150`}>
        {children}
      </div>
    </div>
  );
}