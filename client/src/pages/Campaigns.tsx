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
import { Switch } from "@/components/ui/switch";
import {
  BarChart2,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  Zap,
  ShieldCheck,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { useLocation } from "wouter";
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

function BatchEditDialog({
  campaignId,
  currentBatchSize,
  currentInterval,
  onSave,
}: {
  campaignId: number;
  currentBatchSize: number;
  currentInterval: number;
  onSave: (batchSize: number, intervalMinutes: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [bs, setBs] = useState(currentBatchSize);
  const [bi, setBi] = useState(currentInterval);

  const handleOpen = (val: boolean) => {
    if (val) { setBs(currentBatchSize); setBi(currentInterval); }
    setOpen(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Send Rate</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs">Messages per batch</Label>
            <Input
              type="number" min={1} max={500} value={bs}
              onChange={(e) => setBs(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Minutes between batches</Label>
            <Input
              type="number" min={1} max={1440} value={bi}
              onChange={(e) => setBi(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ~{Math.round((bs / bi) * 60)} messages/hr
          </p>
          <Button className="w-full" onClick={() => { onSave(bs, bi); setOpen(false); toast.success("Send rate updated"); }}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Campaigns() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<"standard" | "drip">("standard");
  const [message, setMessage] = useState("");
  const [listId, setListId] = useState<string>("");
  const [phoneIds, setPhoneIds] = useState<number[]>([]);
  const [phoneId, setPhoneId] = useState<string>(""); // kept for legacy
  const [scheduledAt, setScheduledAt] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(5);
  const [sendWindowStart, setSendWindowStart] = useState("09:00");
  const [sendWindowEnd, setSendWindowEnd] = useState("20:00");
  const [optOutFooter, setOptOutFooter] = useState(true);
  const [scrubInternalDnc, setScrubInternalDnc] = useState(true);
  const [scrubLitigators, setScrubLitigators] = useState(true);
  const [scrubFederalDnc, setScrubFederalDnc] = useState(false);
  const [scrubExistingContacts, setScrubExistingContacts] = useState(false);
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDelayHours, setFollowUpDelayHours] = useState(24);
  const [followUpMessage, setFollowUpMessage] = useState("Thanks for your time! If anything changes on your end, feel free to reach out.");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [sendMode, setSendMode] = useState<"automated" | "manual">("automated");
  const [campaignCategory, setCampaignCategory] = useState<"land" | "house">("house");
  const [, navigate] = useLocation();
  const [steps, setSteps] = useState<Step[]>([
    { stepNumber: 1, body: "", delayDays: 0, delayHours: 0 },
  ]);

  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const { data: contactLists } = trpc.contactLists.list.useQuery();
  const { data: phoneNumbers } = trpc.phoneNumbers.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
  const { data: selectedCampaign } = trpc.campaigns.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const parsedListId = listId ? parseInt(listId) : undefined;
  const { data: scrubPreview, isFetching: scrubPreviewLoading } = trpc.campaigns.scrubPreview.useQuery(
    {
      contactListId: parsedListId!,
      scrubInternalDnc,
      scrubLitigators,
      scrubFederalDnc,
      scrubExistingContacts,
    },
    { enabled: !!parsedListId }
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
      utils.campaigns.get.invalidate({ id: selectedId! });
    },
  });

  const toggleAi = trpc.campaigns.toggleAi.useMutation({
    onSuccess: (_, vars) => {
      toast(vars.enabled ? "AI enabled for this campaign" : "AI paused for this campaign");
      utils.campaigns.list.invalidate();
      utils.campaigns.get.invalidate({ id: vars.id });
    },
    onError: () => toast.error("Failed to update AI setting"),
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
    setPhoneIds([]);
    setPhoneId("");
    setScheduledAt("");
    setBatchSize(10);
    setBatchIntervalMinutes(5);
    setSendWindowStart("09:00");
    setSendWindowEnd("20:00");
    setOptOutFooter(true);
    setScrubInternalDnc(true);
    setScrubLitigators(true);
    setScrubFederalDnc(false);
    setScrubExistingContacts(false);
    setFollowUpEnabled(false);
    setFollowUpDelayHours(24);
    setFollowUpMessage("Thanks for your time! If anything changes on your end, feel free to reach out.");
    setSendMode("automated");
    setCampaignCategory("house");
    setSelectedTemplateIds([]);
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
      phoneNumberId: phoneIds[0] ?? (phoneId ? parseInt(phoneId) : undefined),
      phoneNumberIds: phoneIds.length > 0 ? phoneIds : undefined,
      followUpEnabled,
      followUpDelayHours,
      followUpMessage: followUpEnabled ? followUpMessage : undefined,
      scheduledAt: scheduledAt || undefined,
      batchSize,
      batchIntervalMinutes,
      sendWindowStart,
      sendWindowEnd,
      steps: campaignSteps,
      optOutFooter,
      scrubInternalDnc,
      scrubLitigators,
      scrubFederalDnc,
      scrubExistingContacts,
      templateIds: selectedTemplateIds.length > 0 ? selectedTemplateIds : undefined,
      sendMode,
      campaignCategory,
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

                {/* Campaign Category */}
                <div>
                  <Label className="text-xs font-semibold">Campaign Category</Label>
                  <p className="text-xs text-muted-foreground mb-2">Is this a land campaign or a house campaign?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCampaignCategory("house")}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 py-3 px-2 text-sm font-medium transition-colors ${
                        campaignCategory === "house"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="text-lg">🏠</span>
                      <span>House</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampaignCategory("land")}
                      className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 py-3 px-2 text-sm font-medium transition-colors ${
                        campaignCategory === "land"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="text-lg">🌿</span>
                      <span>Land</span>
                    </button>
                  </div>
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
                  <Label className="text-xs">From Number(s) <span className="text-muted-foreground font-normal">(select up to 3 — rotates for better deliverability)</span></Label>
                  <div className="mt-1 rounded-lg border border-border bg-muted/20 p-2 space-y-1 max-h-36 overflow-y-auto">
                    {phoneNumbers && phoneNumbers.length > 0 ? phoneNumbers.map((p) => {
                      const checked = phoneIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded hover:bg-accent">
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-primary"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (phoneIds.length < 3) setPhoneIds([...phoneIds, p.id]);
                                else toast.error("Maximum 3 numbers per campaign");
                              } else {
                                setPhoneIds(phoneIds.filter((id) => id !== p.id));
                              }
                            }}
                          />
                          <span className="text-xs">{p.phoneNumber}{p.friendlyName ? ` (${p.friendlyName})` : ""}</span>
                        </label>
                      );
                    }) : (
                      <p className="text-xs text-muted-foreground text-center py-2">No numbers yet — add them in Phone Numbers</p>
                    )}
                  </div>
                  {phoneIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{phoneIds.length} number{phoneIds.length > 1 ? "s" : ""} selected — sends will rotate evenly</p>
                  )}
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

                {/* Send Mode toggle */}
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Send className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-semibold">Send Mode</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSendMode("automated")}
                      className={`flex flex-col items-start gap-0.5 rounded-md border p-2.5 text-left transition-colors ${
                        sendMode === "automated"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xs font-semibold">Automated</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">System sends on schedule, rotates templates automatically</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMode("manual")}
                      className={`flex flex-col items-start gap-0.5 rounded-md border p-2.5 text-left transition-colors ${
                        sendMode === "manual"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xs font-semibold">Manual Queue</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">Review each lead and send with Spacebar</span>
                    </button>
                  </div>
                </div>

                {/* Batch throttling — only shown for automated mode */}
                {sendMode === "automated" && <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-semibold">Send Rate / Batch Control</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Messages per batch</Label>
                      <Input
                        type="number"
                        min={1}
                        max={500}
                        value={batchSize}
                        onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Minutes between batches</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={batchIntervalMinutes}
                        onChange={(e) => setBatchIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sends <strong>{batchSize}</strong> message{batchSize !== 1 ? "s" : ""} every <strong>{batchIntervalMinutes}</strong> min
                    {" — "}
                    ~{Math.round((batchSize / batchIntervalMinutes) * 60)} msg/hr
                  </p>
                  <div className="border-t border-border/50 pt-3">
                    <Label className="text-xs text-muted-foreground">Daily Send Window (only send between these hours)</Label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start time</Label>
                        <Input
                          type="time"
                          value={sendWindowStart}
                          onChange={(e) => setSendWindowStart(e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End time</Label>
                        <Input
                          type="time"
                          value={sendWindowEnd}
                          onChange={(e) => setSendWindowEnd(e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Campaign pauses automatically outside this window.</p>
                  </div>
                </div>}

                {/* Opt-out footer toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-xs font-medium">Opt-out footer</p>
                    <p className="text-xs text-muted-foreground">Appends "Reply STOP to opt out." to every message</p>
                  </div>
                  <Switch checked={optOutFooter} onCheckedChange={setOptOutFooter} />
                </div>

                {/* Scrub filters */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Scrub Filters</p>
                  <p className="text-xs text-muted-foreground -mt-1">Choose which lists to scrub before sending. Opt-outs are always blocked.</p>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      checked={scrubInternalDnc}
                      onChange={(e) => setScrubInternalDnc(e.target.checked)}
                    />
                    <div>
                      <p className="text-xs font-medium">Internal DNC list</p>
                      <p className="text-xs text-muted-foreground">Skip contacts you have manually marked as Do Not Contact</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      checked={scrubLitigators}
                      onChange={(e) => setScrubLitigators(e.target.checked)}
                    />
                    <div>
                      <p className="text-xs font-medium">TCPA litigators</p>
                      <p className="text-xs text-muted-foreground">Skip contacts flagged as known TCPA lawsuit filers</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      checked={scrubFederalDnc}
                      onChange={(e) => setScrubFederalDnc(e.target.checked)}
                    />
                    <div>
                      <p className="text-xs font-medium">Federal DNC (National Registry)</p>
                      <p className="text-xs text-muted-foreground">Skip contacts on the national Do Not Call registry</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      checked={scrubExistingContacts}
                      onChange={(e) => setScrubExistingContacts(e.target.checked)}
                    />
                    <div>
                      <p className="text-xs font-medium">Existing contacts in system</p>
                      <p className="text-xs text-muted-foreground">Skip contacts whose phone number already exists in another list — uncheck to allow texting from a different number</p>
                    </div>
                  </label>
                </div>

                {/* Scrub Preview Summary */}
                {parsedListId && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold">Scrub Preview</p>
                      {scrubPreviewLoading && <span className="text-xs text-muted-foreground">Calculating...</span>}
                    </div>
                    {scrubPreview && !scrubPreviewLoading && (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Total contacts in list</span>
                          <span className="text-xs font-medium">{scrubPreview.total.toLocaleString()}</span>
                        </div>
                        {scrubPreview.removedOptedOut > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Opted out (always blocked)</span>
                            <span className="text-xs text-destructive">−{scrubPreview.removedOptedOut.toLocaleString()}</span>
                          </div>
                        )}
                        {scrubPreview.removedInternalDnc > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Internal DNC</span>
                            <span className="text-xs text-destructive">−{scrubPreview.removedInternalDnc.toLocaleString()}</span>
                          </div>
                        )}
                        {scrubPreview.removedLitigators > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">TCPA litigators</span>
                            <span className="text-xs text-destructive">−{scrubPreview.removedLitigators.toLocaleString()}</span>
                          </div>
                        )}
                        {scrubPreview.removedFederalDnc > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Federal DNC</span>
                            <span className="text-xs text-destructive">−{scrubPreview.removedFederalDnc.toLocaleString()}</span>
                          </div>
                        )}
                        {scrubPreview.removedExisting > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Existing in system</span>
                            <span className="text-xs text-destructive">−{scrubPreview.removedExisting.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <span className="text-xs font-semibold">Will be sent to</span>
                          <span className="text-xs font-bold text-green-600">{scrubPreview.sendable.toLocaleString()} contacts</span>
                        </div>
                      </>
                    )}
                    {!scrubPreview && !scrubPreviewLoading && (
                      <p className="text-xs text-muted-foreground">Select a contact list to see preview</p>
                    )}
                  </div>
                )}

                {type === "standard" ? (
                  <div className="space-y-3">
                    {/* Multi-template selector for Send Queue rotation */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Message Templates (rotate up to 8)</Label>
                        <Popover open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={selectedTemplateIds.length >= 8}>
                              <FileText className="h-3 w-3" />
                              Add Template
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-2" align="end">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Select a template to add</p>
                            {templates && templates.length > 0 ? (
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {templates.filter(t => !selectedTemplateIds.includes(t.id)).map((t) => (
                                  <button
                                    key={t.id}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent text-sm"
                                    onClick={() => {
                                      setSelectedTemplateIds(prev => [...prev, t.id]);
                                      setMessage(prev => prev || t.body);
                                      setTemplatePickerOpen(false);
                                    }}
                                  >
                                    <p className="font-medium text-xs">{t.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{t.body}</p>
                                  </button>
                                ))}
                                {templates.filter(t => !selectedTemplateIds.includes(t.id)).length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">All templates added</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-3">No templates yet. Create one in Templates.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                      {selectedTemplateIds.length > 0 ? (
                        <div className="space-y-1">
                          {selectedTemplateIds.map((tId, idx) => {
                            const tpl = templates?.find(t => t.id === tId);
                            return (
                              <div key={tId} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 border border-border">
                                <span className="text-xs font-bold text-primary w-4 shrink-0">{idx + 1}</span>
                                <span className="text-xs font-medium flex-1 truncate">{tpl?.name ?? `Template ${tId}`}</span>
                                <button
                                  className="text-muted-foreground hover:text-destructive text-xs"
                                  onClick={() => setSelectedTemplateIds(prev => prev.filter(id => id !== tId))}
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                          <p className="text-xs text-muted-foreground mt-1">Templates rotate in order across contacts in the Send Queue</p>
                        </div>
                      ) : (
                        <div>
                          <Textarea
                            placeholder="Hi {FirstName}, I'm interested in your property at {PropertyAddress}..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {message.length} chars · Or add templates above to rotate up to 8 variants
                          </p>
                        </div>
                      )}
                    </div>
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

                {/* Not-Interested Follow-Up Automation */}
                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">Not-Interested Follow-Up</p>
                      <p className="text-xs text-muted-foreground">Auto-send a goodbye message when AI labels a lead as Not Interested</p>
                    </div>
                    <Switch checked={followUpEnabled} onCheckedChange={setFollowUpEnabled} />
                  </div>
                  {followUpEnabled && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <Label className="text-xs text-muted-foreground">Send after (hours)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={720}
                          value={followUpDelayHours}
                          onChange={(e) => setFollowUpDelayHours(Math.max(1, parseInt(e.target.value) || 1))}
                          className="mt-1 h-8 text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">e.g. 24 = send 1 day after they say no</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Follow-up message</Label>
                        <Textarea
                          value={followUpMessage}
                          onChange={(e) => setFollowUpMessage(e.target.value)}
                          className="mt-1 min-h-[60px] text-sm"
                          placeholder="Thanks for your time! If anything changes, feel free to reach out."
                        />
                      </div>
                    </div>
                  )}
                </div>

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
                  <div className="flex items-center gap-1 shrink-0">
                    {c.campaignCategory === "land" ? (
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 font-medium">🌿 Land</span>
                    ) : (
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-medium">🏠 House</span>
                    )}
                    <Badge className={`text-xs ${STATUS_COLORS[c.status] ?? ""}`} variant="secondary">
                      {c.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{c.sent} sent</span>
                    <span>{c.replied} replied</span>
                    <span>{c.sent > 0 ? Math.round((c.replied / c.sent) * 100) : 0}% reply</span>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAi.mutate({ id: c.id, enabled: !c.aiEnabled });
                    }}
                  >
                    <Bot className={`h-3 w-3 ${c.aiEnabled ? "text-primary" : "text-muted-foreground/40"}`} />
                    <Switch
                      checked={c.aiEnabled}
                      className="scale-75 origin-right"
                      onCheckedChange={(checked) => toggleAi.mutate({ id: c.id, enabled: checked })}
                    />
                  </div>
                </div>
                {/* Send rate + window */}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {c.batchSize} / {c.batchIntervalMinutes}min
                  </span>
                  <span>·</span>
                  <span>{c.sendWindowStart}–{c.sendWindowEnd}</span>
                  {c.scheduledAt && (
                    <>
                      <span>·</span>
                      <span>
                        <Calendar className="h-3 w-3 inline mr-0.5" />
                        {format(new Date(c.scheduledAt), "MMM d, h:mm a")}
                      </span>
                    </>
                  )}
                </div>
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
              <div className="flex items-center gap-2">
                {/* AI Toggle for this campaign */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
                  <Bot className={`h-4 w-4 ${selectedCampaign.aiEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">
                    AI {selectedCampaign.aiEnabled ? "On" : "Off"}
                  </span>
                  <Switch
                    checked={selectedCampaign.aiEnabled}
                    onCheckedChange={(checked) =>
                      toggleAi.mutate({ id: selectedId!, enabled: checked })
                    }
                  />
                </div>
                {selectedCampaign.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateCampaign.mutate({ id: selectedId!, status: "paused" })}
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                )}
                {selectedCampaign.status === "paused" && (
                  <Button
                    size="sm"
                    onClick={() => updateCampaign.mutate({ id: selectedId!, status: "active" })}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                )}
{(selectedCampaign as any).sendMode === "manual" ? (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 gap-1.5"
                    onClick={() => navigate(`/campaigns/${selectedId}/send-queue`)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Start Send Queue
                  </Button>
                ) : (
                  selectedCampaign.status === "draft" || selectedCampaign.status === "scheduled" ? (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 gap-1.5"
                      onClick={() => updateCampaign.mutate({ id: selectedId!, status: "active" })}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Sending
                    </Button>
                  ) : null
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => deleteCampaign.mutate({ id: selectedId! })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Batch Settings — only for automated campaigns */}
            {(selectedCampaign as any).sendMode !== "manual" && <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Send Rate</span>
                </div>
                {(selectedCampaign.status === "draft" || selectedCampaign.status === "paused" || selectedCampaign.status === "scheduled") && (
                  <BatchEditDialog
                    campaignId={selectedId!}
                    currentBatchSize={selectedCampaign.batchSize}
                    currentInterval={selectedCampaign.batchIntervalMinutes}
                    onSave={(bs, bi) => updateCampaign.mutate({ id: selectedId!, batchSize: bs, batchIntervalMinutes: bi })}
                  />
                )}
              </div>
              <div className="flex gap-6 mt-3">
                <div>
                  <p className="text-2xl font-bold">{selectedCampaign.batchSize}</p>
                  <p className="text-xs text-muted-foreground">msgs per batch</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{selectedCampaign.batchIntervalMinutes}</p>
                  <p className="text-xs text-muted-foreground">min between batches</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ~{Math.round((selectedCampaign.batchSize / selectedCampaign.batchIntervalMinutes) * 60)}
                  </p>
                  <p className="text-xs text-muted-foreground">msgs/hr</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Send Window:</span>
                <span>{selectedCampaign.sendWindowStart ?? "09:00"} – {selectedCampaign.sendWindowEnd ?? "20:00"}</span>
                <span className="text-muted-foreground/60">(pauses outside this window)</span>
                {(selectedCampaign.status === "draft" || selectedCampaign.status === "paused" || selectedCampaign.status === "scheduled") && (
                  <button
                    className="ml-1 text-primary underline underline-offset-2 hover:no-underline"
                    onClick={() => {
                      const start = prompt("Send window start (HH:MM)", selectedCampaign.sendWindowStart ?? "09:00");
                      const end = prompt("Send window end (HH:MM)", selectedCampaign.sendWindowEnd ?? "20:00");
                      if (start && end) updateCampaign.mutate({ id: selectedId!, sendWindowStart: start, sendWindowEnd: end });
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              {selectedCampaign.scheduledAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Scheduled: {format(new Date(selectedCampaign.scheduledAt), "MMM d, yyyy h:mm a")}
                </p>
              )}
            </div>}

            {/* Scrub Filters (detail view) */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Scrub Filters</span>
              </div>
              <div className="space-y-2">
                {[
                  { key: "scrubInternalDnc" as const, label: "Internal DNC list", desc: "Skip contacts marked Do Not Contact" },
                  { key: "scrubLitigators" as const, label: "TCPA litigators", desc: "Skip known TCPA lawsuit filers" },
                  { key: "scrubFederalDnc" as const, label: "Federal DNC (National Registry)", desc: "Skip contacts on the national Do Not Call registry" },
                  { key: "scrubExistingContacts" as const, label: "Existing contacts in system", desc: "Skip phones already in another list" },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      checked={!!(selectedCampaign as any)[key]}
                      onChange={(e) => {
                        if (selectedCampaign.status === "draft" || selectedCampaign.status === "paused" || selectedCampaign.status === "scheduled") {
                          updateCampaign.mutate({ id: selectedId!, [key]: e.target.checked });
                        }
                      }}
                      disabled={selectedCampaign.status === "active" || selectedCampaign.status === "completed" || selectedCampaign.status === "cancelled"}
                    />
                    <div>
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
                {(selectedCampaign.status === "active" || selectedCampaign.status === "completed") && (
                  <p className="text-xs text-muted-foreground italic">Pause the campaign to change scrub settings.</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Sent", value: selectedCampaign.sent, icon: Zap, color: "" },
                { label: "Delivered", value: selectedCampaign.delivered, icon: CheckCircle2, color: "text-green-600" },
                { label: "Replied", value: selectedCampaign.replied, icon: BarChart2, color: "text-blue-600" },
                { label: "Failed", value: (selectedCampaign as any).failed ?? 0, icon: Pause, color: "text-red-500" },
                { label: "Opted Out", value: selectedCampaign.optedOut, icon: Pause, color: "text-yellow-600" },
              ].map((stat) => (
                <Card key={stat.label} className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
              {/* Delivery Rate */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <p className={`text-2xl font-bold ${
                    selectedCampaign.sent === 0 ? "" :
                    Math.round((selectedCampaign.delivered / selectedCampaign.sent) * 100) >= 80 ? "text-green-600" :
                    Math.round((selectedCampaign.delivered / selectedCampaign.sent) * 100) >= 60 ? "text-yellow-600" :
                    "text-red-500"
                  }`}>
                    {selectedCampaign.sent > 0
                      ? `${Math.round((selectedCampaign.delivered / selectedCampaign.sent) * 100)}%`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Delivery Rate</p>
                </CardContent>
              </Card>
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
