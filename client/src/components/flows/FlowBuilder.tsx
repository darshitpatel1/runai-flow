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
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodePanel } from "./NodePanel";
import { NodeConfiguration } from "./NodeConfiguration";
import { NodeContextMenu } from "./NodeContextMenu";
import { ConsoleOutput, LogMessage } from "./ConsoleOutput";
import { useToast } from "@/hooks/use-toast";
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
  const onNodesChange = useCallback((changes: NodeChange[]) => {
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
      let updatedNodes = applyNodeChanges(snappedChanges, nds);
      
      // For node selection changes, update the selectedNode state
      const selectionChanges = changes.filter(change => change.type === 'select');
      
      if (selectionChanges.length > 0) {
        const selectedNodes = updatedNodes.filter(node => node.selected);
        
        if (selectedNodes.length === 1) {
          setSelectedNode(selectedNodes[0]);
        } else {
          setSelectedNode(null);
        }
      }
      
      return updatedNodes;
    });
  }, []);

  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(eds => applyEdgeChanges(changes, eds));
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

  // Skip a node in the flow (for execution)
  const skipNode = useCallback((nodeId: string) => {
    // Close the context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    // Mark the node as skipped by updating its data
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              skipped: !node.data?.skipped,
            },
            style: {
              ...node.style,
              opacity: node.data?.skipped ? 1 : 0.5,
            },
          };
        }
        return node;
      })
    );
    
    toast({
      title: "Node status updated",
      description: "The node will be skipped during execution",
    });
  }, [toast]);

  // Test a node's functionality
  const handleTestNode = useCallback(async (nodeId: string, nodeData: any) => {
    setIsTestRunning(true);
    setLogs([]);
    
    try {
      // Find the node to determine its type
      const nodeToTest = nodes.find(n => n.id === nodeId);
      
      if (!nodeToTest) {
        throw new Error("Node not found");
      }
      
      // Add initial log entry
      const startLog: LogMessage = {
        timestamp: new Date(),
        type: "info",
        nodeId,
        message: `Testing ${nodeToTest.type || "unknown"} node...`
      };
      setLogs([startLog]);
      
      // If we have a parent test function, use it
      if (onTestNode) {
        try {
          const result = await onTestNode(nodeId, nodeData);
          
          // Success log
          const successLog: LogMessage = {
            timestamp: new Date(),
            type: "success",
            nodeId,
            message: `Test completed successfully: ${JSON.stringify(result, null, 2)}`
          };
          setLogs(logs => [...logs, successLog]);
          
          return result;
        } catch (error: any) {
          // Error log
          const errorLog: LogMessage = {
            timestamp: new Date(),
            type: "error",
            nodeId,
            message: `Test failed: ${error.message || "Unknown error"}`
          };
          setLogs(logs => [...logs, errorLog]);
          
          throw error;
        }
      }
      
      // If no parent test function, create a mock response based on node type
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Type-specific logs and responses
      if (nodeToTest.type === 'httpRequest') {
        // Log HTTP request details
        if (nodeData.url) {
          setLogs(logs => [...logs, {
            timestamp: new Date(),
            type: "info",
            nodeId,
            message: `URL: ${nodeData.url}`
          }]);
        }
        
        if (nodeData.method) {
          setLogs(logs => [...logs, {
            timestamp: new Date(),
            type: "info",
            nodeId,
            message: `Method: ${nodeData.method}`
          }]);
        }
        
        if (nodeData.body) {
          setLogs(logs => [...logs, {
            timestamp: new Date(),
            type: "info",
            nodeId,
            message: `Body: ${nodeData.body}`
          }]);
        }
        
        // Mock response
        const mockResponse = {
          status: 200,
          data: {
            id: "mock-123",
            message: "Success",
            timestamp: new Date().toISOString()
          }
        };
        
        setLogs(logs => [...logs, {
          timestamp: new Date(),
          type: "success",
          nodeId,
          message: `Response: ${JSON.stringify(mockResponse, null, 2)}`
        }]);
        
        return mockResponse;
      } else if (nodeToTest.type === 'setVariable') {
        setLogs(logs => [...logs, {
          timestamp: new Date(),
          type: "info",
          nodeId,
          message: `Setting variable '${nodeData.variableName || "unnamed"}' to '${nodeData.value || ""}'`
        }]);
        
        return { success: true, variableName: nodeData.variableName, value: nodeData.value };
      } else {
        // Generic mock response
        setLogs(logs => [...logs, {
          timestamp: new Date(),
          type: "info",
          nodeId,
          message: `Generic test for ${nodeToTest.type} node`
        }]);
        
        return { success: true, message: `${nodeToTest.type} test completed` };
      }
    } catch (error: any) {
      console.error("Error testing node:", error);
      
      setLogs(logs => [...logs, {
        timestamp: new Date(),
        type: "error",
        nodeId,
        message: `Error: ${error.message || "Unknown error"}`
      }]);
      
      toast({
        title: "Test failed",
        description: error.message || "An error occurred while testing the node",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setTimeout(() => {
        setIsTestRunning(false);
      }, 500);
    }
  }, [nodes, onTestNode, toast]);

  // Handle clicking on a node to select it
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="h-[calc(100vh-10rem)] w-full flex flex-col">
      <div className="flex h-full">
        {/* Left panel with node types */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto p-4">
          <NodePanel />
        </div>

        {/* Main flow area */}
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
                onSkip={skipNode}
              />
            </div>
          )}
          
          {/* Console Output for node testing */}
          {isTestRunning && (
            <div className="absolute bottom-4 right-4 w-1/2 h-64 bg-gray-900 text-white rounded shadow-lg overflow-hidden">
              <ConsoleOutput 
                logs={logs} 
                isRunning={isTestRunning}
                onRunTest={() => {}}
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