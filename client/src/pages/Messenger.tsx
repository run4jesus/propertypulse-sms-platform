import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Loader2,
  MoreVertical,
  Search,
  Send,
  Sparkles,
  Star,
  Tag,
  Phone,
  MessageSquare,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const LABEL_COLORS: Record<string, string> = {
  "#ef4444": "bg-red-100 text-red-700",
  "#f97316": "bg-orange-100 text-orange-700",
  "#eab308": "bg-yellow-100 text-yellow-700",
  "#22c55e": "bg-green-100 text-green-700",
  "#6366f1": "bg-indigo-100 text-indigo-700",
  "#8b5cf6": "bg-violet-100 text-violet-700",
  "#06b6d4": "bg-cyan-100 text-cyan-700",
};

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Unread", value: "unread" },
  { label: "Unreplied", value: "unreplied" },
  { label: "Awaiting Reply", value: "awaiting_reply" },
  { label: "Opted Out", value: "opted_out" },
  { label: "Starred", value: "starred" },
];

type Disposition = "interested" | "not_interested" | "wrong_number" | "callback_requested" | "under_contract" | "closed" | "dnc" | "no_answer";

const DISPOSITIONS: { value: Disposition; label: string; color: string; bg: string; dot: string }[] = [
  { value: "interested",         label: "Interested",         color: "text-emerald-700", bg: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300",  dot: "bg-emerald-500" },
  { value: "not_interested",     label: "Not Interested",     color: "text-slate-600",   bg: "bg-slate-100 hover:bg-slate-200 border-slate-300",        dot: "bg-slate-400" },
  { value: "wrong_number",       label: "Wrong Number",       color: "text-orange-700",  bg: "bg-orange-100 hover:bg-orange-200 border-orange-300",     dot: "bg-orange-500" },
  { value: "callback_requested", label: "Call Me",            color: "text-blue-700",   bg: "bg-blue-100 hover:bg-blue-200 border-blue-300",           dot: "bg-blue-500" },
  { value: "under_contract",     label: "Under Contract",     color: "text-violet-700", bg: "bg-violet-100 hover:bg-violet-200 border-violet-300",     dot: "bg-violet-500" },
  { value: "closed",             label: "Closed",             color: "text-teal-700",   bg: "bg-teal-100 hover:bg-teal-200 border-teal-300",           dot: "bg-teal-500" },
  { value: "dnc",                label: "DNC",                color: "text-red-700",    bg: "bg-red-100 hover:bg-red-200 border-red-300",              dot: "bg-red-500" },
  { value: "no_answer",          label: "No Answer",          color: "text-gray-600",   bg: "bg-gray-100 hover:bg-gray-200 border-gray-300",           dot: "bg-gray-400" },
];

function getDisposition(value: string | null | undefined) {
  return DISPOSITIONS.find((d) => d.value === value) ?? null;
}

function getScoreColor(score: number) {
  if (score >= 7) return "text-emerald-600 bg-emerald-50";
  if (score >= 4) return "text-amber-600 bg-amber-50";
  return "text-red-500 bg-red-50";
}

function MacrosDropdown({ onInsert }: { onInsert: (body: string) => void }) {
  const { data: macros = [] } = trpc.macros.list.useQuery();

  if (macros.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="h-10 w-10" disabled>
            <Zap className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>No macros yet — create them in Macros</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Zap className="h-4 w-4 text-amber-500" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Insert macro</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
        {macros.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => onInsert(m.body)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-medium text-sm">{m.name}</span>
            <span className="text-xs text-muted-foreground truncate w-full">{m.body.slice(0, 60)}{m.body.length > 60 ? "…" : ""}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Messenger() {
  const params = useParams<{ id?: string }>();
  const selectedId = params.id ? parseInt(params.id) : null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [labelFilter, setLabelFilter] = useState<number | undefined>(undefined);
  const [messageText, setMessageText] = useState("");
  const [, setNavState] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: conversations, isLoading: convLoading } = trpc.conversations.list.useQuery({
    status: statusFilter,
    labelId: labelFilter,
    search: search || undefined,
    limit: 100,
  });

  const { data: labels } = trpc.labels.list.useQuery();

  const { data: selectedConv, isLoading: convDetailLoading } = trpc.conversations.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId, refetchInterval: 5000 }
  );

  // Unified thread: load ALL messages for this contact's phone number across all sender numbers
  // Derive phone directly from selectedConv to avoid using `contact` before it's declared
  const contactPhone = selectedConv?.contact?.phone ?? "";
  const { data: unifiedMessages, isLoading: msgLoading } = trpc.messages.listByContactPhone.useQuery(
    { contactPhone },
    { enabled: !!contactPhone, refetchInterval: 5000 }
  );
  const messages = unifiedMessages;

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.messages.listByContactPhone.invalidate({ contactPhone });
      utils.conversations.list.invalidate();
    },
  });

  const updateConv = trpc.conversations.update.useMutation({
    onSuccess: () => {
      utils.conversations.get.invalidate({ id: selectedId! });
      utils.conversations.list.invalidate();
    },
  });

  const analyzeAI = trpc.ai.analyzeConversation.useMutation({
    onSuccess: (data) => {
      toast.success("AI analysis complete", {
        description: `Lead score: ${data.leadScore}/10 — ${data.keyInsights}`,
      });
      utils.conversations.get.invalidate({ id: selectedId! });
    },
    onError: () => toast.error("AI analysis failed"),
  });

  const generateReply = trpc.ai.generateReply.useMutation({
    onSuccess: (data) => {
      setMessageText(typeof data.reply === 'string' ? data.reply : '');
    },
    onError: () => toast.error("Failed to generate reply"),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedId) return;
    sendMessage.mutate({ conversationId: selectedId, body: messageText.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const markDnc = trpc.contactManagement.markDnc.useMutation();

  const setDisposition = trpc.conversations.setDisposition.useMutation({
    onSuccess: () => {
      utils.conversations.get.invalidate({ id: selectedId! });
      utils.conversations.list.invalidate();
    },
    onError: () => toast.error("Failed to update disposition"),
  });

  const handleDisposition = (value: Disposition | null) => {
    if (!selectedId) return;
    const current = conv?.disposition as Disposition | null | undefined;
    // Toggle off if clicking the same one
    const next = current === value ? null : value;
    setDisposition.mutate({ id: selectedId, disposition: next });
    if (next) {
      const d = getDisposition(next);
      toast.success(`Marked as ${d?.label}`);
    } else {
      toast("Disposition cleared");
    }
  };

  const handleAiToggle = (checked: boolean) => {
    if (!selectedId) return;
    updateConv.mutate({ id: selectedId, aiEnabled: checked });
    toast(checked ? "AI enabled for this conversation" : "AI paused for this conversation");
  };

  const handleStar = () => {
    if (!selectedId || !selectedConv) return;
    updateConv.mutate({ id: selectedId, isStarred: !selectedConv.conversation.isStarred });
  };

  const contact = selectedConv?.contact;
  const conv = selectedConv?.conversation;
  const aiSuggestion = selectedConv?.aiSuggestion;
  const convLabels = selectedConv?.labels ?? [];

  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.phone
    : "";

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Inbox List */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-card">
        {/* Search */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Status filters */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => { setStatusFilter(f.value); setLabelFilter(undefined); }}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  statusFilter === f.value && !labelFilter
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Label filters */}
          {labels && labels.length > 0 && (
            <div className="flex gap-1 flex-wrap pt-1 border-t border-border/50">
              {labels.map((lbl) => (
                <button
                  key={lbl.id}
                  onClick={() => {
                    setLabelFilter(labelFilter === lbl.id ? undefined : lbl.id);
                    setStatusFilter(undefined);
                  }}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    labelFilter === lbl.id
                      ? "text-white border-transparent"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                  style={labelFilter === lbl.id ? { backgroundColor: lbl.color, borderColor: lbl.color } : {}}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: lbl.color }}
                  />
                  {lbl.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {convLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations && conversations.length > 0 ? (
            conversations.map((row) => {
              const c = row.contact;
              const cv = row.conversation;
              const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.phone;
              const isSelected = cv.id === selectedId;
              const isUnread = cv.unreadCount > 0 && !isSelected;
              return (
                <a
                  key={cv.id}
                  href={`/messenger/${cv.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, "", `/messenger/${cv.id}`);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                    // Invalidate conversation list after a short delay so unread badge clears
                    setTimeout(() => utils.conversations.list.invalidate(), 1500);
                  }}
                  className={`flex items-start gap-3 px-3 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-accent/40 ${
                    isSelected
                      ? "bg-accent/60 border-l-2 border-l-primary"
                      : isUnread
                      ? "bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="relative h-9 w-9 shrink-0 mt-0.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm truncate ${
                        isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80"
                      }`}>
                        {name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {cv.lastMessageAt
                          ? formatDistanceToNow(new Date(cv.lastMessageAt), { addSuffix: false })
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {cv.lastMessagePreview ?? "No messages"}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {cv.status === "awaiting_reply" && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                          Awaiting
                        </span>
                      )}
                      {cv.aiEnabled && (
                        <Bot className="h-3 w-3 text-primary" />
                      )}
                      {cv.isStarred && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      )}
                      {cv.leadScore && cv.leadScore > 0 ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getScoreColor(cv.leadScore)}`}>
                          {cv.leadScore}/10
                        </span>
                      ) : null}
                      {(() => {
                        const disp = getDisposition((cv as { disposition?: string }).disposition);
                        return disp ? (
                          <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${disp.bg} ${disp.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${disp.dot}`} />
                            {disp.label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  {isUnread && (
                    <Badge className="h-5 min-w-5 p-0 flex items-center justify-center text-xs shrink-0 bg-blue-500 hover:bg-blue-500 text-white border-0">
                      {cv.unreadCount}
                    </Badge>
                  )}
                </a>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground px-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No conversations found</p>
            </div>
          )}
        </ScrollArea>
      </div>

        {/* Conversation View */}
        {selectedId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Conversation Header */}
            <div className="border-b border-border bg-card shrink-0">
              {/* Top row: contact info + action buttons */}
              <div className="h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {contactName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">{contactName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{contact?.phone}</p>
                  </div>
                  {/* Labels */}
                  <div className="flex gap-1 ml-2 flex-wrap">
                    {convLabels.map((l) => (
                      <span
                        key={l.label.id}
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: l.label.color + "20", color: l.label.color }}
                      >
                        {l.label.name}
                      </span>
                    ))}
                    {/* DNC / Litigator badges */}
                    {(contact?.dncStatus === "internal_dnc" || contact?.dncStatus === "dnc_complainers") && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 border border-red-300">
                        🚫 Internal DNC
                      </span>
                    )}
                    {contact?.litigatorFlag && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-200 text-red-800 border border-red-400">
                        ⚠ Litigator
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* AI per-conversation toggle */}
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
                    <Bot className={`h-3.5 w-3.5 ${conv?.aiEnabled ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">AI</span>
                    <Switch
                      checked={conv?.aiEnabled ?? false}
                      onCheckedChange={handleAiToggle}
                      className="scale-75"
                    />
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => analyzeAI.mutate({ conversationId: selectedId })}
                        disabled={analyzeAI.isPending}
                      >
                        {analyzeAI.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Analyze with AI</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${conv?.isStarred ? "text-amber-500" : ""}`}
                        onClick={handleStar}
                      >
                        <Star className={`h-4 w-4 ${conv?.isStarred ? "fill-amber-500" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Star conversation</TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {labels?.map((label) => (
                        <DropdownMenuItem
                          key={label.id}
                          onClick={() => {
                            trpc.conversations.assignLabel.useMutation();
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full mr-2"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem
                        onClick={() =>
                          updateConv.mutate({ id: selectedId, status: "opted_out" })
                        }
                        className="text-destructive"
                      >
                        Mark as Opted Out
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!contact) return;
                          markDnc.mutate(
                            { contactId: contact.id, phone: contact.phone },
                            {
                              onSuccess: () => {
                                toast.success("Contact added to internal DNC list");
                                utils.conversations.get.invalidate({ id: selectedId! });
                              },
                              onError: () => toast.error("Failed to mark as DNC"),
                            }
                          );
                        }}
                        className="text-destructive"
                      >
                        🚫 Mark as Internal DNC
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Disposition bar — quick-tap pills */}
              <div className="px-4 pb-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium mr-1">Mark:</span>
                {DISPOSITIONS.map((d) => {
                  const isActive = conv?.disposition === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => handleDisposition(d.value as Disposition)}
                      disabled={setDisposition.isPending}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                        isActive
                          ? `${d.bg} ${d.color} ring-2 ring-offset-1 ring-current/30`
                          : `${d.bg} ${d.color} opacity-70 hover:opacity-100`
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${d.dot} ${isActive ? "" : "opacity-60"}`} />
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

          {/* DNC Warning Banner */}
          {(contact?.dncStatus === "internal_dnc" || contact?.dncStatus === "dnc_complainers" || contact?.litigatorFlag) && (
            <div className="mx-4 mt-3 mb-0 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <span className="font-semibold">DNC Warning — </span>
                {(contact?.dncStatus === "internal_dnc" || contact?.dncStatus === "dnc_complainers")
                  ? "This contact is on your internal Do Not Contact list. "
                  : ""}
                {contact?.litigatorFlag
                  ? "This contact is flagged as a known TCPA litigator. "
                  : ""}
                Sending messages may expose you to legal liability.
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {msgLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3 max-w-2xl mx-auto">
                {messages.map((row, idx) => {
                  const msg = row.message;
                  // Show a subtle divider when the sender phone number changes between messages
                  const prevRow = idx > 0 ? messages[idx - 1] : null;
                  const senderChanged = prevRow && prevRow.phoneNumberId !== row.phoneNumberId && msg.direction === "outbound";
                  return (
                    <>
                      {senderChanged && (
                        <div key={`divider-${msg.id}`} className="flex items-center gap-2 my-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                            Sent from a different number
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                            msg.direction === "outbound"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card border border-border text-foreground rounded-bl-sm"
                          }`}
                        >
                          <p className="leading-relaxed">{msg.body}</p>
                          <div className={`flex items-center gap-1 mt-1 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                            <span className="text-xs opacity-70">
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                            {msg.isAiGenerated && (
                              <Bot className="h-3 w-3 opacity-70" />
                            )}
                            {msg.direction === "outbound" && (
                              <span className="text-xs opacity-70">
                                · {msg.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No messages yet. Send the first one.</p>
              </div>
            )}
          </ScrollArea>

          {/* AI Suggestion Banner */}
          {aiSuggestion && (
            <div className="mx-4 mb-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-start gap-2">
                <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary">AI Suggestion</span>
                    {aiSuggestion.leadScore && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getScoreColor(aiSuggestion.leadScore)}`}>
                        Score: {aiSuggestion.leadScore}/10
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {aiSuggestion.suggestedReply}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 shrink-0"
                  onClick={() => setMessageText(aiSuggestion.suggestedReply ?? "")}
                >
                  Use
                </Button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="p-3 border-t border-border bg-card shrink-0">
            <div className="flex gap-2 items-end max-w-2xl mx-auto">
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  className="min-h-[44px] max-h-32 resize-none text-sm pr-10"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
              </div>
              <div className="flex gap-1.5 shrink-0">
                {/* Macros quick-insert */}
                <MacrosDropdown onInsert={(body) => setMessageText(prev => prev ? prev + " " + body : body)} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => generateReply.mutate({ conversationId: selectedId })}
                      disabled={generateReply.isPending}
                    >
                      {generateReply.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate AI reply</TooltipContent>
                </Tooltip>
                <Button
                  size="icon"
                  className="h-10 w-10"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs mt-1">Choose from the inbox on the left</p>
          </div>
        </div>
      )}
    </div>
  );
}
