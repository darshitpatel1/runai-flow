import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { XIcon, PlusIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectorFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function ConnectorForm({ initialData, onSubmit, onCancel }: ConnectorFormProps) {
  // Basic connector details
  const [name, setName] = useState(initialData?.name || "");
  const [baseUrl, setBaseUrl] = useState(initialData?.baseUrl || "");
  const [authType, setAuthType] = useState(initialData?.authType || "none");
  
  // Basic auth fields
  const [username, setUsername] = useState(initialData?.auth?.username || "");
  const [password, setPassword] = useState(initialData?.auth?.password || "");
  
  // OAuth2 fields
  const [tokenUrl, setTokenUrl] = useState(initialData?.auth?.tokenUrl || "");
  const [clientId, setClientId] = useState(initialData?.auth?.clientId || "");
  const [clientSecret, setClientSecret] = useState(initialData?.auth?.clientSecret || "");
  const [tokenLocation, setTokenLocation] = useState(initialData?.auth?.tokenLocation || "header");
  const [caseSensitiveHeaders, setCaseSensitiveHeaders] = useState(initialData?.auth?.caseSensitiveHeaders || false);
  const [oauth2Type, setOauth2Type] = useState(initialData?.auth?.oauth2Type || "client_credentials");
  const [authorizationUrl, setAuthorizationUrl] = useState(initialData?.auth?.authorizationUrl || "");
  const [redirectUri, setRedirectUri] = useState(initialData?.auth?.redirectUri || "");
  const [scope, setScope] = useState(initialData?.auth?.scope || "");
  
  // Headers
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>(
    initialData?.headers || [{ key: "", value: "" }]
  );
  
  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };
  
  const removeHeader = (index: number) => {
    const newHeaders = [...headers];
    newHeaders.splice(index, 1);
    setHeaders(newHeaders);
  };
  
  const updateHeaderKey = (index: number, key: string) => {
    const newHeaders = [...headers];
    newHeaders[index].key = key;
    setHeaders(newHeaders);
  };
  
  const updateHeaderValue = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index].value = value;
    setHeaders(newHeaders);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!name.trim()) {
      alert("Connector Name is required");
      return;
    }
    
    if (!baseUrl.trim()) {
      alert("Base URL is required");
      return;
    }
    
    // Format and filter headers (remove empty ones)
    const filteredHeaders = headers.filter(h => h.key.trim() && h.value.trim());
    
    // Prepare auth data based on selected type
    let auth: any = null;
    
    if (authType === "basic") {
      if (!username.trim() || !password.trim()) {
        alert("Username and Password are required for Basic Authentication");
        return;
      }
      auth = { 
        username: username.trim(), 
        password: password.trim() 
      };
    } else if (authType === "oauth2") {
      if (!tokenUrl.trim() || !clientId.trim() || !clientSecret.trim()) {
        alert("Token URL, Client ID, and Client Secret are required for OAuth 2.0");
        return;
      }
      
      auth = {
        oauth2Type,
        tokenUrl: tokenUrl.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        tokenLocation,
        caseSensitiveHeaders
      };
      
      // Add authorization code specific fields if that flow is selected
      if (oauth2Type === "authorization_code") {
        if (!authorizationUrl.trim() || !redirectUri.trim()) {
          alert("Authorization URL and Redirect URI are required for OAuth 2.0 Authorization Code flow");
          return;
        }
        
        auth = {
          ...auth,
          authorizationUrl: authorizationUrl.trim(),
          redirectUri: redirectUri.trim(),
          scope: scope.trim() || ""
        };
      }
    }
    
    // Prepare final data
    const connectorData = {
      name: name.trim(),
      baseUrl: baseUrl.trim().endsWith("/") ? baseUrl.trim() : `${baseUrl.trim()}/`,
      authType,
      auth,
      headers: filteredHeaders
    };
    
    onSubmit(connectorData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="name">Connector Name</Label>
          <Input 
            id="name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Shopify API"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input 
            id="baseUrl" 
            value={baseUrl} 
            onChange={(e) => setBaseUrl(e.target.value)} 
            placeholder="https://api.example.com/"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Authentication Type</Label>
        <RadioGroup 
          value={authType} 
          onValueChange={setAuthType}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className={`p-4 rounded-lg border-2 cursor-pointer ${authType === 'none' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <RadioGroupItem value="none" id="none" className="sr-only" />
            <Label htmlFor="none" className="cursor-pointer">
              <div className="font-medium">None</div>
              <div className="text-xs text-muted-foreground mt-1">No authentication</div>
            </Label>
          </div>
          
          <div className={`p-4 rounded-lg border-2 cursor-pointer ${authType === 'basic' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <RadioGroupItem value="basic" id="basic" className="sr-only" />
            <Label htmlFor="basic" className="cursor-pointer">
              <div className="font-medium">Basic Auth</div>
              <div className="text-xs text-muted-foreground mt-1">Username/Password</div>
            </Label>
          </div>
          
          <div className={`p-4 rounded-lg border-2 cursor-pointer ${authType === 'oauth2' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <RadioGroupItem value="oauth2" id="oauth2" className="sr-only" />
            <Label htmlFor="oauth2" className="cursor-pointer">
              <div className="font-medium">OAuth 2.0</div>
              <div className="text-xs text-muted-foreground mt-1">Client Credentials & Auth Code</div>
            </Label>
          </div>
        </RadioGroup>
      </div>
      
      {/* Authentication details based on selected type */}
      <div className="mt-6">
        {authType === "basic" && (
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Basic Authentication</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required={authType === "basic"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required={authType === "basic"}
                />
              </div>
            </div>
          </div>
        )}
        
        {authType === "oauth2" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oauth2Type">OAuth 2.0 Grant Type</Label>
              <Tabs 
                value={oauth2Type} 
                onValueChange={setOauth2Type}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="client_credentials">Client Credentials</TabsTrigger>
                  <TabsTrigger value="authorization_code">Authorization Code</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tokenUrl">Token URL</Label>
              <Input 
                id="tokenUrl" 
                value={tokenUrl} 
                onChange={(e) => setTokenUrl(e.target.value)} 
                placeholder="https://auth.example.com/oauth/token"
                required={authType === "oauth2"}
              />
            </div>
            
            {oauth2Type === "authorization_code" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="authorizationUrl">Authorization URL</Label>
                  <Input 
                    id="authorizationUrl" 
                    value={authorizationUrl} 
                    onChange={(e) => setAuthorizationUrl(e.target.value)} 
                    placeholder="https://auth.example.com/oauth/authorize"
                    required={oauth2Type === "authorization_code"}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="redirectUri">Redirect URI</Label>
                  <Input 
                    id="redirectUri" 
                    value={redirectUri} 
                    onChange={(e) => setRedirectUri(e.target.value)} 
                    placeholder={window.location.origin + "/api/oauth/callback"}
                    required={oauth2Type === "authorization_code"}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use <strong>{window.location.origin}/api/oauth/callback</strong> as your registered redirect URI in the OAuth provider
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope (Optional)</Label>
                  <Input 
                    id="scope" 
                    value={scope} 
                    onChange={(e) => setScope(e.target.value)} 
                    placeholder="read write profile"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Space-separated list of scopes to request
                  </p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input 
                  id="clientId" 
                  value={clientId} 
                  onChange={(e) => setClientId(e.target.value)} 
                  required={authType === "oauth2"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input 
                  id="clientSecret" 
                  type="password" 
                  value={clientSecret} 
                  onChange={(e) => setClientSecret(e.target.value)} 
                  required={authType === "oauth2"}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Token Location</Label>
              <Tabs 
                value={tokenLocation} 
                onValueChange={setTokenLocation}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 w-full max-w-[400px]">
                  <TabsTrigger value="header">Header</TabsTrigger>
                  <TabsTrigger value="body">Request Body</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="caseSensitiveHeaders" 
                className="rounded text-primary focus:ring-primary" 
                checked={caseSensitiveHeaders}
                onChange={(e) => setCaseSensitiveHeaders(e.target.checked)}
              />
              <Label htmlFor="caseSensitiveHeaders">Case-sensitive headers</Label>
            </div>
          </div>
        )}
      </div>
      
      {/* Default Headers */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <h3 className="font-medium mb-4">Default Headers</h3>
        
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex space-x-2">
              <Input
                placeholder="Header Name"
                value={header.key}
                onChange={(e) => updateHeaderKey(index, e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={header.value}
                onChange={(e) => updateHeaderValue(index, e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeHeader(index)}
                disabled={headers.length === 1 && index === 0}
                className="shrink-0"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <Button
          type="button"
          variant="outline"
          className="mt-2 flex items-center gap-2"
          onClick={addHeader}
        >
          <PlusIcon className="h-4 w-4" />
          Add Header
        </Button>
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? "Update Connector" : "Create Connector"}
        </Button>
      </div>
    </form>
  );
}
