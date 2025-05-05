import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";

// Storage key for sidebar collapsed state
const SIDEBAR_COLLAPSED_KEY = "runai_sidebar_collapsed";

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);
  // Initialize the collapsed state from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    const savedState = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return savedState ? JSON.parse(savedState) : false;
  });
  
  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(collapsed));
  }, [collapsed]);
  
  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };
  
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };
  
  return (
    <div className={`flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo Section with Collapse Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center">
          <svg className="w-8 h-8 text-primary fill-current" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z" />
          </svg>
          {!collapsed && <span className="text-lg font-semibold ml-3">RunAI</span>}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleCollapse}
          className="w-8 h-8 p-0"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        <Link href="/dashboard" className={`flex items-center px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black ${location === '/dashboard' ? 'bg-slate-100 dark:bg-black text-primary border-r-4 border-primary' : ''}`}>
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          {!collapsed && <span>Dashboard</span>}
        </Link>
        
        <Link href="/flow-builder" className={`flex items-center px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black ${location.startsWith('/flow-builder') ? 'bg-slate-100 dark:bg-black text-primary border-r-4 border-primary' : ''}`}>
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          {!collapsed && <span>Flows</span>}
        </Link>
        
        <Link href="/connectors" className={`flex items-center px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black ${location === '/connectors' ? 'bg-slate-100 dark:bg-black text-primary border-r-4 border-primary' : ''}`}>
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01"></path>
          </svg>
          {!collapsed && <span>Connectors</span>}
        </Link>
        
        <Link href="/history" className={`flex items-center px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black ${location === '/history' ? 'bg-slate-100 dark:bg-black text-primary border-r-4 border-primary' : ''}`}>
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          {!collapsed && <span>History</span>}
        </Link>
        
        <Link href="/tables" className={`flex items-center px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black ${location === '/tables' || location.startsWith('/tables/') ? 'bg-slate-100 dark:bg-black text-primary border-r-4 border-primary' : ''}`}>
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          {!collapsed && <span>Tables</span>}
        </Link>
        
        <Link href="/settings" className={`flex items-center px-4 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black ${location === '/settings' ? 'bg-slate-100 dark:bg-black text-primary border-r-4 border-primary' : ''}`}>
          <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          {!collapsed && <span>Settings</span>}
        </Link>
      </nav>
      
      {/* User Section */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-3">
              <AvatarImage 
                src={user?.photoURL || undefined} 
                alt={user?.displayName || "User"} 
              />
              <AvatarFallback>
                {user?.displayName 
                  ? user.displayName.substring(0, 2).toUpperCase() 
                  : user?.email
                    ? user.email.substring(0, 2).toUpperCase()
                    : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.displayName || user?.email || "User"}
              </p>
              <div className="flex gap-2">
                <Link href="/settings">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-muted-foreground"
                  >
                    Edit Profile
                  </Button>
                </Link>
                <span className="text-xs text-muted-foreground">|</span>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-xs text-muted-foreground"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                >
                  {loggingOut ? "Signing out..." : "Sign out"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Theme Toggle */}
      <div className={`p-4 border-t border-slate-200 dark:border-slate-700 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        ) : (
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 p-0"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Switch 
              id="dark-mode" 
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
