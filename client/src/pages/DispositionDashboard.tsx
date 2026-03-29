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
import { Plus, Users, DollarSign, TrendingUp } from "lucide-react";

const DISPO_STATUSES = [
  { id: "marketing", label: "Marketing", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { id: "buyer_found", label: "Buyer Found", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { id: "under_contract", label: "Under Contract", color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  { id: "closed", label: "Closed", color: "bg-green-500/20 text-green-300 border-green-500/30" },
];

function formatCurrency(val?: number | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

export default function DispositionDashboard() {
  const utils = trpc.useUtils();
  const { data: dispositions = [], isLoading } = trpc.dispositions.list.useQuery();
  const { data: deals = [] } = trpc.deals.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedDispo, setSelectedDispo] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    dealId: "", buyerName: "", buyerEmail: "", buyerPhone: "",
    listPrice: "", salePrice: "", assignmentFee: "", marketingNotes: "",
  });

  const createDispo = trpc.dispositions.create.useMutation({
    onSuccess: () => {
      utils.dispositions.list.invalidate();
      setShowCreate(false);
      setForm({ dealId: "", buyerName: "", buyerEmail: "", buyerPhone: "", listPrice: "", salePrice: "", assignmentFee: "", marketingNotes: "" });
      toast("Disposition created");
    },
  });

  const updateDispo = trpc.dispositions.update.useMutation({
    onSuccess: () => {
      utils.dispositions.list.invalidate();
      setSelectedDispo(null);
      toast("Disposition updated");
    },
  });

  const filtered = filterStatus === "all" ? dispositions : dispositions.filter((d: any) => d.status === filterStatus);

  const totalRevenue = dispositions.filter((d: any) => d.status === "closed").reduce((sum: number, d: any) => sum + (d.assignmentFee ?? 0), 0);
  const activeDispo = dispositions.filter((d: any) => d.status !== "closed").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disposition Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track buyer activity and dispo status on all deals</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Dispo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Dispos", value: activeDispo, icon: TrendingUp, color: "text-blue-400" },
          { label: "Closed", value: dispositions.filter((d: any) => d.status === "closed").length, icon: Users, color: "text-green-400" },
          { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-emerald-400" },
        ].map(s => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus("all")}
          className={`text-xs px-3 py-1 rounded-full border transition-all ${filterStatus === "all" ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          All ({dispositions.length})
        </button>
        {DISPO_STATUSES.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(s.id)}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${filterStatus === s.id ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            {s.label} ({dispositions.filter((d: any) => d.status === s.id).length})
          </button>
        ))}
      </div>

      {/* Dispo List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No dispositions yet. Add one to track your buyer activity.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d: any) => {
            const deal = deals.find((dl: any) => dl.id === d.dealId);
            const statusInfo = DISPO_STATUSES.find(s => s.id === d.status);
            return (
              <Card key={d.id} className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedDispo(d)}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{deal?.title ?? `Deal #${d.dealId}`}</span>
                      {statusInfo && <Badge className={`text-xs border ${statusInfo.color}`}>{statusInfo.label}</Badge>}
                    </div>
                    {deal?.propertyAddress && <div className="text-sm text-muted-foreground">{deal.propertyAddress}</div>}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {d.buyerName && <span>Buyer: {d.buyerName}</span>}
                      {d.buyerPhone && <span>{d.buyerPhone}</span>}
                      {d.buyerEmail && <span>{d.buyerEmail}</span>}
                    </div>
                    {d.marketingNotes && <div className="text-xs text-muted-foreground mt-1 italic">{d.marketingNotes}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    {d.listPrice && <div className="text-xs text-muted-foreground">List: {formatCurrency(d.listPrice)}</div>}
                    {d.salePrice && <div className="text-sm font-medium text-foreground">Sale: {formatCurrency(d.salePrice)}</div>}
                    {d.assignmentFee && <div className="text-xs text-emerald-400">Fee: {formatCurrency(d.assignmentFee)}</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Disposition</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Linked Deal *</Label>
              <Select value={form.dealId} onValueChange={v => setForm(f => ({ ...f, dealId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a deal" /></SelectTrigger>
                <SelectContent>
                  {deals.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Buyer Name</Label><Input value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} /></div>
              <div><Label>Buyer Phone</Label><Input value={form.buyerPhone} onChange={e => setForm(f => ({ ...f, buyerPhone: e.target.value }))} /></div>
              <div><Label>Buyer Email</Label><Input value={form.buyerEmail} onChange={e => setForm(f => ({ ...f, buyerEmail: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>List Price ($)</Label><Input type="number" value={form.listPrice} onChange={e => setForm(f => ({ ...f, listPrice: e.target.value }))} /></div>
              <div><Label>Sale Price ($)</Label><Input type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: e.target.value }))} /></div>
              <div><Label>Assignment Fee ($)</Label><Input type="number" value={form.assignmentFee} onChange={e => setForm(f => ({ ...f, assignmentFee: e.target.value }))} /></div>
            </div>
            <div><Label>Marketing Notes</Label><Textarea value={form.marketingNotes} onChange={e => setForm(f => ({ ...f, marketingNotes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createDispo.mutate({ dealId: parseInt(form.dealId), buyerName: form.buyerName || undefined, buyerEmail: form.buyerEmail || undefined, buyerPhone: form.buyerPhone || undefined, listPrice: form.listPrice ? parseInt(form.listPrice) : undefined, salePrice: form.salePrice ? parseInt(form.salePrice) : undefined, assignmentFee: form.assignmentFee ? parseInt(form.assignmentFee) : undefined, marketingNotes: form.marketingNotes || undefined })} disabled={createDispo.isPending || !form.dealId}>
              {createDispo.isPending ? "Creating..." : "Create Dispo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedDispo && (
        <Dialog open={!!selectedDispo} onOpenChange={() => setSelectedDispo(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Update Disposition</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DISPO_STATUSES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateDispo.mutate({ id: selectedDispo.id, status: s.id as any })}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${selectedDispo.status === s.id ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Buyer:</span> <span className="text-foreground">{selectedDispo.buyerName || "—"}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{selectedDispo.buyerPhone || "—"}</span></div>
                <div><span className="text-muted-foreground">List Price:</span> <span className="text-foreground">{formatCurrency(selectedDispo.listPrice)}</span></div>
                <div><span className="text-muted-foreground">Sale Price:</span> <span className="text-foreground">{formatCurrency(selectedDispo.salePrice)}</span></div>
                <div><span className="text-muted-foreground">Assign Fee:</span> <span className="text-foreground">{formatCurrency(selectedDispo.assignmentFee)}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDispo(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
