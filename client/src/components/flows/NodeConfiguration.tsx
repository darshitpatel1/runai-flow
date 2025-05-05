import { useState, useEffect } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";

interface NodeConfigurationProps {
  node: any;
  updateNodeData: (nodeId: string, newData: any) => void;
  onClose: () => void;
  connectors: any[];
}

export function NodeConfiguration({ node, updateNodeData, onClose, connectors }: NodeConfigurationProps) {
  const [nodeData, setNodeData] = useState(node.data);
  
  useEffect(() => {
    setNodeData(node.data);
  }, [node]);
  
  const handleChange = (field: string, value: any) => {
    setNodeData({ ...nodeData, [field]: value });
  };
  
  const handleApplyChanges = () => {
    updateNodeData(node.id, nodeData);
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
            <Input
              value={nodeData.endpoint || ''}
              onChange={(e) => handleChange('endpoint', e.target.value)}
              placeholder="api/resource/{{id}}"
            />
            <p className="text-xs text-muted-foreground">
              Variables like <code>{"{{stepX.result.id}}"}</code> will be replaced at runtime
            </p>
          </div>
        </div>
        
        {/* Body configuration for methods that support it */}
        {(nodeData.method === 'POST' || nodeData.method === 'PUT' || nodeData.method === 'PATCH') && (
          <div>
            <Label className="block text-sm font-medium mb-1">Request Body</Label>
            <Textarea
              value={nodeData.body || ''}
              onChange={(e) => handleChange('body', e.target.value)}
              placeholder='{"key": "value", "dynamic": "{{step1.result.id}}"}'
              className="font-mono text-sm h-24"
            />
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
                  <Input
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => {
                      const newParams = [...(nodeData.queryParams || [])];
                      newParams[index].value = e.target.value;
                      handleChange('queryParams', newParams);
                    }}
                  />
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
              <Input
                value={nodeData.variable || ''}
                onChange={(e) => handleChange('variable', e.target.value)}
                placeholder="response.data.status"
              />
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
              <Input
                value={nodeData.value || ''}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="success"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="code" className="space-y-4 mt-2">
            <div>
              <Label className="block text-sm font-medium mb-1">Condition</Label>
              <Textarea
                value={nodeData.condition || ''}
                onChange={(e) => handleChange('condition', e.target.value)}
                placeholder="{{step1.status}} === 200"
                className="font-mono text-sm h-20"
              />
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
          <Input
            value={nodeData.arrayPath || ''}
            onChange={(e) => handleChange('arrayPath', e.target.value)}
            placeholder="{{step1.body.items}}"
          />
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
          <Input
            value={nodeData.variableKey || ''}
            onChange={(e) => handleChange('variableKey', e.target.value)}
            placeholder="myVariable"
          />
        </div>
        
        <div>
          <Label className="block text-sm font-medium mb-1">Variable Value</Label>
          <Textarea
            value={nodeData.variableValue || ''}
            onChange={(e) => handleChange('variableValue', e.target.value)}
            placeholder="{{step1.body.data}} or static value"
            className="font-mono text-sm h-20"
          />
          <p className="text-xs text-muted-foreground mt-1">
            You can use static values or dynamic values from previous steps
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <h3 className="text-sm font-medium mb-2">Access this variable</h3>
          <p className="text-xs text-muted-foreground">
            In later steps, use: <code>{"{{vars.VARIABLE_NAME}}"}</code>
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
          <Textarea
            value={nodeData.message || ''}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Processing order: {order_id}"
            className="font-mono text-sm h-20"
          />
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
  
  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-black flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-medium">Configure Node</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="dark:hover:bg-slate-800">
          <XIcon className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 dark:bg-black">
        {renderConfigFields()}
      </div>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <Button 
          className="w-full"
          onClick={handleApplyChanges}
        >
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
