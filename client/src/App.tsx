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
import PhoneNumbers from "./pages/PhoneNumbers";
import Macros from "./pages/Macros";
import Calendar from "./pages/Calendar";
import SendQueue from "./pages/SendQueue";
import DealPipeline from "./pages/DealPipeline";
import ContractManager from "./pages/ContractManager";
import TaskManager from "./pages/TaskManager";
import PullCadence from "./pages/PullCadence";
import DispositionDashboard from "./pages/DispositionDashboard";
import KPIsDashboard from "./pages/KPIsDashboard";
import ActivityFeed from "./pages/ActivityFeed";
import DailyZero from "./pages/DailyZero";
import DataDashboard from "./pages/DataDashboard";
import MarketingDashboard from "./pages/MarketingDashboard";
import Leads from "./pages/Leads";
import DealTracker from "./pages/DealTracker";

function Router() {
  return (
    <Switch>
      {/* Full-screen pages — outside DashboardLayout */}
      <Route path="/campaigns/:id/send-queue" component={SendQueue} />

      {/* All other pages — inside DashboardLayout */}
      <Route>
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
            <Route path="/phone-numbers" component={PhoneNumbers} />
            <Route path="/settings" component={Settings} />
            <Route path="/deals" component={DealPipeline} />
            <Route path="/contracts" component={ContractManager} />
            <Route path="/tasks" component={TaskManager} />
            <Route path="/cadence" component={PullCadence} />
            <Route path="/dispositions" component={DispositionDashboard} />
            <Route path="/kpis" component={KPIsDashboard} />
            <Route path="/activity" component={ActivityFeed} />
            <Route path="/daily-zero" component={DailyZero} />
            <Route path="/data" component={DataDashboard} />
            <Route path="/marketing" component={MarketingDashboard} />
            <Route path="/leads" component={Leads} />
            <Route path="/deal-tracker" component={DealTracker} />
            <Route path="/lists" component={Contacts} />
            <Route path="/contacts/import" component={Contacts} />
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </DashboardLayout>
      </Route>
    </Switch>
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
