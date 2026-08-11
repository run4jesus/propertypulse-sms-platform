import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function AcceptInvite() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const accept = trpc.team.accept.useMutation({ onSuccess: () => setLocation("/messenger") });
  return <div className="min-h-screen grid place-items-center p-4"><Card className="w-full max-w-md"><CardHeader><ShieldCheck className="h-8 w-8 text-primary mb-2" /><CardTitle>Join the LotPulse team</CardTitle><CardDescription>This invitation grants Messenger-only VA access.</CardDescription></CardHeader><CardContent>{loading ? <p>Checking your account…</p> : !user ? <><Button className="w-full" onClick={() => window.location.href = getLoginUrl()}>Sign in with your invited email</Button><p className="mt-3 text-xs text-muted-foreground">After signing in, open this invitation link again to accept it.</p></> : <Button className="w-full" disabled={!token || accept.isPending} onClick={() => accept.mutate({ token })}>{accept.isPending ? "Joining…" : "Accept invitation"}</Button>}{accept.error && <p className="mt-3 text-sm text-destructive">{accept.error.message}</p>}</CardContent></Card></div>;
}
