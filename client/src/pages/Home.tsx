// Home redirects to Dashboard — the DashboardLayout handles auth gating
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/");
  }, []);
  return null;
}
