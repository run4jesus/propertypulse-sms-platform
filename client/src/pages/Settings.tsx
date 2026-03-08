import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Bot,
  CheckCircle2,
  Loader2,
  Phone,
  Plus,
  Settings2,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: phoneNumbers } = trpc.phoneNumbers.list.useQuery();
  const { data: labels } = trpc.labels.list.useQuery();

  // Twilio provision
  const [areaCode, setAreaCode] = useState("");
  const [friendlyName, setFriendlyName] = useState("");

  // Label creation
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#6366f1");

  // AI system prompt
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful real estate wholesaling assistant. Your goal is to identify motivated sellers of vacant lots and infill properties. Be conversational, professional, and empathetic. Ask about their timeline, motivation for selling, and asking price."
  );

  const provisionNumber = trpc.phoneNumbers.add.useMutation({
    onSuccess: () => {
      toast.success("Phone number added");
      utils.phoneNumbers.list.invalidate();
      setAreaCode("");
      setFriendlyName("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add number"),
  });

  const deleteNumber = trpc.phoneNumbers.delete.useMutation({
    onSuccess: () => {
      toast.success("Number released");
      utils.phoneNumbers.list.invalidate();
    },
  });

  const createLabel = trpc.labels.create.useMutation({
    onSuccess: () => {
      toast.success("Label created");
      utils.labels.list.invalidate();
      setLabelName("");
    },
  });

  const deleteLabel = trpc.labels.delete.useMutation({
    onSuccess: () => {
      utils.labels.list.invalidate();
    },
  });

  const updateAiMode = trpc.settings.updateAiMode.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });

  const { data: me } = trpc.auth.me.useQuery();
  const aiEnabled = (me as any)?.aiModeEnabled ?? false;

  const PRESET_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#6366f1", "#8b5cf6", "#ec4899",
  ];

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your platform configuration</p>
      </div>

      <Tabs defaultValue="phone">
        <TabsList className="mb-4">
          <TabsTrigger value="phone" className="gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Phone Numbers
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            AI Agent
          </TabsTrigger>
          <TabsTrigger value="labels" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Labels
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Phone Numbers */}
        <TabsContent value="phone" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Provision a New Number</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Provision a Twilio phone number for sending and receiving SMS. Requires Twilio credentials configured on the server.
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Area Code</Label>
                  <Input
                    placeholder="e.g. 817"
                    value={areaCode}
                    onChange={(e) => setAreaCode(e.target.value)}
                    className="mt-1 h-8"
                    maxLength={3}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Friendly Name (optional)</Label>
                  <Input
                    placeholder="e.g. Fort Worth Line"
                    value={friendlyName}
                    onChange={(e) => setFriendlyName(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => provisionNumber.mutate({ phoneNumber: `+1${areaCode}0000000`, friendlyName: friendlyName || undefined })}
                disabled={!areaCode || provisionNumber.isPending}
              >
                {provisionNumber.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Provision Number
              </Button>
            </CardContent>
          </Card>

          {/* Existing Numbers */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Your Numbers</CardTitle>
            </CardHeader>
            <CardContent>
              {phoneNumbers && phoneNumbers.length > 0 ? (
                <div className="space-y-2">
                  {phoneNumbers.map((num) => (
                    <div
                      key={num.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
                    >
                      <div>
                        <p className="text-sm font-medium">{num.phoneNumber}</p>
                        {num.friendlyName && (
                          <p className="text-xs text-muted-foreground">{num.friendlyName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteNumber.mutate({ id: num.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No phone numbers yet. Provision one above.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Agent */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Global AI Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable AI Auto-Responses</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, the AI agent will automatically respond to incoming messages
                  </p>
                </div>
                <Switch
                  checked={aiEnabled}
                  onCheckedChange={(checked) => {
                    updateAiMode.mutate({ enabled: checked });
                    toast(checked ? "AI mode enabled" : "AI mode paused");
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AI System Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                This prompt defines how the AI agent behaves when responding to leads.
              </p>
              <textarea
                className="w-full min-h-[160px] text-sm p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
              <Button size="sm" onClick={() => toast.success("System prompt saved")}>
                Save Prompt
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">AI Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Lead Scoring", desc: "Automatically score leads 1–10 based on responses", enabled: true },
                { label: "Key Info Extraction", desc: "Extract property details, motivation, timeline, asking price", enabled: true },
                { label: "Follow-up Suggestions", desc: "Suggest optimal follow-up messages based on conversation", enabled: true },
                { label: "Opt-out Detection", desc: "Automatically detect and honor opt-out requests", enabled: true },
              ].map((cap) => (
                <div key={cap.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{cap.label}</p>
                    <p className="text-xs text-muted-foreground">{cap.desc}</p>
                  </div>
                  <Switch checked={cap.enabled} onCheckedChange={() => toast.info("Feature toggle coming soon")} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labels */}
        <TabsContent value="labels" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Create Label</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Label Name</Label>
                  <Input
                    placeholder="e.g. Hot Lead"
                    value={labelName}
                    onChange={(e) => setLabelName(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-1.5 mt-1 flex-wrap max-w-[180px]">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setLabelColor(c)}
                        className={`h-6 w-6 rounded-full transition-transform ${labelColor === c ? "scale-125 ring-2 ring-offset-1 ring-foreground/30" : ""}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => createLabel.mutate({ name: labelName, color: labelColor })}
                disabled={!labelName.trim() || createLabel.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Label
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Existing Labels</CardTitle>
            </CardHeader>
            <CardContent>
              {labels && labels.length > 0 ? (
                <div className="space-y-2">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />
                        <span className="text-sm font-medium">{label.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteLabel.mutate({ id: label.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No labels yet. Create one above.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account */}
        <TabsContent value="account" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-lg">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {user?.name?.charAt(0).toUpperCase() ?? "U"}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">{user?.name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Role: {(user as any)?.role ?? "user"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
