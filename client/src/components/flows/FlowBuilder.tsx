import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, { 
  addEdge, 
  MiniMap, 
  Controls, 
  Background, 
  ReactFlowProvider, 
  useEdgesState,
  Connection,
  Edge,
  EdgeTypes,
  applyNodeChanges,
  NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { NodePanel } from "./NodePanel";
import { NodeConfiguration } from "./NodeConfiguration";
import { ConsoleOutput } from "./ConsoleOutput";
import { HttpRequestNode } from "./nodes/HttpRequestNode";
import { IfElseNode } from "./nodes/IfElseNode";
import { LoopNode } from "./nodes/LoopNode";
import { SetVariableNode } from "./nodes/SetVariableNode";
import { LogNode } from "./nodes/LogNode";
import { DelayNode } from "./nodes/DelayNode";
import { useToast } from "@/hooks/use-toast";

// Define custom node types
const nodeTypes = {
  httpRequest: HttpRequestNode,
  ifElse: IfElseNode,
  loop: LoopNode,
  setVariable: SetVariableNode,
  log: LogNode,
  delay: DelayNode
};

interface FlowBuilderProps {
  initialNodes?: any[];
  initialEdges?: any[];
  onNodesChange: (nodes: any[]) => void;
  onEdgesChange: (edges: any[]) => void;
  connectors: any[];
  flowId?: string;
}

export function FlowBuilder({ 
  initialNodes = [],
  initialEdges = [],
  onNodesChange: reportNodesChange,
  onEdgesChange: reportEdgesChange,
  connectors,
  flowId
}: FlowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // Use regular state instead of useNodesState to get more control
  const [nodes, setNodes] = useState<any[]>([]);
  
  // Custom nodes change handler to stabilize positions
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        // Apply changes using the standard handler from ReactFlow
        const updatedNodes = applyNodeChanges(changes, nds);
        
        // Stabilize any nodes that are being dragged or manipulated
        return updatedNodes.map((node: any) => {
          // Look for position changes that match this node's ID
          const positionChange = changes.find(
            (c: NodeChange) => 
              // First check if it's the right type of change
              (c.type === 'position' || c.type === 'dimensions') && 
              // Then check if the ID matches (safely accessing the ID)
              'id' in c && c.id === node.id
          );
          
          if (positionChange) {
            // Round position values to prevent subpixel rendering issues
            const roundedX = Math.round(node.position.x);
            const roundedY = Math.round(node.position.y);
            
            return {
              ...node,
              position: { 
                x: roundedX,
                y: roundedY
              },
              positionAbsolute: { 
                x: roundedX,
                y: roundedY
              },
              // Reset dragging flag to prevent continued animation
              dragging: false
            };
          }
          return node;
        });
      });
    },
    [setNodes]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const { toast } = useToast();
  
  // Load initial nodes and edges only on initial component mount or when they change
  useEffect(() => {
    console.log("Loading initial nodes:", initialNodes);
    if (initialNodes && initialNodes.length > 0) {
      // Create a deep copy to prevent reference issues
      const nodesCopy = JSON.parse(JSON.stringify(initialNodes));
      
      // Ensure nodes have stable positions with positionAbsolute
      const stabilizedNodes = nodesCopy.map((node: any) => ({
        ...node,
        // Ensure positionAbsolute matches position to prevent movement
        positionAbsolute: node.positionAbsolute || node.position,
        // Prevent node from being selected on load
        selected: false,
        // Prevent node from being in dragging state
        dragging: false
      }));
      
      setNodes(stabilizedNodes);
    }
  }, [initialNodes, setNodes]);
  
  useEffect(() => {
    console.log("Loading initial edges:", initialEdges);
    if (initialEdges && initialEdges.length > 0) {
      // Create a deep copy to prevent reference issues
      const edgesCopy = JSON.parse(JSON.stringify(initialEdges));
      setEdges(edgesCopy);
    }
  }, [initialEdges, setEdges]);
  
  // Stabilize node positions by ensuring positionAbsolute is always synchronized with position
  const stabilizeNodePositions = useCallback((nodes: any[]) => {
    return nodes.map((node) => {
      // Ensure node has positionAbsolute matching its position
      if (!node.positionAbsolute || 
          node.positionAbsolute.x !== node.position.x || 
          node.positionAbsolute.y !== node.position.y) {
        return {
          ...node,
          positionAbsolute: { ...node.position },
          // Make sure these properties are always set correctly
          selected: node.selected || false,
          dragging: false
        };
      }
      return node;
    });
  }, []);
  
  // Update parent component when nodes/edges change
  useEffect(() => {
    // Apply stabilization before reporting changes
    const stabilizedNodes = stabilizeNodePositions(nodes);
    reportNodesChange(stabilizedNodes);
  }, [nodes, reportNodesChange, stabilizeNodePositions]);
  
  useEffect(() => {
    reportEdgesChange(edges);
  }, [edges, reportEdgesChange]);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }, eds)),
    [setEdges]
  );
  
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeType = event.dataTransfer.getData('application/reactflow-type');
      const nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow-data'));
      
      if (!nodeType || !reactFlowBounds || !reactFlowInstance) {
        return;
      }
      
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      // Create a unique ID for the node
      const newNodeId = `${nodeType}_${Date.now()}`;
      
      // Create the new node
      const newNode = {
        id: newNodeId,
        type: nodeType,
        position,
        data: { 
          ...nodeData, 
          label: `New ${nodeData.label}`,
        },
      };
      
      // Add node first, then create connection
      setNodes((nds) => {
        const updatedNodes = nds.concat(newNode);
        
        // Find the nearest node above this node to auto-connect
        // This prevents the blinking effect by executing all node operations in one go
        setTimeout(() => {
          // Find potential source nodes (any node above the new node)
          if (nds.length > 0) {
            const sourceNodes = nds.filter(node => {
              // Node is above the new node (y position is smaller)
              return node.position.y < position.y;
            });
            
            if (sourceNodes.length > 0) {
              // Find the closest node above the new node
              const closestNode = sourceNodes.reduce((closest, current) => {
                const closestDist = Math.hypot(
                  closest.position.x - position.x,
                  closest.position.y - position.y
                );
                const currentDist = Math.hypot(
                  current.position.x - position.x,
                  current.position.y - position.y
                );
                return currentDist < closestDist ? current : closest;
              }, sourceNodes[0]);
              
              // Create connection from closest node to new node
              // For if/else nodes, connect to appropriate handle
              let sourceHandle = null;
              if (closestNode.type === 'ifElse') {
                // For simple auto-connection, use 'true' path from if/else
                sourceHandle = 'true';
              }
              
              const params = {
                id: `e-${Date.now()}`,
                source: closestNode.id,
                sourceHandle: sourceHandle,
                target: newNodeId,
                animated: true,
                style: { stroke: '#4f46e5', strokeWidth: 2 }
              };
              
              setEdges((eds) => addEdge(params, eds));
            }
          }
        }, 50);
        
        return updatedNodes;
      });
    },
    [reactFlowInstance, setNodes, setEdges]
  );
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Don't trigger selection if it's a click on the context menu
    if ((event.target as HTMLElement).closest('.context-menu-trigger')) {
      return;
    }
    setSelectedNode(node);
  }, []);
  
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
  
  const closeNodeConfig = useCallback(() => {
    setSelectedNode(null);
  }, []);
  
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, [setEdges]);
  
  const runFlowTest = useCallback(() => {
    if (nodes.length === 0) {
      toast({
        title: "Cannot run test",
        description: "No nodes found in the flow",
        variant: "destructive",
      });
      return;
    }
    
    if (!flowId) {
      toast({
        title: "Save Flow First",
        description: "Please save your flow before testing",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestRunning(true);
    const initialLog = {
      timestamp: new Date(),
      type: "info",
      message: "Starting flow execution..."
    };
    
    // Initialize logs array
    const executionLogs = [initialLog];
    setLogs([initialLog]);
    
    // Mock execution for demonstration
    const mockExecution = async () => {
      const startTime = new Date();
      let hasError = false;
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to run tests",
          variant: "destructive",
        });
        setIsTestRunning(false);
        return;
      }
      
      // Simulate some node executions
      for (const node of nodes) {
        const nodeLog = {
          timestamp: new Date(),
          type: "info",
          nodeId: node.id,
          message: `Executing node: "${node.data.label}" (${node.type})`
        };
        
        executionLogs.push(nodeLog);
        setLogs((logs) => [...logs, nodeLog]);
        
        // Simulate API call if it's an HTTP node
        if (node.type === 'httpRequest') {
          const method = node.data.method || 'GET';
          const endpoint = node.data.endpoint || '/api';
          const connector = node.data.connector || 'No connector';
          
          // Log the request details
          const requestLog = {
            timestamp: new Date(),
            type: "http",
            nodeId: node.id,
            message: `${method} ${endpoint} using connector: ${connector}`
          };
          
          executionLogs.push(requestLog);
          setLogs((logs) => [...logs, requestLog]);
          
          // If it's a POST or PUT request with a body, show the request body
          if ((method === 'POST' || method === 'PUT') && node.data.body) {
            const bodyLog = {
              timestamp: new Date(),
              type: "http",
              nodeId: node.id,
              message: `Request Body: ${node.data.body}`
            };
            
            executionLogs.push(bodyLog);
            setLogs((logs) => [...logs, bodyLog]);
          }
          
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Different response scenarios based on connector and method
          if (node.data.connector) {
            // OAuth connectors (simulate successful authentication)
            const responseLog = {
              timestamp: new Date(),
              type: "success",
              nodeId: node.id,
              message: `Response: 200 OK (authenticated with ${node.data.connector})`
            };
            
            executionLogs.push(responseLog);
            setLogs((logs) => [...logs, responseLog]);
            
            // Add mock response data with more specific schema information
            let responseData;
            
            // Check if it's a Workday connector with location query
            if (node.data.connector === 'workday' && node.data.body && node.data.body.includes('locationType')) {
              responseData = {
                "Total Count": 1,
                "data": {
                  "Report_Entry": [
                    {
                      "locationType": "Corporate Office",
                      "locationIdentifier": "1028",
                      "locationName": "San Francisco HQ",
                      "address": {
                        "addressLine1": "123 Market Street",
                        "city": "San Francisco",
                        "region": "CA",
                        "postalCode": "94105",
                        "country": "USA"
                      },
                      "timeZone": "America/Los_Angeles",
                      "status": "Active"
                    }
                  ]
                },
                "id": `req-${Date.now()}`,
                "timestamp": new Date().toISOString()
              };
            } else if (method === 'GET') {
              responseData = {
                "success": true,
                "data": {"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]}
              };
            } else {
              responseData = {
                "success": true,
                "message": "Operation completed successfully",
                "id": `req-${Date.now()}`,
                "timestamp": new Date().toISOString()
              };
            }
            
            const dataLog = {
              timestamp: new Date(),
              type: "info",
              nodeId: node.id,
              message: `Response Data: ${JSON.stringify(responseData)}`
            };
            
            executionLogs.push(dataLog);
            setLogs((logs) => [...logs, dataLog]);
          } else {
            // No connector selected - higher chance of failure
            if (Math.random() > 0.5) {
              const successLog = {
                timestamp: new Date(),
                type: "success",
                nodeId: node.id,
                message: "Response: 200 OK"
              };
              
              executionLogs.push(successLog);
              setLogs((logs) => [...logs, successLog]);
            } else {
              const errorLog = {
                timestamp: new Date(),
                type: "error",
                nodeId: node.id,
                message: "Request failed: 401 Unauthorized (No valid authentication)"
              };
              
              hasError = true;
              executionLogs.push(errorLog);
              setLogs((logs) => [...logs, errorLog]);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      const completionLog = {
        timestamp: new Date(),
        type: "info",
        message: "Flow execution completed"
      };
      
      executionLogs.push(completionLog);
      setLogs((logs) => [...logs, completionLog]);
      
      // Save execution result to Firebase
      try {
        const executionsRef = collection(db, "users", user.uid, "executions");
        await addDoc(executionsRef, {
          flowId: flowId,
          status: hasError ? "failed" : "success",
          startedAt: startTime,
          finishedAt: endTime,
          duration: duration,
          logs: executionLogs
        });
        
        toast({
          title: "Execution Complete",
          description: `Flow test ${hasError ? 'failed' : 'completed successfully'} in ${duration}ms`,
          variant: hasError ? "destructive" : "default",
        });
      } catch (error) {
        console.error("Error saving execution:", error);
        toast({
          title: "Error Saving Execution",
          description: "Your test completed but we couldn't save the execution data",
          variant: "destructive",
        });
      }
      
      setIsTestRunning(false);
    };
    
    mockExecution();
  }, [nodes, toast, flowId]);
  
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-1 overflow-hidden">
        {/* Node Palette */}
        <NodePanel />
        
        {/* Flow Canvas */}
        <div className="flex-1 relative bg-slate-100 dark:bg-slate-800 overflow-hidden" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <div style={{ width: '100%', height: '100%' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ 
                  padding: 0.2, 
                  minZoom: 0.5, 
                  maxZoom: 1.5
                }}
                snapToGrid
                snapGrid={[15, 15]}
                defaultEdgeOptions={{ animated: true }}
                style={{ width: '100%', height: '100%' }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
              >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>
        
        {/* Node Configuration Panel */}
        {selectedNode && (
          <NodeConfiguration 
            node={selectedNode} 
            updateNodeData={updateNodeData} 
            onClose={closeNodeConfig}
            connectors={connectors}
          />
        )}
      </div>
      
      {/* Console Output */}
      <ConsoleOutput 
        logs={logs} 
        isRunning={isTestRunning} 
        onRunTest={runFlowTest} 
      />
    </div>
  );
}
