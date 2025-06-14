import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchIcon, FilterIcon, BarChart3Icon, ActivityIcon, TrendingUpIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

interface UsageStats {
  totalExecutions: number;
  successRate: number;
  apiCalls: number;
  avgResponseTime: number;
  period: string;
}

interface ActivityItem {
  flowName: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
}
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function History() {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Usage data queries
  const { data: usageStats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ['/api/usage/statistics'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: dailyUsage, isLoading: dailyLoading } = useQuery<any[]>({
    queryKey: ['/api/usage/daily'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: topFlows, isLoading: flowsLoading } = useQuery<any[]>({
    queryKey: ['/api/usage/top-flows'],
    staleTime: 5 * 60 * 1000,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ['/api/usage/recent-activity'],
    staleTime: 5 * 60 * 1000,
  });
  
  const applyFilters = () => {
    // Filter functionality can be implemented here
    console.log("Applying filters:", { searchTerm, statusFilter, dateFilter });
  };
  
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
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
          <h1 className="text-2xl font-bold">Analytics & Monitoring</h1>
          <p className="text-muted-foreground">View execution history and track usage metrics</p>
        </div>

        <Tabs defaultValue="history" className="space-y-6">
          <TabsList>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <BarChart3Icon className="h-4 w-4" />
              Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-6">
            {/* Filters */}
            <Card>
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
            
            {/* History Content */}
            <Card className="text-center p-6">
              <div className="mb-4">
                <ActivityIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              </div>
              <h3 className="text-lg font-medium mb-2">No execution history</h3>
              <p className="text-muted-foreground mb-4">Ready to display your execution data here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            {/* Usage Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? "..." : (usageStats?.totalExecutions ?? 0)}
                      </p>
                    </div>
                    <ActivityIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? "..." : `${usageStats?.successRate ?? 0}%`}
                      </p>
                    </div>
                    <TrendingUpIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">API Calls</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? "..." : (usageStats?.apiCalls ?? 0)}
                      </p>
                    </div>
                    <BarChart3Icon className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Total this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                      <p className="text-2xl font-bold">
                        {statsLoading ? "..." : `${usageStats?.avgResponseTime ?? 0}ms`}
                      </p>
                    </div>
                    <ActivityIcon className="h-8 w-8 text-orange-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Response time</p>
                </CardContent>
              </Card>
            </div>

            {/* Usage Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Daily Usage</h3>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-center">
                      <BarChart3Icon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Usage chart will appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Top Flows</h3>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="text-center">
                      <TrendingUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Top flows chart will appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Details Table */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                {activityLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading recent activity...</p>
                  </div>
                ) : !recentActivity || (recentActivity && recentActivity.length === 0) ? (
                  <div className="text-center py-12">
                    <BarChart3Icon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h4 className="text-lg font-medium mb-2">No usage data available</h4>
                    <p className="text-muted-foreground">Usage metrics will appear here once you start running flows.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity && recentActivity.map((activity: ActivityItem, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{activity.flowName}</p>
                            <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                          </div>
                        </div>
                        <Badge variant={activity.status === 'success' ? 'default' : 'destructive'}>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}