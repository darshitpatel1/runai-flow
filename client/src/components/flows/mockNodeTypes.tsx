import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

// Basic node implementation with customizable label
export function BasicNode({ data, isConnectable }: NodeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-md p-3 border border-gray-300 dark:border-gray-700">
      <div className="font-medium text-gray-900 dark:text-gray-100">{data?.label || 'Node'}</div>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable || true}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable || true}
      />
    </div>
  );
}

// Export all node types
export const nodeTypes = {
  httpRequest: BasicNode,
  setVariable: BasicNode,
  ifElse: BasicNode,
  logMessage: BasicNode,
  delay: BasicNode,
  loop: BasicNode,
  stopJob: BasicNode
};