import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import type { SessionRole } from "@agentpay/shared";
import {
  ArrowLeft,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { SnappLogo } from "../components/SnappLogo";
import { SnappToastRegion, useSnappToasts } from "../components/ui/SnappControls";
import { useSnappTheme } from "../theme/ThemeProvider";
import { ConnectDialog } from "./auth/ConnectDialog";
import { roleLabel, SessionProvider, useSession } from "./auth/session";
import { Chip, TestnetBadge } from "./ui";
import { ToastContext } from "./toast";
import { middle } from "./money";
import "./app.css";
import "./auth/auth.css";

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean; agent?: boolean; roleOnly?: boolean };
/** Groups with `role` collapse to that signed-in role; `roleOnly` items need the role, the rest show to everyone as before sign-in existed. */
type NavGroup = { name: string; items: NavItem[]; role?: SessionRole };
const groups: NavGroup[] = [
  {
    name: "Owner",
    role: "owner",
    items: [
      { to: "/app", label: "Overview", Icon: LayoutDashboard, end: true },
      { to: "/app/runs", label: "Your runs", Icon: Wallet, roleOnly: true },
      { to: "/app/cutoffs", label: "Cutoff review", Icon: ListChecks },
      { to: "/app/results", label: "Recipient results", Icon: ScrollText },
    ],
  },
  {
    name: "Agent",
    items: [{ to: "/app/agent", label: "Payment agent", Icon: Sparkles, agent: true }],
  },
  {
    name: "Employee",
    role: "developer",
    items: [
      { to: "/app/payments", label: "Your payments", Icon: Wallet, roleOnly: true },
      { to: "/app/statement", label: "My statement", Icon: FileText },
    ],
  },
  {
    name: "Records",
    items: [
      { to: "/app/projects", label: "Projects", Icon: FolderKanban },
      { to: "/app/invoices", label: "Invoices & collections", Icon: ReceiptText },
      { to: "/app/developers", label: "Developers", Icon: Users },
    ],
  },
  {
    name: "Evidence",
    items: [
      { to: "/app/proof", label: "Testnet proof", Icon: ShieldCheck },
      { to: "/app/settings", label: "Settings", Icon: Settings },
    ],
  },
];

/**
 * Signed out, visitors and clients see the full demo navigation. An owner or developer sees
 * only the group for their role plus the shared ones; the role-only pages are hidden from the rest.
 */
function visibleGroups(role: SessionRole | undefined): NavGroup[] {
  const gated = role === "owner" || role === "developer";
  return groups.flatMap((g) => {
    if (!g.role) return [g];
    if (gated) return g.role === role ? [g] : [];
    return [{ ...g, items: g.items.filter((i) => !i.roleOnly) }];
  });
}

function roleChipKind(role: SessionRole) {
  return role === "owner" ? "human" : role === "developer" ? "settled" : "neutral";
}

/** Connect button, or address + role + sign out. On phones only the icon stays; the drawer carries the rest. */
function Account({ onConnect }: { onConnect: () => void }) {
  const { session, authEnabled, signOut } = useSession();
  if (!authEnabled) return null;
  if (!session)
    return (
      <button type="button" className="s-btn s-btn--sm s-account-connect" onClick={onConnect} aria-label="Connect wallet">
        <Wallet size={16} aria-hidden="true" />
        <span className="s-account-label">Connect wallet</span>
      </button>
    );
  return (
    <div className="s-account">
      <Chip kind={roleChipKind(session.role)}>{roleLabel[session.role]}</Chip>
      <span className="s-account-addr s-mono" title={session.address}>
        {middle(session.address, 5, 4)}
      </span>
      <button
        type="button"
        className="s-btn s-btn--quiet s-btn--sm"
        onClick={() => void signOut()}
        aria-label={`Sign out ${middle(session.address, 5, 4)}`}
      >
        <LogOut size={16} aria-hidden="true" />
        <span className="s-account-label">Sign out</span>
      </button>
    </div>
  );
}

/** Phone drawer copy of the account state, since the header only has room for an icon there. */
function NavAccount({ onConnect }: { onConnect: () => void }) {
  const { session, authEnabled, signOut } = useSession();
  if (!authEnabled) return null;
  return (
    <div className="s-nav-account">
      {session ? (
        <>
          <div className="s-nav-account-row">
            <Chip kind={roleChipKind(session.role)}>{roleLabel[session.role]}</Chip>
            <span className="s-mono" title={session.address}>
              {middle(session.address, 6, 4)}
            </span>
          </div>
          <button type="button" className="s-btn s-btn--sm" onClick={() => void signOut()}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </>
      ) : (
        <button type="button" className="s-btn s-btn--sm" onClick={onConnect}>
          <Wallet size={16} aria-hidden="true" /> Connect wallet
        </button>
      )}
    </div>
  );
}

export function AppShell() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}

function Shell() {
  const { theme, setTheme } = useSnappTheme();
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const { session } = useSession();
  const location = useLocation();
  const toasts = useSnappToasts();
  useEffect(() => {
    setOpen(false);
    document.getElementById("app-main")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const nav = visibleGroups(session?.role);
  const openConnect = () => {
    setOpen(false);
    setConnecting(true);
  };

  return (
    <ToastContext.Provider value={toasts.notify}>
      <div className="s-app" data-nav-open={open}>
        <a className="s-skip" href="#app-main">
          Skip to content
        </a>
        <header className="s-topbar">
          <Link to="/" className="s-topbar-logo" aria-label="Snapp home">
            <SnappLogo release="var(--logo-release)" className="s-wordmark" />
          </Link>
          <span className="s-topbar-context">Demo workspace</span>
          <div className="s-topbar-right">
            <TestnetBadge />
            <Account onConnect={openConnect} />
            <button
              type="button"
              className="s-btn s-btn--quiet s-icon-btn"
              aria-label={theme === "dark" ? "Switch to Paper (light) theme" : "Switch to Ink (dark) theme"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="s-btn s-btn--quiet s-icon-btn s-nav-toggle"
              aria-expanded={open}
              aria-controls="app-nav"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </header>
        <nav id="app-nav" className="s-sidenav" aria-label="Workspace">
          <NavAccount onConnect={openConnect} />
          {nav.map((g) => (
            <div key={g.name} className="s-nav-group">
              <p className="s-label">{g.name}</p>
              <ul>
                {g.items.map(({ to, label, Icon, end, agent }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `s-nav-link ${agent ? "s-nav-link--agent" : ""} ${isActive ? "is-active" : ""}`
                      }
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="s-nav-foot">
            <p>
              Fictional demo data. No real funds, payroll records or bank access. Money-moving
              steps are Stellar Testnet only.
            </p>
            <Link to="/" className="s-nav-back">
              <ArrowLeft size={14} aria-hidden="true" /> Back to snapp home
            </Link>
          </div>
        </nav>
        <main id="app-main" className="s-main" tabIndex={-1}>
          {session?.role === "visitor" && (
            <div className="s-notice s-visitor-notice" role="status">
              <Wallet size={16} aria-hidden="true" />
              <div>
                This wallet is not part of any recorded run. You can browse the demo.{" "}
                <Link to="/app/proof" className="s-link">
                  See the Testnet proof
                </Link>
                .
              </div>
            </div>
          )}
          <div key={location.pathname} className="s-view">
            <Outlet />
          </div>
        </main>
        <ConnectDialog isOpen={connecting} onClose={() => setConnecting(false)} />
        <SnappToastRegion toasts={toasts.toasts} dismiss={toasts.dismiss} />
      </div>
    </ToastContext.Provider>
  );
}
