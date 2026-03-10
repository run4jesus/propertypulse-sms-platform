import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Send,
  MessageSquare,
  TrendingUp,
  Users,
  PhoneOff,
  Activity,
  Clock,
  Bot,
  Download,
  BarChart2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

type DatePreset = "today" | "yesterday" | "7d" | "14d" | "30d" | "90d" | "custom";

function getPresetRange(preset: DatePreset): { start: Date; end: Date } {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  switch (preset) {
    case "today": {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { start: s, end: endOfDay };
    }
    case "yesterday": {
      const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    case "7d": {
      const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      return { start: s, end: endOfDay };
    }
    case "14d": {
      const s = new Date(now); s.setDate(s.getDate() - 13); s.setHours(0, 0, 0, 0);
      return { start: s, end: endOfDay };
    }
    case "30d": {
      const s = new Date(now); s.setDate(s.getDate() - 29); s.setHours(0, 0, 0, 0);
      return { start: s, end: endOfDay };
    }
    case "90d": {
      const s = new Date(now); s.setDate(s.getDate() - 89); s.setHours(0, 0, 0, 0);
      return { start: s, end: endOfDay };
    }
    default: {
      const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
      return { start: s, end: endOfDay };
    }
  }
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fromInputDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

export default function Reporting() {
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customStart, setCustomStart] = useState(() => toInputDate(getPresetRange("7d").start));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const [campaignFilter, setCampaignFilter] = useState<string>("all");

  const dateRange = useMemo(() => {
    if (preset === "custom") {
      const end = fromInputDate(customEnd);
      end.setHours(23, 59, 59, 999);
      return { start: fromInputDate(customStart), end };
    }
    return getPresetRange(preset);
  }, [preset, customStart, customEnd]);

  const { data: stats, isLoading } = trpc.reporting.stats.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
    campaignId: campaignFilter !== "all" ? parseInt(campaignFilter) : undefined,
  });

  const { data: campaigns } = trpc.reporting.campaigns.useQuery();

  const presets: { label: string; value: DatePreset }[] = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 14 Days", value: "14d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 90 Days", value: "90d" },
    { label: "Custom", value: "custom" },
  ];

  const smsCards = [
    { label: "SMS Sent", value: stats?.smsSent ?? 0, icon: Send, color: "text-blue-500", bg: "bg-blue-500/10", format: "number" },
    { label: "SMS Segments Sent", value: stats?.smsSegmentsSent ?? 0, icon: MessageSquare, color: "text-sky-500", bg: "bg-sky-500/10", format: "number" },
    { label: "Carrier Block Rate", value: stats?.carrierBlockRate ?? 0, icon: PhoneOff, color: "text-red-500", bg: "bg-red-500/10", format: "percent" },
    { label: "Replies Received", value: stats?.repliesReceived ?? 0, icon: MessageSquare, color: "text-green-500", bg: "bg-green-500/10", format: "number" },
    { label: "Delivery Rate", value: stats?.deliveryRate ?? 0, icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10", format: "percent" },
    { label: "Opt-Out Rate", value: stats?.optOutRate ?? 0, icon: PhoneOff, color: "text-orange-500", bg: "bg-orange-500/10", format: "percent" },
    { label: "AI Filtering Rate", value: stats?.aiFilteringRate ?? 0, icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10", format: "percent" },
    { label: "Reply Rate", value: stats?.replyRate ?? 0, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", format: "percent" },
    { label: "Median Response Time", value: stats?.medianResponseTime ?? 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", format: "time" },
  ];

  const leadCards = [
    { label: "Leads", value: stats?.leads ?? 0, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", format: "number" },
    { label: "Contacts", value: stats?.contacts ?? 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", format: "number" },
    { label: "SMS-to-Lead Rate", value: stats?.smsToLeadRate ?? 0, icon: BarChart2, color: "text-violet-500", bg: "bg-violet-500/10", format: "percent" },
    { label: "Contact-to-Lead Rate", value: stats?.contactToLeadRate ?? 0, icon: BarChart2, color: "text-emerald-500", bg: "bg-emerald-500/10", format: "percent" },
  ];

  function formatValue(value: number, format: string) {
    if (format === "percent") return `${value}%`;
    if (format === "time") {
      if (value === 0) return "N/A";
      const mins = Math.floor(value / 60);
      return mins > 0 ? `${mins}m` : `${value}s`;
    }
    return value.toLocaleString();
  }

  function handleExportCSV() {
    if (!stats) return;
    const rows = [
      ["Metric", "Value"],
      ["SMS Sent", stats.smsSent],
      ["SMS Segments Sent", stats.smsSegmentsSent],
      ["Carrier Block Rate", `${stats.carrierBlockRate}%`],
      ["Replies Received", stats.repliesReceived],
      ["Delivery Rate", `${stats.deliveryRate}%`],
      ["Opt-Out Rate", `${stats.optOutRate}%`],
      ["AI Filtering Rate", `${stats.aiFilteringRate}%`],
      ["Reply Rate", `${stats.replyRate}%`],
      ["Median Response Time", stats.medianResponseTime],
      ["Leads", stats.leads],
      ["Contacts", stats.contacts],
      ["SMS-to-Lead Rate", `${stats.smsToLeadRate}%`],
      ["Contact-to-Lead Rate", `${stats.contactToLeadRate}%`],
      ["Standard Campaigns", stats.standardCampaigns],
      ["Keyword Campaigns", stats.keywordCampaigns],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${toInputDate(dateRange.start)}-to-${toInputDate(dateRange.end)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  }

  const StatCard = ({ card }: { card: { label: string; value: number; icon: React.ElementType; color: string; bg: string; format: string } }) => {
    const Icon = card.icon;
    return (
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">
                {card.label}
              </p>
              <p className="text-2xl font-bold tracking-tight">
                {isLoading ? (
                  <span className="inline-block w-14 h-7 bg-muted animate-pulse rounded" />
                ) : (
                  formatValue(card.value, card.format)
                )}
              </p>
            </div>
            <div className={`p-2 rounded-lg shrink-0 ml-2 ${card.bg}`}>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analyze your SMS performance across any date range
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={!stats}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                preset === p.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 px-3 text-sm rounded-md border border-border bg-background text-foreground"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 px-3 text-sm rounded-md border border-border bg-background text-foreground"
            />
          </div>
        )}

        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder="All Campaigns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Campaigns</SelectItem>
            {campaigns?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Campaign Summary Badges */}
      {stats && (
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-xs">
            {stats.standardCampaigns} Standard Campaign{stats.standardCampaigns !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-xs">
            {stats.keywordCampaigns} Keyword Campaign{stats.keywordCampaigns !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="messaging">
        <TabsList className="h-9">
          <TabsTrigger value="messaging" className="text-sm gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Messaging
          </TabsTrigger>
          <TabsTrigger value="calling" className="text-sm gap-2" disabled>
            <Phone className="h-3.5 w-3.5" />
            Calling
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="space-y-6 mt-4">
          {/* SMS Performance */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              SMS Performance
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {smsCards.map((card) => (
                <StatCard key={card.label} card={card} />
              ))}
            </div>
          </div>

          {/* Leads & Contacts */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Leads &amp; Contacts
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {leadCards.map((card) => (
                <StatCard key={card.label} card={card} />
              ))}
            </div>
          </div>

          {/* Campaign Breakdown Table */}
          {campaigns && campaigns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Campaign Breakdown
              </p>
              <Card className="border shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {["Campaign", "Sent", "Delivered", "Replied", "Opted Out", "Reply Rate", "Status"].map((h, i) => (
                            <th
                              key={h}
                              className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide ${i === 0 ? "text-left" : "text-right"}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{c.sent.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{c.delivered.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">{c.replied.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-orange-500">{c.optedOut.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-medium">{c.replyRate}%</td>
                            <td className="px-4 py-3 text-right">
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  c.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : c.status === "completed" ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                  : c.status === "scheduled" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                  : "bg-gray-50 text-gray-600"
                                }`}
                              >
                                {c.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calling">
          <div className="text-center py-16 text-muted-foreground">
            <Phone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Calling analytics coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
