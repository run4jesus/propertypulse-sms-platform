import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Zap, Trash2, Pencil, Hash } from "lucide-react";

const MERGE_FIELDS = ["{FirstName}", "{LastName}", "{PropertyAddress}", "{PropertyCity}", "{PropertyState}", "{PropertyZip}"];

export default function Macros() {
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [shortcut, setShortcut] = useState("");

  const { data: macros = [], refetch } = trpc.macros.list.useQuery();

  const createMutation = trpc.macros.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Macro created"); },
    onError: () => toast.error("Failed to create macro"),
  });

  const updateMutation = trpc.macros.update.useMutation({
    onSuccess: () => { refetch(); setEditId(null); resetForm(); toast.success("Macro updated"); },
    onError: () => toast.error("Failed to update macro"),
  });

  const deleteMutation = trpc.macros.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Macro deleted"); },
    onError: () => toast.error("Failed to delete macro"),
  });

  function resetForm() { setName(""); setBody(""); setShortcut(""); }

  function openEdit(m: any) {
    setEditId(m.id); setName(m.name); setBody(m.body); setShortcut(m.shortcut ?? "");
  }

  function handleSubmit() {
    if (!name.trim() || !body.trim()) return toast.error("Name and message body are required");
    const payload = { name, body, shortcut: shortcut || undefined };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function insertMerge(field: string) {
    setBody(prev => prev + field);
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Macros</h1>
            <p className="text-sm text-muted-foreground mt-1">Quick-reply shortcuts you can insert in any conversation with one click</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Macro
          </Button>
        </div>

        {macros.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Zap className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No macros yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Save frequently used messages as macros to insert them instantly in the Messenger</p>
              <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create First Macro</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {macros.map((m) => (
              <Card key={m.id} className="border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary shrink-0" />
                      <p className="font-semibold text-sm text-foreground">{m.name}</p>
                      {m.shortcut && (
                        <span className="flex items-center gap-0.5 text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          <Hash className="w-2.5 h-2.5" />{m.shortcut}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(m)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteMutation.mutate({ id: m.id })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{m.body}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">Used {m.usageCount} times</p>
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
            <DialogTitle>{editId ? "Edit Macro" : "Create Macro"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Macro Name</Label>
                <Input placeholder="e.g. Initial Offer" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Shortcut (optional)</Label>
                <Input placeholder="e.g. offer" value={shortcut} onChange={e => setShortcut(e.target.value)} />
                <p className="text-xs text-muted-foreground">Type #shortcut in Messenger to insert</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Message Body</Label>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {MERGE_FIELDS.map(f => (
                  <button key={f} onClick={() => insertMerge(f)} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">{f}</button>
                ))}
              </div>
              <Textarea
                placeholder="Hi {FirstName}, I'm interested in purchasing your lot at {PropertyAddress}. Would you be open to an offer?"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
              />
              <p className="text-xs text-muted-foreground text-right">{body.length} chars</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save Changes" : "Create Macro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
