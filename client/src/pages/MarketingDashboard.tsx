import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Megaphone, Send, MessageSquare, TrendingUp, Users, Target } from "lucide-react";
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

export default function MarketingDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats } = trpc.reporting.dashboard.useQuery();
  const { data: campaigns } = trpc.reporting.campaigns.useQuery();

  const activeCampaigns = campaigns?.filter(c => c.status === "active").length ?? 0;
  const totalSent = stats?.totalSent ?? 0;
  const totalReplied = stats?.totalReceived ?? 0;
  const needsOffer = stats?.needsOffer ?? 0;
  const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Marketing Dashboard</h1>
            <p className="text-sm text-muted-foreground">Campaign performance and lead flow overview</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard icon={Megaphone} label="Active Campaigns" value={activeCampaigns} color="bg-purple-500/10 text-purple-400" onClick={() => setLocation("/campaigns")} />
          <StatCard icon={Send} label="Total Sent" value={totalSent.toLocaleString()} sub="All time" color="bg-blue-500/10 text-blue-400" />
          <StatCard icon={MessageSquare} label="Total Replies" value={totalReplied.toLocaleString()} sub="All time" color="bg-green-500/10 text-green-400" />
          <StatCard icon={TrendingUp} label="Reply Rate" value={`${replyRate}%`} sub="Avg across campaigns" color="bg-yellow-500/10 text-yellow-400" />
          <StatCard icon={Target} label="Needs Offer" value={needsOffer} sub="Awaiting VA" color="bg-orange-500/10 text-orange-400" onClick={() => setLocation("/messenger?filter=needs_offer")} />
          <StatCard icon={Users} label="Leads Pushed" value={stats?.leadsPushed ?? 0} sub="To Podio" color="bg-violet-500/10 text-violet-400" />
        </div>

        {/* Campaign performance table */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Campaign Performance</h2>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setLocation("/campaigns")}
            >
              View All →
            </button>
          </div>
          {!campaigns || campaigns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No campaigns yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left p-3">Campaign</th>
                    <th className="text-right p-3">Sent</th>
                    <th className="text-right p-3">Delivered</th>
                    <th className="text-right p-3">Replies</th>
                    <th className="text-right p-3">Reply %</th>
                    <th className="text-right p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 10).map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium truncate max-w-[180px]">{c.name}</td>
                      <td className="p-3 text-right">{c.sent.toLocaleString()}</td>
                      <td className="p-3 text-right">{c.delivered.toLocaleString()}</td>
                      <td className="p-3 text-right">{c.replied.toLocaleString()}</td>
                      <td className="p-3 text-right text-green-400">{c.replyRate}%</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === "active" ? "bg-green-500/20 text-green-400" :
                          c.status === "paused" ? "bg-yellow-500/20 text-yellow-400" :
                          c.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
