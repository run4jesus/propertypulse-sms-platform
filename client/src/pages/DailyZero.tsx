import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Star, CheckCircle2, Circle, MessageSquare, ClipboardList, Zap, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

type DailyItem = {
  id: string;
  type: "needs_offer" | "task" | "unread";
  label: string;
  detail?: string;
  link?: string;
  done: boolean;
};

export default function DailyZero() {
  const [, setLocation] = useLocation();
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const { data: rawItems, isLoading, refetch } = trpc.tasks.dailyZero.useQuery();
  const items: DailyItem[] = (rawItems ?? []) as DailyItem[];

  const total = items.length;
  const doneCount = items.filter(i => completed.has(i.id) || i.done).length;
  const pct = total === 0 ? 100 : Math.round((doneCount / total) * 100);

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = () => {
    setCompleted(new Set(items.map(i => i.id)));
    toast.success("Daily Zero achieved! 🎉");
  };

  const TYPE_ICON: Record<string, React.ElementType> = {
    needs_offer: MessageSquare,
    task: ClipboardList,
    unread: Zap,
  };

  const TYPE_COLOR: Record<string, string> = {
    needs_offer: "text-yellow-400",
    task: "text-blue-400",
    unread: "text-green-400",
  };

  const TYPE_LABEL: Record<string, string> = {
    needs_offer: "Needs Offer",
    task: "Task",
    unread: "Unread",
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Daily Zero</h1>
              <p className="text-sm text-muted-foreground">Clear your queue every day</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            {total > 0 && doneCount < total && (
              <Button size="sm" onClick={clearAll}>
                Mark All Done
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Today's Progress</span>
            <span className={`text-sm font-bold ${pct === 100 ? "text-green-400" : "text-primary"}`}>
              {doneCount}/{total} cleared
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct === 100 && (
            <p className="text-xs text-green-400 mt-2 text-center font-medium">🎉 Daily Zero achieved!</p>
          )}
        </div>

        {/* Items */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500/40 mb-4" />
            <p className="text-lg font-semibold text-green-400">You're at zero!</p>
            <p className="text-sm text-muted-foreground mt-1">No pending items. Great work.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const isDone = completed.has(item.id) || item.done;
              const Icon = TYPE_ICON[item.type] ?? ClipboardList;
              const colorClass = TYPE_COLOR[item.type] ?? "text-muted-foreground";
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
                    isDone
                      ? "bg-card/40 border-border/40 opacity-60"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                  onClick={() => toggle(item.id)}
                >
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-card border border-border`}>
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </Badge>
                    {item.link && !isDone && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setLocation(item.link!); }}
                      >
                        Open →
                      </Button>
                    )}
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
