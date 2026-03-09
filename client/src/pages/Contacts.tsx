import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Download,
  Loader2,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Contacts() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Add contact form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyZip: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  // New list form
  const [listName, setListName] = useState("");

  const { data: contactsData, isLoading } = trpc.contacts.list.useQuery({
    search: search || undefined,
    limit: 200,
  });

  const { data: labels } = trpc.labels.list.useQuery();
  const { data: contactLists } = trpc.contactLists.list.useQuery();

  const { data: selectedContact } = trpc.contacts.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const createContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Contact added");
      utils.contacts.list.invalidate();
      setAddOpen(false);
      setForm({ firstName: "", lastName: "", phone: "", email: "", propertyAddress: "", propertyCity: "", propertyState: "", propertyZip: "", city: "", state: "", zip: "", notes: "" });
    },
    onError: () => toast.error("Failed to add contact"),
  });

  const deleteContact = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("Contact deleted");
      utils.contacts.list.invalidate();
      setSelectedId(null);
    },
  });

  const createList = trpc.contactLists.create.useMutation({
    onSuccess: () => {
      toast.success("List created");
      utils.contactLists.list.invalidate();
      setListOpen(false);
      setListName("");
    },
  });

  const bulkImport = trpc.contacts.bulkImport.useMutation({
    onSuccess: (data) => {
      const msg = data.skipped > 0
        ? `Imported ${data.count} contacts · ${data.skipped} duplicate${data.skipped !== 1 ? 's' : ''} skipped`
        : `Imported ${data.count} contacts`;
      toast.success(msg);
      utils.contacts.list.invalidate();
      setImportOpen(false);
    },
    onError: () => toast.error("Import failed"),
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return toast.error("CSV must have a header row and at least one contact");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
      const rows = lines.slice(1).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cols[i] ?? ""; });
        return {
          phone: obj.phone || obj.phonenumber || obj.mobile || "",
          firstName: obj.firstname || obj.first || "",
          lastName: obj.lastname || obj.last || "",
          email: obj.email || "",
          address: obj.address || "",
          city: obj.city || "",
          state: obj.state || "",
          zip: obj.zip || obj.zipcode || "",
          propertyAddress: obj.propertyaddress || obj.propertyaddr || obj.property || "",
          propertyCity: obj.propertycity || obj.propcity || "",
          propertyState: obj.propertystate || obj.propstate || "",
          propertyZip: obj.propertyzip || obj.propzip || obj.propertyzipcode || "",
        };
      }).filter((r) => r.phone);
      if (rows.length === 0) return toast.error("No valid contacts found (phone number required)");
      bulkImport.mutate({ contacts: rows });
    };
    reader.readAsText(file);
  };

  const contacts = contactsData?.contacts ?? [];
  const total = contactsData?.total ?? 0;

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sidebar: Lists */}
      <div className="w-52 shrink-0 border-r border-border flex flex-col bg-card">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lists</span>
            <Dialog open={listOpen} onOpenChange={setListOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Create List</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Input
                    placeholder="List name..."
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                  />
                  <Button className="w-full" onClick={() => createList.mutate({ name: listName })} disabled={!listName.trim()}>
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <button className="w-full text-left text-sm px-2 py-1.5 rounded-md bg-accent/60 font-medium">
            All Contacts
            <span className="text-xs text-muted-foreground ml-1">({total})</span>
          </button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {contactLists?.map((list) => (
            <button
              key={list.id}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors"
            >
              {list.name}
              <span className="text-xs text-muted-foreground ml-1">({list.contactCount})</span>
            </button>
          ))}
        </ScrollArea>

        {/* Labels */}
        <div className="p-3 border-t border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
          <div className="mt-2 space-y-1">
            {labels?.map((label) => (
              <button
                key={label.id}
                className="w-full text-left flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-accent/40"
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                {label.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex items-center gap-3 bg-card">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Import Contacts from CSV</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop CSV file here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required column: phone. Optional: firstName, lastName, email, address, city, state, zip, propertyAddress
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => fileRef.current?.click()}
                    >
                      Browse file
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileImport}
                    />
                  </div>
                  {bulkImport.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing contacts...
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">First Name</Label>
                    <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} className="mt-1 h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name</Label>
                    <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} className="mt-1 h-8" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Phone *</Label>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="mt-1 h-8" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Property Address</Label>
                    <Input value={form.propertyAddress} onChange={(e) => setForm((f) => ({ ...f, propertyAddress: e.target.value }))} className="mt-1 h-8" placeholder="123 Main St" />
                  </div>
                  <div>
                    <Label className="text-xs">Property City</Label>
                    <Input value={form.propertyCity} onChange={(e) => setForm((f) => ({ ...f, propertyCity: e.target.value }))} className="mt-1 h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Property State</Label>
                    <Input value={form.propertyState} onChange={(e) => setForm((f) => ({ ...f, propertyState: e.target.value }))} className="mt-1 h-8" placeholder="TX" />
                  </div>
                  <div>
                    <Label className="text-xs">Property Zip</Label>
                    <Input value={form.propertyZip} onChange={(e) => setForm((f) => ({ ...f, propertyZip: e.target.value }))} className="mt-1 h-8" placeholder="75001" />
                  </div>
                  <div>
                    <Label className="text-xs">Mailing City</Label>
                    <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="mt-1 h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Mailing State</Label>
                    <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="mt-1 h-8" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 min-h-[60px]" />
                  </div>
                  <div className="col-span-2">
                    <Button
                      className="w-full"
                      onClick={() => createContact.mutate(form)}
                      disabled={!form.phone.trim() || createContact.isPending}
                    >
                      {createContact.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Add Contact
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : contacts.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Property</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Score</th>
                  <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => {
                  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "—";
                  return (
                    <tr
                      key={contact.id}
                      className={`border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors ${selectedId === contact.id ? "bg-accent/50" : ""}`}
                      onClick={() => setSelectedId(contact.id)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-primary">{name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{contact.phone}</td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">
                        {contact.propertyAddress || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {contact.leadScore && contact.leadScore > 0 ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                            contact.leadScore >= 7 ? "bg-emerald-50 text-emerald-700" :
                            contact.leadScore >= 4 ? "bg-amber-50 text-amber-700" :
                            "bg-red-50 text-red-600"
                          }`}>
                            {contact.leadScore}/10
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {contact.optedOut ? (
                          <Badge variant="secondary" className="text-xs bg-red-50 text-red-600">Opted Out</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/messenger`);
                            }}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteContact.mutate({ id: contact.id });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="text-center">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No contacts yet</p>
                <p className="text-xs mt-1">Import a CSV or add contacts manually</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contact Detail Panel */}
      {selectedId && selectedContact && (
        <div className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {([selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(" ") || selectedContact.phone).charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {[selectedContact.firstName, selectedContact.lastName].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {selectedContact.leadScore && selectedContact.leadScore > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Lead Score</span>
                <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                  selectedContact.leadScore >= 7 ? "bg-emerald-50 text-emerald-700" :
                  selectedContact.leadScore >= 4 ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-600"
                }`}>
                  {selectedContact.leadScore}/10
                </span>
              </div>
            ) : null}

            {selectedContact.motivationLevel && selectedContact.motivationLevel !== "unknown" && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Motivation</span>
                <span className="text-xs font-medium capitalize">{selectedContact.motivationLevel}</span>
              </div>
            )}

            {selectedContact.timeline && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Timeline</span>
                <span className="text-xs font-medium">{selectedContact.timeline}</span>
              </div>
            )}

            {selectedContact.askingPrice && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Asking Price</span>
                <span className="text-xs font-medium">{selectedContact.askingPrice}</span>
              </div>
            )}

            {selectedContact.propertyAddress && (
              <div>
                <span className="text-xs text-muted-foreground">Property</span>
                <p className="text-xs mt-0.5">{selectedContact.propertyAddress}</p>
              </div>
            )}

            {selectedContact.notes && (
              <div>
                <span className="text-xs text-muted-foreground">Notes</span>
                <p className="text-xs mt-0.5 text-foreground/80">{selectedContact.notes}</p>
              </div>
            )}

            <Button
              className="w-full"
              size="sm"
              onClick={() => setLocation("/messenger")}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Open Conversation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
