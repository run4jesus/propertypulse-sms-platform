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
import { Plus, Building2, DollarSign, Phone, TrendingUp, ChevronRight } from "lucide-react";

const STAGES = [
  { id: "new_lead", label: "New Lead", color: "bg-slate-500" },
  { id: "contact_attempted", label: "Contact Attempted", color: "bg-blue-500" },
  { id: "qualified", label: "Qualified", color: "bg-cyan-500" },
  { id: "appointment_set", label: "Appointment Set", color: "bg-indigo-500" },
  { id: "offer_made", label: "Offer Made", color: "bg-violet-500" },
  { id: "under_contract", label: "Under Contract", color: "bg-purple-600" },
  { id: "dispo_marketing", label: "Dispo / Marketing", color: "bg-amber-500" },
  { id: "buyer_found", label: "Buyer Found", color: "bg-orange-500" },
  { id: "closing_scheduled", label: "Closing Scheduled", color: "bg-lime-500" },
  { id: "closed_paid", label: "Closed / Paid", color: "bg-green-600" },
  { id: "dead_lost", label: "Dead / Lost", color: "bg-red-500" },
];

const PROPERTY_TYPES = [
  { value: "sfr", label: "Single Family" },
  { value: "land", label: "Land" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

function formatCurrency(val?: number | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

export default function DealPipeline() {
  const utils = trpc.useUtils();
  const { data: deals = [], isLoading } = trpc.deals.list.useQuery();
  const { data: stats } = trpc.deals.stats.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", propertyAddress: "", city: "", state: "", zip: "",
    propertyType: "sfr", stage: "new_lead", sellerName: "", sellerPhone: "",
    askingPrice: "", offerPrice: "", contractPrice: "", assignmentFee: "",
    notes: "", isLead: true,
  });

  const createDeal = trpc.deals.create.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      utils.deals.stats.invalidate();
      setShowCreate(false);
      resetForm();
      toast("Deal added to pipeline");
    },
  });

  const updateDeal = trpc.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      utils.deals.stats.invalidate();
      setSelectedDeal(null);
      toast("Deal updated");
    },
  });

  const deleteDeal = trpc.deals.delete.useMutation({
    onSuccess: () => {
      utils.deals.list.invalidate();
      utils.deals.stats.invalidate();
      setSelectedDeal(null);
      toast("Deal removed");
    },
  });

  function resetForm() {
    setForm({ title: "", propertyAddress: "", city: "", state: "", zip: "",
      propertyType: "sfr", stage: "new_lead", sellerName: "", sellerPhone: "",
      askingPrice: "", offerPrice: "", contractPrice: "", assignmentFee: "",
      notes: "", isLead: true });
  }

  function handleCreate() {
    if (!form.title.trim()) return;
    createDeal.mutate({
      title: form.title,
      propertyAddress: form.propertyAddress || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zip: form.zip || undefined,
      propertyType: form.propertyType as any,
      stage: form.stage as any,
      sellerName: form.sellerName || undefined,
      sellerPhone: form.sellerPhone || undefined,
      askingPrice: form.askingPrice ? parseInt(form.askingPrice) : undefined,
      offerPrice: form.offerPrice ? parseInt(form.offerPrice) : undefined,
      contractPrice: form.contractPrice ? parseInt(form.contractPrice) : undefined,
      assignmentFee: form.assignmentFee ? parseInt(form.assignmentFee) : undefined,
      notes: form.notes || undefined,
      isLead: form.isLead,
    });
  }

  function handleStageChange(dealId: number, newStage: string) {
    updateDeal.mutate({ id: dealId, stage: newStage as any });
  }

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = deals.filter((d: any) => d.stage === stage.id);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Deal Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Track every lead from first contact to closed deal</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Deal
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Active Deals", value: stats?.activeDeals ?? 0, icon: TrendingUp, color: "text-blue-500" },
          { label: "Closed Deals", value: stats?.closedDeals ?? 0, icon: Building2, color: "text-green-500" },
          { label: "Pipeline Value", value: formatCurrency(stats?.pipelineValue), icon: DollarSign, color: "text-violet-500" },
          { label: "Total Revenue", value: formatCurrency(stats?.totalRevenue), icon: DollarSign, color: "text-emerald-500" },
          { label: "Avg Assignment Fee", value: formatCurrency(stats?.avgFee), icon: DollarSign, color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading pipeline...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${STAGES.length * 240}px` }}>
            {STAGES.map((stage) => {
              const stageDeals = dealsByStage[stage.id] ?? [];
              return (
                <div key={stage.id} className="w-56 flex-shrink-0">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${stage.color}`}>
                    <span className="text-white text-xs font-semibold truncate">{stage.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs bg-white/20 text-white border-0">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  <div className="bg-muted/30 rounded-b-lg border border-t-0 border-border min-h-[200px] p-2 space-y-2">
                    {stageDeals.map((deal: any) => (
                      <div
                        key={deal.id}
                        className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setSelectedDeal(deal)}
                      >
                        <div className="font-medium text-sm text-foreground truncate">{deal.title}</div>
                        {deal.propertyAddress && (
                          <div className="text-xs text-muted-foreground truncate mt-1">{deal.propertyAddress}</div>
                        )}
                        {deal.sellerName && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{deal.sellerName}</span>
                          </div>
                        )}
                        {(deal.askingPrice || deal.offerPrice) && (
                          <div className="mt-2 text-xs font-medium text-emerald-400">
                            {deal.offerPrice ? `Offer: ${formatCurrency(deal.offerPrice)}` : `Ask: ${formatCurrency(deal.askingPrice)}`}
                          </div>
                        )}
                        {deal.isLead && (
                          <Badge variant="outline" className="mt-2 text-xs border-amber-500/50 text-amber-400">Lead</Badge>
                        )}
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-4">No deals</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Deal Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Deal to Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Title / Property Name *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="123 Main St or Smith Lead" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={v => setForm(f => ({ ...f, stage: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Type</Label>
                <Select value={form.propertyType} onValueChange={v => setForm(f => ({ ...f, propertyType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Property Address</Label>
              <Input value={form.propertyAddress} onChange={e => setForm(f => ({ ...f, propertyAddress: e.target.value }))} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="TX" /></div>
              <div><Label>Zip</Label><Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Seller Name</Label><Input value={form.sellerName} onChange={e => setForm(f => ({ ...f, sellerName: e.target.value }))} /></div>
              <div><Label>Seller Phone</Label><Input value={form.sellerPhone} onChange={e => setForm(f => ({ ...f, sellerPhone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Asking Price ($)</Label><Input type="number" value={form.askingPrice} onChange={e => setForm(f => ({ ...f, askingPrice: e.target.value }))} /></div>
              <div><Label>Offer Price ($)</Label><Input type="number" value={form.offerPrice} onChange={e => setForm(f => ({ ...f, offerPrice: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contract Price ($)</Label><Input type="number" value={form.contractPrice} onChange={e => setForm(f => ({ ...f, contractPrice: e.target.value }))} /></div>
              <div><Label>Assignment Fee ($)</Label><Input type="number" value={form.assignmentFee} onChange={e => setForm(f => ({ ...f, assignmentFee: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createDeal.isPending || !form.title.trim()}>
              {createDeal.isPending ? "Adding..." : "Add to Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Detail / Edit Dialog */}
      {selectedDeal && (
        <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDeal.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Move to Stage</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STAGES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleStageChange(selectedDeal.id, s.id)}
                      className={`text-xs px-2 py-1 rounded-full border transition-all ${selectedDeal.stage === s.id ? `${s.color} text-white border-transparent` : "border-border text-muted-foreground hover:border-primary/50"}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Address:</span> <span className="text-foreground">{selectedDeal.propertyAddress || "—"}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground capitalize">{selectedDeal.propertyType?.replace("_", " ") || "—"}</span></div>
                <div><span className="text-muted-foreground">Seller:</span> <span className="text-foreground">{selectedDeal.sellerName || "—"}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground">{selectedDeal.sellerPhone || "—"}</span></div>
                <div><span className="text-muted-foreground">Asking:</span> <span className="text-foreground">{formatCurrency(selectedDeal.askingPrice)}</span></div>
                <div><span className="text-muted-foreground">Offer:</span> <span className="text-foreground">{formatCurrency(selectedDeal.offerPrice)}</span></div>
                <div><span className="text-muted-foreground">Contract:</span> <span className="text-foreground">{formatCurrency(selectedDeal.contractPrice)}</span></div>
                <div><span className="text-muted-foreground">Assign Fee:</span> <span className="text-foreground">{formatCurrency(selectedDeal.assignmentFee)}</span></div>
              </div>
              {selectedDeal.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedDeal.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="destructive" size="sm" onClick={() => deleteDeal.mutate({ id: selectedDeal.id })} disabled={deleteDeal.isPending}>
                Delete
              </Button>
              <Button variant="outline" onClick={() => setSelectedDeal(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
