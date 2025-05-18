import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, collection, getDoc, addDoc, updateDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { FlowBuilder } from "@/components/flows/FlowBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIcon, PlayIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LogMessage } from "@/components/flows/ConsoleOutput";
import { ExecutionProgress } from "@/components/flows/ExecutionProgress";

export default function FlowBuilderPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [flowName, setFlowName] = useState("Untitled Flow");
  const [flowDescription, setFlowDescription] = useState("");
  const [flow, setFlow] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [lastSavedState, setLastSavedState] = useState<{nodes: any[], edges: any[]}>({nodes: [], edges: []});
  
  // Fetch flow data if id exists, or initialize new flow
  useEffect(() => {
    const fetchFlowData = async () => {
      if (!user) return;
      
      try {
        // Fetch connectors for dropdown selections
        const connectorsRef = collection(db, "users", user.uid, "connectors");
        const connectorsSnapshot = await getDocs(connectorsRef);
        const connectorsData = connectorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConnectors(connectorsData);
        
        // If editing existing flow
        if (id) {
          const flowRef = doc(db, "users", user.uid, "flows", id);
          const flowDoc = await getDoc(flowRef);
          
          if (flowDoc.exists()) {
            const flowData = flowDoc.data();
            setFlow({ id: flowDoc.id, ...flowData });
            setFlowName(flowData.name || "Untitled Flow");
            setFlowDescription(flowData.description || "");
            
            // Load saved nodes and edges
            // Use the parsed data from firestore document
            const savedNodes = Array.isArray(flowData.nodes) ? flowData.nodes : [];
            const savedEdges = Array.isArray(flowData.edges) ? flowData.edges : [];
            
            console.log("Loading saved nodes:", savedNodes);
            console.log("Loading saved edges:", savedEdges);
            
            // Update state
            setNodes(savedNodes);
            setEdges(savedEdges);
            
            // Save the initial state to compare for autosave
            setLastSavedState({
              nodes: savedNodes,
              edges: savedEdges
            });
          } else {
            toast({
              title: "Flow not found",
              description: "The requested flow does not exist",
              variant: "destructive",
            });
          }
        }
      } catch (error: any) {
        toast({
          title: "Error loading flow",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchFlowData();
  }, [id, user, toast]);
  
  // Auto-save flow when nodes or edges change
  useEffect(() => {
    // Don't try to autosave if:
    // - The flow is still loading
    // - There's no user logged in
    // - There's no flow id (new unsaved flow)
    // - Manual save is already in progress
    // - No meaningful changes compared to last saved state
    if (
      loading || 
      !user || 
      !id || 
      !flow || 
      saving || 
      autoSaving ||
      (
        JSON.stringify(lastSavedState.nodes) === JSON.stringify(nodes) && 
        JSON.stringify(lastSavedState.edges) === JSON.stringify(edges)
      )
    ) {
      return;
    }
    
    // Debounce auto-save (wait 2 seconds after last change before saving)
    const autoSaveTimer = setTimeout(async () => {
      console.log("Auto-saving flow changes...");
      setAutoSaving(true);
      
      try {
        const flowData = {
          nodes,
          edges,
          updatedAt: new Date()
        };
        
        const flowRef = doc(db, "users", user.uid, "flows", id);
        await updateDoc(flowRef, flowData);
        
        setLastSavedState({
          nodes,
          edges
        });
        
        console.log("Flow auto-saved successfully");
      } catch (error: any) {
        console.error("Error auto-saving flow:", error);
        // Don't show toast for auto-save errors to avoid disrupting the user
      } finally {
        setAutoSaving(false);
      }
    }, 2000);
    
    // Clear the timeout if the component unmounts or if nodes/edges change again
    return () => clearTimeout(autoSaveTimer);
  }, [nodes, edges, user, id, flow, loading, saving, autoSaving, lastSavedState]);
  
  const handleSaveFlow = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const flowData = {
        name: flowName,
        description: flowDescription,
        nodes,
        edges,
        updatedAt: new Date()
      };
      
      if (id && flow) {
        // Update existing flow
        const flowRef = doc(db, "users", user.uid, "flows", id);
        await updateDoc(flowRef, flowData);
        
        // Update last saved state to avoid immediate auto-save
        setLastSavedState({
          nodes,
          edges
        });
        
        toast({
          title: "Flow updated",
          description: "Flow has been saved successfully",
        });
      } else {
        // Create new flow
        const flowsRef = collection(db, "users", user.uid, "flows");
        const newFlow = await addDoc(flowsRef, {
          ...flowData,
          createdAt: new Date(),
          active: false
        });
        
        setFlow({ id: newFlow.id, ...flowData, createdAt: new Date() });
        
        // Update last saved state
        setLastSavedState({
          nodes,
          edges
        });
        
        toast({
          title: "Flow created",
          description: "New flow has been created successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error saving flow",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleTestFlow = async () => {
    if (!user || !flow?.id) {
      toast({
        title: "Cannot test flow",
        description: "Please save the flow first",
        variant: "destructive",
      });
      return;
    }
    
    setTesting(true);
    
    try {
      // Use the API endpoint to execute the flow
      // This will trigger real-time updates through WebSockets
      const response = await fetch(`/api/flows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.uid}`
        },
        body: JSON.stringify({
          input: {
            // Any input parameters for the flow
            timestamp: new Date().toISOString(),
            testMode: true
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute flow');
      }
      
      const execution = await response.json();
      
      // Store execution ID in the flow for the ExecutionProgress component
      setFlow((prevFlow: any) => ({
        ...prevFlow,
        executionId: execution.id
      }));
      
      toast({
        title: "Flow execution started",
        description: "The flow is running. Watch the progress in real-time.",
      });
    } catch (error: any) {
      toast({
        title: "Error executing flow",
        description: error.message,
        variant: "destructive",
      });
      setTesting(false);
    }
  };
  
  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex-shrink-0">
          <div>
            <Input
              className="text-xl font-semibold bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              onBlur={handleSaveFlow}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{flowDescription || "No description"}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="flex items-center gap-2 dark:bg-black dark:border-slate-700"
              onClick={handleSaveFlow}
              disabled={saving}
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <SaveIcon className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            
            <Button
              className="flex items-center gap-2"
              onClick={handleTestFlow}
              disabled={testing}
            >
              {testing ? (
                <>Testing...</>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  Test Flow
                </>
              )}
            </Button>
          </div>
        </header>
        
        {/* Flow Builder Component */}
        <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100% - 4rem)' }}>
          {/* Main Flow Builder */}
          <div className="flex-1 relative">
            <FlowBuilder
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              connectors={connectors}
              flowId={id}
            />
            
            {/* Execution Progress Panel */}
            {id && (
              <div className="absolute top-4 right-16 w-72">
                <ExecutionProgress 
                  flowId={id} 
                  executionId={flow?.executionId}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
