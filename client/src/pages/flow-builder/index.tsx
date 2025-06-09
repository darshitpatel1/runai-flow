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
import { PlusIcon, WrenchIcon, MicIcon } from "lucide-react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
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
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex flex-col flex-1">
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

            {/* Chat Input Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 shadow-xl w-[600px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-8 w-8 text-gray-300 hover:text-purple-200 hover:bg-purple-600/30 rounded-md"
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
                
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-transparent border-none text-white placeholder:text-gray-400 focus:ring-0 focus-visible:ring-0 focus:outline-none text-sm mx-3"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // Handle send message
                      console.log('Send message:', chatInput);
                      setChatInput("");
                    }
                  }}
                />
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1 h-8 w-8 text-gray-300 hover:text-purple-200 hover:bg-purple-600/30 rounded-md mr-2"
                >
                  <WrenchIcon className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-8 w-8 text-gray-300 hover:text-purple-200 hover:bg-purple-600/30 rounded-md"
                >
                  <MicIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        {sidebarOpen && (
          <div className="w-80 bg-gray-800 border-l border-purple-500/30 flex flex-col">
            <div className="p-4 border-b border-purple-500/30">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-medium">Tools</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-300 hover:text-purple-200 hover:bg-purple-600/30"
                >
                  ×
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}