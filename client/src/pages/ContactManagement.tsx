import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Ban,
  ShieldOff,
  AlertTriangle,
  XCircle,
  Trash2,
  UserMinus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const LIST_TYPES = [
  { key: "opted_out", label: "Opted Out", icon: UserMinus, color: "text-orange-500", description: "Replied STOP or manually opted out" },
  { key: "dnc", label: "Do Not Contact", icon: Ban, color: "text-red-500", description: "Manually added to DNC list" },
  { key: "carrier_blocked", label: "Carrier Blocked", icon: ShieldOff, color: "text-purple-500", description: "Blocked by carrier — number unreachable" },
  { key: "undeliverable", label: "Undeliverable", icon: AlertTriangle, color: "text-yellow-500", description: "Messages consistently fail to deliver" },
  { key: "response_removal", label: "Response Removal", icon: XCircle, color: "text-blue-500", description: "Requested removal via response" },
];

function DncScrubPanel() {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubResult, setScrubResult] = useState<{
    total: number; clean: number; internalDnc: number; litigator: number; federalDnc: number; errors: number;
  } | null>(null);

  const { data: summary, refetch: refetchSummary } = trpc.dnc.summary.useQuery();
  const { data: allContacts } = trpc.contacts.list.useQuery({ limit: 5000 });

  const scrubMutation = trpc.dnc.scrubContacts.useMutation({
    onSuccess: (result) => {
      setScrubResult(result);
      refetchSummary();
      setIsScrubbing(false);
      toast.success(`Scrub complete: ${result.clean} clean, ${result.litigator} litigators, ${result.federalDnc} federal DNC`);
    },
    onError: (err) => {
      setIsScrubbing(false);
      toast.error("Scrub failed: " + err.message);
    },
  });

  const handleScrubAll = () => {
    if (!allContacts?.contacts?.length) {
      toast.error("No contacts to scrub");
      return;
    }
    setIsScrubbing(true);
    setScrubResult(null);
    const ids = allContacts.contacts.map((c: any) => c.id);
    scrubMutation.mutate({ contactIds: ids });
  };

  const handleScrubNeverScrubbed = () => {
    if (!allContacts?.contacts?.length) {
      toast.error("No contacts to scrub");
      return;
    }
    setIsScrubbing(true);
    setScrubResult(null);
    // Filter to contacts that have never been scrubbed (lastScrubbedAt is null)
    const ids = allContacts.contacts
      .filter((c: any) => !c.lastScrubbedAt)
      .map((c: any) => c.id);
    if (ids.length === 0) {
      setIsScrubbing(false);
      toast.info("All contacts have already been scrubbed");
      return;
    }
    scrubMutation.mutate({ contactIds: ids });
  };

  const totalFlagged = (summary?.internalDnc ?? 0) + (summary?.federalDnc ?? 0) + (summary?.stateDnc ?? 0) + (summary?.dncComplainers ?? 0) + (summary?.litigators ?? 0);
  const scrubCoverage = summary?.total ? Math.round(((summary.total - (summary.neverScrubbed ?? 0)) / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            DNC &amp; Litigator Scrub
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scrub your contacts against your internal DNC list and the TCPA Litigator database to protect against TCPA lawsuits
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScrubNeverScrubbed}
            disabled={isScrubbing}
          >
            {isScrubbing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
            Scrub New Contacts
          </Button>
          <Button
            size="sm"
            onClick={handleScrubAll}
            disabled={isScrubbing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isScrubbing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            {isScrubbing ? "Scrubbing..." : "Scrub All Contacts"}
          </Button>
        </div>
      </div>

      {/* API Status */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <div>
              <p className="text-sm font-medium text-foreground">TCPA Litigator List API</p>
              <p className="text-xs text-muted-foreground">
                Add your API credentials in Settings → Secrets to enable real-time litigator scrubbing.
                Without credentials, only your internal DNC list is checked.
              </p>
            </div>
            <Badge variant="outline" className="ml-auto text-yellow-600 border-yellow-300 bg-yellow-50">
              Credentials Required
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{summary.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Contacts</p>
            </CardContent>
          </Card>
          <Card className="border-green-100 bg-green-50/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{summary.clean}</p>
              <p className="text-xs text-green-600 mt-1">Clean</p>
            </CardContent>
          </Card>
          <Card className="border-red-100 bg-red-50/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-700">{summary.litigators}</p>
              <p className="text-xs text-red-600 mt-1">Litigators</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-orange-50/50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{totalFlagged}</p>
              <p className="text-xs text-orange-600 mt-1">Total Flagged</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scrub Coverage */}
      {summary && summary.total > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scrub Coverage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{summary.total - (summary.neverScrubbed ?? 0)} of {summary.total} contacts scrubbed</span>
              <span className="text-xs font-medium text-foreground">{scrubCoverage}%</span>
            </div>
            <Progress value={scrubCoverage} className="h-2" />
            {(summary.neverScrubbed ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                <AlertCircle className="w-3 h-3 inline mr-1 text-yellow-500" />
                {summary.neverScrubbed} contacts have never been scrubbed
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* DNC Breakdown */}
      {summary && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagged Contact Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {[
              { label: "TCPA Litigators", count: summary.litigators, color: "bg-red-500", textColor: "text-red-700", description: "Serial TCPA plaintiffs — highest lawsuit risk" },
              { label: "Federal DNC", count: summary.federalDnc, color: "bg-orange-500", textColor: "text-orange-700", description: "On the National Do Not Call Registry" },
              { label: "State DNC", count: summary.stateDnc, color: "bg-yellow-500", textColor: "text-yellow-700", description: "On a state-level DNC list" },
              { label: "DNC Complainers", count: summary.dncComplainers, color: "bg-purple-500", textColor: "text-purple-700", description: "Filed DNC complaints in the past" },
              { label: "Internal DNC", count: summary.internalDnc, color: "bg-gray-500", textColor: "text-gray-700", description: "Manually added to your internal DNC list" },
            ].map(({ label, count, color, textColor, description }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color} shrink-0`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className={`text-sm font-bold ${textColor}`}>{count}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Last Scrub Result */}
      {scrubResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="font-medium text-green-800">Scrub Complete</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-bold text-green-700">{scrubResult.clean}</p>
                <p className="text-xs text-green-600">Clean</p>
              </div>
              <div>
                <p className="text-xl font-bold text-red-700">{scrubResult.litigator}</p>
                <p className="text-xs text-red-600">Litigators</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-700">{scrubResult.federalDnc}</p>
                <p className="text-xs text-orange-600">Federal DNC</p>
              </div>
            </div>
            {scrubResult.errors > 0 && (
              <p className="text-xs text-yellow-700 mt-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {scrubResult.errors} contacts could not be checked (API error)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-foreground mb-2">How DNC Scrubbing Works</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Each contact's phone number is checked against your internal DNC list first</li>
            <li>If not on internal DNC, it's checked against the TCPA Litigator List API (requires API credentials)</li>
            <li>The API checks: TCPA litigators, TCPA trolls, Federal DNC, State DNC, and DNC complainers</li>
            <li>Flagged contacts are blocked from all future campaign sends automatically</li>
            <li>Contacts are scrubbed automatically on CSV import when credentials are set</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ContactManagement() {
  const [activeTab, setActiveTab] = useState("opted_out");

  const { data: entries = [], refetch } = trpc.contactManagement.list.useQuery(
    { listType: activeTab }
  );

  const removeMutation = trpc.contactManagement.remove.useMutation({
    onSuccess: () => { refetch(); toast.success("Removed from list"); },
    onError: () => toast.error("Failed to remove"),
  });

  const currentType = LIST_TYPES.find(t => t.key === activeTab)!;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Contact Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage opted-out, DNC, carrier-blocked, undeliverable contacts, and run DNC scrubs</p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {LIST_TYPES.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                activeTab === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === key ? "" : color}`} />
              {label}
            </button>
          ))}
          <button
            onClick={() => setActiveTab("dnc_scrub")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              activeTab === "dnc_scrub"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-background text-muted-foreground border-border hover:border-blue-400 hover:text-foreground"
            }`}
          >
            <Shield className={`w-4 h-4 ${activeTab === "dnc_scrub" ? "" : "text-blue-500"}`} />
            DNC Scrub
          </button>
        </div>

        {/* DNC Scrub Panel */}
        {activeTab === "dnc_scrub" ? (
          <DncScrubPanel />
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <currentType.icon className={`w-5 h-5 ${currentType.color}`} />
              <div>
                <h2 className="font-semibold text-foreground">{currentType.label}</h2>
                <p className="text-xs text-muted-foreground">{currentType.description} · {entries.length} contacts</p>
              </div>
            </div>

            {entries.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <currentType.icon className={`w-10 h-10 mb-3 ${currentType.color} opacity-40`} />
                  <p className="text-sm text-muted-foreground">No contacts in this list</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Contacts are added automatically or manually from the Messenger</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <Card key={entry.id} className="border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <currentType.icon className={`w-4 h-4 ${currentType.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{entry.phone}</p>
                          {entry.reason && <p className="text-xs text-muted-foreground mt-0.5">{entry.reason}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Added {new Date(entry.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{currentType.label}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => removeMutation.mutate({ id: entry.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
