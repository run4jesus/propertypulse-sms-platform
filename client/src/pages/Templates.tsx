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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Copy,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

// ─── Merge fields available in templates ────────────────────────────────────
const MERGE_FIELDS = [
  { label: "First Name", token: "{FirstName}" },
  { label: "Last Name", token: "{LastName}" },
  { label: "Property Address", token: "{PropertyAddress}" },
  { label: "Property City", token: "{PropertyCity}" },
  { label: "Property State", token: "{PropertyState}" },
  { label: "Property Zip", token: "{PropertyZip}" },
];

// ─── Inline merge field chip bar ─────────────────────────────────────────────
function MergeFieldBar({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {MERGE_FIELDS.map((f) => (
        <button
          key={f.token}
          type="button"
          onClick={() => onInsert(f.token)}
          className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors font-mono"
        >
          {f.token}
        </button>
      ))}
    </div>
  );
}

// ─── Template form (create + edit) ───────────────────────────────────────────
function TemplateForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: { name: string; body: string; category?: string };
  onSave: (data: { name: string; body: string; category: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    // Restore cursor after token
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const charCount = body.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">Template Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Initial Lot Outreach"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Category</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. initial, follow-up, drip"
          className="mt-1"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Message Body</Label>
          <span className="text-xs text-muted-foreground">
            {charCount} chars · {smsSegments} SMS segment{smsSegments !== 1 ? "s" : ""}
          </span>
        </div>
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Hi {FirstName}, I came across your property at {PropertyAddress} in {PropertyCity}. I'm a real estate investor and I'd love to make you a cash offer. Are you open to a quick chat?`}
          className="mt-1 min-h-[120px] font-mono text-sm"
        />
        <div className="mt-1">
          <p className="text-xs text-muted-foreground mb-1">Click a field to insert at cursor:</p>
          <MergeFieldBar onInsert={insertToken} />
        </div>
      </div>

      {/* Preview with resolved tokens */}
      {body && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Preview (sample data)</p>
          <p className="text-sm leading-relaxed">
            {body
              .replace(/\{FirstName\}/g, "John")
              .replace(/\{LastName\}/g, "Smith")
              .replace(/\{PropertyAddress\}/g, "123 Oak St")
              .replace(/\{PropertyCity\}/g, "Fort Worth")
              .replace(/\{PropertyState\}/g, "TX")
              .replace(/\{PropertyZip\}/g, "76101")}
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1"
          onClick={() => onSave({ name, body, category })}
          disabled={!name.trim() || !body.trim() || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Template
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main Templates page ──────────────────────────────────────────────────────
export default function Templates() {
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: templates, isLoading } = trpc.templates.list.useQuery();

  const createTemplate = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      utils.templates.list.invalidate();
      setCreateOpen(false);
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      utils.templates.list.invalidate();
      setEditId(null);
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteTemplate = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.templates.list.invalidate();
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const copyToClipboard = (body: string) => {
    navigator.clipboard.writeText(body).then(() => toast.success("Copied to clipboard"));
  };

  const filtered = (templates ?? []).filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.body.toLowerCase().includes(search.toLowerCase())
  );

  const editingTemplate = editId ? templates?.find((t) => t.id === editId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Message Templates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reusable messages with dynamic merge fields for personalized outreach
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <TemplateForm
              onSave={(data) => createTemplate.mutate(data)}
              onCancel={() => setCreateOpen(false)}
              saving={createTemplate.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Merge field reference bar */}
      <div className="px-6 py-3 border-b border-border bg-muted/20">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Available Merge Fields</p>
        <div className="flex flex-wrap gap-2">
          {MERGE_FIELDS.map((f) => (
            <div key={f.token} className="flex items-center gap-1.5">
              <code className="text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-mono">
                {f.token}
              </code>
              <span className="text-xs text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          These tokens are automatically replaced with each contact's data when a campaign sends.
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border">
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No templates yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Create your first template with merge fields like {"{FirstName}"} and {"{PropertyAddress}"} to personalize every message automatically.
            </p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 max-w-4xl">
            {filtered.map((template) => (
              <Card key={template.id} className="border shadow-sm">
                <CardContent className="p-4">
                  {editId === template.id ? (
                    <TemplateForm
                      initial={{ name: template.name, body: template.body, category: template.category ?? "" }}
                      onSave={(data) => updateTemplate.mutate({ id: template.id, ...data })}
                      onCancel={() => setEditId(null)}
                      saving={updateTemplate.isPending}
                    />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            {template.category && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {template.category}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">
                            {template.body}
                          </p>
                          {/* Merge field tokens used */}
                          {MERGE_FIELDS.filter((f) => template.body.includes(f.token)).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {MERGE_FIELDS.filter((f) => template.body.includes(f.token)).map((f) => (
                                <span
                                  key={f.token}
                                  className="text-xs px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary font-mono"
                                >
                                  {f.token}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copyToClipboard(template.body)}
                            title="Copy to clipboard"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditId(template.id)}
                            title="Edit template"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/5"
                            onClick={() => {
                              if (confirm("Delete this template?")) {
                                deleteTemplate.mutate({ id: template.id });
                              }
                            }}
                            title="Delete template"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Preview */}
                      <div className="mt-3 rounded-md border border-border bg-muted/20 px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-0.5">Preview with sample data:</p>
                        <p className="text-xs leading-relaxed">
                          {template.body
                            .replace(/\{FirstName\}/g, "John")
                            .replace(/\{LastName\}/g, "Smith")
                            .replace(/\{PropertyAddress\}/g, "123 Oak St")
                            .replace(/\{PropertyCity\}/g, "Fort Worth")
                            .replace(/\{PropertyState\}/g, "TX")
                            .replace(/\{PropertyZip\}/g, "76101")}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
