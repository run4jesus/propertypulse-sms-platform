import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Users, Search, MessageSquare, ArrowUpRight, Filter } from "lucide-react";
import { useLocation } from "wouter";

const STAGE_COLORS: Record<string, string> = {
  intro: "bg-blue-500/20 text-blue-400",
  price_ask: "bg-yellow-500/20 text-yellow-400",
  needs_offer: "bg-orange-500/20 text-orange-400",
  not_interested: "bg-red-500/20 text-red-400",
  handoff: "bg-green-500/20 text-green-400",
  podio_pushed: "bg-violet-500/20 text-violet-400",
};

const STAGE_LABELS: Record<string, string> = {
  intro: "Intro",
  price_ask: "Price Ask",
  needs_offer: "Needs Offer",
  not_interested: "Not Interested",
  handoff: "Handoff",
  podio_pushed: "Pushed to Podio",
};

export default function Leads() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const { data: conversations, isLoading } = trpc.conversations.list.useQuery({
    search: search || undefined,
    status: stageFilter !== "all" ? stageFilter : undefined,
  });

  type ConvRow = {
    conversation: {
      id: number; stage: string; podioLeadPushed?: boolean | null;
      lastMessageAt?: Date | null;
    };
    contact: { firstName?: string | null; lastName?: string | null; phone: string };
  };
  const rawLeads = (conversations ?? []) as unknown as ConvRow[];
  const leads = rawLeads.map(r => ({
    id: r.conversation.id,
    contactName: [r.contact.firstName, r.contact.lastName].filter(Boolean).join(" ") || undefined,
    contactPhone: r.contact.phone,
    stage: r.conversation.stage,
    podioLeadPushed: r.conversation.podioLeadPushed ?? false,
    lastMessageAt: r.conversation.lastMessageAt ? r.conversation.lastMessageAt.getTime() : undefined,
  }));

  const stages = ["all", "needs_offer", "price_ask", "intro", "handoff", "not_interested"];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Leads</h1>
              <p className="text-sm text-muted-foreground">All active conversations and lead statuses</p>
            </div>
          </div>
          <Button onClick={() => setLocation("/messenger")}>
            <MessageSquare className="h-4 w-4 mr-2" /> Open Messenger
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {stages.map(s => (
              <Button
                key={s}
                variant={stageFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStageFilter(s)}
                className="capitalize"
              >
                {s === "all" ? "All" : STAGE_LABELS[s] ?? s}
              </Button>
            ))}
          </div>
        </div>

        {/* Leads table */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="font-medium">No leads found</p>
              <p className="text-sm text-muted-foreground mt-1">Start a campaign to generate leads</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Stage</th>
                    <th className="text-left p-3 hidden md:table-cell">Campaign</th>
                    <th className="text-left p-3 hidden lg:table-cell">Last Message</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{lead.contactName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{lead.contactPhone}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={`text-xs ${STAGE_COLORS[lead.stage] ?? "bg-muted text-muted-foreground"}`}>
                          {STAGE_LABELS[lead.stage] ?? lead.stage}
                        </Badge>
                        {lead.podioLeadPushed && (
                          <Badge className="ml-1 text-xs bg-violet-500/20 text-violet-400">Podio ✓</Badge>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                        {lead.lastMessageAt ? new Date(lead.lastMessageAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setLocation(`/messenger?conversationId=${lead.id}`)}
                        >
                          <ArrowUpRight className="h-3 w-3 mr-1" /> Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
