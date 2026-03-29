import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Calendar, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

function daysUntil(date: Date | string | null) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function dueBadge(nextDueAt: Date | string | null) {
  const days = daysUntil(nextDueAt);
  if (days === null) return null;
  if (days < 0) return <Badge className="bg-red-500/20 text-red-300 border-red-500/30 border text-xs">Overdue {Math.abs(days)}d</Badge>;
  if (days === 0) return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 border text-xs">Due Today</Badge>;
  if (days <= 3) return <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 border text-xs">Due in {days}d</Badge>;
  return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30 border text-xs">Due in {days}d</Badge>;
}

export default function PullCadence() {
  const utils = trpc.useUtils();
  const { data: cadences = [], isLoading } = trpc.cadence.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "", market: "", propertyType: "", dataSource: "", frequencyDays: "7", notes: "",
  });

  const createCadence = trpc.cadence.create.useMutation({
    onSuccess: () => {
      utils.cadence.list.invalidate();
      setShowCreate(false);
      setForm({ name: "", market: "", propertyType: "", dataSource: "", frequencyDays: "7", notes: "" });
      toast("Pull cadence added");
    },
  });

  const markPulled = trpc.cadence.markPulled.useMutation({
    onSuccess: () => {
      utils.cadence.list.invalidate();
      toast("Marked as pulled — next due date updated");
    },
  });

  const deleteCadence = trpc.cadence.delete.useMutation({
    onSuccess: () => {
      utils.cadence.list.invalidate();
      toast("Cadence removed");
    },
  });

  const overdue = cadences.filter((c: any) => daysUntil(c.nextDueAt) !== null && daysUntil(c.nextDueAt)! < 0);
  const dueToday = cadences.filter((c: any) => daysUntil(c.nextDueAt) === 0);
  const upcoming = cadences.filter((c: any) => daysUntil(c.nextDueAt) !== null && daysUntil(c.nextDueAt)! > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pull Cadence</h1>
          <p className="text-sm text-muted-foreground mt-1">Schedule reminders for when to pull lists by market and property type</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Cadence
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Overdue", count: overdue.length, icon: AlertTriangle, color: "text-red-400" },
          { label: "Due Today", count: dueToday.length, icon: Calendar, color: "text-amber-400" },
          { label: "Upcoming", count: upcoming.length, icon: Clock, color: "text-blue-400" },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <div className="text-2xl font-bold text-foreground">{s.count}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cadence List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : cadences.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No pull cadences yet. Add one to track when to pull your lists.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...overdue, ...dueToday, ...upcoming].map((c: any) => (
            <Card key={c.id} className={`bg-card border-border ${daysUntil(c.nextDueAt) !== null && daysUntil(c.nextDueAt)! < 0 ? "border-red-500/30" : daysUntil(c.nextDueAt) === 0 ? "border-amber-500/30" : ""}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {dueBadge(c.nextDueAt)}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Market: {c.market}</span>
                    <span>Type: {c.propertyType}</span>
                    {c.dataSource && <span>Source: {c.dataSource}</span>}
                    <span>Every {c.frequencyDays} days</span>
                  </div>
                  {c.lastPulledAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Last pulled: {new Date(c.lastPulledAt).toLocaleDateString()}
                    </div>
                  )}
                  {c.notes && <div className="text-xs text-muted-foreground mt-1 italic">{c.notes}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => markPulled.mutate({ id: c.id })} disabled={markPulled.isPending} className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Mark Pulled
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCadence.mutate({ id: c.id })} className="text-muted-foreground hover:text-red-400">×</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Pull Cadence</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tarrant Tax Delinquent" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Market *</Label><Input value={form.market} onChange={e => setForm(f => ({ ...f, market: e.target.value }))} placeholder="Tarrant County, TX" /></div>
              <div><Label>Property Type *</Label><Input value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} placeholder="SFR, Land, etc." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Source</Label><Input value={form.dataSource} onChange={e => setForm(f => ({ ...f, dataSource: e.target.value }))} placeholder="County Website" /></div>
              <div>
                <Label>Pull Every (days)</Label>
                <Select value={form.frequencyDays} onValueChange={v => setForm(f => ({ ...f, frequencyDays: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Daily</SelectItem>
                    <SelectItem value="7">Weekly</SelectItem>
                    <SelectItem value="14">Bi-weekly</SelectItem>
                    <SelectItem value="30">Monthly</SelectItem>
                    <SelectItem value="90">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createCadence.mutate({ name: form.name, market: form.market, propertyType: form.propertyType, dataSource: form.dataSource || undefined, frequencyDays: parseInt(form.frequencyDays), notes: form.notes || undefined })} disabled={createCadence.isPending || !form.name.trim() || !form.market.trim() || !form.propertyType.trim()}>
              {createCadence.isPending ? "Adding..." : "Add Cadence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
