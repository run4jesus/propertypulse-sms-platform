import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bot, Brain, Clock, MessageSquare, Shield, Zap,
  Plus, Trash2, ChevronDown, ChevronUp, Save, Info,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConversationExample {
  seller: string;
  agent: string;
}

interface ObjectionEntry {
  objection: string;
  response: string;
}

interface StageInstruction {
  stage: "intro" | "price_ask" | "needs_offer";
  instruction: string;
}

// ─── Helper: section wrapper ─────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/30 rounded-t-lg transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">{title}</CardTitle>
              </div>
              {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function AITraining() {
  const utils = trpc.useUtils();
  const { data: me } = trpc.auth.me.useQuery();
  const u = me as any;

  // ── Persona & Tone ──
  const [persona, setPersona] = useState("");
  const [tone, setTone] = useState("");

  // ── Business Context ──
  const [businessContext, setBusinessContext] = useState("");

  // ── Conversation Examples ──
  const [examples, setExamples] = useState<ConversationExample[]>([
    { seller: "", agent: "" },
  ]);

  // ── Objection Handling ──
  const [objections, setObjections] = useState<ObjectionEntry[]>([
    { objection: "", response: "" },
  ]);

  // ── Stage Instructions ──
  const [stageInstructions, setStageInstructions] = useState<StageInstruction[]>([
    { stage: "intro", instruction: "" },
    { stage: "price_ask", instruction: "" },
    { stage: "needs_offer", instruction: "" },
  ]);

  // ── Forbidden Phrases ──
  const [forbiddenInput, setForbiddenInput] = useState("");
  const [forbidden, setForbidden] = useState<string[]>([]);

  // ── Reply Timing ──
  const [delayFirstMin, setDelayFirstMin] = useState(2);
  const [delayFirstMax, setDelayFirstMax] = useState(6);
  const [delayFollowMin, setDelayFollowMin] = useState(2);
  const [delayFollowMax, setDelayFollowMax] = useState(6);

  // Load saved values when user data arrives
  useEffect(() => {
    if (!u) return;
    if (u.aiPersona) setPersona(u.aiPersona);
    if (u.aiTone) setTone(u.aiTone);
    if (u.aiBusinessContext) setBusinessContext(u.aiBusinessContext);
    if (u.aiExamples) {
      try { setExamples(JSON.parse(u.aiExamples)); } catch {}
    }
    if (u.aiObjectionHandling) {
      try { setObjections(JSON.parse(u.aiObjectionHandling)); } catch {}
    }
    if (u.aiStageInstructions) {
      try { setStageInstructions(JSON.parse(u.aiStageInstructions)); } catch {}
    }
    if (u.aiForbiddenPhrases) {
      try { setForbidden(JSON.parse(u.aiForbiddenPhrases)); } catch {}
    }
    if (u.aiReplyDelayFirstMin != null) setDelayFirstMin(u.aiReplyDelayFirstMin);
    if (u.aiReplyDelayFirstMax != null) setDelayFirstMax(u.aiReplyDelayFirstMax);
    if (u.aiReplyDelayFollowMin != null) setDelayFollowMin(u.aiReplyDelayFollowMin);
    if (u.aiReplyDelayFollowMax != null) setDelayFollowMax(u.aiReplyDelayFollowMax);
  }, [u?.id]);

  const saveTraining = trpc.settings.updateAiTraining.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      toast.success("AI training saved — changes take effect on next reply");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  function handleSave() {
    saveTraining.mutate({
      aiPersona: persona,
      aiTone: tone,
      aiBusinessContext: businessContext,
      aiExamples: JSON.stringify(examples.filter(e => e.seller || e.agent)),
      aiObjectionHandling: JSON.stringify(objections.filter(o => o.objection || o.response)),
      aiStageInstructions: JSON.stringify(stageInstructions),
      aiForbiddenPhrases: JSON.stringify(forbidden),
      aiReplyDelayFirstMin: delayFirstMin,
      aiReplyDelayFirstMax: delayFirstMax,
      aiReplyDelayFollowMin: delayFollowMin,
      aiReplyDelayFollowMax: delayFollowMax,
    });
  }

  const minuteOptions = Array.from({ length: 31 }, (_, i) => ({
    value: i,
    label: i === 0 ? "Instant" : i === 1 ? "1 min" : `${i} min`,
  }));

  const TONE_PRESETS = [
    "Casual and warm",
    "Friendly and conversational",
    "Direct and confident",
    "Empathetic and patient",
    "Low-pressure and helpful",
  ];

  return (
    <div className="p-6 max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Agent Training
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customize how the AI responds to sellers. Changes take effect on the next reply.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saveTraining.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveTraining.isPending ? "Saving..." : "Save All"}
        </Button>
      </div>

      {/* 1. Persona & Tone */}
      <Section
        icon={Bot}
        title="Persona & Tone"
        description="Define who the AI is and how it communicates. This shapes every message it sends."
      >
        <div>
          <Label className="text-xs font-medium">Agent Persona</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Describe who the AI is pretending to be. E.g. "A local real estate investor in DFW who buys houses directly from homeowners."
          </p>
          <textarea
            className="w-full min-h-[80px] text-sm p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="E.g. A local real estate investor in the DFW area who buys houses directly from homeowners. You are not a realtor and do not list properties. You pay cash and close quickly."
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Communication Tone</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Describe the tone and style. Click a preset or write your own.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {TONE_PRESETS.map((t) => (
              <Badge
                key={t}
                variant={tone === t ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setTone(t)}
              >
                {t}
              </Badge>
            ))}
          </div>
          <textarea
            className="w-full min-h-[60px] text-sm p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="E.g. Casual, warm, and direct. Texts like a real person — short sentences, no corporate language, no emojis."
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>
      </Section>

      {/* 2. Business Context */}
      <Section
        icon={Info}
        title="Business Context"
        description="Facts about your business the AI can reference naturally in conversations."
      >
        <p className="text-xs text-muted-foreground">
          Include your market area, how you buy, close timeline, payment method, and anything else relevant. The AI will use this to answer seller questions naturally.
        </p>
        <textarea
          className="w-full min-h-[120px] text-sm p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={`E.g.
- We buy houses in the DFW Metroplex (Dallas, Fort Worth, Arlington, Mansfield, etc.)
- We pay cash and can close in 7-14 days
- We buy as-is — no repairs needed
- We are not realtors and do not list properties
- We work directly with homeowners`}
          value={businessContext}
          onChange={(e) => setBusinessContext(e.target.value)}
        />
      </Section>

      {/* 3. Conversation Examples */}
      <Section
        icon={MessageSquare}
        title="Conversation Examples"
        description="Show the AI examples of ideal seller-agent exchanges. The more examples, the better it learns your style."
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground">
          Add real examples of how you'd want the AI to respond. These are injected into the system prompt as few-shot examples.
        </p>
        <div className="space-y-4">
          {examples.map((ex, i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Example {i + 1}</span>
                {examples.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => setExamples(examples.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-xs text-orange-600 font-medium">Seller says:</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="E.g. Yeah I might be interested, what are you offering?"
                  value={ex.seller}
                  onChange={(e) => {
                    const updated = [...examples];
                    updated[i] = { ...updated[i], seller: e.target.value };
                    setExamples(updated);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-blue-600 font-medium">Agent responds:</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="E.g. Ok great, what price did you have in mind for the property?"
                  value={ex.agent}
                  onChange={(e) => {
                    const updated = [...examples];
                    updated[i] = { ...updated[i], agent: e.target.value };
                    setExamples(updated);
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setExamples([...examples, { seller: "", agent: "" }])}
          >
            <Plus className="h-3 w-3" />
            Add Example
          </Button>
        </div>
      </Section>

      {/* 4. Objection Handling */}
      <Section
        icon={Shield}
        title="Objection Handling"
        description="Pre-define how the AI handles common seller objections or difficult questions."
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground">
          When a seller raises one of these objections, the AI will use your defined response as a guide.
        </p>
        <div className="space-y-3">
          {objections.map((obj, i) => (
            <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Objection {i + 1}</span>
                {objections.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => setObjections(objections.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-xs font-medium">Seller says:</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="E.g. Are you a realtor? / What company are you with? / Is this a scam?"
                  value={obj.objection}
                  onChange={(e) => {
                    const updated = [...objections];
                    updated[i] = { ...updated[i], objection: e.target.value };
                    setObjections(updated);
                  }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">How to respond:</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  placeholder="E.g. Nope, not a realtor — just a local buyer looking to buy direct."
                  value={obj.response}
                  onChange={(e) => {
                    const updated = [...objections];
                    updated[i] = { ...updated[i], response: e.target.value };
                    setObjections(updated);
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setObjections([...objections, { objection: "", response: "" }])}
          >
            <Plus className="h-3 w-3" />
            Add Objection
          </Button>
        </div>
      </Section>

      {/* 5. Stage-Specific Instructions */}
      <Section
        icon={Zap}
        title="Stage-Specific Instructions"
        description="Add custom instructions for each conversation stage to fine-tune the AI's behavior."
        defaultOpen={false}
      >
        <div className="space-y-4">
          {stageInstructions.map((si, i) => (
            <div key={si.stage}>
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {si.stage === "intro" ? "Stage 1: Intro" : si.stage === "price_ask" ? "Stage 2: Price Ask" : "Stage 3: Needs Offer"}
                </Badge>
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-1.5">
                {si.stage === "intro" && "When the seller first replies to your opening text."}
                {si.stage === "price_ask" && "After the seller shows interest and you've asked for their price."}
                {si.stage === "needs_offer" && "When the seller gives a price or asks you to make an offer."}
              </p>
              <textarea
                className="w-full min-h-[70px] text-sm p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={
                  si.stage === "intro"
                    ? "E.g. Always acknowledge if they mention any hardship before asking about selling. Keep it to 1-2 sentences max."
                    : si.stage === "price_ask"
                    ? "E.g. If they seem hesitant, remind them there's no obligation and we just want to see if it makes sense for both sides."
                    : "E.g. Always confirm you'll have someone reach out within 24 hours."
                }
                value={si.instruction}
                onChange={(e) => {
                  const updated = [...stageInstructions];
                  updated[i] = { ...updated[i], instruction: e.target.value };
                  setStageInstructions(updated);
                }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Forbidden Phrases */}
      <Section
        icon={Shield}
        title="Forbidden Phrases"
        description="Words or phrases the AI must never use. Helps avoid corporate language, red flags, or anything that sounds automated."
        defaultOpen={false}
      >
        <div className="flex gap-2">
          <Input
            className="h-8 text-xs flex-1"
            placeholder="E.g. As an AI... / I'm reaching out on behalf of... / Our company..."
            value={forbiddenInput}
            onChange={(e) => setForbiddenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && forbiddenInput.trim()) {
                setForbidden([...forbidden, forbiddenInput.trim()]);
                setForbiddenInput("");
              }
            }}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              if (forbiddenInput.trim()) {
                setForbidden([...forbidden, forbiddenInput.trim()]);
                setForbiddenInput("");
              }
            }}
          >
            Add
          </Button>
        </div>
        {forbidden.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {forbidden.map((phrase, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-xs gap-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => setForbidden(forbidden.filter((_, j) => j !== i))}
              >
                {phrase}
                <Trash2 className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Press Enter or click Add. Click a phrase to remove it.</p>
      </Section>

      {/* 7. Reply Timing */}
      <Section
        icon={Clock}
        title="Reply Timing"
        description="Set how long the AI waits before sending a reply. A random delay within your range is chosen each time."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs font-medium">First Reply Delay</Label>
            <p className="text-xs text-muted-foreground mb-1.5">When a seller first responds to your campaign text.</p>
            <div className="flex items-center gap-2">
              <Select value={String(delayFirstMin)} onValueChange={(v) => setDelayFirstMin(parseInt(v))}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{minuteOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">to</span>
              <Select value={String(delayFirstMax)} onValueChange={(v) => setDelayFirstMax(parseInt(v))}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{minuteOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Follow-up Reply Delay</Label>
            <p className="text-xs text-muted-foreground mb-1.5">For all subsequent messages in the conversation.</p>
            <div className="flex items-center gap-2">
              <Select value={String(delayFollowMin)} onValueChange={(v) => setDelayFollowMin(parseInt(v))}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{minuteOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">to</span>
              <Select value={String(delayFollowMax)} onValueChange={(v) => setDelayFollowMax(parseInt(v))}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{minuteOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Test AI always responds instantly regardless of this setting.
        </p>
      </Section>

      {/* Save button at bottom */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saveTraining.isPending} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {saveTraining.isPending ? "Saving..." : "Save All Training"}
        </Button>
      </div>
    </div>
  );
}
