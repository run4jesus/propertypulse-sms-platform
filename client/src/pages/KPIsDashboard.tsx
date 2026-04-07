import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Target, TrendingUp, DollarSign, MessageSquare, Edit2,
  Plus, Trash2, Users, BarChart3, Percent, ArrowUpRight,
  Briefcase, Database, Cpu, MoreHorizontal
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt$(val?: number | null, decimals = 0) {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}
function fmtPct(val?: number | null) {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
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

const CATEGORY_CONFIG = {
  va:       { label: "VA Costs",       icon: Users,         color: "text-violet-400", bg: "bg-violet-500/10" },
  software: { label: "Software",       icon: Cpu,           color: "text-blue-400",   bg: "bg-blue-500/10" },
  data:     { label: "Data / Lists",   icon: Database,      color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  other:    { label: "Other",          icon: MoreHorizontal, color: "text-zinc-400",  bg: "bg-zinc-500/10" },
} as const;
type CostCategory = keyof typeof CATEGORY_CONFIG;

// ─── Cost Entry Row ───────────────────────────────────────────────────────────
function CostRow({
  entry, onDelete, onEdit,
}: {
  entry: { id: number; category: string; label: string; amount: number };
  onDelete: () => void;
  onEdit: () => void;
}) {
  const cfg = CATEGORY_CONFIG[entry.category as CostCategory] ?? CATEGORY_CONFIG.other;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 group">
      <div className={`h-7 w-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
        <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.label}</p>
        <p className="text-xs text-muted-foreground">{cfg.label}</p>
      </div>
      <p className="text-sm font-semibold tabular-nums">{fmt$(entry.amount / 100)}</p>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Add/Edit Cost Dialog ─────────────────────────────────────────────────────
function CostDialog({
  open, onClose, month, year,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  month: number;
  year: number;
  editing?: { id: number; category: string; label: string; amount: number } | null;
}) {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<CostCategory>((editing?.category as CostCategory) ?? "va");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount / 100) : "");

  const upsert = trpc.kpis.upsertCost.useMutation({
    onSuccess: () => {
      utils.kpis.getCosts.invalidate();
      utils.kpis.getMetrics.invalidate();
      toast.success(editing ? "Cost updated" : "Cost added");
      onClose();
    },
    onError: () => toast.error("Failed to save cost entry"),
  });

  const handleSave = () => {
    if (!label.trim() || !amount) return;
    upsert.mutate({
      id: editing?.id,
      month, year,
      category,
      label: label.trim(),
      amount: parseFloat(amount),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Cost Entry" : "Add Cost Entry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as CostCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_CONFIG) as [CostCategory, typeof CATEGORY_CONFIG[CostCategory]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Label / Description</Label>
            <Input
              placeholder={
                category === "va" ? "e.g. VA — Maria (weekly)" :
                category === "software" ? "e.g. BatchSkipTracing" :
                category === "data" ? "e.g. LandPortal subscription" :
                "e.g. Misc expense"
              }
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <Label>Amount ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 250.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!label.trim() || !amount || upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : editing ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main KPIs Dashboard ──────────────────────────────────────────────────────
export default function KPIsDashboard() {
  const utils = trpc.useUtils();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data: goal } = trpc.goals.get.useQuery({ month: selectedMonth, year: selectedYear });
  const { data: dashStats } = trpc.reporting.dashboard.useQuery(undefined);
  const { data: dealStats } = trpc.deals.stats.useQuery();
  const { data: costs = [] } = trpc.kpis.getCosts.useQuery({ month: selectedMonth, year: selectedYear });
  const { data: metrics } = trpc.kpis.getMetrics.useQuery({ month: selectedMonth, year: selectedYear });

  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalForm, setGoalForm] = useState({ targetDeals: "", targetRevenue: "" });
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<{ id: number; category: string; label: string; amount: number } | null>(null);

  const upsertGoal = trpc.goals.upsert.useMutation({
    onSuccess: () => { utils.goals.get.invalidate(); setShowGoalEdit(false); toast.success("Goals updated"); },
  });

  const deleteCost = trpc.kpis.deleteCost.useMutation({
    onSuccess: () => { utils.kpis.getCosts.invalidate(); utils.kpis.getMetrics.invalidate(); },
    onError: () => toast.error("Failed to delete cost entry"),
  });

  function openGoalEdit() {
    setGoalForm({ targetDeals: String(goal?.targetDeals ?? ""), targetRevenue: String(goal?.targetRevenue ?? "") });
    setShowGoalEdit(true);
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const dealsProgress = dealStats?.closedDeals ?? 0;
  const revenueProgress = dealStats?.totalRevenue ?? 0;
  const targetDeals = goal?.targetDeals ?? 0;
  const targetRevenue = goal?.targetRevenue ?? 0;
  const dealsPct = targetDeals > 0 ? Math.min(100, Math.round((dealsProgress / targetDeals) * 100)) : 0;
  const revenuePct = targetRevenue > 0 ? Math.min(100, Math.round((revenueProgress / targetRevenue) * 100)) : 0;

  // Spend by category
  const spendByCategory = costs.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] ?? 0) + c.amount / 100;
    return acc;
  }, {} as Record<string, number>);
  const totalSpend = Object.values(spendByCategory).reduce((a, b) => a + b, 0);

  // Live metrics
  const liveMetrics = [
    { label: "Messages Sent",   value: dashStats?.totalSent ?? 0,                                     icon: MessageSquare, color: "text-blue-400" },
    { label: "Delivered",       value: dashStats?.totalDelivered ?? 0,                                 icon: TrendingUp,    color: "text-indigo-400" },
    { label: "Replies",         value: dashStats?.totalReceived ?? 0,                                  icon: MessageSquare, color: "text-violet-400" },
    { label: "Reply Rate",      value: dashStats?.replyRate ? `${Math.round(dashStats.replyRate)}%` : "0%", icon: TrendingUp, color: "text-purple-400" },
    { label: "Needs Offer",     value: dashStats?.needsOffer ?? 0,                                     icon: Target,        color: "text-amber-400" },
    { label: "Leads Pushed",    value: dashStats?.leadsPushed ?? 0,                                    icon: DollarSign,    color: "text-emerald-400" },
    { label: "Active Deals",    value: dealStats?.activeDeals ?? 0,                                    icon: TrendingUp,    color: "text-blue-400" },
    { label: "Deals Closed",    value: dealStats?.closedDeals ?? 0,                                    icon: Target,        color: "text-green-400" },
    { label: "Pipeline Value",  value: fmt$(dealStats?.pipelineValue),                                 icon: DollarSign,    color: "text-cyan-400" },
    { label: "Total Revenue",   value: fmt$(dealStats?.totalRevenue),                                  icon: DollarSign,    color: "text-green-400" },
    { label: "Avg Assignment",  value: fmt$(dealStats?.avgFee),                                        icon: DollarSign,    color: "text-teal-400" },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Goals, costs, and business performance metrics</p>
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
          <Button onClick={openGoalEdit} variant="outline" size="sm" className="gap-2">
            <Edit2 className="h-4 w-4" /> Set Goals
          </Button>
        </div>
      </div>

      {/* ── Cost KPI Cards ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {MONTHS[selectedMonth - 1]} {selectedYear} — Cost Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total Spend */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-red-400" />
                <span className="text-xs text-muted-foreground">Total Spend</span>
              </div>
              <p className="text-2xl font-bold">{fmt$(totalSpend)}</p>
              <p className="text-xs text-muted-foreground mt-1">{costs.length} entries</p>
            </CardContent>
          </Card>

          {/* Cost Per Lead */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Cost Per Lead</span>
              </div>
              <p className="text-2xl font-bold">{fmt$(metrics?.costPerLead, 2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{metrics?.leads ?? 0} leads</p>
            </CardContent>
          </Card>

          {/* Cost Per Deal */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Cost Per Deal</span>
              </div>
              <p className="text-2xl font-bold">{fmt$(metrics?.costPerDeal, 2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{metrics?.deals ?? 0} deals closed</p>
            </CardContent>
          </Card>

          {/* Leads → Deal Rate */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Lead → Deal Rate</span>
              </div>
              <p className="text-2xl font-bold">{fmtPct(metrics?.leadsToDealRate)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.deals ?? 0} / {metrics?.leads ?? 0} leads
              </p>
            </CardContent>
          </Card>

          {/* ROI */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-muted-foreground">ROI</span>
              </div>
              <p className={`text-2xl font-bold ${metrics?.roi != null && metrics.roi >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmtPct(metrics?.roi)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Revenue vs. spend</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Monthly Goals ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {MONTHS[selectedMonth - 1]} {selectedYear} — Goals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-sm font-medium">Deals Closed</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Target: {targetDeals > 0 ? targetDeals : "Not set"}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{dealsProgress}</div>
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

          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-sm font-medium">Revenue</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Target: {targetRevenue > 0 ? fmt$(targetRevenue) : "Not set"}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{fmt$(revenueProgress)}</div>
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

      {/* ── Cost Tracking ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {MONTHS[selectedMonth - 1]} {selectedYear} — Cost Breakdown
          </h2>
          <Button size="sm" onClick={() => { setEditingCost(null); setCostDialogOpen(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Add Cost
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Category summary */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">By Category</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {totalSpend === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No costs entered yet for this period.</p>
              ) : (
                <div className="space-y-3">
                  {(Object.entries(CATEGORY_CONFIG) as [CostCategory, typeof CATEGORY_CONFIG[CostCategory]][]).map(([key, cfg]) => {
                    const amount = spendByCategory[key] ?? 0;
                    const pct = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            <span className="text-sm">{cfg.label}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{fmt$(amount)}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${cfg.bg.replace("/10", "/60")}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-border flex justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-sm font-bold">{fmt$(totalSpend)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line items */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {costs.length === 0 ? (
                <div className="py-6 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No costs logged for {MONTHS[selectedMonth - 1]}.</p>
                  <Button
                    variant="outline" size="sm" className="mt-3 gap-1"
                    onClick={() => { setEditingCost(null); setCostDialogOpen(true); }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add first entry
                  </Button>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {costs.map((c) => (
                    <CostRow
                      key={c.id}
                      entry={c}
                      onDelete={() => deleteCost.mutate({ id: c.id })}
                      onEdit={() => { setEditingCost(c); setCostDialogOpen(true); }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Live Metrics ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Metrics (All Time)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {liveMetrics.map(m => (
            <Card key={m.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <m.icon className={`h-7 w-7 ${m.color} shrink-0`} />
                <div>
                  <div className="text-xl font-bold">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <Dialog open={showGoalEdit} onOpenChange={setShowGoalEdit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Goals — {MONTHS[selectedMonth - 1]} {selectedYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Target Deals Closed</Label>
              <Input type="number" value={goalForm.targetDeals} onChange={e => setGoalForm(f => ({ ...f, targetDeals: e.target.value }))} placeholder="e.g. 5" />
            </div>
            <div>
              <Label>Target Revenue ($)</Label>
              <Input type="number" value={goalForm.targetRevenue} onChange={e => setGoalForm(f => ({ ...f, targetRevenue: e.target.value }))} placeholder="e.g. 50000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalEdit(false)}>Cancel</Button>
            <Button
              onClick={() => upsertGoal.mutate({
                month: selectedMonth, year: selectedYear,
                targetDeals: goalForm.targetDeals ? parseInt(goalForm.targetDeals) : 0,
                targetRevenue: goalForm.targetRevenue ? parseInt(goalForm.targetRevenue) : 0,
              })}
              disabled={upsertGoal.isPending}
            >
              {upsertGoal.isPending ? "Saving…" : "Save Goals"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CostDialog
        open={costDialogOpen}
        onClose={() => { setCostDialogOpen(false); setEditingCost(null); }}
        month={selectedMonth}
        year={selectedYear}
        editing={editingCost}
      />
    </div>
  );
}
