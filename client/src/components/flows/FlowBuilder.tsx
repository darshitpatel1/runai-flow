import { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, { 
  addEdge, 
  MiniMap, 
  Controls, 
  Background, 
  ReactFlowProvider, 
  useNodesState, 
  useEdgesState,
  Connection,
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';
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
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const { toast } = useToast();
  
  // Load initial nodes and edges when they change
  useEffect(() => {
    console.log("Loading initial nodes:", initialNodes);
    if (initialNodes && initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);
  
  useEffect(() => {
    console.log("Loading initial edges:", initialEdges);
    if (initialEdges && initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);
  
  // Update parent component when nodes/edges change
  useEffect(() => {
    reportNodesChange(nodes);
  }, [nodes, reportNodesChange]);
  
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
      
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
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
    
    setIsTestRunning(true);
    setLogs([
      {
        timestamp: new Date(),
        type: "info",
        message: "Starting flow execution..."
      }
    ]);
    
    // TODO: Add real flow execution logic for testing
    
    // Mock execution for demonstration
    const mockExecution = async () => {
      // Simulate some node executions
      for (const node of nodes) {
        setLogs((logs) => [
          ...logs,
          {
            timestamp: new Date(),
            type: "info",
            message: `Executing node: "${node.data.label}" (${node.type})`
          }
        ]);
        
        // Simulate API call if it's an HTTP node
        if (node.type === 'httpRequest') {
          const method = node.data.method || 'GET';
          const endpoint = node.data.endpoint || '/api';
          const connector = node.data.connector || 'No connector';
          
          // Log the request details
          setLogs((logs) => [
            ...logs,
            {
              timestamp: new Date(),
              type: "http",
              message: `${method} ${endpoint} using connector: ${connector}`
            }
          ]);
          
          // If it's a POST or PUT request with a body, show the request body
          if ((method === 'POST' || method === 'PUT') && node.data.body) {
            setLogs((logs) => [
              ...logs,
              {
                timestamp: new Date(),
                type: "http",
                message: `Request Body: ${node.data.body}`
              }
            ]);
          }
          
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Different response scenarios based on connector and method
          if (node.data.connector) {
            // OAuth connectors (simulate successful authentication)
            setLogs((logs) => [
              ...logs,
              {
                timestamp: new Date(),
                type: "success",
                message: `Response: 200 OK (authenticated with ${node.data.connector})`
              }
            ]);
            
            // Add mock response data
            setLogs((logs) => [
              ...logs,
              {
                timestamp: new Date(),
                type: "info",
                message: method === 'GET' 
                  ? `Response Data: {"success": true, "data": {"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]}}`
                  : `Response Data: {"success": true, "message": "Operation completed successfully", "id": ${Date.now()}}`
              }
            ]);
          } else {
            // No connector selected - higher chance of failure
            if (Math.random() > 0.5) {
              setLogs((logs) => [
                ...logs,
                {
                  timestamp: new Date(),
                  type: "success",
                  message: "Response: 200 OK"
                }
              ]);
            } else {
              setLogs((logs) => [
                ...logs,
                {
                  timestamp: new Date(),
                  type: "error",
                  message: "Request failed: 401 Unauthorized (No valid authentication)"
                }
              ]);
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setLogs((logs) => [
        ...logs,
        {
          timestamp: new Date(),
          type: "info",
          message: "Flow execution completed"
        }
      ]);
      
      setIsTestRunning(false);
    };
    
    mockExecution();
  }, [nodes, toast]);
  
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
                snapToGrid
                snapGrid={[15, 15]}
                defaultEdgeOptions={{ animated: true }}
                style={{ width: '100%', height: '100%' }}
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
