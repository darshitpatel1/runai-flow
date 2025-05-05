import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Pages
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Connectors from "@/pages/connectors";
import FlowBuilder from "@/pages/flow-builder";
import History from "@/pages/history";
import TablesPage from "@/pages/tables";
import TableDetailPage from "@/pages/tables/[id]";
import TableEditPage from "@/pages/tables/[id]/edit";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/connectors" component={Connectors} />
      <Route path="/flow-builder/:id?" component={FlowBuilder} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={SettingsPage} />
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
