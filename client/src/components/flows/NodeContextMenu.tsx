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
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <MoreVertical className="h-4 w-4" />
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