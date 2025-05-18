import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges as applyReactFlowNodeChanges,
  applyEdgeChanges as applyReactFlowEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';

import { NodeConfiguration } from './NodeConfiguration';
import { NodeContextMenu } from './NodeContextMenu';
import { LogMessage } from './ConsoleOutput';
import { useToast } from '@/hooks/use-toast';

interface NodePositionChange {
  type: 'position';
  id: string;
  position: { x: number; y: number };
  dragging?: boolean;
}

interface FlowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  connectors: any[];
  flowId?: string;
  onTestNode?: (nodeId: string, nodeData: any) => Promise<any>;
}

export function FlowBuilder({ 
  initialNodes = [],
  initialEdges = [],
  onNodesChange: reportNodesChange,
  onEdgesChange: reportEdgesChange,
  connectors,
  flowId,
  onTestNode
}: FlowBuilderProps) {
  const { toast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const reactFlowInstance = useReactFlow();
  
  // Grid size for snapping
  const gridSize = 15;
  
  // Initialize the flow on component mount
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    
    if (initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges]);
  
  // Report changes to parent components
  useEffect(() => {
    reportNodesChange(nodes);
  }, [nodes, reportNodesChange]);
  
  useEffect(() => {
    reportEdgesChange(edges);
  }, [edges, reportEdgesChange]);

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback((changes: any[]) => {
    // Apply grid snapping to position changes
    const snappedChanges = changes.map(change => {
      if (change.type === 'position' && change.position) {
        // Snap positions to grid
        return {
          ...change,
          position: {
            x: Math.round(change.position.x / gridSize) * gridSize,
            y: Math.round(change.position.y / gridSize) * gridSize,
          },
        };
      }
      return change;
    });
    
    setNodes((nds) => {
      // Apply the changes to the nodes
      const updatedNodes = applyReactFlowNodeChanges(snappedChanges, nds);
      
      // For node selection changes, update the selectedNode state
      const selectionChanges = changes.filter(change => change.type === 'select');
      
      if (selectionChanges.length > 0) {
        const selectedNodes = updatedNodes.filter((node) => node.selected);
        
        if (selectedNodes.length === 1) {
          setSelectedNode(selectedNodes[0]);
        } else {
          setSelectedNode(null);
        }
      }
      
      return updatedNodes;
    });
  }, []);

  // Handle node changes (adding, removing, positioning)
  const onEdgesChange = useCallback((changes: any[]) => {
    setEdges((eds) => applyReactFlowEdgeChanges(changes, eds));
  }, []);

  // Connect two nodes when a connection is created
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#4f46e5', strokeWidth: 2 } 
    }, eds)),
    []
  );

  // Handle right-click on a node to show context menu
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Prevent default context menu
      event.preventDefault();
      
      // Set the context menu position and node ID
      setContextMenuNodeId(node.id);
      setContextMenuPosition({
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  // Close the context menu when clicking outside
  const onPaneClick = useCallback(() => {
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
  }, []);

  // Update node data when configuration changes
  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
  }, []);

  // Delete a node from the flow
  const deleteNode = useCallback((nodeId: string) => {
    // Close the context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    // Remove the node and its connections
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) => edges.filter((edge) => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    
    toast({
      title: "Node deleted",
      description: "The node has been removed from the flow",
    });
  }, [toast]);

  // Handle testing a node
  const handleTestNode = useCallback(async (nodeId: string, nodeData: any) => {
    if (!onTestNode) {
      toast({
        title: "Test not available",
        description: "No test function provided",
        variant: "destructive"
      });
      return null;
    }

    setIsTestRunning(true);
    setLogs([]);

    try {
      // Call the test function passed from parent
      const result = await onTestNode(nodeId, nodeData);
      return result;
    } catch (error) {
      console.error("Error testing node:", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsTestRunning(false);
    }
  }, [onTestNode, toast]);

  // Handle clicking on a node
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="h-[calc(100vh-10rem)] w-full flex flex-col">
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          fitView
          snapToGrid
          snapGrid={[gridSize, gridSize]}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodeTypes={{}}
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <div className="absolute top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-lg w-80 overflow-y-auto z-10">
            <NodeConfiguration
              node={selectedNode}
              updateNodeData={updateNodeData}
              onClose={() => setSelectedNode(null)}
              connectors={connectors}
              onTestNode={handleTestNode}
            />
          </div>
        )}

        {/* Context Menu */}
        {contextMenuNodeId && contextMenuPosition && (
          <div
            className="absolute z-50"
            style={{
              top: contextMenuPosition.y,
              left: contextMenuPosition.x,
            }}
          >
            <NodeContextMenu
              nodeId={contextMenuNodeId}
              onDelete={deleteNode}
              onSkip={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}