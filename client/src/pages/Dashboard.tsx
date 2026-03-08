import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  MessageSquare,
  Send,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Bot,
} from "lucide-react";
import { useLocation } from "wouter";

const mockChartData = [
  { day: "Mon", sent: 420, replies: 38 },
  { day: "Tue", sent: 380, replies: 42 },
  { day: "Wed", sent: 510, replies: 61 },
  { day: "Thu", sent: 290, replies: 27 },
  { day: "Fri", sent: 640, replies: 77 },
  { day: "Sat", sent: 180, replies: 19 },
  { day: "Sun", sent: 120, replies: 11 },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.reporting.dashboard.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: conversations } = trpc.conversations.list.useQuery({ limit: 5 });

  const statCards = [
    {
      label: "Total Sent",
      value: stats?.totalSent ?? 0,
      icon: Send,
      color: "text-blue-600",
      bg: "bg-blue-50",
      change: "+12%",
    },
    {
      label: "Reply Rate",
      value: `${stats?.replyRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      change: "+3.2%",
    },
    {
      label: "Delivery Rate",
      value: `${stats?.deliveryRate ?? 0}%`,
      icon: CheckCircle2,
      color: "text-violet-600",
      bg: "bg-violet-50",
      change: "+0.8%",
    },
    {
      label: "Total Contacts",
      value: stats?.totalContacts ?? 0,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50",
      change: "+24",
    },
    {
      label: "Active Campaigns",
      value: stats?.activeCampaigns ?? 0,
      icon: Zap,
      color: "text-rose-600",
      bg: "bg-rose-50",
      change: "",
    },
    {
      label: "Messages Received",
      value: stats?.totalReceived ?? 0,
      icon: MessageSquare,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      change: "+8%",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your SMS marketing overview
          </p>
        </div>
        <Button onClick={() => setLocation("/campaigns")}>
          <Zap className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                {card.change && (
                  <span className="text-xs text-emerald-600 font-medium">{card.change}</span>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {isLoading ? "—" : card.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Messages This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockChartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="sent" fill="oklch(0.52 0.22 255)" radius={[4, 4, 0, 0]} name="Sent" />
                <Bar dataKey="replies" fill="oklch(0.65 0.18 160)" radius={[4, 4, 0, 0]} name="Replies" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Reply Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(val: number, name: string) => [`${val}`, name]}
                />
                <Line
                  type="monotone"
                  dataKey="replies"
                  stroke="oklch(0.52 0.22 255)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "oklch(0.52 0.22 255)" }}
                  name="Replies"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Campaigns */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Campaigns</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/campaigns")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns && campaigns.length > 0 ? (
              campaigns.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.sent} sent · {c.replied} replied</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ml-2 ${
                      c.status === "active" ? "bg-emerald-50 text-emerald-700" :
                      c.status === "completed" ? "bg-blue-50 text-blue-700" :
                      c.status === "scheduled" ? "bg-amber-50 text-amber-700" :
                      "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {c.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No campaigns yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setLocation("/campaigns")}>
                  Create Campaign
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Conversations</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setLocation("/messenger")}>
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {conversations && conversations.length > 0 ? (
              conversations.slice(0, 5).map((row) => {
                const contact = row.contact;
                const conv = row.conversation;
                const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phone;
                return (
                  <div
                    key={conv.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setLocation(`/messenger/${conv.id}`)}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessagePreview ?? "No messages yet"}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setLocation("/contacts")}>
                  Add Contacts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
