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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, AlertCircle, MessageSquare, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400 border-red-500/30 bg-red-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  low: "text-slate-400 border-slate-500/30 bg-slate-500/10",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  manual: "Manual",
  needs_offer: "Needs Offer",
  follow_up: "Follow-Up",
  contract: "Contract",
  dispo: "Dispo",
};

export default function TaskManager() {
  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.tasks.list.useQuery({ status: "all" });
  const { data: dailyZero, isLoading: dzLoading } = trpc.tasks.dailyZero.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", taskType: "manual", priority: "medium", dueDate: "",
  });

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.dailyZero.invalidate();
      setShowCreate(false);
      setForm({ title: "", description: "", taskType: "manual", priority: "medium", dueDate: "" });
      toast("Task created");
    },
  });

  const completeTask = trpc.tasks.complete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.dailyZero.invalidate();
      toast("Task completed ✓");
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.tasks.dailyZero.invalidate();
    },
  });

  const pending = tasks.filter((t: any) => t.status === "pending" || t.status === "in_progress");
  const completed = tasks.filter((t: any) => t.status === "completed");

  const dzPending = dailyZero?.pendingTasks ?? [];
  const dzNeedsOffer = dailyZero?.needsOfferConvs ?? [];
  const dzTotal = dzPending.length + dzNeedsOffer.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Daily Zero keeps your queue clear</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      <Tabs defaultValue="daily-zero">
        <TabsList>
          <TabsTrigger value="daily-zero" className="gap-2">
            Daily Zero
            {dzTotal > 0 && <Badge className="bg-red-500 text-white text-xs">{dzTotal}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {/* Daily Zero Tab */}
        <TabsContent value="daily-zero" className="mt-4 space-y-6">
          {dzLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : dzTotal === 0 ? (
            <div className="text-center py-16">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-bold text-foreground">You're at Daily Zero!</h2>
              <p className="text-muted-foreground mt-2">No pending tasks or leads waiting for offers. Great work.</p>
            </div>
          ) : (
            <>
              {/* Needs Offer Conversations */}
              {dzNeedsOffer.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-400" />
                    Needs Offer ({dzNeedsOffer.length})
                    <span className="text-xs text-muted-foreground font-normal">— Leads waiting for your offer</span>
                  </h3>
                  <div className="space-y-2">
                    {dzNeedsOffer.map((conv: any) => (
                      <Card key={conv.id} className="bg-card border-amber-500/30">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm">{conv.contactName || conv.contactPhone}</div>
                            <div className="text-xs text-muted-foreground mt-1">{conv.propertyAddress || "No address"}</div>
                            <div className="text-xs text-amber-400 mt-1">
                              Last message: {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : "—"}
                            </div>
                          </div>
                          <Link href={`/messenger?conversationId=${conv.id}`}>
                            <Button size="sm" variant="outline" className="gap-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                              <LinkIcon className="h-3 w-3" /> Open
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Tasks */}
              {dzPending.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Circle className="h-4 w-4 text-blue-400" />
                    Pending Tasks ({dzPending.length})
                  </h3>
                  <div className="space-y-2">
                    {dzPending.map((task: any) => (
                      <Card key={task.id} className="bg-card border-border">
                        <CardContent className="p-4 flex items-center gap-4">
                          <button
                            onClick={() => completeTask.mutate({ id: task.id })}
                            className="shrink-0 text-muted-foreground hover:text-green-400 transition-colors"
                          >
                            <Circle className="h-5 w-5" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm">{task.title}</div>
                            {task.description && <div className="text-xs text-muted-foreground mt-1">{task.description}</div>}
                            <div className="flex gap-2 mt-2">
                              {task.priority && (
                                <Badge className={`text-xs border ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                              )}
                              {task.taskType && task.taskType !== "manual" && (
                                <Badge variant="outline" className="text-xs">{TASK_TYPE_LABELS[task.taskType]}</Badge>
                              )}
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => deleteTask.mutate({ id: task.id })} className="text-muted-foreground hover:text-red-400 shrink-0">
                            ×
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* All Tasks Tab */}
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No pending tasks.</div>
          ) : (
            <div className="space-y-2">
              {pending.map((task: any) => (
                <Card key={task.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center gap-4">
                    <button onClick={() => completeTask.mutate({ id: task.id })} className="shrink-0 text-muted-foreground hover:text-green-400 transition-colors">
                      <Circle className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm">{task.title}</div>
                      {task.description && <div className="text-xs text-muted-foreground mt-1">{task.description}</div>}
                      <div className="flex gap-2 mt-2">
                        {task.priority && <Badge className={`text-xs border ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>}
                        {task.dueDate && <span className="text-xs text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteTask.mutate({ id: task.id })} className="text-muted-foreground hover:text-red-400 shrink-0">×</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-4">
          {completed.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">No completed tasks yet.</div>
          ) : (
            <div className="space-y-2">
              {completed.map((task: any) => (
                <Card key={task.id} className="bg-card border-border opacity-60">
                  <CardContent className="p-4 flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm line-through">{task.title}</div>
                      {task.completedAt && <div className="text-xs text-muted-foreground mt-1">Completed {new Date(task.completedAt).toLocaleDateString()}</div>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteTask.mutate({ id: task.id })} className="text-muted-foreground hover:text-red-400 shrink-0">×</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.taskType} onValueChange={v => setForm(f => ({ ...f, taskType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createTask.mutate({ title: form.title, description: form.description || undefined, taskType: form.taskType as any, priority: form.priority as any, dueDate: form.dueDate ? new Date(form.dueDate) : undefined })} disabled={createTask.isPending || !form.title.trim()}>
              {createTask.isPending ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
