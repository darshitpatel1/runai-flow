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
  NodeChange,
  useReactFlow,
  getConnectedEdges,
  Node
} from 'reactflow';

// Define a custom type for position changes since not all NodeChange types have an ID
interface NodePositionChange {
  type: 'position';
  id: string;
  position: { x: number; y: number };
  dragging?: boolean;
}

// Tracking time between updates to prevent node jitter
let lastUpdateTime = Date.now();
let isCurrentlyDragging = false;
let draggedNodeId: string | null = null;
import 'reactflow/dist/style.css';
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import { NodePanel } from "./NodePanel";
import { NodeConfiguration } from "./NodeConfiguration";
import { NodeContextMenu } from "./NodeContextMenu";
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
  // Use regular state for more control over node position handling
  const [nodes, setNodes] = useState<any[]>([]);
  
  // Grid size for snapping - should match the snapGrid value in ReactFlow component
  const gridSize = 15;
  
  // Use a directly simplified node change handler with throttling to fix zigzag
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check for drag start and drag end to manage state
      const dragChange = changes.find(change => 
        change.type === 'position' && 'dragging' in change
      ) as NodePositionChange | undefined;
      
      if (dragChange) {
        // Handle drag start
        if (dragChange.dragging === true) {
          isCurrentlyDragging = true;
          draggedNodeId = dragChange.id;
          console.log('Drag started:', draggedNodeId);
        } 
        // Handle drag end
        else if (dragChange.dragging === false && isCurrentlyDragging) {
          isCurrentlyDragging = false;
          console.log('Drag ended:', draggedNodeId);
          
          // On drag end, we finalize all node positions
          setTimeout(() => {
            setNodes(nodes => {
              return nodes.map(node => {
                if (!node || !node.position) return node;
                
                // Snap to grid for final position
                const x = Math.round(node.position.x / gridSize) * gridSize;
                const y = Math.round(node.position.y / gridSize) * gridSize;
                
                return {
                  ...node,
                  position: { x, y },
                  positionAbsolute: { x, y },
                  dragging: false,
                };
              });
            });
          }, 50); // slight delay to ensure final position is captured
        }
      }
      
      // Simple throttling for position updates during drag
      const now = Date.now();
      if (isCurrentlyDragging && now - lastUpdateTime < 25) {
        // Skip this update if we're dragging and it's too soon
        return;
      }
      lastUpdateTime = now;
      
      // Always apply the changes directly without manipulation during drag
      setNodes(nds => applyNodeChanges(changes, nds));
    },
    [setNodes, gridSize]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
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
  
  // Snap node positions to grid and stabilize them
  const stabilizeNodePositions = useCallback((nodes: any[]) => {
    const gridSize = 15; // Should match the snapGrid value in ReactFlow component
    
    return nodes.map((node) => {
      if (!node) return node;
      
      // Make sure position exists
      if (!node.position) {
        node.position = { x: 0, y: 0 };
      }
      
      // Get current position 
      const { x, y } = node.position;
      
      // Snap to grid by rounding to nearest grid point
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;
      
      // Return a new node with stabilized properties
      return {
        ...node,
        // Set exact coordinates
        position: { 
          x: snappedX,
          y: snappedY
        },
        // Always keep positionAbsolute in sync with position (prevents UI jitter)
        positionAbsolute: { 
          x: snappedX,
          y: snappedY
        },
        // Ensure these properties are always reset to prevent animation issues
        selected: node.selected || false,
        dragging: false,
        // Add a timestamp to force React to re-render the node
        __lastUpdate: Date.now()
      };
    });
  }, []);
  
  // Update parent component when nodes/edges change - but not during dragging
  useEffect(() => {
    // Don't report changes during drag operations to prevent zigzag
    if (isCurrentlyDragging) {
      return;
    }
    
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
  
  // Handle drag completion to ensure nodes are properly snapped
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
    // Snap to grid on drag stop
    setNodes(nodes => {
      return nodes.map(n => {
        if (n.id !== node.id) return n;
        
        // Snap to grid
        const x = Math.round(node.position.x / gridSize) * gridSize;
        const y = Math.round(node.position.y / gridSize) * gridSize;
        
        return {
          ...n,
          position: { x, y },
          positionAbsolute: { x, y },
          dragging: false,
        };
      });
    });
    
    // Report the changes to parent
    setTimeout(() => {
      if (nodes.length > 0) {
        const stabilizedNodes = stabilizeNodePositions(nodes);
        reportNodesChange(stabilizedNodes);
      }
    }, 50);
  }, [nodes, setNodes, gridSize, stabilizeNodePositions, reportNodesChange]);
  
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeType = event.dataTransfer.getData('application/reactflow-type');
      const nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow-data'));
      
      if (!nodeType || !reactFlowBounds || !reactFlowInstance) {
        return;
      }
      
      // Get the raw position from mouse coordinates
      const rawPosition = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      // Snap the position to our grid
      const position = {
        x: Math.round(rawPosition.x / gridSize) * gridSize,
        y: Math.round(rawPosition.y / gridSize) * gridSize
      };
      
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
        try {
          // First add the new node
          const updatedNodes = nds.concat(newNode);
          
          // Find the nearest node above this node to auto-connect
          // Safe handling of empty node arrays
          if (nds && nds.length > 0) {
            // Use setTimeout to ensure the node is added to the graph before creating the edge
            setTimeout(() => {
              try {
                // Find potential source nodes (any node above the new node)
                const sourceNodes = nds.filter(node => 
                  node && node.position && node.position.y < position.y
                );
                
                if (sourceNodes.length > 0) {
                  // Find the closest node above the new node
                  const closestNode = sourceNodes.reduce((closest, current) => {
                    // Safe distance calculation with fallbacks
                    const closestDist = Math.hypot(
                      (closest.position?.x || 0) - position.x,
                      (closest.position?.y || 0) - position.y
                    );
                    const currentDist = Math.hypot(
                      (current.position?.x || 0) - position.x,
                      (current.position?.y || 0) - position.y
                    );
                    return currentDist < closestDist ? current : closest;
                  }, sourceNodes[0]);
                  
                  // Create connection from closest node to new node
                  // Determine source handle based on node type
                  let sourceHandle = null;
                  if (closestNode.type === 'ifElse') {
                    // For if/else nodes, connect to the "true" path
                    sourceHandle = 'true';
                  }
                  
                  // Create a unique ID for the edge
                  const edgeId = `e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  
                  // Create the connection parameters
                  const params = {
                    id: edgeId,
                    source: closestNode.id,
                    sourceHandle: sourceHandle,
                    target: newNodeId,
                    targetHandle: null, // Auto-select the default target handle
                    animated: true,
                    style: { stroke: '#4f46e5', strokeWidth: 2 }
                  };
                  
                  // Create the edge connection
                  setEdges((eds) => addEdge(params, eds));
                }
              } catch (error) {
                console.error("Error creating edge connection:", error);
              }
            }, 100); // Increased timeout for better reliability
          }
          
          return updatedNodes;
        } catch (error) {
          console.error("Error adding new node:", error);
          return nds; // Return original nodes on error
        }
      });
    },
    [reactFlowInstance, setNodes, setEdges]
  );
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Don't trigger selection if it's a click on the context menu
    if ((event.target as HTMLElement).closest('.context-menu-trigger')) {
      return;
    }
    
    try {
      // Make sure we have a valid ReactFlow instance first
      if (!reactFlowInstance) {
        console.error("ReactFlow instance not available");
        return;
      }
      
      // Get all nodes in the flow to make them available for variable selection
      const allNodes = reactFlowInstance.getNodes();
      
      if (!allNodes || !Array.isArray(allNodes)) {
        console.error("Failed to get nodes from ReactFlow instance");
        return;
      }
      
      // Create a clean, safe version of each node to avoid circular references
      const safeAllNodes = allNodes.map(n => {
        if (!n || typeof n !== 'object') return null;
        
        return {
          id: n.id,
          type: n.type,
          data: n.data ? {
            ...n.data,
            label: n.data.label || n.type || "Node"
          } : { label: n.type || "Node" }
        };
      }).filter(Boolean); // Remove any null entries
      
      // Make sure the node data is a clean object without reactflow-specific properties
      const safeNode = {
        ...node,
        data: { 
          ...node.data,
          // Add all nodes to the node data so variable selector can use them
          allNodes: safeAllNodes
        }
      };
      
      // Set the selected node with this safe copy
      setSelectedNode(safeNode);
    } catch (error) {
      console.error("Error selecting node:", error);
      // If there's an error, don't update the selected node
    }
  }, [reactFlowInstance]);
  
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
  
  // Test a node in isolation
  const testNode = useCallback(async (nodeId: string, nodeData: any) => {
    // Find the node by ID
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    
    // Apply the node data to ensure we're using the latest configuration
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              ...nodeData,
            },
          };
        }
        return n;
      })
    );
    
    // Mock execution for this node only
    let responseData: any = null;
    
    // Create a log to track the execution
    const initialLog = {
      timestamp: new Date(),
      type: "info",
      nodeId,
      message: `Testing node: "${nodeData.label}" (${node.type})`
    };
    setLogs([initialLog]);
    
    // Simulate different behavior based on node type
    if (node.type === 'httpRequest') {
      // Mock HTTP request execution
      const method = nodeData.method || 'GET';
      const endpoint = nodeData.endpoint || '/api';
      const connector = nodeData.connector || 'No connector';
      
      // Log the request details
      const requestLog = {
        timestamp: new Date(),
        type: "http",
        nodeId: node.id,
        message: `${method} ${endpoint} using connector: ${connector}`
      };
      setLogs((logs) => [...logs, requestLog]);
      
      // If it's a POST or PUT request with a body, show the request body
      if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && nodeData.body) {
        const bodyLog = {
          timestamp: new Date(),
          type: "http",
          nodeId: node.id,
          message: `Request Body: ${nodeData.body}`
        };
        setLogs((logs) => [...logs, bodyLog]);
      }
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a response based on the connector and method
      if (nodeData.connector) {
        // OAuth connectors (simulate successful authentication)
        const responseLog = {
          timestamp: new Date(),
          type: "success",
          nodeId: node.id,
          message: `Response: 200 OK (authenticated with ${nodeData.connector})`
        };
        setLogs((logs) => [...logs, responseLog]);
        
        // Add mock response data with more realistic schema
        if (nodeData.connector === 'workday' && nodeData.body && nodeData.body.includes('locationType')) {
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
            }
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
        
        // Log the response data
        const dataLog = {
          timestamp: new Date(),
          type: "info",
          nodeId: node.id,
          message: `Response Data: ${JSON.stringify(responseData)}`
        };
        setLogs((logs) => [...logs, dataLog]);
      } else {
        // No connector selected - simple mock response
        const successLog = {
          timestamp: new Date(),
          type: "success",
          nodeId: node.id,
          message: "Response: 200 OK"
        };
        setLogs((logs) => [...logs, successLog]);
        
        responseData = {
          "status": 200,
          "success": true,
          "data": {
            "message": "This is a mock response for testing purposes",
            "timestamp": new Date().toISOString()
          }
        };
      }
    } else if (node.type === 'setVariable') {
      // Handle different variable setting methods
      if (nodeData.useTransform && nodeData.transformScript) {
        // Apply transformation with user-provided script
        const sourceVarPath = nodeData.variableValue || '';
        
        const transformationLog = {
          timestamp: new Date(),
          type: "info",
          nodeId: node.id,
          message: `Applying transformation to source: ${sourceVarPath}`
        };
        setLogs((logs) => [...logs, transformationLog]);
        
        // Mock source value - in real execution this would be fetched from previous steps
        const mockSourceValue = {
          items: [
            { id: 1, name: "Item 1", active: true, price: 49.99 },
            { id: 2, name: "Item 2", active: false, price: 29.99 },
            { id: 3, name: "Item 3", active: true, price: 39.99 }
          ],
          meta: {
            total: 3,
            page: 1,
            timestamp: new Date().toISOString()
          }
        };
        
        try {
          // Create a function from the transform script
          const transformFn = new Function('source', `
            try {
              ${nodeData.transformScript}
            } catch (error) {
              console.error("Transform error:", error);
              return null;
            }
          `);
          
          // Execute transformation
          const transformedValue = transformFn(mockSourceValue);
          
          const successLog = {
            timestamp: new Date(),
            type: "success",
            nodeId: node.id,
            message: `Transformation completed successfully`
          };
          setLogs((logs) => [...logs, successLog]);
          
          const resultLog = {
            timestamp: new Date(),
            type: "info",
            nodeId: node.id,
            message: `Variable ${nodeData.variableKey} set to transformed value: ${JSON.stringify(transformedValue).substring(0, 100)}${JSON.stringify(transformedValue).length > 100 ? '...' : ''}`
          };
          setLogs((logs) => [...logs, resultLog]);
          
          responseData = {
            variableKey: nodeData.variableKey,
            variableValue: transformedValue,
            originalValue: mockSourceValue,
            transformScript: nodeData.transformScript,
            useTransform: true,
            type: "variable"
          };
        } catch (error: any) {
          const errorLog = {
            timestamp: new Date(),
            type: "error",
            nodeId: node.id,
            message: `Transformation error: ${error.message}`
          };
          setLogs((logs) => [...logs, errorLog]);
          
          responseData = {
            variableKey: nodeData.variableKey,
            error: error.message,
            type: "variable",
            status: "error"
          };
        }
      } else {
        // Standard variable setting - just displaying the info
        const variableLog = {
          timestamp: new Date(),
          type: "info",
          nodeId: node.id,
          message: `Variable ${nodeData.variableKey} would be set to: ${nodeData.variableValue}`
        };
        setLogs((logs) => [...logs, variableLog]);
        
        responseData = {
          variableKey: nodeData.variableKey,
          variableValue: nodeData.variableValue,
          type: "variable"
        };
      }
    } else {
      // Generic test response for other node types
      responseData = {
        nodeType: node.type,
        nodeId: node.id,
        testOnly: true,
        timestamp: new Date().toISOString()
      };
    }
    
    // Complete the test
    const completionLog = {
      timestamp: new Date(),
      type: "info",
      nodeId,
      message: "Node test completed"
    };
    setLogs((logs) => [...logs, completionLog]);
    
    // Store the test result in the node data to make it available for downstream nodes
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              testResult: responseData,  // Store the full test result
              _lastTestTimestamp: new Date().toISOString(),  // Track when it was last tested
            },
          };
        }
        return n;
      })
    );
    
    // Return the response data for further processing
    return responseData;
  }, [nodes, setNodes, setLogs]);
  
  // Handle the node context menu display
  useEffect(() => {
    const handleNodeContextMenu = (event: CustomEvent) => {
      const { nodeId, x, y } = event.detail;
      setContextMenuNodeId(nodeId);
      setContextMenuPosition({ x, y });
    };
    
    // Listen for the custom event from node components
    document.addEventListener('node:contextmenu' as any, handleNodeContextMenu);
    
    // Close the context menu when clicking elsewhere
    const handleGlobalClick = () => {
      setContextMenuNodeId(null);
      setContextMenuPosition(null);
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      document.removeEventListener('node:contextmenu' as any, handleNodeContextMenu);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);
  
  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    // Get connected edges to also remove
    const edgesToRemove = edges.filter(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );
    
    // Remove node
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    
    // Remove connected edges
    if (edgesToRemove.length > 0) {
      setEdges((edges) => 
        edges.filter((edge) => 
          !(edge.source === nodeId || edge.target === nodeId)
        )
      );
    }
    
    // Close the context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    toast({
      title: "Node Deleted",
      description: "The node has been removed from the flow",
    });
  }, [edges, setNodes, setEdges, toast]);
  
  // Handle node skipping (marking as skipped in execution)
  const handleSkipNode = useCallback((nodeId: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              skipped: !node.data.skipped,
            },
          };
        }
        return node;
      })
    );
    
    // Close the context menu
    setContextMenuNodeId(null);
    setContextMenuPosition(null);
    
    toast({
      title: "Node Skip Status Changed",
      description: "The node will be skipped during execution",
    });
  }, [setNodes, toast]);
  
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
        <div className="flex-1 relative bg-slate-100 dark:bg-black overflow-hidden" ref={reactFlowWrapper}>
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
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ 
                  padding: 0.2, 
                  minZoom: 0.5, 
                  maxZoom: 1.5
                }}
                snapToGrid={true}
                snapGrid={[gridSize, gridSize]}
                nodesDraggable={true}
                elementsSelectable={true}
                preventScrolling={false}
                defaultEdgeOptions={{ 
                  animated: true,
                  style: { stroke: '#4f46e5', strokeWidth: 2 }
                }}
                style={{ width: '100%', height: '100%' }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{ hideAttribution: true }}
              >
                <Controls />
                <MiniMap />
                <Background gap={12} size={1} />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>
        
        {/* Node Configuration Panel */}
        {selectedNode && selectedNode.id && selectedNode.data && (
          <NodeConfiguration 
            node={selectedNode} 
            updateNodeData={updateNodeData} 
            onClose={closeNodeConfig}
            connectors={connectors}
            onTestNode={testNode}
          />
        )}
        
        {/* Node Context Menu */}
        {contextMenuNodeId && contextMenuPosition && (
          <div 
            style={{
              position: 'absolute',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              zIndex: 1000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <NodeContextMenu 
              nodeId={contextMenuNodeId}
              onDelete={handleDeleteNode}
              onSkip={handleSkipNode}
            />
          </div>
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
