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
import {
  HttpRequestNode,
  SetVariableNode,
  IfElseNode,
  LogNode,
  DelayNode,
  LoopNode,
  StopJobNode
} from "./SimpleNode";

// Define custom node types
const nodeTypes = {
  httpRequest: HttpRequestNode,
  setVariable: SetVariableNode,
  ifElse: IfElseNode,
  log: LogNode,
  delay: DelayNode,
  loop: LoopNode,
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

  // Skip a node (keep it in the flow but mark it as skipped)
  const skipNode = useCallback((nodeId: string) => {
    // Close the context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    // Mark the node as skipped
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              skipped: !node.data.skipped,
            },
            style: {
              ...node.style,
              opacity: node.data.skipped ? 1 : 0.5,
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

  // Helper function to generate log entries
  const addLogEntry = useCallback((message: string, type: string = "info", nodeId?: string) => {
    const logEntry: LogMessage = {
      timestamp: new Date(),
      type,
      message,
      nodeId
    };
    
    setLogs(logs => [...logs, logEntry]);
  }, []);

  // Test an HTTP request node
  const testHttpNode = useCallback(async (nodeId: string, nodeData: any) => {
    setIsTestRunning(true);
    setLogs([]);
    
    // Add start log
    addLogEntry(`Testing HTTP request to ${nodeData.url || "unknown URL"}`, "info", nodeId);
    
    try {
      // Log request details
      if (nodeData.url) {
        addLogEntry(`URL: ${nodeData.url}`, "info", nodeId);
      }
      
      if (nodeData.method) {
        addLogEntry(`Method: ${nodeData.method}`, "info", nodeId);
      }
      
      if (nodeData.body) {
        addLogEntry(`Body: ${nodeData.body}`, "info", nodeId);
      }
      
      // Call the test function if provided
      let result;
      if (onTestNode) {
        result = await onTestNode(nodeId, nodeData);
        addLogEntry(`Response received: ${JSON.stringify(result, null, 2)}`, "success", nodeId);
      } else {
        // Generate mock response if no test function provided
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = {
          success: true,
          data: {
            id: "mock-123",
            status: "success",
            message: "This is a mock response for testing"
          }
        };
        addLogEntry(`Mock response: ${JSON.stringify(result, null, 2)}`, "success", nodeId);
      }
      
      return result;
    } catch (error: any) {
      console.error("Error testing node:", error);
      addLogEntry(`Error: ${error.message || "Unknown error"}`, "error", nodeId);
      
      toast({
        title: "Test failed",
        description: error.message || "An error occurred during testing",
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsTestRunning(false);
    }
  }, [onTestNode, addLogEntry, toast]);

  // Handle testing different node types
  const handleTestNode = useCallback(async (nodeId: string, nodeData: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    // Different testing logic based on node type
    switch (node.type) {
      case 'httpRequest':
        return testHttpNode(nodeId, nodeData);
      
      case 'setVariable':
        setIsTestRunning(true);
        setLogs([]);
        addLogEntry(`Testing Set Variable node`, "info", nodeId);
        addLogEntry(`Variable name: ${nodeData.variableName || "unnamed"}`, "info", nodeId);
        addLogEntry(`Value: ${nodeData.value || "undefined"}`, "info", nodeId);
        
        setTimeout(() => {
          addLogEntry(`Variable set successfully`, "success", nodeId);
          setIsTestRunning(false);
        }, 1000);
        
        return { success: true, variableName: nodeData.variableName, value: nodeData.value };
        
      case 'log':
        setIsTestRunning(true);
        setLogs([]);
        addLogEntry(`Testing Log node`, "info", nodeId);
        addLogEntry(`Message: ${nodeData.message || "No message"}`, "info", nodeId);
        
        setTimeout(() => {
          addLogEntry(`Log message processed`, "success", nodeId);
          setIsTestRunning(false);
        }, 1000);
        
        return { success: true, message: nodeData.message };
        
      default:
        toast({
          title: "Test not implemented",
          description: `Testing for ${node.type} nodes is not implemented yet`,
          variant: "destructive"
        });
        return null;
    }
  }, [nodes, testHttpNode, addLogEntry, toast]);

  // Handle clicking on a node
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