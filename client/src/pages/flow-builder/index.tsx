import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SaveIcon, ArrowLeftIcon } from "lucide-react";
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
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get flow ID from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const urlFlowId = urlParams.get('id');

  useEffect(() => {
    // Load existing flow if ID is provided
    if (urlFlowId && user) {
      loadFlow(urlFlowId);
    }
  }, [urlFlowId, user]);

  const loadFlow = async (id: string) => {
    try {
      const flowDoc = await getDoc(doc(db, "users", user!.uid, "flows", id));
      if (flowDoc.exists()) {
        const flowData = flowDoc.data();
        setFlowId(id);
        setFlowName(flowData.name || "");
        setFlowDescription(flowData.description || "");
        setNodes(flowData.nodes || []);
        setEdges(flowData.edges || []);
      }
    } catch (error) {
      console.error("Error loading flow:", error);
      toast({
        title: "Error",
        description: "Failed to load flow",
        variant: "destructive",
      });
    }
  };

  const saveFlow = async () => {
    if (!user) return;
    if (!flowName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a flow name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const flowData = {
        name: flowName.trim(),
        description: flowDescription.trim(),
        nodes,
        edges,
        updatedAt: new Date()
      };

      if (flowId) {
        // Update existing flow
        await updateDoc(doc(db, "users", user.uid, "flows", flowId), flowData);
        toast({
          title: "Flow Updated",
          description: "Your flow has been saved successfully",
        });
      } else {
        // Create new flow
        const flowsRef = collection(db, "users", user.uid, "flows");
        const docRef = await addDoc(flowsRef, {
          ...flowData,
          createdAt: new Date()
        });
        setFlowId(docRef.id);
        // Update URL to include the flow ID
        navigate(`/flow-builder?id=${docRef.id}`);
        toast({
          title: "Flow Created",
          description: "Your new flow has been created successfully",
        });
      }
    } catch (error) {
      console.error("Error saving flow:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save the flow",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Flow Creation Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span>Back to Dashboard</span>
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="flex flex-col space-y-2">
                  <Input
                    placeholder="Enter flow name..."
                    value={flowName}
                    onChange={(e) => setFlowName(e.target.value)}
                    className="w-64"
                  />
                  <Textarea
                    placeholder="Flow description (optional)..."
                    value={flowDescription}
                    onChange={(e) => setFlowDescription(e.target.value)}
                    className="w-64 h-20 resize-none"
                  />
                </div>
              </div>
              
              <Button
                onClick={saveFlow}
                disabled={saving || !flowName.trim()}
                className="flex items-center space-x-2"
              >
                <SaveIcon className="h-4 w-4" />
                <span>{saving ? "Saving..." : flowId ? "Update Flow" : "Create Flow"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-gray-50 dark:bg-gray-900"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} />
            
            {flowName && (
              <Panel position="top-left">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
                  <h3 className="font-medium text-sm">{flowName}</h3>
                  {flowDescription && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {flowDescription}
                    </p>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </AppLayout>
  );
}