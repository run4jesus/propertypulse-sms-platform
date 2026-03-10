import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Messenger from "./pages/Messenger";
import Campaigns from "./pages/Campaigns";
import Contacts from "./pages/Contacts";
import Reporting from "./pages/Reporting";
import CallLogs from "./pages/CallLogs";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import Workflows from "./pages/Workflows";
import KeywordCampaigns from "./pages/KeywordCampaigns";
import ContactGroups from "./pages/ContactGroups";
import ContactManagement from "./pages/ContactManagement";
import Macros from "./pages/Macros";
import Calendar from "./pages/Calendar";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/messenger" component={Messenger} />
        <Route path="/messenger/:id" component={Messenger} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/keywords" component={KeywordCampaigns} />
        <Route path="/contacts" component={Contacts} />
        <Route path="/contacts/groups" component={ContactGroups} />
        <Route path="/contacts/management" component={ContactManagement} />
        <Route path="/workflows" component={Workflows} />
        <Route path="/macros" component={Macros} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/calls" component={CallLogs} />
        <Route path="/reporting" component={Reporting} />
        <Route path="/templates" component={Templates} />
        <Route path="/settings" component={Settings} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
