import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";

const CONTRACT_STATUSES = [
  { id: "draft", label: "Draft", color: "bg-slate-500", icon: FileText },
  { id: "sent", label: "Sent", color: "bg-blue-500", icon: Clock },
  { id: "signed", label: "Signed", color: "bg-amber-500", icon: CheckCircle2 },
  { id: "executed", label: "Executed", color: "bg-green-600", icon: CheckCircle2 },
  { id: "expired", label: "Expired", color: "bg-orange-500", icon: XCircle },
  { id: "cancelled", label: "Cancelled", color: "bg-red-500", icon: XCircle },
];

const CONTRACT_TYPES = [
  { value: "purchase_agreement", label: "Purchase Agreement" },
  { value: "assignment", label: "Assignment Contract" },
  { value: "double_close", label: "Double Close" },
  { value: "other", label: "Other" },
];

function formatCurrency(val?: number | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function statusBadge(status: string) {
  const s = CONTRACT_STATUSES.find(x => x.id === status);
  if (!s) return null;
  const colors: Record<string, string> = {
    draft: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    signed: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    executed: "bg-green-500/20 text-green-300 border-green-500/30",
    expired: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return <Badge className={`text-xs border ${colors[status] ?? ""}`}>{s.label}</Badge>;
}

export default function ContractManager() {
  const utils = trpc.useUtils();
  const { data: contracts = [], isLoading } = trpc.contracts.list.useQuery();
  const { data: deals = [] } = trpc.deals.list.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    title: "", dealId: "", contractType: "purchase_agreement",
    sellerName: "", buyerName: "", propertyAddress: "",
    contractPrice: "", assignmentFee: "", closingDate: "", notes: "",
  });

  const createContract = trpc.contracts.create.useMutation({
    onSuccess: () => {
      utils.contracts.list.invalidate();
      setShowCreate(false);
      resetForm();
      toast("Contract created");
    },
  });

  const updateContract = trpc.contracts.update.useMutation({
    onSuccess: () => {
      utils.contracts.list.invalidate();
      setSelectedContract(null);
      toast("Contract updated");
    },
  });

  const deleteContract = trpc.contracts.delete.useMutation({
    onSuccess: () => {
      utils.contracts.list.invalidate();
      setSelectedContract(null);
      toast("Contract deleted");
    },
  });

  function resetForm() {
    setForm({ title: "", dealId: "", contractType: "purchase_agreement",
      sellerName: "", buyerName: "", propertyAddress: "",
      contractPrice: "", assignmentFee: "", closingDate: "", notes: "" });
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    createContract.mutate({
      title: form.title,
      dealId: form.dealId ? parseInt(form.dealId) : undefined,
      contractType: form.contractType as any,
      sellerName: form.sellerName || undefined,
      buyerName: form.buyerName || undefined,
      propertyAddress: form.propertyAddress || undefined,
      contractPrice: form.contractPrice ? parseInt(form.contractPrice) : undefined,
      assignmentFee: form.assignmentFee ? parseInt(form.assignmentFee) : undefined,
      closingDate: form.closingDate ? new Date(form.closingDate) : undefined,
      notes: form.notes || undefined,
    });
  }

  const filtered = filterStatus === "all" ? contracts : contracts.filter((c: any) => c.status === filterStatus);

  const counts = CONTRACT_STATUSES.reduce((acc, s) => {
    acc[s.id] = contracts.filter((c: any) => c.status === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contract Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Track purchase agreements, assignments, and double closes</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Contract
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {CONTRACT_STATUSES.map(s => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(filterStatus === s.id ? "all" : s.id)}
            className={`p-3 rounded-lg border text-left transition-all ${filterStatus === s.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
          >
            <div className="text-xl font-bold text-foreground">{counts[s.id] ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Contract List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading contracts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No contracts yet. Click "New Contract" to add one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => (
            <Card key={c.id} className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedContract(c)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{c.title}</span>
                      {statusBadge(c.status)}
                      {c.contractType && (
                        <Badge variant="outline" className="text-xs">
                          {CONTRACT_TYPES.find(t => t.value === c.contractType)?.label ?? c.contractType}
                        </Badge>
                      )}
                    </div>
                    {c.propertyAddress && <div className="text-sm text-muted-foreground">{c.propertyAddress}</div>}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {c.sellerName && <span>Seller: {c.sellerName}</span>}
                      {c.buyerName && <span>Buyer: {c.buyerName}</span>}
                      {c.closingDate && <span>Closing: {new Date(c.closingDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.contractPrice && <div className="text-sm font-medium text-foreground">{formatCurrency(c.contractPrice)}</div>}
                    {c.assignmentFee && <div className="text-xs text-emerald-400">Fee: {formatCurrency(c.assignmentFee)}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Contract Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="123 Main St — Purchase Agreement" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contract Type</Label>
                <Select value={form.contractType} onValueChange={v => setForm(f => ({ ...f, contractType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Linked Deal</Label>
                <Select value={form.dealId} onValueChange={v => setForm(f => ({ ...f, dealId: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {deals.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Property Address</Label>
              <Input value={form.propertyAddress} onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Seller Name</Label><Input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))} /></div>
              <div><Label>Buyer Name</Label><Input value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contract Price ($)</Label><Input type="number" value={form.contractPrice} onChange={e => setForm(f => ({ ...f, contractPrice: e.target.value }))} /></div>
              <div><Label>Assignment Fee ($)</Label><Input type="number" value={form.assignmentFee} onChange={e => setForm(f => ({ ...f, assignmentFee: e.target.value }))} /></div>
            </div>
            <div><Label>Closing Date</Label><Input type="date" value={form.closingDate} onChange={e => setForm(f => ({ ...f, closingDate: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createContract.isPending || !form.title.trim()}>
              {createContract.isPending ? "Creating..." : "Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedContract && (
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selectedContract.title}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Update Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CONTRACT_STATUSES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => updateContract.mutate({ id: selectedContract.id, status: s.id as any })}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${selectedContract.status === s.id ? `${s.color} text-white border-transparent` : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{CONTRACT_TYPES.find(t => t.value === selectedContract.contractType)?.label ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{selectedContract.propertyAddress || "—"}</span></div>
                <div><span className="text-muted-foreground">Seller:</span> <span className="text-foreground">{selectedContract.sellerName || "—"}</span></div>
                <div><span className="text-muted-foreground">Buyer:</span> <span className="text-foreground">{selectedContract.buyerName || "—"}</span></div>
                <div><span className="text-muted-foreground">Contract Price:</span> <span className="text-foreground">{formatCurrency(selectedContract.contractPrice)}</span></div>
                <div><span className="text-muted-foreground">Assignment Fee:</span> <span className="text-foreground">{formatCurrency(selectedContract.assignmentFee)}</span></div>
                <div><span className="text-muted-foreground">Closing Date:</span> <span className="text-foreground">{selectedContract.closingDate ? new Date(selectedContract.closingDate).toLocaleDateString() : "—"}</span></div>
              </div>
              {selectedContract.notes && (
                <div><Label>Notes</Label><p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedContract.notes}</p></div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="destructive" size="sm" onClick={() => deleteContract.mutate({ id: selectedContract.id })} disabled={deleteContract.isPending}>Delete</Button>
              <Button variant="outline" onClick={() => setSelectedContract(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
