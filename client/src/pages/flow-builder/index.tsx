import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme } = useTheme();

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
        <div className={`${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b px-4 py-2`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Input
                placeholder="Flow name..."
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                className={`bg-transparent border-none font-bold focus:ring-0 focus-visible:ring-0 text-sm h-8 w-44 ${
                  theme === 'dark' 
                    ? 'text-white placeholder:text-gray-400' 
                    : 'text-black placeholder:text-gray-500'
                }`}
              />
              <Input
                placeholder="Description..."
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                className={`bg-transparent border-none focus:ring-0 focus-visible:ring-0 text-sm h-8 w-56 ${
                  theme === 'dark' 
                    ? 'text-white placeholder:text-gray-400' 
                    : 'text-black placeholder:text-gray-500'
                }`}
              />
            </div>
            
            <div className={`flex items-center space-x-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {loading && <span>Loading...</span>}
              {autoSaving && <span>Saving...</span>}
            </div>
          </div>
        </div>

        {/* Main Content Area - positioned below header */}
        <div className="flex flex-1">
          {/* React Flow Canvas */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              className={theme === 'dark' ? 'bg-black' : 'bg-gray-50'}
            >
              <Controls />
              <Background 
                variant={BackgroundVariant.Dots} 
                className={theme === 'dark' ? 'bg-black' : 'bg-gray-50'} 
                color={theme === 'dark' ? '#333' : '#ddd'} 
              />
            </ReactFlow>

            {/* Chat Input Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center bg-indigo-900/40 backdrop-blur-lg border border-indigo-400/20 rounded-full px-4 py-2 shadow-2xl w-[750px] ring-1 ring-indigo-300/15">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-7 w-7 text-indigo-200 hover:text-white hover:bg-indigo-500/40 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                </Button>
                
                <Input
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className={`flex-1 bg-transparent border-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus:border-none active:border-none text-sm mx-4 h-8 rounded-full ${
                    theme === 'dark' 
                      ? 'text-white placeholder:text-indigo-200/60' 
                      : 'text-black placeholder:text-indigo-400/70'
                  }`}
                  style={{ boxShadow: 'none' }}
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
                  className="p-1 h-7 w-7 text-indigo-200 hover:text-white hover:bg-indigo-500/40 rounded-full mr-2 transition-all duration-200 hover:scale-105"
                >
                  <WrenchIcon className="h-3.5 w-3.5" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-7 w-7 text-indigo-200 hover:text-white hover:bg-indigo-500/40 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <MicIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - positioned below header */}
          {sidebarOpen && (
            <div className={`w-80 border-l flex flex-col ${
              theme === 'dark' 
                ? 'bg-black border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <div className={`p-4 border-b ${
                theme === 'dark' 
                  ? 'border-gray-700' 
                  : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <h2 className={`font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-black'
                  }`}>Tools</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(false)}
                    className={theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                    }
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}