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

// Global state for drag tracking and optimization
let lastUpdateTime = Date.now();
let isCurrentlyDragging = false;
let draggedNodeId: string | null = null;
let nodePositionCache: Record<string, {x: number, y: number}> = {}; // Cache to prevent loss of position
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
import { StopJobNode } from "./nodes/StopJobNode";
import { useToast } from "@/hooks/use-toast";

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
  
  // Optimized node change handler with more efficient updates and reduced memory usage
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    try {
      // Check for drag start and drag end to manage state - only process once
      const dragChange = changes.find(change => 
        change.type === 'position' && 'dragging' in change
      ) as NodePositionChange | undefined;
      
      if (dragChange) {
        // Handle drag start with safety mechanisms
        if (dragChange.dragging === true) {
          isCurrentlyDragging = true;
          draggedNodeId = dragChange.id;
          
          // Store the node's current position in the cache for recovery
          // This prevents nodes from disappearing if they encounter rendering issues
          setNodes(currentNodes => {
            const draggedNode = currentNodes.find(n => n.id === dragChange.id);
            if (draggedNode && draggedNode.position) {
              // Save current position to recover from errors
              nodePositionCache[dragChange.id] = { 
                x: draggedNode.position.x, 
                y: draggedNode.position.y 
              };
            }
            return currentNodes;
          });
        } 
        // Handle drag end with improved efficiency
        else if (dragChange.dragging === false && isCurrentlyDragging) {
          isCurrentlyDragging = false;
          
          // On drag end, use a single stable update
          setNodes(nodes => {
            // Only process nodes that need updating to reduce calculation load
            const updatedNodes = nodes.map(node => {
              if (!node || !node.position) return node;
              
              // Only apply full stabilization to the dragged node for better performance
              if (node.id === draggedNodeId) {
                const position = node.positionAbsolute || node.position;
                const x = Math.round(position.x / gridSize) * gridSize;
                const y = Math.round(position.y / gridSize) * gridSize;
                
                return {
                  ...node,
                  position: { x, y },
                  positionAbsolute: { x, y },
                  dragging: false,
                  selected: !!node.selected
                };
              }
              
              // For other nodes, just ensure dragging state is cleared
              return { ...node, dragging: false };
            });
            
            // Report changes but avoid nested timeouts that can cause memory issues
            if (reportNodesChange && typeof reportNodesChange === 'function') {
              reportNodesChange(updatedNodes);
            }
            
            return updatedNodes;
          });
          
          // Clear any reference to dragged node
          draggedNodeId = null;
          
          // Return early to avoid double processing
          return;
        }
      }
      
      // Aggressive throttling for smoother performance
      const now = Date.now();
      if (isCurrentlyDragging && now - lastUpdateTime < 50) {
        // Skip more updates to reduce CPU/memory load
        return;
      }
      lastUpdateTime = now;
      
      // Apply changes with minimal spreading/copying
      setNodes(nds => {
        const updatedNodes = applyNodeChanges(changes, nds);
        
        // Report all node changes to parent for saving to Firestore
        if (reportNodesChange && typeof reportNodesChange === 'function') {
          console.log("Reporting regular node changes to parent");
          // Use setTimeout to ensure this happens after the state update
          setTimeout(() => reportNodesChange(updatedNodes), 10);
        }
        
        return updatedNodes;
      });
      
    } catch (error) {
      console.error("Error in onNodesChange:", error);
    }
  }, [setNodes, gridSize, reportNodesChange]);
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
    // Initial nodes loaded
    if (initialNodes && initialNodes.length > 0) {
      console.log("Initial nodes data received in Flow Builder:", initialNodes);
      
      try {
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
        
        console.log("Setting processed nodes:", stabilizedNodes);
        setNodes(stabilizedNodes);
      } catch (error) {
        console.error("Error processing initial nodes:", error);
        // Fallback to using the original nodes without processing if there's an error
        setNodes(initialNodes);
      }
    } else {
      console.log("No initial nodes to load or empty array received");
    }
  }, [initialNodes, setNodes]);
  
  useEffect(() => {
    if (initialEdges && initialEdges.length > 0) {
      // Create a deep copy to prevent reference issues
      const edgesCopy = JSON.parse(JSON.stringify(initialEdges));
      setEdges(edgesCopy);
    }
  }, [initialEdges, setEdges]);
  
  // Optimized function to stabilize node positions with minimal object creation
  const stabilizeNodePositions = useCallback((nodes: any[]) => {
    // Use the same grid size constant to avoid duplication
    if (!nodes || nodes.length === 0) return nodes;
    
    // Avoid creating new array if nothing changes
    let hasChanges = false;
    
    // Perform in-place updates where possible to reduce memory pressure
    const result = nodes.map((node) => {
      if (!node) return node;
      
      // Skip nodes that don't need stabilization
      if (!node.position) {
        return { ...node, position: { x: 0, y: 0 } };
      }
      
      // Check if stabilization is needed
      const { x, y } = node.position;
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;
      
      // Only create new objects if the position actually changed
      if (x !== snappedX || y !== snappedY || node.dragging || !node.positionAbsolute) {
        hasChanges = true;
        
        // Create position objects only once
        const stablePosition = { x: snappedX, y: snappedY };
        
        return {
          ...node,
          position: stablePosition,
          positionAbsolute: stablePosition, // Use the same object reference for both
          selected: !!node.selected,
          dragging: false
        };
      }
      
      // If node is already stable, don't create new objects
      return node;
    });
    
    return hasChanges ? result : nodes;
  }, [gridSize]);
  
  // Update parent component when nodes/edges change with improved zigzag prevention
  useEffect(() => {
    // Add debounce mechanism to prevent zigzag effect for rapid changes
    const updateTimeout = setTimeout(() => {
      // Skip update during active drag operations
      if (isCurrentlyDragging) {
        return;
      }
      
      // Apply consistent node positioning before reporting changes
      const stabilizedNodes = stabilizeNodePositions(nodes);
      
      // Only report if nodes have actually changed to prevent unnecessary renders
      if (stabilizedNodes !== nodes) {
        reportNodesChange(stabilizedNodes);
      }
    }, 50); // Short delay to batch updates
    
    // Clear timeout on cleanup
    return () => clearTimeout(updateTimeout);
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
  
  // Optimized drag stop handler with less memory usage
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
    // Skip processing if node is invalid
    if (!node || !node.position) return;
    
    // Calculate snapped position once
    const x = Math.round(node.position.x / gridSize) * gridSize;
    const y = Math.round(node.position.y / gridSize) * gridSize;
    const stablePosition = { x, y };
    
    // Update only the dragged node to improve performance
    setNodes(nodes => {
      return nodes.map(n => {
        // Skip irrelevant nodes to avoid unnecessary renders
        if (n.id !== node.id) return n;
        
        // Use the pre-calculated stable position
        return {
          ...n,
          position: stablePosition,
          positionAbsolute: stablePosition, // Use same object reference
          dragging: false,
        };
      });
    });
    
    // Report changes without creating another stabilized copy of all nodes
    if (reportNodesChange) {
      reportNodesChange(nodes); // Parent component will handle stabilization as needed
    }
  }, [setNodes, gridSize, reportNodesChange]);
  
  // Improved node drop handler with better positioning and connection reliability
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      try {
        // Get viewport bounds
        const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
        if (!reactFlowBounds || !reactFlowInstance) {
          return;
        }
        
        // Extract node data from drag event
        const nodeType = event.dataTransfer.getData('application/reactflow-type');
        let nodeData;
        
        try {
          nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow-data'));
        } catch (e) {
          console.error("Failed to parse node data:", e);
          return;
        }
        
        if (!nodeType || !nodeData) {
          return;
        }
        
        // Calculate drop position with viewport adjustment
        const viewportPosition = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
        
        // Ensure the node is placed within visible bounds and snapped to grid
        const safeX = Math.max(50, Math.round(viewportPosition.x / gridSize) * gridSize); 
        const safeY = Math.max(50, Math.round(viewportPosition.y / gridSize) * gridSize);
        
        // Use consistent position objects to avoid reference issues
        const position = { x: safeX, y: safeY };
        const positionAbsolute = { x: safeX, y: safeY };
        
        // Create a unique and stable ID for the node
        const newNodeId = `${nodeType}_${Date.now()}`;
        
        // Create a complete node with all necessary properties
        const newNode = {
          id: newNodeId,
          type: nodeType,
          position,
          positionAbsolute, // Set both position properties to ensure stability
          data: { 
            ...nodeData, 
            label: `New ${nodeData.label || nodeType}`,
          },
          selected: false,
          dragging: false
        };
        
        // Add the node to the flow with proper handling
        setNodes((nds) => {
          // First add the new node to the graph
          const updatedNodes = nds.concat(newNode);
          
          // Make sure to report this change to the parent component for saving
          if (reportNodesChange) {
            console.log("Reporting node added to parent:", updatedNodes);
            setTimeout(() => reportNodesChange(updatedNodes), 0);
          }
          
          // Create a connection with a slight delay to ensure node rendering is complete
          if (nds && nds.length > 0) {
            // Use requestAnimationFrame for better timing with the render cycle
            requestAnimationFrame(() => {
              try {
                // Get all nodes above this one as potential sources
                const sourceNodes = nds.filter(node => 
                  node && node.position && node.position.y < safeY - 50 // Use minimum vertical gap
                );
                
                // Only proceed if we have potential source nodes
                if (sourceNodes.length > 0) {
                  // Find best node to connect to based on position and type
                  let bestSourceNode = sourceNodes[0];
                  let bestDistance = Infinity;
                  
                  // Calculate distances with special handling for different node types
                  sourceNodes.forEach(node => {
                    // Base distance calculation
                    const dx = (node.position?.x || 0) - safeX;
                    const dy = (node.position?.y || 0) - safeY;
                    let distance = Math.sqrt(dx*dx + dy*dy);
                    
                    // Prefer nodes that are more directly above (weight vertical proximity higher)
                    const horizontalOffset = Math.abs(dx);
                    if (horizontalOffset < 150) {
                      // Boost priority of nodes that are vertically aligned
                      distance *= 0.7; 
                    }
                    
                    // Special handling for nodes that need to connect to something
                    const isSpecialTargetNode = nodeType === 'setVariable' || nodeType === 'httpRequest';
                    
                    // Special handling for nodes we want to connect from
                    const isGoodSourceNode = node.type !== 'stopJob' && node.type !== 'delay';
                    if (isGoodSourceNode && isSpecialTargetNode) {
                      // Boost priority for good connection combinations
                      distance *= 0.8;
                    }
                    
                    // Update best match if this is better
                    if (distance < bestDistance) {
                      bestDistance = distance;
                      bestSourceNode = node;
                    }
                  });
                  
                  // Determine the appropriate source handle
                  let sourceHandle = null;
                  
                  // Special cases for different node types
                  if (bestSourceNode.type === 'ifElse') {
                    // Connect to true path by default for if/else nodes
                    sourceHandle = 'true';
                  } else if (bestSourceNode.type === 'loopStart') {
                    // Connect to standard output for loop nodes
                    sourceHandle = 'standard';
                  }
                  
                  // Create a unique ID for the edge that's stable
                  const edgeId = `edge-${bestSourceNode.id}-${newNodeId}`;
                  
                  // Define connection parameters
                  const connectionParams = {
                    id: edgeId,
                    source: bestSourceNode.id,
                    sourceHandle,
                    target: newNodeId,
                    targetHandle: null,
                    animated: true,
                    style: { stroke: '#4f46e5', strokeWidth: 2 }
                  };
                  
                  // Add the edge to connect the nodes
                  setEdges(eds => addEdge(connectionParams, eds));
                }
              } catch (error) {
                console.error("Error creating connection:", error);
              }
            });
          }
          
          return updatedNodes;
        });
      } catch (error) {
        console.error("Error in node drop operation:", error);
      }
    },
    [reactFlowInstance, gridSize, setNodes, setEdges]
  );
  
  // Optimized node click handler that minimizes object creation
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Skip if clicking on context menu to avoid double processing
    if ((event.target as HTMLElement).closest('.context-menu-trigger')) {
      return;
    }
    
    try {
      // Quick validation to save processing time
      if (!reactFlowInstance || !node || !node.data) {
        return;
      }
      
      // Get a reference to all nodes but only extract minimal data
      const allNodes = reactFlowInstance.getNodes();
      if (!allNodes || !Array.isArray(allNodes)) return;
      
      // Create a minimal representation of other nodes for variable selection
      // This greatly reduces memory usage compared to the previous approach
      const minimalNodes = [];
      for (let i = 0; i < allNodes.length; i++) {
        const n = allNodes[i];
        if (!n || !n.id) continue;
        
        // Only include essential properties to save memory
        minimalNodes.push({
          id: n.id,
          type: n.type,
          data: {
            label: n.data?.label || n.type || "Node"
          }
        });
      }
      
      // Create selective copy with minimal property duplication
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
  
  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    console.log(`💾 Updating node ${nodeId} with data:`, newData);
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
          
          // If this node has test results, share them with all other nodes for variable access
          if (newData.testResult || newData.variables) {
            console.log(`🔄 Sharing test results from node ${nodeId} with all nodes`);
            
            // Update all other nodes to include this node's test data
            setTimeout(() => {
              setNodes((currentNodes) => 
                currentNodes.map((n) => {
                  if (n.id !== nodeId) {
                    // Add current nodes list including the updated test results
                    const allNodesWithTestData = currentNodes.map(cn => {
                      console.log(`🔄 Sharing data from node ${cn.id}:`, {
                        hasTestResult: !!cn.data?.testResult,
                        hasVariables: !!cn.data?.variables,
                        variablesCount: cn.data?.variables?.length || 0
                      });
                      
                      return {
                        id: cn.id,
                        type: cn.type,
                        data: {
                          label: cn.data?.label || cn.type || "Node",
                          testResult: cn.data?.testResult,
                          variables: cn.data?.variables,
                          _rawTestData: cn.data?._rawTestData
                        }
                      };
                    });
                    
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        allNodes: allNodesWithTestData
                      }
                    };
                  }
                  return n;
                })
              );
            }, 100);
          }
          
          return updatedNode;
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
      message: "🚀 Starting Art Institute API flow execution..."
    };
    
    // Initialize logs array
    const executionLogs = [initialLog];
    setLogs([initialLog]);
    
    // Execute the actual flow and get real API response for main console
    setTimeout(async () => {
      try {
        // Call the flow execution endpoint to get real API data
        const response = await fetch(`/api/execute-flow/${flowId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firebaseId: getAuth().currentUser?.uid
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          
          // Show execution completion
          const completionLog = {
            timestamp: new Date(),
            type: "success",
            message: `✅ Flow completed successfully! Execution ID: ${result.executionId}`
          };
          setLogs(prev => [...prev, completionLog]);
          
          // If we have API response data, show it in main console
          if (result.apiResponse) {
            const apiResponseLog = {
              timestamp: new Date(),
              type: "success",
              message: `Response Data: ${result.apiResponse}`
            };
            setLogs(prev => [...prev, apiResponseLog]);
          }
          
          // Show artwork details if available
          if (result.artworkDetails) {
            const artworkDetailsLog = {
              timestamp: new Date(),
              type: "info",
              message: `🎨 Artwork: "${result.artworkDetails.title}" by ${result.artworkDetails.artist} (${result.artworkDetails.date}) - ${result.artworkDetails.medium}`
            };
            setLogs(prev => [...prev, artworkDetailsLog]);
          }
        } else {
          const errorLog = {
            timestamp: new Date(),
            type: "error",
            message: `❌ Flow execution failed: ${response.statusText}`
          };
          setLogs(prev => [...prev, errorLog]);
        }
      } catch (error) {
        const errorLog = {
          timestamp: new Date(),
          type: "error",
          message: `❌ Flow execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        setLogs(prev => [...prev, errorLog]);
      }
    }, 1000);
    
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
        <div className="flex-1 relative bg-slate-100 dark:bg-black overflow-hidden transform-gpu" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <div style={{ width: '100%', height: '100%' }} className="transform-gpu">
              <ReactFlow 
                className="transform-gpu overflow-hidden"
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
                
                // Better snapping configuration
                snapToGrid={true}
                snapGrid={[gridSize, gridSize]}
                
                // Better edge routing
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  style: { 
                    stroke: '#4f46e5', 
                    strokeWidth: 2
                  },
                  animated: true
                }}
                
                // Connection line options for better visibility
                connectionLineStyle={{
                  stroke: '#6366f1',
                  strokeWidth: 3,
                  strokeDasharray: '5,5'
                }}
                
                // More intuitive connections
                connectionMode="strict"
                
                // Key controls
                selectNodesOnDrag={false}
                multiSelectionKeyCode="Control"
                
                fitView
                fitViewOptions={{ 
                  padding: 0.2, 
                  minZoom: 0.5,
                  maxZoom: 1.5
                }}
                nodesDraggable={true}
                elementsSelectable={true}
                preventScrolling={false}
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
            allNodes={nodes}
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
    </div>
  );
}
