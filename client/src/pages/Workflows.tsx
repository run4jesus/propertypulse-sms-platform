import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, GitBranch, Trash2, GripVertical, Clock, MessageSquare, Tag, Users, ChevronDown, ChevronUp, Play, Pause } from "lucide-react";

const MERGE_FIELDS = ["{FirstName}", "{LastName}", "{PropertyAddress}", "{PropertyCity}", "{PropertyState}", "{PropertyZip}"];

type WorkflowStep = {
  stepNumber: number;
  body: string;
  delayDays: number;
  actionOnNoReply: boolean;
  noReplyHours: number;
  addToGroupId?: number;
  addLabelId?: number;
};

export default function Workflows() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { stepNumber: 1, body: "", delayDays: 0, actionOnNoReply: false, noReplyHours: 24 },
  ]);
  const [expandedStep, setExpandedStep] = useState<number>(1);

  const { data: workflowList = [], refetch } = trpc.workflows.list.useQuery();
  const { data: selectedWorkflow } = trpc.workflows.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );
  const { data: labels = [] } = trpc.labels.list.useQuery();
  const { data: groups = [] } = trpc.contactGroups.list.useQuery();

  const createMutation = trpc.workflows.create.useMutation({
    onSuccess: () => { refetch(); setShowCreate(false); resetForm(); toast.success("Workflow created"); },
    onError: () => toast.error("Failed to create workflow"),
  });

  const updateMutation = trpc.workflows.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Workflow updated"); },
    onError: () => toast.error("Failed to update workflow"),
  });

  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => { refetch(); setSelectedId(null); toast.success("Workflow deleted"); },
    onError: () => toast.error("Failed to delete workflow"),
  });

  function resetForm() {
    setName(""); setDescription("");
    setSteps([{ stepNumber: 1, body: "", delayDays: 0, actionOnNoReply: false, noReplyHours: 24 }]);
    setExpandedStep(1);
  }

  function addStep() {
    const next = steps.length + 1;
    setSteps([...steps, { stepNumber: next, body: "", delayDays: 1, actionOnNoReply: false, noReplyHours: 24 }]);
    setExpandedStep(next);
  }

  function removeStep(idx: number) {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setSteps(updated);
  }

  function updateStep(idx: number, field: keyof WorkflowStep, value: any) {
    const updated = [...steps];
    (updated[idx] as any)[field] = value;
    setSteps(updated);
  }

  function insertMergeField(idx: number, field: string) {
    const updated = [...steps];
    updated[idx].body = (updated[idx].body || "") + field;
    setSteps(updated);
  }

  function handleCreate() {
    if (!name.trim()) return toast.error("Workflow name is required");
    if (steps.some(s => !s.body.trim())) return toast.error("All steps must have a message body");
    createMutation.mutate({ name, description });
  }

  function handleToggleStatus(workflow: any) {
    updateMutation.mutate({
      id: workflow.id,
      status: workflow.status === "active" ? "inactive" : "active",
    });
  }

  const totalDays = steps.length > 0 ? Math.max(...steps.map(s => s.delayDays)) : 0;

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Left panel — workflow list */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Workflows</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{workflowList.length} workflows</p>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {workflowList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <GitBranch className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No workflows yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Create automated multi-step follow-up sequences</p>
              </div>
            ) : (
              workflowList.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => setSelectedId(wf.id)}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${selectedId === wf.id ? "bg-accent" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{wf.name}</p>
                      {wf.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{wf.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{wf.totalMessages} steps</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{wf.totalDays}d</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{wf.activeContacts}</span>
                      </div>
                    </div>
                    <Badge variant={wf.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
                      {wf.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel — workflow detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedWorkflow ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <GitBranch className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Select a Workflow</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose a workflow from the left to view and edit its steps</p>
            </div>
          ) : (
            <div className="p-6 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{selectedWorkflow.name}</h2>
                  {selectedWorkflow.description && <p className="text-sm text-muted-foreground mt-1">{selectedWorkflow.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedWorkflow.status === "active" ? "Active" : "Inactive"}</span>
                    <Switch
                      checked={selectedWorkflow.status === "active"}
                      onCheckedChange={() => handleToggleStatus(selectedWorkflow)}
                    />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate({ id: selectedWorkflow.id })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-6 mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedWorkflow.steps?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Steps</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedWorkflow.totalDays}</p>
                  <p className="text-xs text-muted-foreground">Days</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedWorkflow.activeContacts}</p>
                  <p className="text-xs text-muted-foreground">Active Contacts</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {(selectedWorkflow.steps ?? []).map((step, idx) => (
                  <Card key={step.id} className="border-border">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{step.stepNumber}</div>
                          <span className="text-sm font-medium text-foreground">
                            {step.delayDays === 0 ? "Immediately" : `Day ${step.delayDays}`}
                          </span>
                          {step.actionOnNoReply && (
                            <Badge variant="outline" className="text-xs">No-reply action</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{step.body.slice(0, 60)}{step.body.length > 60 ? "…" : ""}</p>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Workflow Name</Label>
                <Input placeholder="e.g. Lot Seller Follow-Up Sequence" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description (optional)</Label>
                <Input placeholder="Brief description of this workflow" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-foreground">Steps</p>
                <p className="text-xs text-muted-foreground">{steps.length} steps · {totalDays} days total</p>
              </div>
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" /> Add Step
              </Button>
            </div>

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <Card key={idx} className="border-border">
                  <CardHeader className="py-2 px-4 cursor-pointer" onClick={() => setExpandedStep(expandedStep === step.stepNumber ? 0 : step.stepNumber)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{step.stepNumber}</div>
                        <span className="text-sm font-medium">{step.delayDays === 0 ? "Immediately" : `Day ${step.delayDays}`}</span>
                        {step.body && <span className="text-xs text-muted-foreground truncate max-w-xs">{step.body.slice(0, 40)}…</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {steps.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={e => { e.stopPropagation(); removeStep(idx); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                        {expandedStep === step.stepNumber ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedStep === step.stepNumber && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Send after (days)</Label>
                        <Input type="number" min={0} value={step.delayDays} onChange={e => updateStep(idx, "delayDays", parseInt(e.target.value) || 0)} className="w-32" />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Message</Label>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {MERGE_FIELDS.map(f => (
                            <button key={f} onClick={() => insertMergeField(idx, f)} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono">{f}</button>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Hi {FirstName}, I saw your property at {PropertyAddress}…"
                          value={step.body}
                          onChange={e => updateStep(idx, "body", e.target.value)}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground text-right">{step.body.length} chars</p>
                      </div>

                      <div className="border-t border-border pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-foreground">No-reply action</p>
                            <p className="text-xs text-muted-foreground">Trigger action if contact doesn't reply</p>
                          </div>
                          <Switch checked={step.actionOnNoReply} onCheckedChange={v => updateStep(idx, "actionOnNoReply", v)} />
                        </div>

                        {step.actionOnNoReply && (
                          <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-primary/30">
                            <div className="space-y-1.5">
                              <Label className="text-xs">After (hours)</Label>
                              <Input type="number" min={1} value={step.noReplyHours} onChange={e => updateStep(idx, "noReplyHours", parseInt(e.target.value) || 24)} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Add to Group</Label>
                              <Select value={step.addToGroupId?.toString() ?? ""} onValueChange={v => updateStep(idx, "addToGroupId", v ? parseInt(v) : undefined)}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Add Label</Label>
                              <Select value={step.addLabelId?.toString() ?? ""} onValueChange={v => updateStep(idx, "addLabelId", v ? parseInt(v) : undefined)}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">None</SelectItem>
                                  {labels.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
