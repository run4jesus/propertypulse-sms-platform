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
  { label: "Awaiting Reply", value: "awaiting_reply" },
  { label: "Unreplied", value: "unreplied" },
  { label: "Opted Out", value: "opted_out" },
];

function getScoreColor(score: number) {
  if (score >= 7) return "text-emerald-600 bg-emerald-50";
  if (score >= 4) return "text-amber-600 bg-amber-50";
  return "text-red-500 bg-red-50";
}

export default function Messenger() {
  const params = useParams<{ id?: string }>();
  const selectedId = params.id ? parseInt(params.id) : null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [messageText, setMessageText] = useState("");
  const [, setNavState] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: conversations, isLoading: convLoading } = trpc.conversations.list.useQuery({
    status: statusFilter,
    search: search || undefined,
    limit: 100,
  });

  const { data: labels } = trpc.labels.list.useQuery();

  const { data: selectedConv, isLoading: convDetailLoading } = trpc.conversations.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId, refetchInterval: 5000 }
  );

  const { data: messages, isLoading: msgLoading } = trpc.messages.list.useQuery(
    { conversationId: selectedId! },
    { enabled: !!selectedId, refetchInterval: 5000 }
  );

  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.messages.list.invalidate({ conversationId: selectedId! });
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
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
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
              return (
                <a
                  key={cv.id}
                  href={`/messenger/${cv.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState({}, "", `/messenger/${cv.id}`);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                  className={`flex items-start gap-3 px-3 py-3 border-b border-border/50 cursor-pointer transition-colors hover:bg-accent/40 ${
                    isSelected ? "bg-accent/60 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-semibold text-primary">
                      {name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm font-medium truncate ${cv.unreadCount > 0 ? "font-semibold" : ""}`}>
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
                    <div className="flex items-center gap-1 mt-1">
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
                    </div>
                  </div>
                  {cv.unreadCount > 0 && (
                    <Badge className="h-5 min-w-5 p-0 flex items-center justify-center text-xs shrink-0">
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
          <div className="h-14 border-b border-border px-4 flex items-center justify-between bg-card shrink-0">
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
              <div className="flex gap-1 ml-2">
                {convLabels.map((l) => (
                  <span
                    key={l.label.id}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: l.label.color + "20", color: l.label.color }}
                  >
                    {l.label.name}
                  </span>
                ))}
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {msgLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3 max-w-2xl mx-auto">
                {messages.map((msg) => (
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
                        <span className={`text-xs opacity-70`}>
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </span>
                        {msg.isAiGenerated && (
                          <Bot className="h-3 w-3 opacity-70" />
                        )}
                        {msg.direction === "outbound" && (
                          <span className={`text-xs opacity-70`}>
                            · {msg.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
