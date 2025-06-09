import { AppLayout } from "@/components/layout/AppLayout";
import ReactFlow, { 
  Node, 
  Edge, 
  addEdge, 
  Connection, 
  useNodesState, 
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export default function FlowBuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  return (
    <AppLayout>
      <div className="h-screen w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} />
          <Panel position="top-left">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-2">Flow Builder</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Build your workflows here
              </p>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </AppLayout>
  );
}