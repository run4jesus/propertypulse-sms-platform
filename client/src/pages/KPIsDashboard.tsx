import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Target, TrendingUp, DollarSign, MessageSquare, Edit2 } from "lucide-react";

function formatCurrency(val?: number | null) {
  if (!val) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function ProgressBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2 mt-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function KPIsDashboard() {
  const utils = trpc.useUtils();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: goal } = trpc.goals.get.useQuery({ month: selectedMonth, year: selectedYear });
  const { data: dashStats } = trpc.reporting.dashboard.useQuery(undefined);
  const { data: dealStats } = trpc.deals.stats.useQuery();

  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ targetDeals: "", targetRevenue: "" });

  const upsertGoal = trpc.goals.upsert.useMutation({
    onSuccess: () => {
      utils.goals.get.invalidate();
      setShowEdit(false);
      toast("Goals updated");
    },
  });

  function openEdit() {
    setForm({
      targetDeals: String(goal?.targetDeals ?? ""),
      targetRevenue: String(goal?.targetRevenue ?? ""),
    });
    setShowEdit(true);
  }

  // Live metrics
  const liveMetrics = [
    { label: "Messages Sent", value: dashStats?.totalSent ?? 0, icon: MessageSquare, color: "text-blue-400" },
    { label: "Delivered", value: dashStats?.totalDelivered ?? 0, icon: TrendingUp, color: "text-indigo-400" },
    { label: "Replies", value: dashStats?.totalReceived ?? 0, icon: MessageSquare, color: "text-violet-400" },
    {
      label: "Reply Rate",
      value: dashStats?.replyRate ? `${Math.round(dashStats.replyRate)}%` : "0%",
      icon: TrendingUp,
      color: "text-purple-400",
    },
    { label: "Needs Offer", value: dashStats?.needsOffer ?? 0, icon: Target, color: "text-amber-400" },
    { label: "Leads Pushed", value: dashStats?.leadsPushed ?? 0, icon: DollarSign, color: "text-emerald-400" },
    { label: "Active Deals", value: dealStats?.activeDeals ?? 0, icon: TrendingUp, color: "text-blue-400" },
    { label: "Deals Closed", value: dealStats?.closedDeals ?? 0, icon: Target, color: "text-green-400" },
    { label: "Pipeline Value", value: formatCurrency(dealStats?.pipelineValue), icon: DollarSign, color: "text-cyan-400" },
    { label: "Total Revenue", value: formatCurrency(dealStats?.totalRevenue), icon: DollarSign, color: "text-green-400" },
    { label: "Avg Assignment Fee", value: formatCurrency(dealStats?.avgFee), icon: DollarSign, color: "text-teal-400" },
  ];

  const dealsProgress = dealStats?.closedDeals ?? 0;
  const revenueProgress = dealStats?.totalRevenue ?? 0;
  const targetDeals = goal?.targetDeals ?? 0;
  const targetRevenue = goal?.targetRevenue ?? 0;
  const dealsPct = targetDeals > 0 ? Math.min(100, Math.round((dealsProgress / targetDeals) * 100)) : 0;
  const revenuePct = targetRevenue > 0 ? Math.min(100, Math.round((revenueProgress / targetRevenue) * 100)) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track goals, conversion rates, and business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="text-sm bg-card border border-border rounded px-2 py-1 text-foreground"
          >
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="text-sm bg-card border border-border rounded px-2 py-1 text-foreground"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={openEdit} variant="outline" className="gap-2">
            <Edit2 className="h-4 w-4" /> Set Goals
          </Button>
        </div>
      </div>

      {/* Monthly Goals */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {MONTHS[selectedMonth - 1]} {selectedYear} Goals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Deals Closed Goal */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-sm font-medium text-foreground">Deals Closed</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Target: {targetDeals > 0 ? targetDeals : "Not set"}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{dealsProgress}</div>
                  <div className={`text-xs font-medium ${dealsPct >= 100 ? "text-green-400" : "text-muted-foreground"}`}>
                    {targetDeals > 0 ? `${dealsPct}%` : "—"}
                  </div>
                </div>
              </div>
              {targetDeals > 0 && (
                <ProgressBar value={dealsProgress} max={targetDeals} color={dealsPct >= 100 ? "bg-green-500" : dealsPct >= 60 ? "bg-amber-500" : "bg-primary"} />
              )}
            </CardContent>
          </Card>

          {/* Revenue Goal */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-sm font-medium text-foreground">Revenue</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Target: {targetRevenue > 0 ? formatCurrency(targetRevenue) : "Not set"}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{formatCurrency(revenueProgress)}</div>
                  <div className={`text-xs font-medium ${revenuePct >= 100 ? "text-green-400" : "text-muted-foreground"}`}>
                    {targetRevenue > 0 ? `${revenuePct}%` : "—"}
                  </div>
                </div>
              </div>
              {targetRevenue > 0 && (
                <ProgressBar value={revenueProgress} max={targetRevenue} color={revenuePct >= 100 ? "bg-green-500" : revenuePct >= 60 ? "bg-amber-500" : "bg-emerald-500"} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Metrics (All Time)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {liveMetrics.map(m => (
            <Card key={m.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <m.icon className={`h-7 w-7 ${m.color} shrink-0`} />
                <div>
                  <div className="text-xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Goals Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Goals — {MONTHS[selectedMonth - 1]} {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Target Deals Closed</Label>
              <Input type="number" value={form.targetDeals} onChange={e => setForm(f => ({ ...f, targetDeals: e.target.value }))} placeholder="e.g. 5" />
            </div>
            <div>
              <Label>Target Revenue ($)</Label>
              <Input type="number" value={form.targetRevenue} onChange={e => setForm(f => ({ ...f, targetRevenue: e.target.value }))} placeholder="e.g. 50000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button
              onClick={() => upsertGoal.mutate({
                month: selectedMonth,
                year: selectedYear,
                targetDeals: form.targetDeals ? parseInt(form.targetDeals) : 0,
                targetRevenue: form.targetRevenue ? parseInt(form.targetRevenue) : 0,
              })}
              disabled={upsertGoal.isPending}
            >
              {upsertGoal.isPending ? "Saving..." : "Save Goals"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
