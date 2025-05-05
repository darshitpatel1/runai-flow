import { useState, useEffect } from "react";
import { XIcon, PlayIcon, Code2Icon, Variable } from "lucide-react";
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
  
  useEffect(() => {
    setNodeData(node.data);
  }, [node]);
  
  const handleChange = (field: string, value: any) => {
    setNodeData({ ...nodeData, [field]: value });
  };
  
  // Function to get existing variables from all SetVariable nodes
  const getExistingVariables = () => {
    try {
      // Make sure we have allNodes data before attempting to use it
      if (!node?.data?.allNodes || !Array.isArray(node.data.allNodes)) {
        console.log("No allNodes data available");
        return [];
      }
      
      // Find all SetVariable nodes and collect their variable keys
      const variables: string[] = [];
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
      
      // If the user is creating a new variable
      if (!updatedData.variableKey && updatedData.newVariableKey) {
        updatedData.variableKey = updatedData.newVariableKey;
        delete updatedData.newVariableKey;
      }
      
      updateNodeData(node.id, updatedData);
    } else {
      // For other node types, just apply the changes directly
      updateNodeData(node.id, nodeData);
    }
  };
  
  const handleTestNode = async () => {
    if (!onTestNode) {
      toast({
        title: "Test functionality not available",
        description: "Please save the flow first to enable node testing.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsTestingNode(true);
      // Apply any unsaved changes before testing
      updateNodeData(node.id, nodeData);
      
      // Run the test
      const result = await onTestNode(node.id, nodeData);
      setTestResult(result);
      setShowTestResult(true);
      
      // Automatically generate a list of available variables from the result
      if (result && typeof result === 'object') {
        const variables = generateVariablePaths(result);
        setAvailableVariables(variables);
      }
      
      toast({
        title: "Node Test Complete",
        description: "Test completed successfully. View the result and create variables.",
      });
    } catch (error: any) {
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
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        paths.push(newPrefix);
        
        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          paths = [...paths, ...generateVariablePaths(obj[key], newPrefix)];
        }
        
        // Handle arrays specifically
        if (Array.isArray(obj[key])) {
          paths.push(`${newPrefix}.length`);
          
          // Add paths for the first few array items as examples
          if (obj[key].length > 0) {
            paths.push(`${newPrefix}[0]`);
            
            // If the first item is an object, also include its paths
            if (typeof obj[key][0] === 'object' && obj[key][0] !== null) {
              const itemPaths = generateVariablePaths(obj[key][0], `${newPrefix}[0]`);
              paths = [...paths, ...itemPaths];
            }
          }
        }
      }
    }
    
    return paths;
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
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-2">Loop Variable Access</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Inside the loop, you can access:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><code>{"{{loop.item}}"}</code> - Current item in the array</li>
              <li><code>{"{{loop.index}}"}</code> - Current index (0-based)</li>
              <li><code>{"{{loop.number}}"}</code> - Current iteration (1-based)</li>
            </ul>
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
                <SelectItem value="">Create new variable</SelectItem>
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
            
            {!nodeData.variableKey && (
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
    <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex flex-col">
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
              
              {!testResult && node.data.testResult && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center justify-between">
                    <span>Previous Test Result Available</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    This node has been tested before. The test result is saved and available to downstream nodes.
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md p-2">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-mono">
                      {`{{${node.id}.result.[path]}}`}
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setTestResult(node.data.testResult);
                      if (node.data.testResult && typeof node.data.testResult === 'object') {
                        const variables = generateVariablePaths(node.data.testResult);
                        setAvailableVariables(variables);
                      }
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
          // If we're outside the FlowBuilder context, we need to pass nodes manually
          manualNodes={[node]} // Just include the current node for safety
        />
      )}
    </div>
  );
}
