import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { SnappLogo } from "../components/SnappLogo";
import { SnappToastRegion, useSnappToasts } from "../components/ui/SnappControls";
import { useSnappTheme } from "../theme/ThemeProvider";
import { TestnetBadge } from "./ui";
import { ToastContext } from "./toast";
import "./app.css";

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean; agent?: boolean };
const groups: { name: string; items: NavItem[] }[] = [
  {
    name: "Owner",
    items: [
      { to: "/app", label: "Overview", Icon: LayoutDashboard, end: true },
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
    items: [{ to: "/app/statement", label: "My statement", Icon: FileText }],
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

export function AppShell() {
  const { theme, setTheme } = useSnappTheme();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const toasts = useSnappToasts();
  useEffect(() => {
    setOpen(false);
    document.getElementById("app-main")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
          {groups.map((g) => (
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
          <div key={location.pathname} className="s-view">
            <Outlet />
          </div>
        </main>
        <SnappToastRegion toasts={toasts.toasts} dismiss={toasts.dismiss} />
      </div>
    </ToastContext.Provider>
  );
}
