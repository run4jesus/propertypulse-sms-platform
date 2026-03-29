import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Database, Users, List, TrendingUp, Upload, BarChart2 } from "lucide-react";
import { useLocation } from "wouter";

function StatCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string;
  color: string; onClick?: () => void;
}) {
  return (
    <div
      className={`p-5 rounded-xl bg-card border border-border flex items-start gap-4 ${onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DataDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.reporting.dashboard.useQuery();
  const { data: lists } = trpc.contactLists.list.useQuery();
  const { data: contacts } = trpc.contacts.list.useQuery({ limit: 1 });

  const totalLists = lists?.length ?? 0;
  const totalContacts = (contacts as { total?: number })?.total ?? 0;
  const totalSent = stats?.totalSent ?? 0;
  const replyRate = stats && stats.totalSent > 0
    ? Math.round((stats.totalReceived / stats.totalSent) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Data Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your lists, contacts, and data health</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={List} label="Contact Lists" value={totalLists} sub="Active lists" color="bg-blue-500/10 text-blue-400" onClick={() => setLocation("/lists")} />
          <StatCard icon={Users} label="Total Contacts" value={totalContacts.toLocaleString()} sub="Across all lists" color="bg-green-500/10 text-green-400" onClick={() => setLocation("/contacts")} />
          <StatCard icon={TrendingUp} label="Total Sent" value={totalSent.toLocaleString()} sub="All campaigns" color="bg-purple-500/10 text-purple-400" />
          <StatCard icon={BarChart2} label="Reply Rate" value={`${replyRate}%`} sub="Avg across campaigns" color="bg-yellow-500/10 text-yellow-400" />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => setLocation("/lists")}
          >
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
              <List className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-semibold mb-1">Manage Lists</h3>
            <p className="text-sm text-muted-foreground">View, create, and manage your contact lists</p>
          </div>

          <div
            className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => setLocation("/contacts")}
          >
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-green-400" />
            </div>
            <h3 className="font-semibold mb-1">All Contacts</h3>
            <p className="text-sm text-muted-foreground">Browse and search your full contact database</p>
          </div>

          <div
            className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => setLocation("/contacts?tab=import")}
          >
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
              <Upload className="h-5 w-5 text-orange-400" />
            </div>
            <h3 className="font-semibold mb-1">Import / Skip Trace</h3>
            <p className="text-sm text-muted-foreground">Upload new lists and run skip tracing</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
