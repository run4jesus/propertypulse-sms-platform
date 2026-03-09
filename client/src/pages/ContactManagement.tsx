import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Ban, ShieldOff, AlertTriangle, XCircle, Trash2, UserMinus } from "lucide-react";

const LIST_TYPES = [
  { key: "opted_out", label: "Opted Out", icon: UserMinus, color: "text-orange-500", description: "Replied STOP or manually opted out" },
  { key: "dnc", label: "Do Not Contact", icon: Ban, color: "text-red-500", description: "Manually added to DNC list" },
  { key: "carrier_blocked", label: "Carrier Blocked", icon: ShieldOff, color: "text-purple-500", description: "Blocked by carrier — number unreachable" },
  { key: "undeliverable", label: "Undeliverable", icon: AlertTriangle, color: "text-yellow-500", description: "Messages consistently fail to deliver" },
  { key: "response_removal", label: "Response Removal", icon: XCircle, color: "text-blue-500", description: "Requested removal via response" },
];

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
          <p className="text-sm text-muted-foreground mt-1">Manage opted-out, DNC, carrier-blocked, and undeliverable contacts</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {LIST_TYPES.map(({ key, label, icon: Icon, color }) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all border ${activeTab === key ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
              onClick={() => setActiveTab(key)}
            >
              <CardContent className="p-4 text-center">
                <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                <p className="text-xs font-medium text-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
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
      </div>
    </DashboardLayout>
  );
}
