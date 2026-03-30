import { useState, useRef, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  List, Upload, Plus, Search, Trash2, ChevronRight, X,
  Phone, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ArrowLeft, Download, Filter, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type PhoneStatus = "untouched" | "messaged" | "replied" | "opted_out" | "dnc" | "needs_reskip";

interface ContactRow {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  owner2FirstName?: string | null;
  owner2LastName?: string | null;
  phone: string;
  phone2?: string | null;
  phone3?: string | null;
  phone1Status: PhoneStatus;
  phone2Status: PhoneStatus;
  phone3Status: PhoneStatus;
  propertyAddress?: string | null;
  propertyCity?: string | null;
  propertyState?: string | null;
  propertyZip?: string | null;
  mailingAddress?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingZip?: string | null;
  createdAt: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CSV_FIELDS = [
  { key: "firstName",       label: "Owner 1 First Name" },
  { key: "lastName",        label: "Owner 1 Last Name" },
  { key: "owner2FirstName", label: "Owner 2 First Name" },
  { key: "owner2LastName",  label: "Owner 2 Last Name" },
  { key: "propertyAddress", label: "Property Address" },
  { key: "propertyCity",    label: "Property City" },
  { key: "propertyState",   label: "Property State" },
  { key: "propertyZip",     label: "Property Zip" },
  { key: "mailingAddress",  label: "Mailing Address" },
  { key: "mailingCity",     label: "Mailing City" },
  { key: "mailingState",    label: "Mailing State" },
  { key: "mailingZip",      label: "Mailing Zip" },
  { key: "phone",           label: "Phone 1 (Primary) *" },
  { key: "phone2",          label: "Phone 2" },
  { key: "phone3",          label: "Phone 3" },
] as const;

type CsvFieldKey = typeof CSV_FIELDS[number]["key"];

const STATUS_CONFIG: Record<PhoneStatus, { label: string; color: string; icon: React.ReactNode }> = {
  untouched:    { label: "Untouched",    color: "bg-zinc-700 text-zinc-300",        icon: <Phone className="h-3 w-3" /> },
  messaged:     { label: "Messaged",     color: "bg-blue-500/20 text-blue-400",     icon: <CheckCircle className="h-3 w-3" /> },
  replied:      { label: "Replied",      color: "bg-green-500/20 text-green-400",   icon: <CheckCircle className="h-3 w-3" /> },
  opted_out:    { label: "Opted Out",    color: "bg-orange-500/20 text-orange-400", icon: <XCircle className="h-3 w-3" /> },
  dnc:          { label: "DNC",          color: "bg-red-500/20 text-red-400",       icon: <XCircle className="h-3 w-3" /> },
  needs_reskip: { label: "Re-Skip",      color: "bg-yellow-500/20 text-yellow-400", icon: <RefreshCw className="h-3 w-3" /> },
};

function PhoneStatusBadge({ status }: { status: PhoneStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.untouched;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
  return { headers, rows };
}

// ─── Auto-map heuristic ───────────────────────────────────────────────────────
function autoMap(headers: string[]): Record<CsvFieldKey, string> {
  const mapping: Record<string, string> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const hints: Record<CsvFieldKey, string[]> = {
    firstName:       ["owner1first","ownerfirst","firstname","first","fname","owner1fn"],
    lastName:        ["owner1last","ownerlast","lastname","last","lname","owner1ln"],
    owner2FirstName: ["owner2first","co-ownerfirst","coownerfirst","owner2fn"],
    owner2LastName:  ["owner2last","co-ownerlast","coownerlast","owner2ln"],
    propertyAddress: ["propaddress","propertyaddress","siteaddress","propaddr","address"],
    propertyCity:    ["propcity","propertycity","sitecity","city"],
    propertyState:   ["propstate","propertystate","sitestate","state"],
    propertyZip:     ["propzip","propertyzip","sitezip","zip","zipcode"],
    mailingAddress:  ["mailaddress","mailingaddress","mailaddr"],
    mailingCity:     ["mailcity","mailingcity"],
    mailingState:    ["mailstate","mailingstate"],
    mailingZip:      ["mailzip","mailingzip"],
    phone:           ["phone1","primaryphone","phone","mobile","cell","phonenumber"],
    phone2:          ["phone2","secondaryphone","altphone"],
    phone3:          ["phone3","thirdphone"],
  };

  for (const [fieldKey, keywords] of Object.entries(hints) as [CsvFieldKey, string[]][]) {
    for (const header of headers) {
      const norm = normalize(header);
      if (keywords.some((k) => norm.includes(k) || k.includes(norm))) {
        if (!mapping[fieldKey]) mapping[fieldKey] = header;
        break;
      }
    }
  }
  return mapping as Record<CsvFieldKey, string>;
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({
  open, onClose, listId, listName, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  listId: number;
  listName: string;
  onSuccess: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map" | "importing">("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<CsvFieldKey, string>>>({});

  const bulkImport = trpc.contacts.bulkImport.useMutation();
  const utils = trpc.useUtils();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCsv(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(autoMap(headers));
      setStep("map");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!mapping.phone) {
      toast.error("Phone 1 is required — map at least the primary phone column.");
      return;
    }
    setStep("importing");

    const headerIndex = (col: string | undefined) =>
      col ? csvHeaders.indexOf(col) : -1;

    const contactData = csvRows
      .map((row) => {
        const get = (col: string | undefined) => {
          const idx = headerIndex(col);
          return idx >= 0 ? (row[idx] ?? "").trim() : undefined;
        };
        const phone = get(mapping.phone);
        if (!phone) return null;

        // Strip middle initials from first names
        const stripMiddle = (name?: string) => name?.replace(/\s+[A-Z]\s*$/, "").trim() || undefined;
        // Normalize zip to 5 digits
        const zip5 = (z?: string) => z?.replace(/[^0-9]/g, "").slice(0, 5) || undefined;

        return {
          firstName:       stripMiddle(get(mapping.firstName)),
          lastName:        get(mapping.lastName) || undefined,
          owner2FirstName: stripMiddle(get(mapping.owner2FirstName)),
          owner2LastName:  get(mapping.owner2LastName) || undefined,
          propertyAddress: get(mapping.propertyAddress) || undefined,
          propertyCity:    get(mapping.propertyCity) || undefined,
          propertyState:   get(mapping.propertyState) || undefined,
          propertyZip:     zip5(get(mapping.propertyZip)),
          mailingAddress:  get(mapping.mailingAddress) || undefined,
          mailingCity:     get(mapping.mailingCity) || undefined,
          mailingState:    get(mapping.mailingState) || undefined,
          mailingZip:      zip5(get(mapping.mailingZip)),
          phone,
          phone2:          get(mapping.phone2) || undefined,
          phone3:          get(mapping.phone3) || undefined,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    try {
      const result = await bulkImport.mutateAsync({ contacts: contactData as Parameters<typeof bulkImport.mutateAsync>[0]["contacts"], listId });
      await utils.contactLists.list.invalidate();
      await utils.contactLists.getMembers.invalidate();
      toast.success(`Import complete — ${result.count} contacts added${result.skipped > 0 ? `, ${result.skipped} duplicates skipped` : ""}.`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Import failed — check your CSV and try again.");
      setStep("map");
    }
  };

  const reset = () => {
    setStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts → {listName}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Click to upload a CSV file</p>
            <p className="text-sm text-muted-foreground">Supports standard skip-trace exports (BatchSkipTracing, Skip Genie, REI Sift)</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === "map" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {csvRows.length.toLocaleString()} rows detected. Map your CSV columns to the fields below.
              </p>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-1" /> Change file
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {CSV_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                  <Select
                    value={mapping[field.key] ?? "__none__"}
                    onValueChange={(v) =>
                      setMapping((prev) => ({ ...prev, [field.key]: v === "__none__" ? undefined : v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="— skip —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— skip —</SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview first 3 rows */}
            {csvRows.length > 0 && (
              <div className="rounded-lg border border-border overflow-x-auto mb-4">
                <p className="text-xs text-muted-foreground px-3 py-2 border-b border-border">Preview (first 3 rows)</p>
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {CSV_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <th key={f.key} className="px-3 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {CSV_FIELDS.filter((f) => mapping[f.key]).map((f) => {
                          const idx = csvHeaders.indexOf(mapping[f.key]!);
                          return <td key={f.key} className="px-3 py-1.5 whitespace-nowrap">{row[idx] ?? ""}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button onClick={handleImport} disabled={!mapping.phone}>
                Import {csvRows.length.toLocaleString()} contacts
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="py-16 text-center">
            <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-medium">Importing contacts…</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a moment for large lists.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── List Detail View ─────────────────────────────────────────────────────────
function ListDetail({
  listId, listName, onBack,
}: {
  listId: number;
  listName: string;
  onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const { data, isLoading, refetch } = trpc.contactLists.getMembers.useQuery({
    listId,
    search: search || undefined,
    phoneStatus: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const updateStatus = trpc.contacts.updatePhoneStatus.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update status"),
  });

  const contacts = (data?.contacts ?? []) as ContactRow[];
  const total = data?.total ?? 0;

  // Compute summary stats
  const allPhones = contacts.flatMap((c) => [
    { status: c.phone1Status, phone: c.phone },
    ...(c.phone2 ? [{ status: c.phone2Status, phone: c.phone2 }] : []),
    ...(c.phone3 ? [{ status: c.phone3Status, phone: c.phone3 }] : []),
  ]);
  const statCounts = allPhones.reduce((acc, { status }) => {
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const needsReskip = contacts.filter((c) => {
    const statuses = [c.phone1Status, c.phone2Status, c.phone3Status].filter(Boolean);
    return statuses.length > 0 && statuses.every((s) => ["opted_out", "dnc", "needs_reskip"].includes(s));
  }).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Lists
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <List className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{listName}</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} contacts</p>
        </div>
        <Button size="sm" onClick={() => setImportOpen(true)} className="gap-1">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </div>

      {/* Status summary bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {(Object.entries(STATUS_CONFIG) as [PhoneStatus, typeof STATUS_CONFIG[PhoneStatus]][]).map(([status, cfg]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            className={`p-3 rounded-xl border text-left transition-colors ${
              statusFilter === status ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <p className="text-lg font-bold">{statCounts[status] ?? 0}</p>
            <p className="text-xs text-muted-foreground">{cfg.label}</p>
          </button>
        ))}
      </div>

      {needsReskip > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
          <span className="text-yellow-300">
            <strong>{needsReskip}</strong> contact{needsReskip !== 1 ? "s have" : " has"} all phones exhausted — ready for re-skip tracing.
          </span>
          <button
            className="ml-auto text-yellow-400 underline text-xs"
            onClick={() => setStatusFilter("needs_reskip")}
          >
            Filter
          </button>
        </div>
      )}

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, phone, or address…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        {statusFilter !== "all" && (
          <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")} className="gap-1">
            <X className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </div>

      {/* Contact table */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">No contacts found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== "all" ? "Try adjusting your filters." : "Import a CSV to add contacts to this list."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner 1</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Owner 2</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Property Address</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mailing Address</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone 1</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone 2</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone 3</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {[c.owner2FirstName, c.owner2LastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                      {c.propertyAddress
                        ? `${c.propertyAddress}${c.propertyCity ? `, ${c.propertyCity}` : ""}${c.propertyState ? ` ${c.propertyState}` : ""}${c.propertyZip ? ` ${c.propertyZip}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                      {c.mailingAddress
                        ? `${c.mailingAddress}${c.mailingCity ? `, ${c.mailingCity}` : ""}${c.mailingState ? ` ${c.mailingState}` : ""}${c.mailingZip ? ` ${c.mailingZip}` : ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <PhoneCell
                        phone={c.phone}
                        status={c.phone1Status}
                        onStatusChange={(s) => updateStatus.mutate({ contactId: c.id, phoneSlot: 1, status: s })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {c.phone2 ? (
                        <PhoneCell
                          phone={c.phone2}
                          status={c.phone2Status}
                          onStatusChange={(s) => updateStatus.mutate({ contactId: c.id, phoneSlot: 2, status: s })}
                        />
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {c.phone3 ? (
                        <PhoneCell
                          phone={c.phone3}
                          status={c.phone3Status}
                          onStatusChange={(s) => updateStatus.mutate({ contactId: c.id, phoneSlot: 3, status: s })}
                        />
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        listId={listId}
        listName={listName}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

// ─── Phone Cell with status dropdown ─────────────────────────────────────────
function PhoneCell({
  phone, status, onStatusChange,
}: {
  phone: string;
  status: PhoneStatus;
  onStatusChange: (s: PhoneStatus) => void;
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <p className="text-xs font-mono">{phone}</p>
      <Select value={status} onValueChange={(v) => onStatusChange(v as PhoneStatus)}>
        <SelectTrigger className="h-6 text-xs px-2 py-0 border-0 bg-transparent p-0 w-auto gap-1 focus:ring-0">
          <PhoneStatusBadge status={status} />
        </SelectTrigger>
        <SelectContent>
          {(Object.entries(STATUS_CONFIG) as [PhoneStatus, typeof STATUS_CONFIG[PhoneStatus]][]).map(([s, cfg]) => (
            <SelectItem key={s} value={s}>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                {cfg.icon}{cfg.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Lists Index ──────────────────────────────────────────────────────────────
export default function Lists() {
  const [selectedList, setSelectedList] = useState<{ id: number; name: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState<{ id: number; name: string } | null>(null);
  const [newListName, setNewListName] = useState("");
  const [search, setSearch] = useState("");

  const { data: lists = [], isLoading, refetch } = trpc.contactLists.list.useQuery();
  const createList = trpc.contactLists.create.useMutation({
    onSuccess: () => { refetch(); setCreateOpen(false); setNewListName(""); },
    onError: () => toast.error("Failed to create list"),
  });
  const deleteList = trpc.contactLists.delete.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to delete list"),
  });

  if (selectedList) {
    return (
      <DashboardLayout>
        <ListDetail
          listId={selectedList.id}
          listName={selectedList.name}
          onBack={() => setSelectedList(null)}
        />
      </DashboardLayout>
    );
  }

  const filtered = lists.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <List className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Lists</h1>
              <p className="text-sm text-muted-foreground">Manage and track your contact lists</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New List
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search lists…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium text-lg mb-1">No lists yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create a list and import your skip-traced data.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Create your first list
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((list) => (
              <div
                key={list.id}
                className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer group"
                onClick={() => setSelectedList({ id: list.id, name: list.name })}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <List className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setImportOpen({ id: list.id, name: list.name }); }}
                    >
                      <Upload className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${list.name}"? This cannot be undone.`)) {
                          deleteList.mutate({ id: list.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold mb-0.5 truncate">{list.name}</h3>
                {list.description && (
                  <p className="text-xs text-muted-foreground truncate mb-2">{list.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(list.createdAt).toLocaleDateString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create list dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="List name (e.g. Tarrant Probate Q1 2026)"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newListName.trim() && createList.mutate({ name: newListName.trim() })}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!newListName.trim() || createList.isPending}
              onClick={() => createList.mutate({ name: newListName.trim() })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick import from list card */}
      {importOpen && (
        <ImportModal
          open={!!importOpen}
          onClose={() => setImportOpen(null)}
          listId={importOpen.id}
          listName={importOpen.name}
          onSuccess={() => refetch()}
        />
      )}
    </DashboardLayout>
  );
}
