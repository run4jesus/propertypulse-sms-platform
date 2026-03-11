import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Phone, Search, Plus, Trash2, RefreshCw, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PhoneNumbers() {
  const [areaCode, setAreaCode] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Owned numbers
  const { data: ownedNumbers = [], refetch: refetchOwned, isLoading: loadingOwned } = trpc.phoneNumbers.list.useQuery();

  // Search available numbers — only fires when hasSearched is true
  const {
    data: availableNumbers = [],
    isLoading: loadingSearch,
    error: searchError,
    refetch: runSearch,
  } = trpc.phoneNumbers.searchAvailable.useQuery(
    { areaCode: areaCode || undefined, limit: 20 },
    { enabled: false }
  );

  // Mutations
  const purchaseMutation = trpc.phoneNumbers.purchase.useMutation({
    onSuccess: (data) => {
      toast.success(`Number ${data.phoneNumber} purchased successfully!`);
      refetchOwned();
      setHasSearched(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const releaseMutation = trpc.phoneNumbers.release.useMutation({
    onSuccess: () => {
      toast.success("Phone number released.");
      refetchOwned();
    },
    onError: (err) => toast.error(err.message),
  });

  const syncMutation = trpc.phoneNumbers.syncFromTextGrid.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} numbers from TextGrid. ${data.added} new numbers added.`);
      refetchOwned();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSearch = () => {
    setHasSearched(true);
    runSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="w-6 h-6 text-blue-500" />
            Phone Numbers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search, buy, and manage your TextGrid phone numbers — all without leaving LotPulse SMS.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync from TextGrid
        </Button>
      </div>

      {/* Search Available Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Search Available Numbers
          </CardTitle>
          <CardDescription>
            Enter an area code to find local numbers available for purchase. Numbers are $0.50/month each through TextGrid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Area code (e.g. 817)"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={handleKeyDown}
              className="w-48"
              maxLength={3}
            />
            <Button onClick={handleSearch} disabled={loadingSearch} className="gap-2">
              <Search className="w-4 h-4" />
              {loadingSearch ? "Searching..." : "Search"}
            </Button>
          </div>

          {searchError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 border border-red-800 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {searchError.message.includes("credentials not configured")
                ? "TextGrid credentials not configured. Please add your Account SID and Auth Token in Settings → TextGrid."
                : searchError.message}
            </div>
          )}

          {hasSearched && !loadingSearch && !searchError && availableNumbers.length === 0 && (
            <p className="text-sm text-muted-foreground">No numbers found for that area code. Try a different one.</p>
          )}

          {availableNumbers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{availableNumbers.length} numbers available</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {availableNumbers.map((num) => (
                  <div
                    key={num.phone_number}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-blue-500/50 transition-colors"
                  >
                    <div>
                      <p className="font-mono font-medium text-sm">{formatPhone(num.phone_number)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {[num.locality, num.region].filter(Boolean).join(", ") || "US"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => purchaseMutation.mutate({ phoneNumber: num.phone_number })}
                      disabled={purchaseMutation.isPending}
                      className="gap-1 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Buy
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owned Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Your Phone Numbers
          </CardTitle>
          <CardDescription>
            {ownedNumbers.length === 0
              ? "No numbers yet. Search above to buy your first number."
              : `${ownedNumbers.length} number${ownedNumbers.length !== 1 ? "s" : ""} in your account`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOwned ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : ownedNumbers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No phone numbers yet.</p>
              <p className="text-xs mt-1">Search above to find and purchase your first number.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ownedNumbers.map((num) => (
                <div
                  key={num.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-mono font-semibold">{formatPhone(num.phoneNumber)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {num.friendlyName && num.friendlyName !== num.phoneNumber && (
                          <span className="text-xs text-muted-foreground">{num.friendlyName}</span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 ${
                            num.status === "active"
                              ? "border-green-600 text-green-400"
                              : "border-yellow-600 text-yellow-400"
                          }`}
                        >
                          {num.status}
                        </Badge>
                        {num.isDefault && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 border-blue-600 text-blue-400">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      <p>{num.smsSent.toLocaleString()} SMS sent</p>
                      {num.twilioSid && (
                        <p className="font-mono opacity-60">{num.twilioSid.slice(0, 12)}…</p>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Release {formatPhone(num.phoneNumber)}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently release this number from your TextGrid account and remove it from LotPulse SMS. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => releaseMutation.mutate({ id: num.id, twilioSid: num.twilioSid ?? undefined })}
                          >
                            Release Number
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing note */}
      <div className="text-xs text-muted-foreground text-center pb-2">
        Phone numbers are billed at $0.50/month each through TextGrid — 50% less than Twilio.
        Numbers are purchased directly in your TextGrid account and charges appear on your TextGrid invoice.
      </div>
    </div>
  );
}
