import React, { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, limit, startAfter, where, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, SearchIcon, FilterIcon, ChevronRightIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ExecutionDetail } from "@/components/flows/ExecutionDetail";

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [executions, setExecutions] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [flowsMap, setFlowsMap] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const fetchExecutions = async () => {
      if (!user) return;
      
      try {
        // Get all user flows for mapping names
        const flowsRef = collection(db, "users", user.uid, "flows");
        const flowsSnapshot = await getDocs(flowsRef);
        const flowsData: Record<string, any> = {};
        flowsSnapshot.docs.forEach(doc => {
          flowsData[doc.id] = doc.data();
        });
        setFlowsMap(flowsData);
        
        // Build query for executions
        let executionsQuery = query(
          collection(db, "users", user.uid, "executions"),
          orderBy("startedAt", "desc"),
          limit(10)
        );
        
        const snapshot = await getDocs(executionsQuery);
        
        if (snapshot.empty) {
          setExecutions([]);
          setLoading(false);
          return;
        }
        
        const executionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setExecutions(executionsData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      } catch (error: any) {
        toast({
          title: "Error loading execution history",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchExecutions();
  }, [user, toast]);
  
  const handleLoadMore = async () => {
    if (!user || !lastVisible || loadingMore) return;
    
    setLoadingMore(true);
    
    try {
      let executionsQuery = query(
        collection(db, "users", user.uid, "executions"),
        orderBy("startedAt", "desc"),
        startAfter(lastVisible),
        limit(10)
      );
      
      const snapshot = await getDocs(executionsQuery);
      
      if (snapshot.empty) {
        setLoadingMore(false);
        return;
      }
      
      const newExecutions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setExecutions([...executions, ...newExecutions]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (error: any) {
      toast({
        title: "Error loading more executions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  };
  
  const toggleRowExpand = (id: string) => {
    setExpandedRows({
      ...expandedRows,
      [id]: !expandedRows[id]
    });
  };
  
  const applyFilters = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      let executionsQuery: any = collection(db, "users", user.uid, "executions");
      let constraints = [orderBy("startedAt", "desc"), limit(10)];
      
      // Apply status filter
      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }
      
      // Apply date filter
      if (dateFilter !== "all") {
        const date = new Date();
        if (dateFilter === "today") {
          date.setHours(0, 0, 0, 0);
        } else if (dateFilter === "week") {
          date.setDate(date.getDate() - 7);
        } else if (dateFilter === "month") {
          date.setMonth(date.getMonth() - 1);
        }
        constraints.push(where("startedAt", ">=", date));
      }
      
      executionsQuery = query(executionsQuery, ...constraints);
      const snapshot = await getDocs(executionsQuery);
      
      if (snapshot.empty) {
        setExecutions([]);
        setLastVisible(null);
        setLoading(false);
        return;
      }
      
      const executionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Apply search filter client-side (since Firestore doesn't support full-text search)
      let filteredExecutions = executionsData;
      if (searchTerm) {
        const lowercaseSearch = searchTerm.toLowerCase();
        filteredExecutions = executionsData.filter(exec => {
          const flowName = flowsMap[exec.flowId]?.name || "";
          return (
            flowName.toLowerCase().includes(lowercaseSearch) ||
            exec.id.toLowerCase().includes(lowercaseSearch) ||
            exec.status.toLowerCase().includes(lowercaseSearch)
          );
        });
      }
      
      setExecutions(filteredExecutions);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    } catch (error: any) {
      toast({
        title: "Error applying filters",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    // Re-fetch the original data
    setLoading(true);
    const fetchExecutions = async () => {
      if (!user) return;
      
      try {
        let executionsQuery = query(
          collection(db, "users", user.uid, "executions"),
          orderBy("startedAt", "desc"),
          limit(10)
        );
        
        const snapshot = await getDocs(executionsQuery);
        
        if (snapshot.empty) {
          setExecutions([]);
          setLoading(false);
          return;
        }
        
        const executionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setExecutions(executionsData);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      } catch (error: any) {
        toast({
          title: "Error resetting filters",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchExecutions();
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Failed</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Execution History</h1>
          <p className="text-muted-foreground">View and analyze your flow runs</p>
        </div>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by flow name or ID"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2">
                  <Button onClick={applyFilters} className="flex items-center gap-2">
                    <FilterIcon className="h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Executions Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : executions.length > 0 ? (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-left">Flow Name</TableHead>
                    <TableHead className="text-left">Status</TableHead>
                    <TableHead className="text-left">Start Time</TableHead>
                    <TableHead className="text-left">Duration</TableHead>
                    <TableHead className="text-left">Execution ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => [
                    // Regular Row
                    <TableRow 
                      key={`row-${execution.id}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleRowExpand(execution.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                          <ChevronRightIcon 
                            className={`h-4 w-4 transition-transform ${expandedRows[execution.id] ? 'rotate-90' : ''}`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {flowsMap[execution.flowId]?.name || "Unknown Flow"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(execution.status)}
                      </TableCell>
                      <TableCell>
                        {execution.startedAt?.toDate 
                          ? new Date(execution.startedAt.toDate()).toLocaleString() 
                          : "Unknown"}
                      </TableCell>
                      <TableCell>
                        {execution.duration 
                          ? `${execution.duration}ms`
                          : execution.status === "running" 
                            ? "Running..."
                            : "Unknown"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {execution.id.substring(0, 8)}...
                      </TableCell>
                    </TableRow>,
                    
                    // Expanded Content Row - only rendered when expanded
                    expandedRows[execution.id] ? (
                      <TableRow key={`content-${execution.id}`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                          <div className="p-4">
                            <ExecutionDetail 
                              execution={execution} 
                              flowData={flowsMap[execution.flowId]} 
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null
                  ].filter(Boolean))}
                </TableBody>
              </Table>
            </div>
            
            {lastVisible && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="text-center p-6">
            <div className="mb-4">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No execution history</h3>
            <p className="text-muted-foreground mb-4">No flow executions found. Run a flow to see execution data.</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
