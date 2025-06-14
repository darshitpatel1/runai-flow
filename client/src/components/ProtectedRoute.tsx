import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect if we're sure the user is not authenticated and haven't redirected yet
    if (!loading && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      setLocation("/auth");
    }
    
    // Reset redirect flag when user becomes authenticated
    if (user) {
      hasRedirected.current = false;
    }
  }, [loading, user, setLocation]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
}