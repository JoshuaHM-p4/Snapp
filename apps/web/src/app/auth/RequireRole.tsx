import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { SessionRole } from "@agentpay/shared";
import { SnappLoading } from "../../components/ui/SnappLoading";
import { useNotify } from "../toast";
import { roleLabel, useSession } from "./session";

/** Renders children only for the matching role; everyone else lands on /app with a notice. */
export function RequireRole({ role, children }: { role: SessionRole; children: ReactNode }) {
  const { session, ready } = useSession();
  const notify = useNotify();
  const allowed = session?.role === role;
  useEffect(() => {
    if (!ready || allowed) return;
    notify(
      session
        ? `That page is for the ${roleLabel[role].toLowerCase()} wallet. You are signed in as ${roleLabel[session.role].toLowerCase()}.`
        : `Connect the ${roleLabel[role].toLowerCase()} wallet to open that page.`,
      "warning",
    );
  }, [ready, allowed, session, role, notify]);
  if (!ready) return <SnappLoading label="Checking your session" />;
  if (!allowed) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
