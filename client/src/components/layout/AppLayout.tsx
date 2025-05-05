import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import { MenuIcon, XIcon } from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  // Use effect to handle authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
      toast({
        title: "Authentication required",
        description: "Please sign in to access this page",
        variant: "destructive",
      });
    }
  }, [loading, user, setLocation, toast]);
  
  // Early return if still loading or not authenticated
  if (loading || !user) {
    return null;
  }
  
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
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-black" style={{ height: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
