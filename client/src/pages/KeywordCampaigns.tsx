import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Hash, Trash2, Pencil, Zap } from "lucide-react";

const MERGE_FIELDS = ["{FirstName}", "{LastName}", "{PropertyAddress}", "{PropertyCity}", "{PropertyState}", "{PropertyZip}"];

export default function KeywordCampaigns() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState<string>("");

  const { data: campaigns = [], refetch } = trpc.keywordCampaigns.list.useQuery();
  const { data: phoneNumbers = [] } = trpc.phoneNumbers.list.useQuery();

  const createMutation = trpc.keywordCampaigns.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Keyword campaign created"); },
    onError: () => toast.error("Failed to create keyword campaign"),
  });

  const updateMutation = trpc.keywordCampaigns.update.useMutation({
    onSuccess: () => { refetch(); setEditId(null); resetForm(); toast.success("Updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = trpc.keywordCampaigns.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  function resetForm() {
    setName(""); setKeyword(""); setReplyMessage(""); setPhoneNumberId("");
  }

  function openEdit(c: any) {
    setEditId(c.id);
    setName(c.name); setKeyword(c.keyword); setReplyMessage(c.replyMessage);
    setPhoneNumberId(c.phoneNumberId?.toString() ?? "");
  }

  function handleSubmit() {
    if (!name.trim() || !keyword.trim() || !replyMessage.trim()) return toast.error("Name, keyword, and reply message are required");
    const payload = { name, keyword: keyword.toUpperCase().trim(), replyMessage, phoneNumberId: phoneNumberId ? parseInt(phoneNumberId) : undefined };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleToggle(c: any) {
    updateMutation.mutate({ id: c.id, status: c.status === "active" ? "paused" : "active" });
  }

  function insertMerge(field: string) {
    setReplyMessage(prev => prev + field);
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Keyword Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">Auto-reply when someone texts a specific keyword to your number</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Keyword
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Hash className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No keyword campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Set up auto-replies triggered by specific keywords like INFO, STOP, OFFER</p>
              <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create First Keyword</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Hash className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{c.name}</p>
                          <Badge variant="outline" className="font-mono text-xs">{c.keyword}</Badge>
                          <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{c.replyMessage}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{c.triggerCount} triggers</span>
                          {c.phoneNumberId && <span>Assigned to phone #{c.phoneNumberId}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch checked={c.status === "active"} onCheckedChange={() => handleToggle(c)} />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: c.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditId(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Keyword Campaign" : "Create Keyword Campaign"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input placeholder="e.g. Info Request Auto-Reply" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Trigger Keyword</Label>
              <Input
                placeholder="e.g. INFO, OFFER, STOP"
                value={keyword}
                onChange={e => setKeyword(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">When someone texts this word to your number, the auto-reply fires. Case-insensitive.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Auto-Reply Message</Label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {MERGE_FIELDS.map(f => (
                  <button key={f} onClick={() => insertMerge(f)} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">{f}</button>
                ))}
              </div>
              <Textarea
                placeholder="Thanks for reaching out! We buy lots in {PropertyCity}. Reply with your asking price and we'll get back to you shortly."
                value={replyMessage}
                onChange={e => setReplyMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">{replyMessage.length} chars</p>
            </div>

            <div className="space-y-1.5">
              <Label>Phone Number (optional)</Label>
              <Select value={phoneNumberId} onValueChange={setPhoneNumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="All numbers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All numbers</SelectItem>
                  {phoneNumbers.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.phoneNumber} {p.friendlyName ? `— ${p.friendlyName}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Keyword"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
