import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2, SkipForward } from 'lucide-react';

interface NodeContextMenuProps {
  nodeId: string;
  onDelete: (nodeId: string) => void;
  onSkip: (nodeId: string) => void;
}

export function NodeContextMenu({ nodeId, onDelete, onSkip }: NodeContextMenuProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    onDelete(nodeId);
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    onSkip(nodeId);
  };

  return (
    <div 
      className="absolute top-2 right-2 z-10" 
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-6 h-6 flex items-center justify-center rounded-full bg-white bg-opacity-70 dark:bg-slate-700 dark:bg-opacity-70 hover:bg-opacity-100 dark:hover:bg-opacity-100 transition-all duration-200">
            <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-200" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel>Node Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-amber-600 dark:text-amber-400 cursor-pointer" onClick={handleSkip}>
            <SkipForward className="mr-2 h-4 w-4" /> Skip Node
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Node
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}