import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Connectors from "@/pages/connectors";
import FlowBuilder from "@/pages/flow-builder";
import History from "@/pages/history";
import TablesPage from "@/pages/tables";
import TableDetailPage from "@/pages/tables/[id]";
import NewTablePage from "@/pages/tables/new";
import TableEditPage from "@/pages/tables/[id]/edit";
import AddRowPage from "@/pages/tables/[id]/add-row";
import EditRowPage from "@/pages/tables/[id]/edit-row/[rowId]";
import SettingsPage from "@/pages/settings";
import DocsPage from "@/pages/docs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/connectors">
        <ProtectedRoute>
          <Connectors />
        </ProtectedRoute>
      </Route>
      <Route path="/flow-builder/:id?">
        <ProtectedRoute>
          <FlowBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      </Route>
      <Route path="/tables">
        <ProtectedRoute>
          <TablesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tables/new">
        <ProtectedRoute>
          <NewTablePage />
        </ProtectedRoute>
      </Route>
      <Route path="/tables/:id/add-row">
        <ProtectedRoute>
          <AddRowPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tables/:id/edit-row/:rowId">
        <ProtectedRoute>
          <EditRowPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tables/:id/edit">
        <ProtectedRoute>
          <TableEditPage />
        </ProtectedRoute>
      </Route>
      <Route path="/tables/:id">
        <ProtectedRoute>
          <TableDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/docs">
        <ProtectedRoute>
          <DocsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
