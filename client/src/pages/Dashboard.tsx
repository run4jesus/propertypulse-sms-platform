import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare,
  Send,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  Reply,
  PhoneOff,
  Activity,
  HandCoins,
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  // Date range presets
  type RangePreset = "today" | "7d" | "30d" | "month" | "custom";
  const [preset, setPreset] = useState<RangePreset>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const { dateFrom, dateTo, presetLabel } = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
    if (preset === "today") {
      return { dateFrom: startOfDay(now), dateTo: endOfDay(now), presetLabel: "Today" };
    } else if (preset === "7d") {
      const from = new Date(now); from.setDate(now.getDate() - 6);
      return { dateFrom: startOfDay(from), dateTo: endOfDay(now), presetLabel: "Last 7 Days" };
    } else if (preset === "30d") {
      const from = new Date(now); from.setDate(now.getDate() - 29);
      return { dateFrom: startOfDay(from), dateTo: endOfDay(now), presetLabel: "Last 30 Days" };
    } else if (preset === "month") {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: startOfDay(from), dateTo: endOfDay(now), presetLabel: "This Month" };
    } else {
      // custom
      const from = customRange?.from ?? startOfDay(now);
      const to = customRange?.to ?? endOfDay(now);
      const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        dateFrom: startOfDay(from),
        dateTo: endOfDay(to),
        presetLabel: customRange?.from
          ? `${fmt(customRange.from)}${customRange.to ? ` – ${fmt(customRange.to)}` : ""}`
          : "Custom Range",
      };
    }
  }, [preset, customRange]);

  const { data: stats, isLoading } = trpc.reporting.dashboard.useQuery({
    startDate: dateFrom,
    endDate: dateTo,
  });

  const { data: campaigns } = trpc.reporting.campaigns.useQuery();
  const { data: conversations } = trpc.conversations.list.useQuery({ limit: 5 });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statCards = [
    {
      label: "SMS Sent",
      value: stats?.totalSent ?? 0,
      icon: Send,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    {
      label: "Replies",
      value: stats?.totalReceived ?? 0,
      icon: Reply,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-500/10",
      iconColor: "text-green-500",
    },
    {
      label: "Reply Rate",
      value: `${stats?.replyRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
    {
      label: "Delivery Rate",
      value: `${stats?.deliveryRate ?? 0}%`,
      icon: CheckCircle2,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-500/10",
      iconColor: "text-violet-500",
    },
    {
      label: "Delivered",
      value: stats?.totalDelivered ?? 0,
      icon: Activity,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-500/10",
      iconColor: "text-sky-500",
    },
    {
      label: "Total Contacts",
      value: stats?.totalContacts ?? 0,
      icon: Users,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      iconColor: "text-amber-500",
    },
    {
      label: "Active Campaigns",
      value: stats?.activeCampaigns ?? 0,
      icon: Zap,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-500/10",
      iconColor: "text-rose-500",
    },
    {
      label: "All Campaigns",
      value: stats?.totalCampaigns ?? 0,
      icon: PhoneOff,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-500/10",
      iconColor: "text-orange-500",
    },
    {
      label: "Needs Offer",
      value: stats?.needsOffer ?? 0,
      icon: HandCoins,
      color: "text-orange-700 font-bold",
      bg: "bg-orange-100 dark:bg-orange-500/20",
      iconColor: "text-orange-600",
      href: "/messenger",
    },
    {
      label: "Leads Pushed",
      value: stats?.leadsPushed ?? 0,
      icon: ArrowUpRight,
      color: "text-violet-700 font-bold",
      bg: "bg-violet-100 dark:bg-violet-500/20",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                <CalendarIcon className="h-3.5 w-3.5" />
                {presetLabel}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setPreset("today")}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreset("7d")}>
                Last 7 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreset("30d")}>
                Last 30 Days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreset("month")}>
                This Month
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setPreset("custom"); setCustomOpen(true); }}>
                Custom Range...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Custom range calendar popover */}
          <Popover open={customOpen} onOpenChange={setCustomOpen}>
            <PopoverTrigger asChild>
              <span />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={(range) => {
                  setCustomRange(range);
                  if (range?.from && range?.to) setCustomOpen(false);
                }}
                numberOfMonths={2}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>

          <Button onClick={() => setLocation("/campaigns")}>
            <Zap className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* KPI Grid — 4 columns on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const isNeedsOffer = card.label === "Needs Offer";
          const isLeadsPushed = card.label === "Leads Pushed";
          return (
            <Card
              key={card.label}
              className={`border shadow-sm transition-colors ${
                isNeedsOffer
                  ? "border-orange-300 dark:border-orange-500/40 cursor-pointer hover:border-orange-400"
                  : isLeadsPushed
                  ? "border-violet-300 dark:border-violet-500/40"
                  : ""
              }`}
              onClick={isNeedsOffer ? () => setLocation("/messenger") : undefined}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className={`text-xs font-medium uppercase tracking-wide ${
                      isNeedsOffer ? "text-orange-600 dark:text-orange-400"
                      : isLeadsPushed ? "text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground"
                    }`}>
                      {card.label}
                    </p>
                    <p className={`text-2xl font-bold tracking-tight ${
                      isNeedsOffer && (stats?.needsOffer ?? 0) > 0 ? "text-orange-600 dark:text-orange-400"
                      : isLeadsPushed && (stats?.leadsPushed ?? 0) > 0 ? "text-violet-600 dark:text-violet-400"
                      : ""
                    }`}>
                      {isLoading ? (
                        <span className="inline-block w-12 h-7 bg-muted animate-pulse rounded" />
                      ) : typeof card.value === "number" ? (
                        card.value.toLocaleString()
                      ) : (
                        card.value
                      )}
                    </p>
                    {isNeedsOffer && (stats?.needsOffer ?? 0) > 0 && (
                      <p className="text-xs text-orange-500">Click to view in Messenger</p>
                    )}
                    {isLeadsPushed && (
                      <p className="text-xs text-violet-500">Total pushed to Podio</p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Campaigns */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Campaigns</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setLocation("/campaigns")}
            >
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {campaigns && campaigns.length > 0 ? (
              campaigns.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.sent} sent · {c.replied} replied · {c.replyRate}% reply rate
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ml-2 ${
                      c.status === "active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : c.status === "completed"
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                        : c.status === "scheduled"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        : "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400"
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
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setLocation("/campaigns")}
                >
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
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setLocation("/messenger")}
            >
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {conversations && conversations.length > 0 ? (
              conversations.slice(0, 5).map((row) => {
                const contact = row.contact;
                const conv = row.conversation;
                const name =
                  [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
                  contact.phone;
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
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setLocation("/contacts")}
                >
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
