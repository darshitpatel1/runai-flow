import { useState, useEffect } from "react";
import { XIcon, PlayIcon, Code2Icon, Variable } from "lucide-react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VariableSelector } from "./VariableSelector";

interface NodeConfigurationProps {
  node: any;
  updateNodeData: (nodeId: string, newData: any) => void;
  onClose: () => void;
  connectors: any[];
  onTestNode?: (nodeId: string, data: any) => Promise<any>;
}

export function NodeConfiguration({ node, updateNodeData, onClose, connectors, onTestNode }: NodeConfigurationProps) {
  const { toast } = useToast();
  const [nodeData, setNodeData] = useState(node.data);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestResult, setShowTestResult] = useState(false);
  const [isTestingNode, setIsTestingNode] = useState(false);
  const [showVariableDialog, setShowVariableDialog] = useState(false);
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  const [activeInputField, setActiveInputField] = useState<string>("");
  const [transformScript, setTransformScript] = useState("");
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  
  useEffect(() => {
    setNodeData(node.data);
    // Clear test result when switching to a different node
    setTestResult(null);
    setShowTestResult(false);
    setAvailableVariables([]);
  }, [node.id]);

  // Handle resizing functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.7;
      
      setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleChange = (field: string, value: any) => {
    setNodeData({ ...nodeData, [field]: value });
  };
  
  // Function to get existing variables from all SetVariable nodes and tested HTTP nodes
  const getExistingVariables = () => {
    try {
      // Make sure we have allNodes data before attempting to use it
      if (!node?.data?.allNodes || !Array.isArray(node.data.allNodes)) {
        console.log("No allNodes data available");
        return [];
      }
      
      const variables: string[] = [];
      
      // Add variables from tested HTTP nodes
      node.data.allNodes.forEach((n: any) => {
        if (n.type === 'httpRequest' && n.data?.testResult) {
          const testVariables = generateVariablePaths(n.data.testResult, `${n.id}.result`);
          variables.push(...testVariables);
        }
        if (n.data?.variables && Array.isArray(n.data.variables)) {
          variables.push(...n.data.variables);
        }
      });
      
      // Find all SetVariable nodes and collect their variable keys
      node.data.allNodes.forEach((n: any) => {
        if (n && n.type === 'setVariable' && n.data?.variableKey && n.id !== node.id) {
          variables.push(n.data.variableKey);
        }
      });
      
      return variables;
    } catch (error) {
      console.error("Failed to get existing variables", error);
      return [];
    }
  };

  const handleApplyChanges = () => {
    // For SetVariable node, handle new variable creation
    if (node.type === 'setVariable') {
      const updatedData = { ...nodeData };
      
      // Handle the special "__new__" value and use the newVariableKey instead
      if (updatedData.variableKey === "__new__" && updatedData.newVariableKey) {
        updatedData.variableKey = updatedData.newVariableKey;
        delete updatedData.newVariableKey;
      } 
      // Backward compatibility for older implementation
      else if (!updatedData.variableKey && updatedData.newVariableKey) {
        updatedData.variableKey = updatedData.newVariableKey;
        delete updatedData.newVariableKey;
      }
      
      // Validate the variable key
      if (!updatedData.variableKey || updatedData.variableKey === "__new__") {
        toast({
          title: "Invalid Variable Name",
          description: "Please enter a name for your variable.",
          variant: "destructive"
        });
        return;
      }
      
      updateNodeData(node.id, updatedData);
    } else {
      // For other node types, just apply the changes directly
      updateNodeData(node.id, nodeData);
    }
  };
  
  const handleTestNode = async () => {
    if (node.type !== 'httpRequest') {
      toast({
        title: "Test functionality not available",
        description: "Only HTTP nodes can be tested individually.",
        variant: "destructive",
      });
      return;
    }
    
    if (!nodeData.endpoint && !nodeData.url) {
      toast({
        title: "Missing Configuration",
        description: "Please configure the URL before testing this node.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsTestingNode(true);
      updateNodeData(node.id, nodeData);
      
      const url = nodeData.endpoint || nodeData.url;
      const method = nodeData.method || 'GET';
      
      console.log(`🧪 Testing HTTP node: ${method} ${url}`);
      
      // Get Firebase auth token for authenticated request
      const token = await auth.currentUser?.getIdToken();
      
      // Call the new test-node endpoint for real API responses
      const response = await fetch('/api/test-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          url: url,
          method: method,
          headers: nodeData.headers || {},
          body: nodeData.body || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Node test result:', result);
      
      // Set the actual API response data
      setTestResult(result.data);
      setShowTestResult(true);
      
      // Generate variables from the real response with node prefix
      if (result.data && typeof result.data === 'object') {
        const variables = generateVariablePaths(result.data, `${node.id}.result`);
        setAvailableVariables(variables);
        
        // Also update the node data with test results for variable access
        const updatedNodeData = {
          ...nodeData,
          testResult: result.data,
          variables: variables,
          // Store raw test data for previews
          _rawTestData: result.data
        };
        updateNodeData(node.id, updatedNodeData);
        
        console.log('✅ Generated variables:', variables);
        console.log('✅ Test result stored:', result.data);
      }
      
      toast({
        title: "Node Test Complete",
        description: `Got real API response! ${result.status} ${result.statusText} (${result.responseTime}ms)`,
      });
    } catch (error: any) {
      console.error('❌ Node test failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || "An error occurred while testing the node",
        variant: "destructive",
      });
    } finally {
      setIsTestingNode(false);
    }
  };
  
  // Helper function to generate dot notation paths for all properties in an object
  const generateVariablePaths = (obj: any, prefix = ""): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    let paths: string[] = [];
    
    const traverse = (current: any, path: string, depth = 0) => {
      if (depth > 3) return; // Limit depth to prevent too many variables
      
      if (current === null || current === undefined) {
        paths.push(`{{${path}}}`);
        return;
      }
      
      if (Array.isArray(current)) {
        paths.push(`{{${path}}}`); // Add the array itself
        paths.push(`{{${path}.length}}`); // Add length property
        
        if (current.length > 0) {
          paths.push(`{{${path}[0]}}`); // Add first item access
          
          // If first item is object, add its useful properties
          if (typeof current[0] === 'object' && current[0] !== null) {
            const keys = Object.keys(current[0]).slice(0, 8); // Limit to 8 properties
            keys.forEach(key => {
              const value = current[0][key];
              if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                paths.push(`{{${path}[0].${key}}}`);
              }
            });
          }
        }
      } else if (typeof current === 'object') {
        if (path) paths.push(`{{${path}}}`); // Add the object itself
        
        // Add useful scalar properties
        Object.keys(current).slice(0, 15).forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          const value = current[key];
          
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            paths.push(`{{${newPath}}}`);
          } else if (value !== null && typeof value === 'object') {
            traverse(value, newPath, depth + 1);
          }
        });
      } else {
        paths.push(`{{${path}}}`);
      }
    };
    
    traverse(obj, prefix);
    
    // Remove duplicates and return limited set
    return Array.from(new Set(paths)).slice(0, 25);
  };
  
  // Render different configuration fields based on node type
  const renderConfigFields = () => {
    switch (node.type) {
      case 'httpRequest':
        return renderHttpRequestConfig();
      case 'ifElse':
        return renderIfElseConfig();
      case 'loop':
        return renderLoopConfig();
      case 'setVariable':
        return renderSetVariableConfig();
      case 'log':
        return renderLogConfig();
      case 'delay':
        return renderDelayConfig();
      case 'stopJob':
        return renderStopJobConfig();
      default:
        return <p>No configuration available for this node type.</p>;
    }
  };
  
  const renderHttpRequestConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="HTTP Request"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Connector</Label>
          <Select 
            value={nodeData.connector || ''} 
            onValueChange={(value) => handleChange('connector', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a connector" />
            </SelectTrigger>
            <SelectContent>
              {connectors.map((connector) => (
                <SelectItem key={connector.id} value={connector.name}>
                  {connector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">HTTP Method</Label>
          <div className="flex flex-wrap gap-2">
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((method) => (
              <Button
                key={method}
                type="button"
                variant={nodeData.method === method ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChange('method', method)}
              >
                {method}
              </Button>
            ))}
          </div>
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Endpoint Path</Label>
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={nodeData.endpoint || ''}
                onChange={(e) => handleChange('endpoint', e.target.value)}
                placeholder="api/resource/{{id}}"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleOpenVariableSelector('endpoint')}
                className="flex-shrink-0"
              >
                <Variable className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Variables like <code>{"{{stepX.result.id}}"}</code> will be replaced at runtime
            </p>
          </div>
        </div>
        
        {/* Body configuration for methods that support it */}
        {(nodeData.method === 'POST' || nodeData.method === 'PUT' || nodeData.method === 'PATCH') && (
          <div>
            <Label className="block text-sm font-medium mb-1">Request Body</Label>
            <div className="relative">
              <Textarea
                value={nodeData.body || ''}
                onChange={(e) => handleChange('body', e.target.value)}
                placeholder='{"key": "value", "dynamic": "{{step1.result.id}}"}'
                className="font-mono text-sm h-24 pr-10"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleOpenVariableSelector('body')}
                className="absolute bottom-2 right-2"
              >
                <Variable className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Query parameters for methods that typically use them */}
        {(nodeData.method === 'GET' || nodeData.method === 'DELETE') && (
          <div>
            <Label className="block text-sm font-medium mb-1">Query Parameters</Label>
            <div className="space-y-2">
              {(nodeData.queryParams || []).map((param: any, index: number) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => {
                      const newParams = [...(nodeData.queryParams || [])];
                      newParams[index].key = e.target.value;
                      handleChange('queryParams', newParams);
                    }}
                  />
                  <div className="relative flex-1">
                    <Input
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => {
                        const newParams = [...(nodeData.queryParams || [])];
                        newParams[index].value = e.target.value;
                        handleChange('queryParams', newParams);
                      }}
                      className="pr-10"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        // Store the current index to update the correct parameter
                        setActiveInputField(`queryParams-${index}`);
                        setShowVariableSelector(true);
                      }}
                      className="absolute top-0 right-0 h-full"
                    >
                      <Variable className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      const newParams = [...(nodeData.queryParams || [])];
                      newParams.splice(index, 1);
                      handleChange('queryParams', newParams);
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newParams = [...(nodeData.queryParams || []), { key: '', value: '' }];
                  handleChange('queryParams', newParams);
                }}
              >
                + Add Parameter
              </Button>
            </div>
          </div>
        )}
        
        <div>
          <Label className="block text-sm font-medium mb-1">Response Handling</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="parse-json"
                checked={nodeData.parseJson !== false}
                onCheckedChange={(checked) => handleChange('parseJson', checked)}
              />
              <Label htmlFor="parse-json">Automatically parse JSON response</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="fail-on-error"
                checked={nodeData.failOnError !== false}
                onCheckedChange={(checked) => handleChange('failOnError', checked)}
              />
              <Label htmlFor="fail-on-error">Fail flow on HTTP error (4xx, 5xx)</Label>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderIfElseConfig = () => {
    const useVisualEditor = !nodeData.condition; // Use visual editor by default if no condition is set
    
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="IF/ELSE Condition"
          />
        </div>
        
        <Tabs defaultValue={useVisualEditor ? "visual" : "code"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual Editor</TabsTrigger>
            <TabsTrigger value="code">Code Editor</TabsTrigger>
          </TabsList>
          
          <TabsContent value="visual" className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">Variable</Label>
              <div className="flex gap-2">
                <Input
                  value={nodeData.variable || ''}
                  onChange={(e) => handleChange('variable', e.target.value)}
                  placeholder="response.data.status"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleOpenVariableSelector('variable')}
                  className="flex-shrink-0"
                >
                  <Variable className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter a variable name from previous steps
              </p>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">Operator</Label>
              <Select 
                value={nodeData.operator || 'equals'} 
                onValueChange={(value) => handleChange('operator', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals (==)</SelectItem>
                  <SelectItem value="notEquals">Not Equals (!=)</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="notContains">Does Not Contain</SelectItem>
                  <SelectItem value="greaterThan">Greater Than (&gt;)</SelectItem>
                  <SelectItem value="lessThan">Less Than (&lt;)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">Value</Label>
              <div className="flex gap-2">
                <Input
                  value={nodeData.value || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  placeholder="success"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleOpenVariableSelector('value')}
                  className="flex-shrink-0"
                >
                  <Variable className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">Condition</Label>
              <div className="relative">
                <Textarea
                  value={nodeData.condition || ''}
                  onChange={(e) => handleChange('condition', e.target.value)}
                  placeholder="{{step1.status}} === 200"
                  className="font-mono text-sm h-20 pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleOpenVariableSelector('condition')}
                  className="absolute bottom-2 right-2"
                >
                  <Variable className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter a JavaScript condition using variables from previous steps
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="bg-muted/50 dark:bg-black dark:border dark:border-slate-800 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-2">Condition Help</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Examples:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><code>{"{{step1.status}} === 200"}</code> - Check if HTTP status is 200</li>
              <li><code>{"{{step1.body.user.active}} === true"}</code> - Check if user is active</li>
              <li><code>{"{{step1.body.items.length}} > 0"}</code> - Check if items array is not empty</li>
              <li><code>{"{{response.body}}.includes('success')"}</code> - Check if response body contains 'success'</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };
  
  const renderLoopConfig = () => {
    const isWhileLoop = nodeData.loopType === 'while';
    const isForEachLoop = !nodeData.loopType || nodeData.loopType === 'forEach';
    
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Loop"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="block text-sm font-medium">Loop Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={isForEachLoop ? "default" : "outline"}
              className={`justify-start text-xs whitespace-normal h-auto py-2 ${isForEachLoop ? 'bg-green-500 hover:bg-green-600' : ''}`}
              onClick={() => handleChange('loopType', 'forEach')}
            >
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>For Each Item</span>
            </Button>
            <Button
              type="button"
              variant={isWhileLoop ? "default" : "outline"}
              className={`justify-start text-xs whitespace-normal h-auto py-2 ${isWhileLoop ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              onClick={() => handleChange('loopType', 'while')}
            >
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
              <span>While Condition</span>
            </Button>
          </div>
        </div>
        
        {isForEachLoop && (
          <div>
            <Label className="block text-sm font-medium mb-1">Array Path</Label>
            <div className="flex gap-2">
              <Input
                value={nodeData.arrayPath || ''}
                onChange={(e) => handleChange('arrayPath', e.target.value)}
                placeholder="{{step1.body.items}}"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleOpenVariableSelector('arrayPath')}
                className="flex-shrink-0"
              >
                <Variable className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the path to the array you want to iterate
            </p>
            
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 dark:border dark:border-green-800 rounded-md overflow-hidden">
              <h4 className="text-xs font-medium mb-1">Common Array Paths from HTTP Responses:</h4>
              <ul className="text-xs space-y-1 pl-4 list-disc">
                <li className="break-words">
                  <code className="break-all">{"{{step1.body.data}}"}</code> - For APIs that return <code>{"{data: [...]}"}</code>
                </li>
                <li className="break-words">
                  <code className="break-all">{"{{step1.body.results}}"}</code> - For APIs that return <code>{"{results: [...]}"}</code>
                </li>
                <li className="break-words">
                  <code className="break-all">{"{{step1.body.items}}"}</code> - For APIs that return <code>{"{items: [...]}"}</code>
                </li>
                <li className="break-words">
                  <code className="break-all">{"{{step1.body}}"}</code> - For APIs that return arrays directly
                </li>
              </ul>
              <div className="mt-2 text-xs">
                <span className="font-medium">Tip:</span> Test your HTTP requests first to see the response structure
              </div>
            </div>
          </div>
        )}
        
        {isForEachLoop && (
          <div>
            <Label className="block text-sm font-medium mb-1">Batch Size</Label>
            <Input
              type="number"
              min="0"
              value={nodeData.batchSize || ''}
              onChange={(e) => handleChange('batchSize', parseInt(e.target.value) || 0)}
              placeholder="Process items in batches (0 for all at once)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Process multiple items at once (0 = all items, 1 = one by one)
            </p>
            
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 dark:border dark:border-blue-800 rounded-md overflow-hidden">
              <h4 className="text-xs font-medium mb-1">Batch Processing Guide:</h4>
              <ul className="text-xs space-y-1 pl-4 list-disc">
                <li className="break-words"><strong>0</strong>: Process all items at once in a single iteration</li>
                <li className="break-words"><strong>1</strong>: Process one item at a time (traditional loop)</li>
                <li className="break-words"><strong>N</strong>: Process N items in each iteration, useful for rate limiting</li>
              </ul>
              <div className="mt-2 text-xs break-words">
                <span className="font-medium">Example:</span> With batch size 10 and 100 items, 
                the loop will run 10 times with 10 items per batch
              </div>
            </div>
          </div>
        )}
        
        {isWhileLoop && (
          <div>
            <Label className="block text-sm font-medium mb-1">While Condition</Label>
            <div className="flex gap-2">
              <Input
                value={nodeData.conditionExpression || ''}
                onChange={(e) => handleChange('conditionExpression', e.target.value)}
                placeholder="{{counter}} < 10"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleOpenVariableSelector('conditionExpression')}
                className="flex-shrink-0"
              >
                <Variable className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the condition that must be true for the loop to continue
            </p>
            
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 dark:border dark:border-amber-800 rounded-md overflow-hidden">
              <h4 className="text-xs font-medium mb-1">Condition Examples:</h4>
              <ul className="text-xs space-y-1 pl-4 list-disc">
                <li className="break-words">
                  <code className="break-all">{"{{vars.counter}} < 10"}</code> - Repeat until counter reaches 10
                </li>
                <li className="break-words">
                  <code className="break-all">{"{{vars.hasMorePages}} === true"}</code> - Continue while a flag is true
                </li>
                <li className="break-words">
                  <code className="break-all">{"{{vars.items.length}} > 0"}</code> - Process while items remain
                </li>
                <li className="break-words">
                  <code className="break-all">{"{{loop.iteration}} < 5"}</code> - Maximum 5 iterations
                </li>
              </ul>
              <div className="mt-2 text-xs break-words">
                <span className="font-medium">Tip:</span> Set up a counter variable before the loop,
                and increment it inside the loop to control iterations
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-muted/50 rounded-lg p-3 overflow-hidden">
          <h3 className="text-sm font-medium mb-2">Loop Variable Access</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Inside the loop, you can access:</p>
            {isForEachLoop ? (
              <ul className="list-disc pl-4 space-y-1">
                <li className="break-words"><code className="break-all">{"{{loop.item}}"}</code> - Current item in the array</li>
                <li className="break-words"><code className="break-all">{"{{loop.index}}"}</code> - Current index (0-based)</li>
                <li className="break-words"><code className="break-all">{"{{loop.number}}"}</code> - Current iteration (1-based)</li>
                {nodeData.batchSize && nodeData.batchSize > 0 && (
                  <li className="break-words"><code className="break-all">{"{{loop.batch}}"}</code> - Current batch of items</li>
                )}
              </ul>
            ) : (
              <ul className="list-disc pl-4 space-y-1">
                <li className="break-words"><code className="break-all">{"{{loop.iteration}}"}</code> - Current iteration count</li>
                <li className="break-words"><code className="break-all">{"{{loop.startTime}}"}</code> - When the loop started</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderSetVariableConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Set Variable"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Variable Key</Label>
          <div className="space-y-2">
            <Select
              value={nodeData.variableKey || ''}
              onValueChange={(value) => handleChange('variableKey', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select or create variable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">Create new variable</SelectItem>
                {/* Show existing variables from other SetVariable nodes with error handling */}
                {(() => {
                  try {
                    const vars = getExistingVariables();
                    return Array.isArray(vars) ? vars.map((variable) => (
                      <SelectItem key={variable} value={variable}>
                        {variable}
                      </SelectItem>
                    )) : null;
                  } catch (error) {
                    console.error("Error rendering variable options:", error);
                    return null;
                  }
                })()}
              </SelectContent>
            </Select>
            
            {nodeData.variableKey === "__new__" && (
              <Input
                value={nodeData.newVariableKey || ''}
                onChange={(e) => handleChange('newVariableKey', e.target.value)}
                placeholder="Enter new variable name"
              />
            )}
          </div>
        </div>
        
        <Tabs defaultValue={nodeData.useTransform ? "transform" : "simple"} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="simple"
              onClick={() => handleChange('useTransform', false)}
            >
              Simple Value
            </TabsTrigger>
            <TabsTrigger 
              value="transform"
              onClick={() => handleChange('useTransform', true)}
            >
              Transform
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="simple" className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">Variable Value</Label>
              <div className="relative">
                <Textarea
                  value={nodeData.variableValue || ''}
                  onChange={(e) => handleChange('variableValue', e.target.value)}
                  placeholder="{{step1.body.data}} or static value"
                  className="font-mono text-sm h-20 pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleOpenVariableSelector('variableValue')}
                  className="absolute bottom-2 right-2"
                >
                  <Variable className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You can use static values or dynamic values from previous steps
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="transform" className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">Source Variable Path</Label>
              <div className="flex gap-2">
                <Input
                  value={nodeData.variableValue || ''}
                  onChange={(e) => handleChange('variableValue', e.target.value)}
                  placeholder="step1.body.data"
                  className="font-mono text-sm flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleOpenVariableSelector('variableValue')}
                  className="flex-shrink-0"
                >
                  <Variable className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reference the source data to transform
              </p>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-1">Transform Script</Label>
              <Textarea
                value={nodeData.transformScript || ''}
                onChange={(e) => handleChange('transformScript', e.target.value)}
                placeholder="// Transform the source data with JavaScript
// Example: Filter an array
const sourceData = source;
if (Array.isArray(sourceData)) {
  return sourceData.filter(item => item.active === true);
}
// Or calculate a value
return sourceData * 2;"
                className="font-mono text-sm h-40"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Write JavaScript code to transform the source data. 
                The source data is available as <code>source</code>.
                Return the transformed value.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-2">Access this variable</h3>
          <p className="text-xs text-muted-foreground">
            In later steps, use: <code>{"{{vars." + (nodeData.variableKey || "VARIABLE_NAME") + "}}"}</code>
          </p>
        </div>
      </div>
    );
  };
  
  const renderLogConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Log Message"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Log Level</Label>
          <Select 
            value={nodeData.logLevel || 'info'} 
            onValueChange={(value) => handleChange('logLevel', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select log level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Message</Label>
          <div className="relative">
            <Textarea
              value={nodeData.message || ''}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="Processing order: {order_id}"
              className="font-mono text-sm h-20 pr-10"
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleOpenVariableSelector('message')}
              className="absolute bottom-2 right-2"
            >
              <Variable className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You can include dynamic values with curly braces, e.g., {'{'}variable{'}'}
          </p>
        </div>
      </div>
    );
  };
  
  const renderDelayConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Delay"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Delay Type</Label>
          <Tabs
            value={nodeData.delayType || 'seconds'}
            onValueChange={(value) => handleChange('delayType', value)}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="seconds">Time Delay</TabsTrigger>
              <TabsTrigger value="cron">CRON Schedule</TabsTrigger>
            </TabsList>
            
            <TabsContent value="seconds" className="space-y-4 pt-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="block text-sm font-medium mb-1">Delay Amount</Label>
                  <Input
                    type="number"
                    min="1"
                    value={nodeData.delayAmount || ''}
                    onChange={(e) => handleChange('delayAmount', e.target.value)}
                  />
                </div>
                <div className="w-1/3">
                  <Select 
                    value={nodeData.delayUnit || 'seconds'} 
                    onValueChange={(value) => handleChange('delayUnit', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Flow execution will pause for the specified duration
              </p>
            </TabsContent>
            
            <TabsContent value="cron" className="space-y-4 pt-4">
              <div>
                <Label className="block text-sm font-medium mb-1">CRON Expression</Label>
                <Input
                  value={nodeData.cronExpression || ''}
                  onChange={(e) => handleChange('cronExpression', e.target.value)}
                  placeholder="0 0 * * *"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Standard CRON syntax (e.g., <code>0 0 * * *</code> for daily at midnight)
                </p>
              </div>
              <Card className="p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Note: CRON schedules use Firebase Cloud Scheduler and will trigger the flow at the specified times.
                </p>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }
  
  const renderStopJobConfig = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label className="block text-sm font-medium mb-1">Node Name</Label>
          <Input
            value={nodeData.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Stop Job"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Stop Type</Label>
          <RadioGroup 
            value={nodeData.stopType || 'success'} 
            onValueChange={(value) => handleChange('stopType', value)}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="success" id="stop-success" />
              <Label htmlFor="stop-success" className="cursor-pointer flex items-center">
                <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-0.5 rounded ml-1">
                  Success
                </span>
                <span className="ml-2 text-sm">Stop with successful completion</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="error" id="stop-error" />
              <Label htmlFor="stop-error" className="cursor-pointer flex items-center">
                <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs px-2 py-0.5 rounded ml-1">
                  Error
                </span>
                <span className="ml-2 text-sm">Stop with error</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        {nodeData.stopType === 'error' && (
          <div>
            <Label className="block text-sm font-medium mb-1">Error Message</Label>
            <div className="flex gap-2">
              <Textarea
                value={nodeData.errorMessage || ''}
                onChange={(e) => handleChange('errorMessage', e.target.value)}
                placeholder="Process stopped due to invalid data"
                className="flex-1 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={nodeData.errorVariable || ''}
                onChange={(e) => handleChange('errorVariable', e.target.value)}
                placeholder="{{vars.errorReason}}"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => handleOpenVariableSelector('errorVariable')}
                className="flex-shrink-0"
              >
                <Variable className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Use a variable for the error message
            </p>
          </div>
        )}
        
        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-md p-3 mt-4">
          <h3 className="text-sm font-medium mb-1 text-amber-800 dark:text-amber-300">Important</h3>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            When this node is reached, job execution will stop immediately. No downstream nodes will be executed.
            {nodeData.stopType === 'error' 
              ? ' The job will be marked as failed with the specified error message.' 
              : ' The job will be marked as completed successfully.'}
          </p>
        </div>
      </div>
    );
  };
  
  // Function to handle variable transformation through JavaScript
  const applyTransformation = () => {
    if (!testResult) return;
    
    try {
      // Create a safe function from the transform script
      const transformFn = new Function('data', `
        try {
          ${transformScript}
          return data;
        } catch (error) {
          console.error("Transform error:", error);
          return null;
        }
      `);
      
      // Execute the transformation
      const transformedResult = transformFn(testResult);
      
      if (transformedResult) {
        // Update the test result with the transformed data
        setTestResult(transformedResult);
        
        // Regenerate variable paths based on the new structure
        const variables = generateVariablePaths(transformedResult);
        setAvailableVariables(variables);
        
        toast({
          title: "Transformation Applied",
          description: "The data has been transformed successfully.",
        });
      } else {
        toast({
          title: "Transformation Failed",
          description: "The transformation script returned null or undefined.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Transformation Error",
        description: error.message || "An error occurred in the transformation script",
        variant: "destructive",
      });
    }
  };
  
  // Handle creating a new variable from the test result
  const createVariable = (path: string) => {
    // Create a set variable node using this value
    const variableName = path.split('.').pop() || 'result';
    const variableValue = `{{${node.id}.result.${path}}}`;
    
    toast({
      title: "Variable Reference Copied",
      description: `Use "${variableValue}" in downstream nodes.`,
    });
    
    // If we're already in a set variable node, we can auto-populate it
    if (node.type === 'setVariable') {
      handleChange('variableKey', variableName);
      handleChange('variableValue', `${node.id}.result.${path}`); // Reference path to the test result
    }
    
    // Close the dialog
    setShowVariableDialog(false);
  };
  
  // Handle selecting a variable from the variable selector
  const handleOpenVariableSelector = (fieldName: string) => {
    setActiveInputField(fieldName);
    setShowVariableSelector(true);
  };
  
  const handleSelectVariable = (variablePath: string) => {
    if (activeInputField) {
      // Check if this is a query param field
      if (activeInputField.startsWith('queryParams-')) {
        const index = parseInt(activeInputField.split('-')[1]);
        const newParams = [...(nodeData.queryParams || [])];
        
        // Update the value at the specific index
        if (newParams[index]) {
          newParams[index].value = variablePath;
          handleChange('queryParams', newParams);
        }
      } else {
        // Regular field update
        handleChange(activeInputField, variablePath);
      }
    }
    setShowVariableSelector(false);
  };
  
  return (
    <div 
      className="border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex flex-col relative"
      style={{ width: sidebarWidth }}
    >
      {/* Drag handle for resizing */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 hover:w-1.5 transition-all duration-150 z-10"
        onMouseDown={handleResizeStart}
        style={{ backgroundColor: isDragging ? '#3b82f6' : 'transparent' }}
      />
      
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-medium">Configure Node</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="dark:hover:bg-slate-800">
          <XIcon className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 dark:bg-black">
        {/* Tab interface for configuration and testing */}
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="config">Configure</TabsTrigger>
            <TabsTrigger value="test">Test & Variables</TabsTrigger>
          </TabsList>
          
          <TabsContent value="config">
            {renderConfigFields()}
          </TabsContent>
          
          <TabsContent value="test">
            <div className="space-y-4">
              <div>
                <Button 
                  className="w-full flex items-center justify-center gap-2" 
                  onClick={handleTestNode}
                  disabled={isTestingNode}
                >
                  {isTestingNode ? (
                    <>Testing...</>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4" />
                      Test This Node
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Test this node in isolation and use the result to create variables for downstream nodes.
                </p>
              </div>
              
              {testResult && (
                <>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3">
                    <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
                      <span>Test Result</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => setShowVariableDialog(true)}
                      >
                        View Variables
                      </Button>
                    </h3>
                    <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded overflow-x-auto overflow-y-auto max-h-40 whitespace-pre-wrap break-all">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-3 my-2">
                    <h3 className="text-sm font-medium mb-1 text-blue-800 dark:text-blue-300">Using this result in other nodes</h3>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">
                      The test result is now saved and available to downstream nodes using:
                    </p>
                    <pre className="text-xs bg-white dark:bg-slate-900 p-2 rounded mb-2 font-mono whitespace-pre-wrap break-all">
                      {`{{${node.id}.result.[path]}}`}
                    </pre>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      For example: <code className="break-all whitespace-pre-wrap">{`{{${node.id}.result.data.items[0].id}}`}</code>
                    </p>
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium mb-1">Transform Data with JavaScript</Label>
                    <div className="relative">
                      <Textarea
                        value={transformScript}
                        onChange={(e) => setTransformScript(e.target.value)}
                        placeholder="// Example: Add a computed field based on the response
data.computedField = data.someValue * 2;
// Or filter an array
if (data.items) {
  data.items = data.items.filter(item => item.status === 'active');
}"
                        className="font-mono text-xs h-32 pr-10"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenVariableSelector('transformScript')}
                        className="absolute bottom-2 right-2"
                      >
                        <Variable className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use JavaScript to transform the response data. The original data is available as <code>data</code>.
                    </p>
                    <Button 
                      onClick={applyTransformation} 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 flex items-center gap-1"
                    >
                      <Code2Icon className="h-3 w-3" />
                      Apply Transformation
                    </Button>
                  </div>
                </>
              )}
              
              {/* Only show previous test result for the current node (not from other nodes) */}
              {!testResult && node.data.testResult && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
                    <span>Previous Test Result Available</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    This node has been tested before. The test result is saved and available to downstream nodes.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-2">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-mono break-all">
                      {`{{${node.id}.result.[path]}}`}
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      // Clear any previous test results first
                      setTestResult(null);
                      setAvailableVariables([]);
                      
                      // Then set the current node's test result
                      setTimeout(() => {
                        setTestResult(node.data.testResult);
                        if (node.data.testResult && typeof node.data.testResult === 'object') {
                          const variables = generateVariablePaths(node.data.testResult);
                          setAvailableVariables(variables);
                        }
                      }, 50);
                    }} 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 w-full"
                  >
                    View Previous Test Result
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Button 
          className="w-full"
          onClick={handleApplyChanges}
        >
          Apply Changes
        </Button>
      </div>
      
      {/* Variable list dialog */}
      <Dialog open={showVariableDialog} onOpenChange={setShowVariableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Available Variables</DialogTitle>
            <DialogDescription>
              Click on a variable path to use it in downstream nodes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-80 overflow-y-auto">
            {availableVariables.length > 0 ? (
              <div className="space-y-1">
                {availableVariables.map((path) => (
                  <div
                    key={path}
                    className="flex items-center justify-between p-2 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    onClick={() => createVariable(path)}
                  >
                    <code className="font-mono">{path}</code>
                    <Button size="sm" variant="ghost" className="h-6">
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center text-muted-foreground py-4">
                No variables available. Run a test to generate variables.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Only render the variable selector when shown to avoid ReactFlow context issues */}
      {showVariableSelector && (
        <VariableSelector 
          open={showVariableSelector} 
          onClose={() => setShowVariableSelector(false)} 
          onSelectVariable={handleSelectVariable}
          // Pass the current node being configured as a special property
          currentNodeId={node.id}
          // If we're outside the FlowBuilder context, we need to pass nodes manually
          manualNodes={node?.data?.allNodes || [node]} 
        />
      )}
    </div>
  );
}
