import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { MenuIcon, XIcon } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed z-50 top-4 left-4"
          onClick={toggleSidebar}
        >
          {sidebarOpen ? (
            <XIcon className="h-6 w-6" />
          ) : (
            <MenuIcon className="h-6 w-6" />
          )}
        </Button>
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} ${isMobile ? 'fixed inset-0 z-40' : 'relative'}`}>
        {isMobile && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}
        <div 
          className={`
            ${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative h-full'} 
            bg-white dark:bg-black border-r border-slate-200 dark:border-slate-700 flex flex-col
          `}
        >
          <Sidebar />
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black" style={{ height: '100vh' }}>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
