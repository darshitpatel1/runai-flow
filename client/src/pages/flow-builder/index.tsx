import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { doc, collection, getDoc, addDoc, updateDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { FlowBuilder } from "@/components/flows/FlowBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIcon, PlayIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LogMessage, ResizableConsole } from "@/components/flows/ResizableConsole";

export default function FlowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [lastSavedState, setLastSavedState] = useState<any>(null);

  // Load flow and connectors
  useEffect(() => {
    const loadData = async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        console.log('Loading flow data for:', id);
        
        // Load flow
        const flowRef = doc(db, "users", user.uid, "flows", id);
        const flowSnap = await getDoc(flowRef);
        
        if (flowSnap.exists()) {
          const flowData = flowSnap.data();
          console.log('Flow data loaded:', flowData);
          setFlow(flowData);
          setFlowName(flowData.name || "");
          setFlowDescription(flowData.description || "");
          
          // Properly load nodes with all their saved data
          const savedNodes = flowData.nodes || [];
          console.log('Loading saved nodes from Firestore:', savedNodes);
          setNodes(savedNodes);
          setEdges(flowData.edges || []);
          
          setLastSavedState({
            nodes: flowData.nodes || [],
            edges: flowData.edges || []
          });
        } else {
          console.log('Flow not found, creating new flow');
          // Create empty flow if it doesn't exist
          setFlow({ id, name: "New Flow", nodes: [], edges: [] });
          setFlowName("New Flow");
          setFlowDescription("");
          setNodes([]);
          setEdges([]);
        }

        // Load connectors
        const connectorsRef = collection(db, "users", user.uid, "connectors");
        const connectorsSnap = await getDocs(connectorsRef);
        const connectorsData = connectorsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setConnectors(connectorsData);
        console.log('Connectors loaded:', connectorsData.length);

      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: "Failed to load flow data",
          variant: "destructive",
        });
        // Still set loading to false even on error
        setLoading(false);
      }
      
      // Always set loading to false at the end
      setLoading(false);
    };

    loadData();
  }, [user, id]);

  // Manual save only - remove auto-save to prevent conflicts with node config saves
  // Auto-save disabled to prevent overwriting node configuration changes

  const handleSaveFlow = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const serializedNodes = JSON.parse(JSON.stringify(nodes));
      const serializedEdges = JSON.parse(JSON.stringify(edges));
      
      const flowData = {
        name: flowName,
        description: flowDescription,
        nodes: serializedNodes,
        edges: serializedEdges,
        updatedAt: new Date()
      };
      
      if (id && flow) {
        const flowRef = doc(db, "users", user.uid, "flows", id);
        await updateDoc(flowRef, flowData);
      } else {
        await addDoc(collection(db, "users", user.uid, "flows"), {
          ...flowData,
          createdAt: new Date()
        });
      }
      
      setLastSavedState({ nodes, edges });
      
      toast({
        title: "Flow saved",
        description: "Your flow has been saved successfully.",
      });
      
    } catch (error: any) {
      console.error("Error saving flow:", error);
      toast({
        title: "Error",
        description: "Failed to save flow",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestFlow = async () => {
    if (!id || !user?.uid) {
      toast({
        title: "Authentication required",
        description: "Please make sure you're logged in to test flows",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Starting flow execution with user:', user.uid);
    
    setTesting(true);
    setLogs([{
      timestamp: new Date(),
      type: "info",
      message: "🚀 Starting Art Institute API flow execution..."
    }]);
    
    try {
      console.log('Making API call with firebaseId:', user.uid);
      const response = await fetch(`/api/execute-flow/${id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.uid}`
        },
        body: JSON.stringify({
          firebaseId: user.uid,
          nodes: JSON.parse(JSON.stringify(nodes))
        })
      });
      
      if (!response.ok) {
        throw new Error('Flow execution failed');
      }
      
      const result = await response.json();
      
      // Display real API response data in main console
      const newLogs = [];
      
      if (result.responses && result.responses.length > 0) {
        result.responses.forEach((resp: any) => {
          // Add API call success message
          newLogs.push({
            timestamp: new Date(),
            type: "success",
            message: `✅ ${resp.method} ${resp.url} → ${resp.status} ${resp.statusText} (${resp.responseTime}ms)`,
            nodeId: resp.nodeId
          });
          
          // Add the actual API response data (works for ANY API response)
          newLogs.push({
            timestamp: new Date(),
            type: "info",
            message: `🎨 API Response Data:\n${resp.data}`,
            nodeId: resp.nodeId
          });
        });
      }
      
      // Add completion message
      newLogs.push({
        timestamp: new Date(),
        type: "success",
        message: `✅ Flow completed successfully! Execution ID: ${result.execution?.id}`
      });
      
      setLogs(prev => [...prev, ...newLogs]);
      
      // Show extracted details if available (for any structured API response)
      if (result.artworkDetails) {
        setLogs(prev => [...prev, {
          timestamp: new Date(),
          type: "info",
          message: `🎨 Data: "${result.artworkDetails.title}" by ${result.artworkDetails.artist} (${result.artworkDetails.date}) - ${result.artworkDetails.medium}`
        }]);
      }
      
      // Save execution to Firebase for history with full API response data
      try {
        const executionRef = doc(db, "users", user.uid, "executions", result.execution.id.toString());
        await setDoc(executionRef, {
          flowId: id,
          flowName: flowName,
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          nodeCount: nodes.length,
          apiResponse: result.apiResponse || null,
          responseDetails: result.artworkDetails || null,
          executionLogs: logs,
          createdAt: new Date()
        });
        console.log('Execution saved to Firebase with full API response data');
      } catch (error) {
        console.warn('Could not save execution to Firebase:', error);
      }
      
      toast({
        title: "Flow executed successfully",
        description: `Your Art Institute API flow completed successfully!`,
      });
      
    } catch (error: any) {
      console.error('Error executing flow:', error);
      
      setLogs(prev => [...prev, {
        timestamp: new Date(),
        type: "error",
        message: `❌ Flow execution failed: ${error.message}`
      }]);
      
      toast({
        title: "Error",
        description: "Failed to execute flow",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading flow...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-4">
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              placeholder="Flow name"
              className="font-medium"
            />
            {(saving || autoSaving) && (
              <span className="text-xs text-slate-500">
                {saving ? "Saving..." : "Auto-saving..."}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleSaveFlow}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <SaveIcon className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
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
        
        {/* Flow Builder */}
        <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100% - 4rem)' }}>
          <div className="flex-1 relative">
            <FlowBuilder
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              connectors={connectors}
              flowId={id}
            />
          </div>
        </div>
        
        {/* Main Console Panel at Bottom - Your 1000+ line API response will show here */}
        <ResizableConsole
          logs={logs}
          isRunning={testing}
          onRunTest={handleTestFlow}
          flowId={id}
        />
      </div>
    </AppLayout>
  );
}