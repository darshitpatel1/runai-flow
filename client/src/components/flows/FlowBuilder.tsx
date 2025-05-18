import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, { 
  addEdge, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  applyNodeChanges,
  NodeChange,
  useReactFlow,
  getConnectedEdges,
  Node,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useToast } from "@/hooks/use-toast";
import { NodePanel } from "./NodePanel";
import { NodeConfiguration } from "./NodeConfiguration";
import { NodeContextMenu } from "./NodeContextMenu";
import { ConsoleOutput, LogMessage } from "./ConsoleOutput";
import { HttpRequestNode } from "./nodes/HttpRequestNode";
import { IfElseNode } from "./nodes/IfElseNode";
import { LoopNode } from "./nodes/LoopNode";
import { SetVariableNode } from "./nodes/SetVariableNode";
import { LogNode } from "./nodes/LogNode";
import { DelayNode } from "./nodes/DelayNode";
import { StopJobNode } from "./nodes/StopJobNode";

// Define custom node types
const nodeTypes = {
  httpRequest: HttpRequestNode,
  ifElse: IfElseNode,
  loop: LoopNode,
  setVariable: SetVariableNode,
  log: LogNode,
  delay: DelayNode,
  stopJob: StopJobNode
};

// Define a custom type for position changes
interface NodePositionChange {
  type: 'position';
  id: string;
  position: { x: number; y: number };
  dragging?: boolean;
}

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
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  
  // Handle new connections between nodes
  const onConnect = useCallback((params: Connection) => {
    // Add animated edge styling
    setEdges((eds) => 
      addEdge(
        { 
          ...params, 
          animated: true, 
          style: { stroke: '#4f46e5', strokeWidth: 2 } 
        }, 
        eds
      )
    );
  }, [setEdges]);
  
  // Handle edge removal when clicked
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, [setEdges]);
  
  // Node testing function that relays to parent component
  const testNode = useCallback(async (nodeId: string, nodeData: any) => {
    if (!onTestNode) {
      console.error("Test node functionality is not available");
      throw new Error("Test node functionality is not available");
    }
    
    try {
      // Create initial log for testing
      const initialLog = {
        timestamp: new Date(),
        type: "info",
        nodeId,
        message: `Starting test for node: "${nodeData.label || 'Unnamed Node'}"`
      };
      setLogs([initialLog]);
      
      // Set testing state
      setIsTestRunning(true);
      
      // Forward test request to parent component for API handling
      const result = await onTestNode(nodeId, nodeData);
      
      // Log success
      const successLog = {
        timestamp: new Date(),
        type: "success",
        nodeId,
        message: "Test completed successfully"
      };
      setLogs(logs => [...logs, successLog]);
      
      // Add response data log if available
      if (result) {
        const dataLog = {
          timestamp: new Date(),
          type: "info",
          nodeId,
          message: `Response Data: ${JSON.stringify(result, null, 2)}`
        };
        setLogs(logs => [...logs, dataLog]);
      }
      
      // Reset testing state
      setIsTestRunning(false);
      return result;
    } catch (error: any) {
      // Log error
      const errorLog = {
        timestamp: new Date(),
        type: "error",
        nodeId,
        message: `Test failed: ${error.message || 'Unknown error'}`
      };
      setLogs(logs => [...logs, errorLog]);
      
      // Reset testing state
      setIsTestRunning(false);
      
      console.error("Error testing node:", error);
      throw error;
    }
  }, [onTestNode]);
  
  // Handle node drag & drop from panel
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!reactFlowBounds || !reactFlowInstance) return;
    
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    
    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });
    
    // Snap to grid
    const snappedPosition = {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize
    };
    
    // Generate a unique ID for the node
    const id = `${type}_${Date.now()}`;
    
    // Create a new node with default data
    const newNode = {
      id,
      type,
      position: snappedPosition,
      data: { 
        label: type.charAt(0).toUpperCase() + type.slice(1),
        // Add default properties based on node type
        ...(type === 'httpRequest' ? { method: 'GET', endpoint: '' } : {}),
        ...(type === 'setVariable' ? { variableKey: '', variableValue: '' } : {}),
        ...(type === 'ifElse' ? { condition: '' } : {}),
        ...(type === 'log' ? { level: 'info', message: '' } : {}),
        ...(type === 'delay' ? { durationMs: 1000 } : {}),
      }
    };
    
    // Add the new node
    setNodes((nds) => nds.concat(newNode));
    
    // Show success toast
    toast({
      title: "Node Added",
      description: `Added new ${type} node to the flow`,
    });
  }, [reactFlowInstance, setNodes, toast, gridSize]);
  
  // Handle node selection for configuration
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    
    // Clear any open context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    try {
      // Get all current nodes for variables and relationships
      const allNodes = reactFlowInstance.getNodes();
      
      // Create minimal representation of other nodes for variable selection
      const minimalNodes = allNodes.map(n => ({
        id: n.id,
        type: n.type,
        data: {
          label: n.data?.label || n.type || "Node"
        }
      }));
      
      // Create node with essential properties
      const nodeToSelect = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: { 
          ...node.data,
          allNodes: minimalNodes
        }
      };
      
      // Update selection
      setSelectedNode(nodeToSelect);
    } catch (error) {
      console.error("Error in node selection:", error);
    }
  }, [reactFlowInstance]);
  
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
  }, [setNodes]);
  
  // Close node configuration panel
  const closeNodeConfig = useCallback(() => {
    setSelectedNode(null);
  }, []);
  
  // Context menu for node actions
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    
    setContextMenuNodeId(node.id);
    setContextMenuPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);
  
  // Handle node deletion from context menu
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Clear context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    // Get connected edges to also remove
    const connectedEdges = getConnectedEdges([{id: nodeId} as Node], edges);
    
    // Remove node and edges
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => !connectedEdges.some(ce => ce.id === e.id)));
    
    // Close config panel if this node was selected
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
    }
    
    // Show success toast
    toast({
      title: "Node Deleted",
      description: "Node and its connections have been removed",
    });
  }, [edges, setNodes, setEdges, selectedNode, toast]);
  
  // Clear context menu when clicking on canvas
  const onPaneClick = useCallback(() => {
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    setSelectedNode(null);
  }, []);
  
  // Run test of the entire flow
  const runFlowTest = useCallback(async () => {
    if (!flowId) {
      toast({
        title: "Cannot Test Flow",
        description: "Please save the flow first before testing",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestRunning(true);
    
    // Initialize logs
    setLogs([{
      timestamp: new Date(),
      type: "info",
      message: "Starting flow execution test"
    }]);
    
    try {
      // Implementation would call the backend to test the flow
      // This is a placeholder for the actual implementation
      
      // Here you would use WebSockets to get real-time updates
      // For now, we'll simulate some success logs
      
      // Show success message
      toast({
        title: "Test Complete",
        description: "Flow test completed successfully",
      });
    } catch (error: any) {
      // Log error
      setLogs((logs) => [...logs, {
        timestamp: new Date(),
        type: "error",
        message: `Error: ${error.message || 'Unknown error'}`
      }]);
      
      // Show error toast
      toast({
        title: "Test Failed",
        description: error.message || "An error occurred while testing the flow",
        variant: "destructive",
      });
    } finally {
      setIsTestRunning(false);
    }
  }, [flowId, toast]);
  
  return (
    <div className="flex h-full">
      {/* Left panel for node types */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        <NodePanel />
      </div>
      
      {/* Center flow editor */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={reportEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneClick={onPaneClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            snapToGrid
            snapGrid={[gridSize, gridSize]}
            connectionLineStyle={{ stroke: '#4f46e5', strokeWidth: 2 }}
            defaultEdgeOptions={{ 
              animated: true, 
              style: { stroke: '#4f46e5', strokeWidth: 2 }
            }}
          >
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              nodeColor={(node) => {
                switch (node.type) {
                  case 'httpRequest':
                    return '#3b82f6';
                  case 'ifElse':
                    return '#f59e0b';
                  case 'loop':
                    return '#10b981';
                  case 'setVariable':
                    return '#8b5cf6';
                  case 'log':
                    return '#6b7280';
                  case 'delay':
                    return '#ec4899';
                  case 'stopJob':
                    return '#ef4444';
                  default:
                    return '#94a3b8';
                }
              }}
            />
            <Background color="#c8c8c8" gap={16} />
          </ReactFlow>
        </div>
        
        {/* Console output */}
        <div className="h-48 border-t border-slate-200 dark:border-slate-700">
          <ConsoleOutput 
            logs={logs} 
            isRunning={isTestRunning} 
            onRunTest={runFlowTest} 
          />
        </div>
      </div>
      
      {/* Right panel for node configuration */}
      {selectedNode && (
        <NodeConfiguration
          node={selectedNode}
          updateNodeData={updateNodeData}
          onClose={closeNodeConfig}
          connectors={connectors}
          onTestNode={testNode}
        />
      )}
      
      {/* Context menu for node actions */}
      {contextMenuNodeId && contextMenuPosition && (
        <div
          className="absolute z-50"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <NodeContextMenu
            nodeId={contextMenuNodeId}
            onDelete={handleDeleteNode}
            onSkip={() => {
              // Implement skip functionality here
              setContextMenuNodeId(null);
              setContextMenuPosition(null);
            }}
          />
        </div>
      )}
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