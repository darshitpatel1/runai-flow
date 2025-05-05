import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Globe,
  ArrowRight,
  PlusCircle,
  Trash,
  Variable,
} from "lucide-react";
import { VariableSelectDialog } from "../VariableSelectDialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NODE_WIDTH = 320;

interface HeaderParam {
  id: string;
  key: string;
  value: string;
}

interface QueryParam {
  id: string;
  key: string;
  value: string;
}

interface HttpRequestNodeData {
  label: string;
  method: string;
  url: string;
  headers: HeaderParam[];
  queryParams: QueryParam[];
  body: string;
  authType: string;
  authConfig: any;
  description?: string;
  responseType?: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function HttpRequestNode({ id, data, isConnectable, selected }: NodeProps) {
  // Initialize with safe defaults to prevent undefined errors
  const defaultData: HttpRequestNodeData = {
    label: data.label || 'HTTP Request',
    method: data.method || 'GET',
    url: data.url || '',
    headers: Array.isArray(data.headers) ? data.headers : [],
    queryParams: Array.isArray(data.queryParams) ? data.queryParams : [],
    body: data.body || '',
    authType: data.authType || 'none',
    authConfig: data.authConfig || {},
    responseType: data.responseType || 'json'
  };
  
  const [nodeData, setNodeData] = useState<HttpRequestNodeData>(defaultData);
  const [activeTab, setActiveTab] = useState("request");
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState<{
    field: string;
    paramType?: string;
    paramId?: string;
  } | null>(null);

  // Update parent data when nodeData changes
  useEffect(() => {
    if (data.onChange) {
      data.onChange(id, nodeData);
    }
  }, [id, nodeData, data]);

  const handleMethodChange = (method: string) => {
    setNodeData((prev) => ({ ...prev, method }));
  };

  const handleUrlChange = (url: string) => {
    setNodeData((prev) => ({ ...prev, url }));
  };

  const handleAddHeader = () => {
    setNodeData((prev) => ({
      ...prev,
      headers: [
        ...prev.headers,
        { id: generateId(), key: "", value: "" },
      ],
    }));
  };

  const handleHeaderChange = (id: string, field: "key" | "value", value: string) => {
    setNodeData((prev) => ({
      ...prev,
      headers: prev.headers.map((header) =>
        header.id === id ? { ...header, [field]: value } : header
      ),
    }));
  };

  const handleRemoveHeader = (id: string) => {
    setNodeData((prev) => ({
      ...prev,
      headers: prev.headers.filter((header) => header.id !== id),
    }));
  };

  const handleAddQueryParam = () => {
    setNodeData((prev) => ({
      ...prev,
      queryParams: [
        ...prev.queryParams,
        { id: generateId(), key: "", value: "" },
      ],
    }));
  };

  const handleQueryParamChange = (id: string, field: "key" | "value", value: string) => {
    setNodeData((prev) => ({
      ...prev,
      queryParams: prev.queryParams.map((param) =>
        param.id === id ? { ...param, [field]: value } : param
      ),
    }));
  };

  const handleRemoveQueryParam = (id: string) => {
    setNodeData((prev) => ({
      ...prev,
      queryParams: prev.queryParams.filter((param) => param.id !== id),
    }));
  };

  const handleBodyChange = (body: string) => {
    setNodeData((prev) => ({ ...prev, body }));
  };

  const handleAuthTypeChange = (authType: string) => {
    setNodeData((prev) => ({
      ...prev,
      authType,
      authConfig: {},
    }));
  };

  const handleAuthConfigChange = (key: string, value: string) => {
    setNodeData((prev) => ({
      ...prev,
      authConfig: {
        ...prev.authConfig,
        [key]: value,
      },
    }));
  };

  const handleResponseTypeChange = (responseType: string) => {
    setNodeData((prev) => ({ ...prev, responseType }));
  };

  const openVariableDialog = (field: string, paramType?: string, paramId?: string) => {
    setCurrentEditField({ field, paramType, paramId });
    setVariableDialogOpen(true);
  };

  const handleVariableSelect = (variablePath: string) => {
    if (!currentEditField) return;

    const { field, paramType, paramId } = currentEditField;

    if (field === "url") {
      setNodeData((prev) => ({ ...prev, url: prev.url + variablePath }));
    } else if (field === "body") {
      setNodeData((prev) => ({ ...prev, body: prev.body + variablePath }));
    } else if (field === "header" && paramId) {
      handleHeaderChange(paramId, paramType as "key" | "value", variablePath);
    } else if (field === "queryParam" && paramId) {
      handleQueryParamChange(paramId, paramType as "key" | "value", variablePath);
    } else if (field.startsWith("auth_")) {
      const authField = field.replace("auth_", "");
      handleAuthConfigChange(authField, variablePath);
    }
  };

  return (
    <>
      <Card
        className={`border-2 ${
          selected ? "border-blue-500" : "border-border"
        } shadow-md w-[${NODE_WIDTH}px] bg-background`}
      >
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center">
            <Globe className="w-4 h-4 mr-2 text-primary" />
            <CardTitle className="text-sm font-medium">{data.label || "HTTP Request"}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Skip</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="px-3 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-2">
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
            </TabsList>

            <TabsContent value="request" className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <div className="flex space-x-2">
                  <div className="w-[30%]">
                    <Select
                      value={nodeData.method}
                      onValueChange={handleMethodChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="URL"
                      value={nodeData.url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      className="pr-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => openVariableDialog("url")}
                    >
                      <Variable className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Headers</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddHeader}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>

                {nodeData.headers.length > 0 ? (
                  <div className="space-y-2 max-h-[100px] overflow-y-auto">
                    {nodeData.headers.map((header) => (
                      <div key={header.id} className="flex items-center space-x-2">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Key"
                            value={header.key}
                            onChange={(e) =>
                              handleHeaderChange(header.id, "key", e.target.value)
                            }
                            className="h-8 text-xs pr-7"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="absolute right-0 top-0 h-full p-1"
                            onClick={() => openVariableDialog("header", "key", header.id)}
                          >
                            <Variable className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Value"
                            value={header.value}
                            onChange={(e) =>
                              handleHeaderChange(header.id, "value", e.target.value)
                            }
                            className="h-8 text-xs pr-7"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="absolute right-0 top-0 h-full p-1"
                            onClick={() => openVariableDialog("header", "value", header.id)}
                          >
                            <Variable className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveHeader(header.id)}
                          className="h-8 w-8"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    No headers added
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Query Parameters</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddQueryParam}
                  >
                    <PlusCircle className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>

                {nodeData.queryParams.length > 0 ? (
                  <div className="space-y-2 max-h-[100px] overflow-y-auto">
                    {nodeData.queryParams.map((param) => (
                      <div key={param.id} className="flex items-center space-x-2">
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Key"
                            value={param.key}
                            onChange={(e) =>
                              handleQueryParamChange(param.id, "key", e.target.value)
                            }
                            className="h-8 text-xs pr-7"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="absolute right-0 top-0 h-full p-1"
                            onClick={() => openVariableDialog("queryParam", "key", param.id)}
                          >
                            <Variable className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) =>
                              handleQueryParamChange(param.id, "value", e.target.value)
                            }
                            className="h-8 text-xs pr-7"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="absolute right-0 top-0 h-full p-1"
                            onClick={() => openVariableDialog("queryParam", "value", param.id)}
                          >
                            <Variable className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveQueryParam(param.id)}
                          className="h-8 w-8"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    No query parameters added
                  </div>
                )}
              </div>

              {(nodeData.method === "POST" ||
                nodeData.method === "PUT" ||
                nodeData.method === "PATCH") && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Body</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-8 w-8"
                      onClick={() => openVariableDialog("body")}
                    >
                      <Variable className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder='{"key": "value"}'
                    value={nodeData.body}
                    onChange={(e) => handleBodyChange(e.target.value)}
                    className="h-24 font-mono text-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Authentication</Label>
                <Select
                  value={nodeData.authType}
                  onValueChange={handleAuthTypeChange}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select authentication type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="apiKey">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                  </SelectContent>
                </Select>

                {nodeData.authType === "basic" && (
                  <div className="space-y-2 mt-2">
                    <div className="flex flex-col space-y-2">
                      <div className="relative">
                        <Input
                          placeholder="Username"
                          value={nodeData.authConfig?.username || ""}
                          onChange={(e) =>
                            handleAuthConfigChange("username", e.target.value)
                          }
                          className="h-8 text-xs pr-7"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="absolute right-0 top-0 h-full p-1"
                          onClick={() => openVariableDialog("auth_username")}
                        >
                          <Variable className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="Password"
                          value={nodeData.authConfig?.password || ""}
                          onChange={(e) =>
                            handleAuthConfigChange("password", e.target.value)
                          }
                          className="h-8 text-xs pr-7"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="absolute right-0 top-0 h-full p-1"
                          onClick={() => openVariableDialog("auth_password")}
                        >
                          <Variable className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {nodeData.authType === "bearer" && (
                  <div className="space-y-2 mt-2">
                    <div className="relative">
                      <Input
                        placeholder="Token"
                        value={nodeData.authConfig?.token || ""}
                        onChange={(e) =>
                          handleAuthConfigChange("token", e.target.value)
                        }
                        className="h-8 text-xs pr-7"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="absolute right-0 top-0 h-full p-1"
                        onClick={() => openVariableDialog("auth_token")}
                      >
                        <Variable className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {nodeData.authType === "apiKey" && (
                  <div className="space-y-2 mt-2">
                    <div className="flex flex-col space-y-2">
                      <Select
                        value={nodeData.authConfig?.in || "header"}
                        onValueChange={(value) =>
                          handleAuthConfigChange("in", value)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="query">Query Parameter</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Input
                          placeholder="Key name"
                          value={nodeData.authConfig?.name || ""}
                          onChange={(e) =>
                            handleAuthConfigChange("name", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Key value"
                          value={nodeData.authConfig?.value || ""}
                          onChange={(e) =>
                            handleAuthConfigChange("value", e.target.value)
                          }
                          className="h-8 text-xs pr-7"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="absolute right-0 top-0 h-full p-1"
                          onClick={() => openVariableDialog("auth_value")}
                        >
                          <Variable className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Response Type</Label>
                <Select
                  value={nodeData.responseType || "json"}
                  onValueChange={handleResponseTypeChange}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select response type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="blob">Binary / Blob</SelectItem>
                    <SelectItem value="arrayBuffer">Array Buffer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Available Output Variables</Label>
                <div className="space-y-1">
                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          object
                        </Badge>
                        <span className="text-xs font-medium">response</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      The full response object
                    </p>
                  </div>

                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          string
                        </Badge>
                        <span className="text-xs font-medium">headers</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Response headers as a JSON object
                    </p>
                  </div>

                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          number
                        </Badge>
                        <span className="text-xs font-medium">status</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      HTTP status code
                    </p>
                  </div>

                  <div className="p-2 bg-secondary rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 py-0 h-5">
                          any
                        </Badge>
                        <span className="text-xs font-medium">data</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Response body data (parsed according to response type)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs flex items-center">
                  <Switch
                    className="mr-2"
                    checked={!!nodeData.authConfig?.saveResponse}
                    onCheckedChange={(checked) =>
                      handleAuthConfigChange("saveResponse", String(checked))
                    }
                  /> 
                  Save Response to Execution History
                </Label>
                <p className="text-xs text-muted-foreground">
                  Store the full response in execution logs for troubleshooting
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="px-3 py-2 border-t flex justify-between items-center text-xs text-muted-foreground">
          <div>HTTP Request</div>
          {activeTab === "request" && (
            <div>{nodeData.method} {nodeData.url.slice(0, 15)}{nodeData.url.length > 15 ? "..." : ""}</div>
          )}
        </CardFooter>
      </Card>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-primary"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        isConnectable={isConnectable}
        className="w-2 h-2 rounded-full border-2 bg-background border-primary"
      />

      {/* Variable selection dialog */}
      <VariableSelectDialog
        open={variableDialogOpen}
        onOpenChange={setVariableDialogOpen}
        onSelect={handleVariableSelect}
        nodes={data.nodes || []}
        currentNodeId={id}
      />
    </>
  );
}