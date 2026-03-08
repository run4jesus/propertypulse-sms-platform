import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, CheckCircle2, MessageSquare, Send, TrendingUp, Users } from "lucide-react";

const COLORS = ["oklch(0.52 0.22 255)", "oklch(0.65 0.18 160)", "oklch(0.70 0.18 40)", "oklch(0.65 0.20 330)"];

export default function Reporting() {
  const { data: stats } = trpc.reporting.dashboard.useQuery();
  const { data: campaigns } = trpc.reporting.campaigns.useQuery();

  const pieData = stats
    ? [
        { name: "Delivered", value: stats.totalDelivered },
        { name: "Replied", value: stats.totalReceived },
        { name: "Undelivered", value: Math.max(0, stats.totalSent - stats.totalDelivered) },
      ].filter((d) => d.value > 0)
    : [];

  const campaignChartData = campaigns?.slice(0, 8).map((c) => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + "…" : c.name,
    sent: c.sent,
    delivered: c.delivered,
    replied: c.replied,
  })) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reporting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Performance metrics across all campaigns</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: stats?.totalSent ?? 0, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Delivered", value: stats?.totalDelivered ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Replies", value: stats?.totalReceived ?? 0, icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Reply Rate", value: `${stats?.replyRate ?? 0}%`, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Campaign Performance Bar */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={campaignChartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="sent" fill="oklch(0.52 0.22 255)" radius={[3, 3, 0, 0]} name="Sent" />
                  <Bar dataKey="delivered" fill="oklch(0.65 0.18 160)" radius={[3, 3, 0, 0]} name="Delivered" />
                  <Bar dataKey="replied" fill="oklch(0.70 0.18 40)" radius={[3, 3, 0, 0]} name="Replied" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No campaign data yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Distribution Pie */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Message Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Table */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Campaign Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns && campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Campaign</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Delivered</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Replied</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Delivery %</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Reply %</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{c.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            c.status === "active" ? "bg-emerald-50 text-emerald-700" :
                            c.status === "completed" ? "bg-blue-50 text-blue-700" :
                            c.status === "scheduled" ? "bg-amber-50 text-amber-700" :
                            "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">{c.sent.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{c.delivered.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{c.replied.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={c.deliveryRate >= 90 ? "text-emerald-600" : c.deliveryRate >= 70 ? "text-amber-600" : "text-red-500"}>
                          {c.deliveryRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={c.replyRate >= 10 ? "text-emerald-600" : c.replyRate >= 5 ? "text-amber-600" : "text-muted-foreground"}>
                          {c.replyRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No campaign data yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
