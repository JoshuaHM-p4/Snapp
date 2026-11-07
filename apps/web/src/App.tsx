import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { SnappThemeProvider } from "./theme/ThemeProvider";
import { SnappLoading } from "./components/ui/SnappLoading";
import { AppShell } from "./app/AppShell";
import Landing from "./site/Landing";
import { CheckoutResult, NotFound } from "./site/StatusPages";
import Overview from "./app/pages/Overview";
import Projects from "./app/pages/Projects";
import ProjectDetail from "./app/pages/ProjectDetail";
import Invoices from "./app/pages/Invoices";
import Developers from "./app/pages/Developers";
import CutoffReview from "./app/pages/CutoffReview";
import Statement from "./app/pages/Statement";
import Results from "./app/pages/Results";
import Proof from "./app/pages/Proof";
import Agent from "./app/pages/Agent";
import SettingsPage from "./app/pages/Settings";

// Dev-only tools; import.meta.env.DEV is false in production builds, so these are dropped.
const HoldPlayground = import.meta.env.DEV ? lazy(() => import("./dev/HoldPlayground")) : null;
const DesignLibrary = import.meta.env.DEV ? lazy(() => import("./dev/DesignLibrary")) : null;

function LegacyProject() {
  const { id } = useParams();
  return <Navigate to={`/app/projects/${id ?? ""}`} replace />;
}

export default function App() {
  const location = useLocation();
  if (DesignLibrary && location.pathname === "/dev/library")
    return (
      <Suspense fallback={<SnappLoading label="Loading design library" />}>
        <DesignLibrary />
      </Suspense>
    );
  return (
    <SnappThemeProvider forceTheme={location.pathname === "/" ? "dark" : undefined}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="cutoffs" element={<CutoffReview />} />
          <Route path="results" element={<Results />} />
          <Route path="agent" element={<Agent />} />
          <Route path="statement" element={<Statement />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="developers" element={<Developers />} />
          <Route path="proof" element={<Proof />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound inApp />} />
        </Route>
        {/* Earlier scaffold URLs keep working. */}
        <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="/projects/:id" element={<LegacyProject />} />
        <Route path="/invoices" element={<Navigate to="/app/invoices" replace />} />
        <Route path="/developers" element={<Navigate to="/app/developers" replace />} />
        <Route path="/agent" element={<Navigate to="/app/agent" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
        <Route path="/checkout/success" element={<CheckoutResult outcome="success" />} />
        <Route path="/checkout/cancel" element={<CheckoutResult outcome="cancel" />} />
        {HoldPlayground && (
          <Route
            path="/dev/hold"
            element={
              <Suspense fallback={<SnappLoading label="Loading playground" />}>
                <HoldPlayground />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SnappThemeProvider>
  );
}
