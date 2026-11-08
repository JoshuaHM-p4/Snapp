import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, SessionRole } from "@agentpay/shared";
import { ApiError, getJson, postJson } from "../api";
import { connect, disconnectKit, WalletError, type WalletMethod } from "./wallets";

type Me = { session: Session | null; authEnabled: boolean };
type Challenge = { transaction: string; networkPassphrase: string };

export interface SessionState {
  /** Null when signed out. */
  session: Session | null;
  /** False until the server has answered once, and when it has no auth keys configured (demo keeps working). */
  authEnabled: boolean;
  /** True once the first GET /api/me settled, so guards do not redirect before the cookie was read. */
  ready: boolean;
  /** `onConnected` fires once the wallet picked an account, before the signing prompt. */
  signIn(method: WalletMethod, onConnected?: (address: string) => void): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const SessionContext = createContext<SessionState>({
  session: null,
  authEnabled: false,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export const useSession = () => useContext(SessionContext);

export const roleLabel: Record<SessionRole, string> = {
  owner: "Owner",
  developer: "Developer",
  client: "Client",
  visitor: "Visitor",
};

/** Turn a sign-in failure into one sentence the dialog can show. Never exposes XDR or keys. */
export function signInErrorMessage(e: unknown): string {
  if (e instanceof WalletError) return e.message;
  if (e instanceof ApiError) {
    if (e.status === 401)
      return "The server rejected the signature. Make sure the wallet is on Stellar Testnet and signed with the account you picked, then try again.";
    if (e.status === 503) return "Wallet sign-in is not configured on this server yet.";
    if (e.status === 400) return e.detail || "The server could not read that account.";
    return `The server returned ${e.status}. Nothing was changed; try again in a moment.`;
  }
  if (e instanceof TypeError) return "Could not reach the server. It may be waking up; try again in a moment.";
  return e instanceof Error ? e.message : String(e);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await getJson<Me>("/api/me");
      if (alive.current) setMe(next);
    } catch {
      // Server unreachable or asleep: behave like a site without sign-in until the next refresh.
      if (alive.current) setMe({ session: null, authEnabled: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (method: WalletMethod, onConnected?: (address: string) => void) => {
      const wallet = await connect(method);
      onConnected?.(wallet.address);
      const challenge = await getJson<Challenge>(
        `/api/auth/challenge?account=${encodeURIComponent(wallet.address)}`,
      );
      const signed = await wallet.sign(challenge.transaction);
      await postJson<{ session: Session }>("/api/auth/verify", { transaction: signed });
      await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    try {
      await postJson<{ ok: true }>("/api/auth/logout");
    } finally {
      await disconnectKit().catch(() => {});
      await refresh();
    }
  }, [refresh]);

  const value = useMemo<SessionState>(
    () => ({
      session: me?.session ?? null,
      authEnabled: me?.authEnabled ?? false,
      ready: me !== null,
      signIn,
      signOut,
      refresh,
    }),
    [me, signIn, signOut, refresh],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
