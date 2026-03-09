import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Users, Trash2, Pencil, ChevronRight } from "lucide-react";

export default function ContactGroups() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: groups = [], refetch } = trpc.contactGroups.list.useQuery();
  const { data: members = [] } = trpc.contactGroups.members.useQuery(
    { groupId: selectedId! },
    { enabled: !!selectedId }
  );

  const createMutation = trpc.contactGroups.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Group created"); },
    onError: () => toast.error("Failed to create group"),
  });

  const updateMutation = trpc.contactGroups.update.useMutation({
    onSuccess: () => { refetch(); setEditId(null); resetForm(); toast.success("Group updated"); },
    onError: () => toast.error("Failed to update group"),
  });

  const deleteMutation = trpc.contactGroups.delete.useMutation({
    onSuccess: () => { refetch(); if (selectedId === deleteMutation.variables?.id) setSelectedId(null); toast.success("Group deleted"); },
    onError: () => toast.error("Failed to delete group"),
  });

  const removeMemberMutation = trpc.contactGroups.removeContact.useMutation({
    onSuccess: () => { toast.success("Contact removed from group"); },
    onError: () => toast.error("Failed to remove contact"),
  });

  function resetForm() { setName(""); setDescription(""); }

  function openEdit(g: any) {
    setEditId(g.id); setName(g.name); setDescription(g.description ?? "");
  }

  function handleSubmit() {
    if (!name.trim()) return toast.error("Group name is required");
    if (editId) {
      updateMutation.mutate({ id: editId, name, description });
    } else {
      createMutation.mutate({ name, description });
    }
  }

  const selectedGroup = groups.find(g => g.id === selectedId);

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Left panel */}
        <div className="w-72 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Contact Groups</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{groups.length} groups</p>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No groups yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Organize contacts into named groups for targeted campaigns</p>
              </div>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-between ${selectedId === g.id ? "bg-accent" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{g.name}</p>
                    {g.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{g.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{g.contactCount} contacts</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Users className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Select a Group</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose a group to view its members</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedGroup.name}</h2>
                  {selectedGroup.description && <p className="text-sm text-muted-foreground mt-1">{selectedGroup.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{selectedGroup.contactCount} members</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedGroup)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: selectedGroup.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {members.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No members in this group yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Add contacts from the Contacts page or via workflow actions</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {members.map(({ contact }) => (
                    <Card key={contact.id} className="border-border">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          {contact.propertyAddress && <p className="text-xs text-muted-foreground">{contact.propertyAddress}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => removeMemberMutation.mutate({ groupId: selectedGroup.id, contactId: contact.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editId} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditId(null); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Group" : "Create Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Group Name</Label>
              <Input placeholder="e.g. Jackson MS Lot Sellers" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="Brief description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Save" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
