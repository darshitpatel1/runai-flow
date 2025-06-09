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
  const [loading, setLoading] = useState(false);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Get flow ID from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlFlowId = urlParams.get('id');
    
    // Reset state when switching flows or starting new
    if (!urlFlowId) {
      setFlowId(null);
      setFlowName("");
      setFlowDescription("");
      setNodes([]);
      setEdges([]);
    }
    
    // Load existing flow if ID is provided
    if (urlFlowId && user) {
      loadFlow(urlFlowId);
    }
  }, [location, user]);

  const loadFlow = async (id: string) => {
    setLoading(true);
    try {
      const flowDoc = await getDoc(doc(db, "users", user!.uid, "flows", id));
      
      if (flowDoc.exists()) {
        const flowData = flowDoc.data();
        
        setFlowId(id);
        setFlowName(flowData.name || "");
        setFlowDescription(flowData.description || "");
        setNodes(flowData.nodes || []);
        setEdges(flowData.edges || []);
      } else {
        toast({
          title: "Flow not found",
          description: "The requested flow could not be found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading flow:", error);
      toast({
        title: "Error",
        description: "Failed to load flow",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Auto-save on changes with debounce (only for name and description)
  useEffect(() => {
    if (!flowName.trim() || loading) return;
    
    const timeoutId = setTimeout(() => {
      autoSaveFlow();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [flowName, flowDescription]);

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  return (
    <AppLayout>
      <div className="flex flex-col h-screen">
        {/* Compact Flow Header */}
        <div className="bg-black border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Input
                placeholder="Flow name..."
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className="bg-transparent border-none text-white placeholder:text-gray-400 focus:ring-0 focus-visible:ring-0 text-sm h-8 w-44"
              />
              <Input
                placeholder="Description..."
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                className="bg-transparent border-none text-white placeholder:text-gray-400 focus:ring-0 focus-visible:ring-0 text-sm h-8 w-56"
              />
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              {loading && <span>Loading...</span>}
              {autoSaving && <span>Saving...</span>}
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