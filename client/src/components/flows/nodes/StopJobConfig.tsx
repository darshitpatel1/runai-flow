import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Variable } from "lucide-react";

interface StopJobConfigProps {
  nodeData: any;
  handleChange: (field: string, value: any) => void;
  handleOpenVariableSelector: (field: string) => void;
}

export function StopJobConfig({ nodeData, handleChange, handleOpenVariableSelector }: StopJobConfigProps) {
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
        <Select 
          value={nodeData.stopType || 'success'} 
          onValueChange={(value) => handleChange('stopType', value as 'success' | 'error' | 'cancel')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select stop type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success">Complete Successfully</SelectItem>
            <SelectItem value="error">Stop with Error</SelectItem>
            <SelectItem value="cancel">Cancel Flow</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {nodeData.stopType === 'error' && (
        <div>
          <Label className="block text-sm font-medium mb-1">Error Message</Label>
          <div className="flex gap-2">
            <Textarea
              value={nodeData.errorMessage || ''}
              onChange={(e) => handleChange('errorMessage', e.target.value)}
              placeholder="Enter error message here..."
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => handleOpenVariableSelector('errorMessage')}
              className="flex-shrink-0"
            >
              <Variable className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            You can include dynamic variables like {'{{stepX.result.message}}'}
          </div>
        </div>
      )}
      
      <div className="bg-muted/50 p-3 rounded-md mt-4">
        <h4 className="text-sm font-medium mb-2">About Stop Job Node</h4>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>This node immediately ends the flow execution with the selected status</li>
          <li>All subsequent nodes in the flow will be skipped</li>
          <li>Use "Complete Successfully" for normal completion and successful outcomes</li>
          <li>Use "Stop with Error" to signal a problem that should be reported</li>
          <li>Use "Cancel Flow" to stop the flow without an error but also without marking it as completed</li>
        </ul>
      </div>
    </div>
  );
}