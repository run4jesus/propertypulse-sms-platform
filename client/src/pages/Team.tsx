import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Copy, Mail, ShieldCheck, UserMinus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Team() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.team.list.useQuery();
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const invite = trpc.team.invite.useMutation({
    onSuccess: ({ inviteUrl: url }) => {
      setInviteUrl(url);
      setEmail("");
      utils.team.list.invalidate();
      toast.success("Invitation link created — copy and send it to your VA.");
    },
    onError: (error) => toast.error(error.message),
  });
  const revoke = trpc.team.revoke.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); toast.success("VA access revoked"); },
    onError: (error) => toast.error(error.message),
  });
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); toast.success("Copied to clipboard"); };

  return <div className="container max-w-4xl py-8 space-y-6">
    <div><h1 className="text-2xl font-semibold">Team Access</h1><p className="text-muted-foreground">Invite a VA with a separate secure login and Messenger-only access.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Invite a VA</CardTitle><CardDescription>They must create or use a Manus account with this exact email address.</CardDescription></CardHeader><CardContent className="flex gap-3"><div className="flex-1"><Label htmlFor="va-email">VA email address</Label><Input id="va-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="va@example.com" type="email" /></div><Button className="self-end" disabled={!email || invite.isPending} onClick={() => invite.mutate({ email, origin: window.location.origin })}>Create invite</Button></CardContent></Card>
    {inviteUrl && <Card className="border-primary/40"><CardHeader><CardTitle className="text-base">Send this secure invitation link</CardTitle><CardDescription>The link expires in seven days and only works for the invited email.</CardDescription></CardHeader><CardContent className="flex gap-2"><Input readOnly value={inviteUrl} /><Button variant="outline" onClick={() => copy(inviteUrl)}><Copy className="h-4 w-4" /></Button></CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Current team members</CardTitle><CardDescription>VAs can use Messenger, reply manually, pause/resume AI, and push qualified leads to Podio. They cannot access campaigns, costs, lists, settings, or credentials.</CardDescription></CardHeader><CardContent className="space-y-3">{isLoading ? <p className="text-sm text-muted-foreground">Loading team…</p> : <>{(data?.members ?? []).filter((member) => member.status === "active").map((member) => <div key={member.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">Messenger VA</p><p className="text-sm text-muted-foreground">Active since {new Date(member.createdAt).toLocaleDateString()}</p></div><Button variant="outline" size="sm" onClick={() => revoke.mutate({ memberId: member.id })}><UserMinus className="mr-2 h-4 w-4" /> Revoke</Button></div>)}{(data?.members ?? []).filter((member) => member.status === "active").length === 0 && <p className="text-sm text-muted-foreground">No active VAs yet.</p>}</>}</CardContent></Card>
    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><p>Each VA uses their own account. Do not share your owner login or integration credentials.</p></div>
  </div>;
}
