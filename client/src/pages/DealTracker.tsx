import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BarChart2, Search, DollarSign, MapPin, Calendar, ArrowUpRight, Plus } from "lucide-react";
import { useLocation } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/20 text-blue-400",
  contact_attempted: "bg-cyan-500/20 text-cyan-400",
  qualified: "bg-teal-500/20 text-teal-400",
  appointment_set: "bg-indigo-500/20 text-indigo-400",
  offer_made: "bg-yellow-500/20 text-yellow-400",
  under_contract: "bg-purple-500/20 text-purple-400",
  dispo_marketing: "bg-orange-500/20 text-orange-400",
  buyer_found: "bg-pink-500/20 text-pink-400",
  closing_scheduled: "bg-emerald-500/20 text-emerald-400",
  closed_paid: "bg-green-600/20 text-green-300",
  dead_lost: "bg-red-500/20 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contact_attempted: "Contact Attempted",
  qualified: "Qualified",
  appointment_set: "Appointment Set",
  offer_made: "Offer Made",
  under_contract: "Under Contract",
  dispo_marketing: "Dispo Marketing",
  buyer_found: "Buyer Found",
  closing_scheduled: "Closing Scheduled",
  closed_paid: "Closed / Paid",
  dead_lost: "Dead / Lost",
};

function formatCurrency(val?: number | null) {
  if (!val) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

export default function DealTracker() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: deals, isLoading } = trpc.deals.list.useQuery();
  const { data: dealStats } = trpc.deals.stats.useQuery();

  const updateDeal = trpc.deals.update.useMutation({
    onSuccess: () => { utils.deals.list.invalidate(); toast.success("Deal updated"); },
  });

  const filtered = (deals ?? []).filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title?.toLowerCase().includes(q) ||
      d.propertyAddress?.toLowerCase().includes(q) ||
      d.sellerName?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <BarChart2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Deal Tracker</h1>
              <p className="text-sm text-muted-foreground">Track every deal from lead to close</p>
            </div>
          </div>
          <Button onClick={() => setLocation("/deals")}>
            <Plus className="h-4 w-4 mr-2" /> Pipeline View
          </Button>
        </div>

        {/* Stats row */}
        {dealStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold">{dealStats.activeDeals + dealStats.closedDeals}</p>
              <p className="text-sm text-muted-foreground">Total Deals</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-green-400">{dealStats.activeDeals}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-blue-400">{dealStats.closedDeals}</p>
              <p className="text-sm text-muted-foreground">Closed</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(dealStats.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals by title, address, or seller..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Deals table */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading deals...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="font-medium">No deals yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create deals from the Pipeline view</p>
              <Button className="mt-4" onClick={() => setLocation("/deals")}>Go to Pipeline</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                    <th className="text-left p-3">Deal</th>
                    <th className="text-left p-3 hidden md:table-cell">Address</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3 hidden lg:table-cell">Offer Price</th>
                    <th className="text-right p-3 hidden lg:table-cell">ARV</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((deal) => (
                    <tr key={deal.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium truncate max-w-[150px]">{deal.title}</p>
                          {deal.sellerName && (
                            <p className="text-xs text-muted-foreground">{deal.sellerName}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        {deal.propertyAddress ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{deal.propertyAddress}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-xs ${STATUS_COLORS[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABELS[deal.stage] ?? deal.stage}
                        </Badge>
                      </td>
                      <td className="p-3 text-right hidden lg:table-cell text-muted-foreground">
                        {formatCurrency(deal.offerPrice)}
                      </td>
                      <td className="p-3 text-right hidden lg:table-cell text-muted-foreground">
                        {formatCurrency(deal.contractPrice)}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setLocation("/deals")}
                        >
                          <ArrowUpRight className="h-3 w-3 mr-1" /> View
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
