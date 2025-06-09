import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ArrowLeftIcon } from "lucide-react";
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
  const [autoSaving, setAutoSaving] = useState(false);
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

  // Auto-save function
  const autoSaveFlow = useCallback(async () => {
    if (!user || !flowName.trim()) return;

    setAutoSaving(true);
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
      } else {
        // Create new flow
        const flowsRef = collection(db, "users", user.uid, "flows");
        const docRef = await addDoc(flowsRef, {
          ...flowData,
          createdAt: new Date()
        });
        setFlowId(docRef.id);
        // Update URL to include the flow ID without navigation
        window.history.replaceState({}, '', `/flow-builder?id=${docRef.id}`);
      }
    } catch (error) {
      console.error("Error auto-saving flow:", error);
    } finally {
      setAutoSaving(false);
    }
  }, [user, flowName, flowDescription, nodes, edges, flowId]);

  // Auto-save on changes with debounce
  useEffect(() => {
    if (!flowName.trim()) return;
    
    const timeoutId = setTimeout(() => {
      autoSaveFlow();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [flowName, flowDescription, autoSaveFlow]);

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Compact Flow Header */}
        <div className="bg-black border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-1 text-white hover:bg-gray-800"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              <span className="text-sm">Dashboard</span>
            </Button>
            
            <div className="flex items-center space-x-4 flex-1 max-w-lg mx-4">
              <Input
                placeholder="Flow name..."
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="bg-transparent border-none text-white placeholder:text-gray-400 focus:ring-0 focus-visible:ring-0 text-sm h-8"
              />
              <Input
                placeholder="Description..."
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                className="bg-transparent border-none text-white placeholder:text-gray-400 focus:ring-0 focus-visible:ring-0 text-sm h-8"
              />
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              {autoSaving && <span>Saving...</span>}
              {flowId && !autoSaving && <span>Saved</span>}
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
            className="bg-black"
          >
            <Controls className="fill-white" />
            <Background variant={BackgroundVariant.Dots} className="bg-black" color="#333" />
          </ReactFlow>
        </div>
      </div>
    </AppLayout>
  );
}