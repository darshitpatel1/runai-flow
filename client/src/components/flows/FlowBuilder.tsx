import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, { 
  addEdge, 
  MiniMap, 
  Controls, 
  Background, 
  ReactFlowProvider, 
  Connection,
  Edge,
  applyNodeChanges,
  NodeChange,
  useReactFlow,
  Node
} from 'reactflow';

// Define a custom type for position changes
interface NodePositionChange {
  type: 'position';
  id: string;
  position: { x: number; y: number };
  dragging?: boolean;
}

// Global state for drag tracking and optimization
let lastUpdateTime = Date.now();
let isCurrentlyDragging = false;
let draggedNodeId: string | null = null;
let nodePositionCache: Record<string, {x: number, y: number}> = {}; // Cache to prevent loss of position

import 'reactflow/dist/style.css';
import { NodePanel } from "./NodePanel";
import { NodeConfiguration } from "./NodeConfiguration";
import { NodeContextMenu } from "./NodeContextMenu";
import { ConsoleOutput, LogMessage } from "./ConsoleOutput";
import { useToast } from "@/hooks/use-toast";

// Import the node components
import { HttpRequestNode } from "./nodes/HttpRequestNode";
import { SetVariableNode } from "./nodes/SetVariableNode";
import { IfElseNode } from "./nodes/IfElseNode";
import { LogNode } from "./nodes/LogNode";
import { DelayNode } from "./nodes/DelayNode";
import { LoopNode } from "./nodes/LoopNode";
import { StopJobNode } from "./nodes/StopJobNode";

// Define node types for the flow
const nodeTypes = {
  httpRequest: HttpRequestNode,
  setVariable: SetVariableNode,
  ifElse: IfElseNode,
  logMessage: LogNode,
  delay: DelayNode,
  loop: LoopNode,
  stopJob: StopJobNode
};

interface FlowBuilderProps {
  initialNodes?: any[];
  initialEdges?: any[];
  onNodesChange: (nodes: any[]) => void;
  onEdgesChange: (edges: any[]) => void;
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
  const [nodes, setNodes] = useState<any[]>(initialNodes);
  const [edges, setEdges] = useState<any[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<any>(null);
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
      console.log('Loading saved nodes:', initialNodes);
      setNodes(initialNodes);
    }
    
    if (initialEdges.length > 0) {
      console.log('Loading saved edges:', initialEdges);
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
  
  // Handle node changes with optimizations
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Get position changes only for UI updates and snapping
    const positionChanges = changes.filter(change => 
      change.type === 'position' && change.dragging
    ) as NodePositionChange[];
    
    // Apply position changes immediately for UI smoothness
    if (positionChanges.length > 0) {
      // Throttling for position updates during dragging
      if (isCurrentlyDragging) {
        const now = Date.now();
        if (now - lastUpdateTime < 33) { // ~ 30fps update rate
          return; // Skip this update if too soon
        }
        lastUpdateTime = now;
      }
      
      // Track dragging state for throttling
      if (positionChanges[0].dragging) {
        isCurrentlyDragging = true;
        draggedNodeId = positionChanges[0].id;
      } else if (draggedNodeId === positionChanges[0].id) {
        isCurrentlyDragging = false;
        draggedNodeId = null;
      }
      
      // Apply snapping to grid
      const snappedChanges = changes.map(change => {
        if (change.type === 'position' && change.position) {
          // Save original position before snapping for use during dragging
          if (change.dragging) {
            // Cache the exact position for smooth dragging
            nodePositionCache[change.id] = { ...change.position };
            return change;
          } else {
            // On drop, snap to grid
            const snappedPosition = {
              x: Math.round(change.position.x / gridSize) * gridSize,
              y: Math.round(change.position.y / gridSize) * gridSize
            };
            return { ...change, position: snappedPosition };
          }
        }
        return change;
      });
      
      setNodes((nds) => {
        return applyNodeChanges(snappedChanges, nds);
      });
      return;
    }
    
    // For all other changes (adding, removing, selecting)
    setNodes((nds) => {
      const updatedNodes = applyNodeChanges(changes, nds);
      
      // Check if a node was selected
      const selectedNodes = updatedNodes.filter(node => node.selected);
      
      if (selectedNodes.length === 1) {
        setSelectedNode(selectedNodes[0]);
      } else if (selectedNodes.length === 0) {
        setSelectedNode(null);
      }
      
      return updatedNodes;
    });
  }, [setNodes]);
  
  // Create a new edge between nodes
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }, eds)),
    [setEdges]
  );
  
  // Show context menu when right-clicking a node
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    // Prevent default context menu
    event.preventDefault();
    
    // Position the custom context menu
    setContextMenuNodeId(node.id);
    setContextMenuPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);
  
  // Close context menu when clicking anywhere else
  const onPaneClick = useCallback(() => {
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
  }, []);
  
  // Update node data when configuration changes
  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nodes) =>
      nodes.map((node) => {
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
  }, [setNodes]);
  
  // Delete a node
  const deleteNode = useCallback((nodeId: string) => {
    // Close context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    // Find all connected edges to remove them
    const nodesToDelete = [nodeId];
    
    // Remove nodes and their connected edges
    setNodes((nodes) => nodes.filter((node) => !nodesToDelete.includes(node.id)));
    setEdges((edges) => edges.filter((edge) => 
      !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target)
    ));
    
    toast({
      title: "Node deleted",
      description: "The node has been removed from the flow",
    });
  }, [setNodes, setEdges, toast]);
  
  // Skip a node in the flow execution
  const toggleSkipNode = useCallback((nodeId: string) => {
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              skipped: !node.data.skipped
            },
            style: {
              ...node.style,
              opacity: node.data.skipped ? 1 : 0.5
            }
          };
        }
        return node;
      })
    );
    
    toast({
      title: "Node updated",
      description: "Node execution preference has been updated",
    });
  }, [setNodes, toast]);
  
  // Test a node's functionality - fixed to handle async properly
  const handleTestNode = useCallback(async (nodeId: string, nodeData: any) => {
    if (!onTestNode) {
      toast({
        title: "Test function not available", 
        description: "No test function provided",
        variant: "destructive"
      });
      return null;
    }
    
    setIsTestRunning(true);
    setLogs([]);
    
    try {
      const result = await onTestNode(nodeId, nodeData);
      return result;
    } catch (error) {
      console.error("Error testing node:", error);
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsTestRunning(false);
    }
  }, [onTestNode, toast]);
  
  return (
    <div className="h-[calc(100vh-10rem)] overflow-hidden">
      <div className="flex h-full">
        {/* Node Panel */}
        <div className="w-64 overflow-y-auto border-r border-gray-200 dark:border-gray-800 p-4">
          <NodePanel />
        </div>
        
        {/* Main Flow Area */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={(changes) => setEdges((eds) => applyNodeChanges(changes, eds))}
            onConnect={onConnect}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onNodeClick={(_, node) => setSelectedNode(node)}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[gridSize, gridSize]}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
          
          {/* Node Configuration Panel */}
          {selectedNode && (
            <div className="absolute top-0 right-0 h-full bg-white dark:bg-gray-800 shadow-lg w-80 overflow-y-auto">
              <NodeConfiguration
                node={selectedNode}
                updateNodeData={updateNodeData}
                onClose={() => setSelectedNode(null)}
                connectors={connectors}
                onTestNode={handleTestNode}
              />
            </div>
          )}
          
          {/* Console Output for Testing */}
          {isTestRunning && (
            <div className="absolute bottom-4 right-4 w-1/2 h-64 bg-gray-900 text-white rounded shadow-lg overflow-hidden">
              <ConsoleOutput logs={logs} isRunning={isTestRunning} onRunTest={() => {}} />
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
                onSkip={toggleSkipNode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap the FlowBuilder with ReactFlowProvider to ensure proper context
export function FlowBuilderWithProvider(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilder {...props} />
    </ReactFlowProvider>
  );
}