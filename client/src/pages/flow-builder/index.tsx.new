import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { FlowBuilder } from "@/components/flows/FlowBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIcon, PlayIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LogMessage } from "@/components/flows/ConsoleOutput";
import { ExecutionProgress } from "@/components/flows/ExecutionProgress";
import { apiRequest } from "@/lib/queryClient";

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
  const [testing, setTesting] = useState(false);
  const [testingExecutionId, setTestingExecutionId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  
  // Fetch flow data if id exists, or initialize new flow
  useEffect(() => {
    const fetchFlowData = async () => {
      if (!user) return;
      
      try {
        // Fetch connectors from API
        const connectorsData = await apiRequest('/api/connectors');
        setConnectors(connectorsData || []);
        
        // If editing existing flow
        if (id) {
          try {
            const flowData = await apiRequest(`/api/flows/${id}`);
            
            if (flowData) {
              setFlow(flowData);
              setFlowName(flowData.name || "Untitled Flow");
              setFlowDescription(flowData.description || "");
              
              // Load saved nodes and edges from API
              const savedNodes = Array.isArray(flowData.nodes) ? flowData.nodes : [];
              const savedEdges = Array.isArray(flowData.edges) ? flowData.edges : [];
              
              console.log("Loading initial nodes:", savedNodes);
              console.log("Loading initial edges:", savedEdges);
              
              // Update state
              setNodes(savedNodes);
              setEdges(savedEdges);
            } else {
              toast({
                title: "Flow not found",
                description: "The requested flow does not exist",
                variant: "destructive",
              });
            }
          } catch (error: any) {
            // If we get a 404, the flow doesn't exist
            console.error("Error fetching flow:", error);
            toast({
              title: "Error loading flow",
              description: "Could not load the flow. It may not exist or you don't have permission to access it.",
              variant: "destructive",
            });
          }
        }
      } catch (error: any) {
        toast({
          title: "Error loading data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchFlowData();
  }, [id, user, toast]);
  
  const handleSaveFlow = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const flowData = {
        name: flowName,
        description: flowDescription,
        nodes,
        edges,
      };
      
      if (id && flow) {
        // Update existing flow via API
        await apiRequest(`/api/flows/${id}`, {
          method: 'PUT',
          data: flowData
        });
      } else {
        // Create new flow via API
        const newFlow = await apiRequest('/api/flows', {
          method: 'POST',
          data: flowData
        });
        
        if (newFlow && newFlow.id) {
          // Update URL with new flow ID without refreshing page
          window.history.replaceState(null, '', `/flow-builder/${newFlow.id}`);
          setFlow(newFlow);
        }
      }
      
      toast({
        title: "Flow saved",
        description: "Your flow has been saved successfully",
      });
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
    if (!id || !flow) {
      toast({
        title: "Save flow first",
        description: "Please save your flow before testing",
        variant: "destructive",
      });
      return;
    }
    
    setTesting(true);
    setLogs([{
      timestamp: new Date(),
      type: 'info',
      message: 'Starting flow execution...'
    }]);
    
    try {
      // Start flow execution via API
      const executionData = await apiRequest(`/api/flows/${id}/execute`, {
        method: 'POST',
        data: {} // Empty data for now, but could be test input data
      });
      
      if (executionData && executionData.id) {
        setTestingExecutionId(executionData.id);
        
        setLogs(prev => [
          ...prev,
          {
            timestamp: new Date(),
            type: 'info',
            message: `Flow execution started with ID: ${executionData.id}`
          }
        ]);
      } else {
        throw new Error('Failed to start flow execution');
      }
    } catch (error: any) {
      toast({
        title: "Error testing flow",
        description: error.message,
        variant: "destructive",
      });
      
      setLogs(prev => [
        ...prev,
        {
          timestamp: new Date(),
          type: 'error',
          message: `Error starting flow execution: ${error.message}`
        }
      ]);
      
      setTesting(false);
    }
  };
  
  const handleExecutionComplete = () => {
    setTesting(false);
    setTestingExecutionId(null);
  };
  
  const handleLogsUpdate = (newLogs: LogMessage[]) => {
    setLogs(newLogs);
  };
  
  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="border-b bg-background p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-4 items-center flex-grow">
            <Input
              className="max-w-[240px]"
              placeholder="Flow name"
              value={flowName}
              onChange={e => setFlowName(e.target.value)}
            />
            <Input
              className="max-w-[300px]"
              placeholder="Flow description (optional)"
              value={flowDescription}
              onChange={e => setFlowDescription(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleTestFlow}
              disabled={testing || saving || loading}
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              {testing ? 'Running...' : 'Test'}
            </Button>
            
            <Button 
              onClick={handleSaveFlow}
              disabled={saving || loading}
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-grow grid grid-rows-[1fr_auto] overflow-hidden">
          <div className="overflow-hidden">
            <FlowBuilder
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              connectors={connectors}
              flowId={id}
            />
          </div>
          
          {/* Console output */}
          <div className="h-60 border-t bg-card">
            <ExecutionProgress
              flowId={id || ""}
              executionId={testingExecutionId || undefined}
              onLogsUpdate={handleLogsUpdate}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}