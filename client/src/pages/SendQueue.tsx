import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, SkipForward, ArrowLeft, Phone, MapPin, User, RotateCcw, CheckCircle2, Keyboard } from "lucide-react";

export default function SendQueue() {
  const [, params] = useRoute("/campaigns/:id/send-queue");
  const [, navigate] = useLocation();
  const campaignId = params ? parseInt(params.id) : 0;

  const { data, isLoading } = trpc.campaigns.getSendQueue.useQuery(
    { campaignId },
    { enabled: campaignId > 0 }
  );

  const phoneNumbersQuery = trpc.phoneNumbers.list.useQuery();
  const sendMutation = trpc.campaigns.sendQueueItem.useMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [editedBody, setEditedBody] = useState("");
  const [selectedPhoneId, setSelectedPhoneId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const queue = data?.contacts ?? [];
  const currentItem = queue[currentIndex];
  const totalItems = queue.length;
  const progress = totalItems > 0 ? ((sentCount + skippedCount) / totalItems) * 100 : 0;
  const isDone = currentIndex >= totalItems;

  // Sync editedBody when current item changes
  useEffect(() => {
    if (currentItem) {
      setEditedBody(currentItem.resolvedBody);
    }
  }, [currentIndex, currentItem?.contact.id]);

  // Set default phone number
  useEffect(() => {
    if (phoneNumbersQuery.data && phoneNumbersQuery.data.length > 0 && !selectedPhoneId) {
      setSelectedPhoneId(phoneNumbersQuery.data[0].id);
    }
  }, [phoneNumbersQuery.data]);

  const handleSend = useCallback(async () => {
    if (!currentItem || isSending || isDone) return;
    if (!selectedPhoneId) {
      toast.error("Please select a phone number to send from");
      return;
    }
    if (!editedBody.trim()) {
      toast.error("Message body cannot be empty");
      return;
    }
    setIsSending(true);
    try {
      const result = await sendMutation.mutateAsync({
        campaignId,
        contactId: currentItem.contact.id,
        body: editedBody,
        fromPhoneNumberId: selectedPhoneId,
      });
      if (result.success) {
        setSentCount(prev => prev + 1);
        setCompletedItems(prev => { const s = new Set(Array.from(prev)); s.add(currentItem.contact.id); return s; });
        toast.success(`Sent to ${currentItem.contact.firstName ?? currentItem.contact.phone}`);
      } else {
        toast.error("Failed to send — check TextGrid credentials");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Send failed");
    } finally {
      setIsSending(false);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentItem, isSending, isDone, selectedPhoneId, editedBody, campaignId, sendMutation]);

  const handleSkip = useCallback(() => {
    if (isDone) return;
    setSkippedCount(prev => prev + 1);
    setCurrentIndex(prev => prev + 1);
    toast.info(`Skipped ${currentItem?.contact.firstName ?? "contact"}`);
  }, [isDone, currentItem]);

  // Spacebar / Enter to send
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in textarea
      if (document.activeElement === textareaRef.current) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleSend();
      }
      if (e.code === "KeyS" && e.shiftKey) {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSend, handleSkip]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground animate-pulse">Loading send queue...</div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-6">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h1 className="text-2xl font-bold">Queue Complete</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          You sent <strong>{sentCount}</strong> messages and skipped <strong>{skippedCount}</strong> contacts.
        </p>
        <Button onClick={() => navigate(`/campaigns`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const contact = currentItem?.contact;
  const templateIndex = currentItem?.templateIndex;
  const templateCount = currentItem?.templateCount;
  const templateName = currentItem?.templateName;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">{data?.campaign?.name ?? "Send Queue"}</h1>
            <p className="text-xs text-muted-foreground">{totalItems} contacts in queue</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {sentCount + skippedCount} / {totalItems}
          </span>
        </div>

        {/* From phone selector */}
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <Select
            value={selectedPhoneId?.toString() ?? ""}
            onValueChange={(v) => setSelectedPhoneId(parseInt(v))}
          >
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="Select number" />
            </SelectTrigger>
            <SelectContent>
              {phoneNumbersQuery.data?.map(pn => (
                <SelectItem key={pn.id} value={pn.id.toString()}>
                  {pn.friendlyName ?? pn.phoneNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Contact card */}
        <div className="w-80 border-r border-border bg-card p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {currentIndex + 1} of {totalItems}
            </Badge>
            {templateCount && templateCount > 0 && (
              <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-200">
                <RotateCcw className="w-3 h-3 mr-1" />
                Template {templateIndex} of {templateCount}
              </Badge>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {contact?.firstName?.[0] ?? contact?.phone?.[0] ?? "?"}
              </div>
              <div>
                <div className="font-semibold text-foreground">
                  {[contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || "Unknown"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {contact?.phone}
                </div>
              </div>
            </div>

            {contact?.propertyAddress && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{contact.propertyAddress}{contact.propertyCity ? `, ${contact.propertyCity}` : ""}{contact.propertyState ? ` ${contact.propertyState}` : ""}</span>
              </div>
            )}

            {templateName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                <User className="w-3 h-3" />
                Using: <span className="font-medium text-foreground">{templateName}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-auto pt-4 border-t border-border grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-xl font-bold text-green-600">{sentCount}</div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
            <div>
              <div className="text-xl font-bold text-amber-500">{skippedCount}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
          </div>
        </div>

        {/* Right: Message composer */}
        <div className="flex-1 flex flex-col p-6 gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Message Preview</h2>
            <span className="text-xs text-muted-foreground">{editedBody.length} chars</span>
          </div>

          <Textarea
            ref={textareaRef}
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            placeholder="Message body..."
            className="flex-1 resize-none text-base leading-relaxed font-mono"
          />

          {/* Keyboard hint */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Keyboard className="w-3 h-3" />
            <span>Press <kbd className="px-1 py-0.5 rounded bg-muted border text-xs">Space</kbd> or <kbd className="px-1 py-0.5 rounded bg-muted border text-xs">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-muted border text-xs">Shift+S</kbd> to skip (when not typing)</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isSending || isDone}
              className="flex-1"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || isDone || !selectedPhoneId}
              className="flex-2 flex-[2] bg-primary hover:bg-primary/90"
            >
              {isSending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Send &amp; Next
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
