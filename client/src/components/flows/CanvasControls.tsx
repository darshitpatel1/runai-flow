import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReactFlow } from "reactflow";

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  
  return (
    <div className="absolute bottom-4 right-4 flex space-x-2 z-10">
      <Button 
        variant="secondary" 
        size="icon"
        className="rounded-full shadow-lg"
        onClick={() => zoomIn()}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="secondary" 
        size="icon"
        className="rounded-full shadow-lg"
        onClick={() => zoomOut()}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="secondary" 
        size="icon"
        className="rounded-full shadow-lg"
        onClick={() => fitView({ padding: 0.2 })}
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
}
