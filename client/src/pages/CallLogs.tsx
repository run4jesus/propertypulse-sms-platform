import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Phone,
  PhoneCall,
  PhoneMissed,
  Search,
  Upload,
  Clock,
  FileText,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { format, formatDuration, intervalToDuration } from "date-fns";

function formatSecs(seconds: number) {
  const d = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(d, { format: ["minutes", "seconds"] }) || "0s";
}

export default function CallLogs() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: callsRaw, isLoading } = trpc.callRecordings.list.useQuery(undefined);
  const calls = (callsRaw ?? []) as Array<{
    id: number;
    contactId: number;
    audioUrl: string | null;
    transcription: string | null;
    duration: number | null;
    calledAt: Date;
    transcriptionStatus: "pending" | "processing" | "completed" | "failed";
    notes: string | null;
    createdAt: Date;
  }>;

  const selectedCall = calls.find((c) => c.id === selectedId) ?? null;

  const transcribeMutation = trpc.callRecordings.transcribe.useMutation({
    onSuccess: () => {
      toast.success("Transcription complete");
      utils.callRecordings.list.invalidate();
    },
    onError: () => toast.error("Transcription failed"),
  });

  const createCall = trpc.callRecordings.create.useMutation({
    onSuccess: () => {
      toast.success("Call log saved");
      utils.callRecordings.list.invalidate();
    },
    onError: () => toast.error("Failed to save call"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("To transcribe a recording, first save the call log, then use the Transcribe button.");
    e.target.value = "";
  };

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Call List */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Call Logs</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3 w-3" />
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/mp4"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search calls..."
              className="pl-9 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length > 0 ? (
            calls
              .filter((call) =>
                search
                  ? String(call.contactId).includes(search) ||
                    (call.notes ?? "").toLowerCase().includes(search.toLowerCase())
                  : true
              )
              .map((call) => (
                <div
                  key={call.id}
                  onClick={() => setSelectedId(call.id)}
                  className={`px-3 py-3 border-b border-border/50 cursor-pointer hover:bg-accent/40 transition-colors ${
                    selectedId === call.id ? "bg-accent/60 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-sm font-medium truncate">
                        Contact #{call.contactId}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(call.calledAt), "MMM d")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {call.duration ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatSecs(call.duration)}
                      </span>
                    ) : null}
                    {call.transcriptionStatus === "completed" ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <FileText className="h-3 w-3" />
                        Transcribed
                      </span>
                    ) : call.transcriptionStatus === "processing" ? (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-12 text-muted-foreground px-4">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No call logs yet</p>
              <p className="text-xs mt-1">Upload a recording to get started</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Call Detail */}
      {selectedId && selectedCall ? (
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Contact #{selectedCall.contactId}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {selectedCall.duration ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatSecs(selectedCall.duration)}
                    </span>
                  ) : null}
                  <span>{format(new Date(selectedCall.calledAt), "MMM d, yyyy h:mm a")}</span>
                </div>
              </div>
            </div>

            {/* Audio Player */}
            {selectedCall.audioUrl && (
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Recording</p>
                  <audio controls className="w-full" src={selectedCall.audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                  {selectedCall.transcriptionStatus !== "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 gap-1.5"
                      onClick={() =>
                        transcribeMutation.mutate({
                          id: selectedCall.id,
                          audioUrl: selectedCall.audioUrl!,
                        })
                      }
                      disabled={transcribeMutation.isPending}
                    >
                      {transcribeMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      Transcribe
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Transcription */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Transcription</p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      selectedCall.transcriptionStatus === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : selectedCall.transcriptionStatus === "processing"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {selectedCall.transcriptionStatus ?? "pending"}
                  </Badge>
                </div>
                {selectedCall.transcription ? (
                  <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                    {selectedCall.transcription}
                  </p>
                ) : selectedCall.transcriptionStatus === "processing" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Transcription in progress...
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No transcription available. Add an audio URL and click Transcribe.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {selectedCall.notes && (
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-2">Notes</p>
                  <p className="text-sm text-foreground/80">{selectedCall.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Phone className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a call log</p>
            <p className="text-xs mt-1">Or upload a recording to transcribe</p>
          </div>
        </div>
      )}
    </div>
  );
}
