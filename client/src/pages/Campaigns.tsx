import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
  cancelled: "bg-red-50 text-red-700",
};

type Step = { stepNumber: number; body: string; delayDays: number; delayHours: number };

export default function Campaigns() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"standard" | "drip">("standard");
  const [message, setMessage] = useState("");
  const [listId, setListId] = useState<string>("");
  const [phoneId, setPhoneId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [steps, setSteps] = useState<Step[]>([
    { stepNumber: 1, body: "", delayDays: 0, delayHours: 0 },
  ]);

  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const { data: contactLists } = trpc.contactLists.list.useQuery();
  const { data: phoneNumbers } = trpc.phoneNumbers.list.useQuery();
  const { data: selectedCampaign } = trpc.campaigns.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      toast.success("Campaign created");
      utils.campaigns.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create campaign"),
  });

  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => {
      toast.success("Campaign updated");
      utils.campaigns.list.invalidate();
    },
  });

  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      utils.campaigns.list.invalidate();
      setSelectedId(null);
    },
  });

  const resetForm = () => {
    setName("");
    setType("standard");
    setMessage("");
    setListId("");
    setPhoneId("");
    setScheduledAt("");
    setSteps([{ stepNumber: 1, body: "", delayDays: 0, delayHours: 0 }]);
  };

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Campaign name is required");
    const campaignSteps =
      type === "drip"
        ? steps
        : message.trim()
        ? [{ stepNumber: 1, body: message, delayDays: 0, delayHours: 0 }]
        : undefined;

    createCampaign.mutate({
      name,
      type,
      contactListId: listId ? parseInt(listId) : undefined,
      phoneNumberId: phoneId ? parseInt(phoneId) : undefined,
      scheduledAt: scheduledAt || undefined,
      steps: campaignSteps,
    });
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { stepNumber: prev.length + 1, body: "", delayDays: 1, delayHours: 0 },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const updateStep = (index: number, field: keyof Step, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Campaign List */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-sm">Campaigns</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs">Campaign Name</Label>
                  <Input
                    placeholder="e.g. Tarrant County Vacant Lots"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (single message)</SelectItem>
                      <SelectItem value="drip">Drip Sequence (multi-step)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Contact List</Label>
                  <Select value={listId} onValueChange={setListId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contactLists?.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name} ({l.contactCount} contacts)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">From Number</Label>
                  <Select value={phoneId} onValueChange={setPhoneId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select phone number..." />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.phoneNumber} {p.friendlyName ? `(${p.friendlyName})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Schedule (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {type === "standard" ? (
                  <div>
                    <Label className="text-xs">Message</Label>
                    <Textarea
                      placeholder="Hi {FirstName}, I'm interested in your property at {Address}..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="mt-1 min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {message.length} chars · Use {"{FirstName}"}, {"{Address}"} for merge fields
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Drip Steps</Label>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addStep}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Step
                      </Button>
                    </div>
                    {steps.map((step, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Step {step.stepNumber}</span>
                          {steps.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeStep(i)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                        {i > 0 && (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Delay (days)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={step.delayDays}
                                onChange={(e) => updateStep(i, "delayDays", parseInt(e.target.value) || 0)}
                                className="h-7 text-xs mt-0.5"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground">Delay (hours)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={23}
                                value={step.delayHours}
                                onChange={(e) => updateStep(i, "delayHours", parseInt(e.target.value) || 0)}
                                className="h-7 text-xs mt-0.5"
                              />
                            </div>
                          </div>
                        )}
                        <Textarea
                          placeholder={`Message for step ${step.stepNumber}...`}
                          value={step.body}
                          onChange={(e) => updateStep(i, "body", e.target.value)}
                          className="min-h-[80px] text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createCampaign.isPending}
                >
                  {createCampaign.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-accent/40 transition-colors ${
                  selectedId === c.id ? "bg-accent/60 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <Badge className={`text-xs shrink-0 ${STATUS_COLORS[c.status] ?? ""}`} variant="secondary">
                    {c.status}
                  </Badge>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span>{c.sent} sent</span>
                  <span>{c.replied} replied</span>
                  <span>{c.sent > 0 ? Math.round((c.replied / c.sent) * 100) : 0}% reply</span>
                </div>
                {c.scheduledAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {format(new Date(c.scheduledAt), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground px-4">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No campaigns yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Campaign Detail */}
      {selectedId && selectedCampaign ? (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedCampaign.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${STATUS_COLORS[selectedCampaign.status] ?? ""}`} variant="secondary">
                    {selectedCampaign.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground capitalize">{selectedCampaign.type}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedCampaign.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCampaign.mutate({ id: selectedId, status: "paused" })}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                {selectedCampaign.status === "paused" && (
                  <Button
                    size="sm"
                    onClick={() => updateCampaign.mutate({ id: selectedId, status: "active" })}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => deleteCampaign.mutate({ id: selectedId })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Sent", value: selectedCampaign.sent, icon: Zap },
                { label: "Delivered", value: selectedCampaign.delivered, icon: CheckCircle2 },
                { label: "Replied", value: selectedCampaign.replied, icon: BarChart2 },
                { label: "Opted Out", value: selectedCampaign.optedOut, icon: Pause },
              ].map((stat) => (
                <Card key={stat.label} className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Drip Steps */}
            {selectedCampaign.steps && selectedCampaign.steps.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Drip Sequence</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedCampaign.steps.map((step, i) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {step.stepNumber}
                        </div>
                        {i < selectedCampaign.steps!.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        {i > 0 && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Wait {step.delayDays}d {step.delayHours}h
                          </p>
                        )}
                        <div className="bg-secondary/50 rounded-lg p-3 text-sm">
                          {step.body}
                        </div>
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{step.sent} sent</span>
                          <span>{step.replied} replied</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a campaign</p>
            <p className="text-xs mt-1">Or create a new one</p>
          </div>
        </div>
      )}
    </div>
  );
}
