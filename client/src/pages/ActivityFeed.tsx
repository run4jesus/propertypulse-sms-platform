import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Activity, Zap, MessageSquare, Users, TrendingUp, Clock } from "lucide-react";

const TYPE_COLORS: Record<string, string> = {
  campaign: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  message: "bg-green-500/20 text-green-400 border-green-500/30",
  lead: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  deal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  system: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  campaign: Zap,
  message: MessageSquare,
  lead: Users,
  deal: TrendingUp,
  system: Activity,
};

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ActivityFeed() {
  const [tab, setTab] = useState<"all" | "campaigns">("all");

  const { data: rawEvents, isLoading } = trpc.reporting.activityFeed.useQuery({ type: tab === "campaigns" ? "campaign" : undefined });
  const events = (rawEvents ?? []) as Array<{ id: number; type: string; description: string; createdAt: number; eventName?: string }>;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Activity Feed</h1>
            <p className="text-sm text-muted-foreground">All platform events in real time</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {(["all", "campaigns"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All" : "Campaigns"}
            </button>
          ))}
        </div>

        {/* Events */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Events will appear here as your platform runs</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const Icon = TYPE_ICONS[event.type] ?? Activity;
              const colorClass = TYPE_COLORS[event.type] ?? TYPE_COLORS.system;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:border-border/80 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{event.description}</p>
                    {event.eventName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.eventName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-xs border ${colorClass}`}>
                      {event.type}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {timeAgo(event.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
