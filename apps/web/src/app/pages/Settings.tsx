import { CircleCheck, CircleX, Moon, Sun } from "lucide-react";
import { SnappSwitch } from "../../components/ui/SnappControls";
import { useSnappTheme } from "../../theme/ThemeProvider";
import { playSnap, preloadSnap } from "../../lib/snapSound";
import { useApi } from "../api";
import { ApiState, Chip, PageHeader } from "../ui";
import "./records.css";

type Health = { ok: boolean; network: string; demoMode: boolean };

export default function SettingsPage() {
  const { theme, setTheme, sound, setSound, reduced } = useSnappTheme();
  const health = useApi<Health>("/api/health");
  return (
    <div className="s-page">
      <PageHeader title="Settings" lede="Display preferences for this browser, and the status of each connection." />

      <section className="s-section" aria-labelledby="disp-h">
        <h2 id="disp-h">Display and sound</h2>
        <div className="s-panel rc-settings">
          <div className="rc-setting">
            <div>
              <h3>Theme</h3>
              <p className="s-row-sub">Ink is the signature dark theme. Paper suits dense tables and printing.</p>
            </div>
            <div className="rc-seg" role="radiogroup" aria-label="Theme">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  className="rc-seg-btn"
                  onClick={() => setTheme(t)}
                >
                  {t === "dark" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
                  {t === "dark" ? "Ink" : "Paper"}
                </button>
              ))}
            </div>
          </div>
          <div className="rc-setting">
            <div>
              <h3>Approval sound</h3>
              <p className="s-row-sub">
                A suction swell while you hold, then one snap. Off by default; the screen always
                confirms the approval too.
              </p>
            </div>
            <div className="rc-setting-controls">
              <SnappSwitch label={sound ? "On" : "Off"} selected={sound} onChange={setSound} />
              <button type="button" className="s-btn s-btn--sm" disabled={!sound} onClick={() => void preloadSnap().then(() => playSnap(0.6))}>
                Preview
              </button>
            </div>
          </div>
          <div className="rc-setting">
            <div>
              <h3>Motion</h3>
              <p className="s-row-sub">
                {reduced
                  ? "Your system asks for reduced motion. Snapp uses simple fades and no travel."
                  : "Snapp follows your system's reduced-motion setting."}
              </p>
            </div>
            <Chip>{reduced ? "Reduced" : "Standard"}</Chip>
          </div>
        </div>
      </section>

      <section className="s-section" aria-labelledby="conn-h">
        <h2 id="conn-h">Connections</h2>
        <div className="s-panel s-panel--flush">
          <div className="s-row">
            <div>
              <p className="s-row-title">Snapp demo server</p>
              <p className="s-row-sub">Projects, eligibility checks and Velo collections.</p>
            </div>
            <ApiState loading={health.loading} error={health.error} onRetry={health.retry}>
              {health.data?.ok ? (
                <Chip kind="settled" icon={<CircleCheck size={13} aria-hidden="true" />}>
                  Online · {health.data.network}
                </Chip>
              ) : (
                <Chip kind="stop" icon={<CircleX size={13} aria-hidden="true" />}>
                  Unavailable
                </Chip>
              )}
            </ApiState>
          </div>
          <div className="s-row">
            <div>
              <p className="s-row-title">Noir delegated payouts</p>
              <p className="s-row-sub">
                Signed on the operator's machine with separate owner, agent and merchant keys. This
                website holds no keys and can't move funds.
              </p>
            </div>
            <Chip>Stellar Testnet</Chip>
          </div>
          <div className="s-row">
            <div>
              <p className="s-row-title">Proyekto</p>
              <p className="s-row-sub">Projects, tasks and invoices stay in Proyekto. Linking is planned.</p>
            </div>
            <Chip kind="attention">Planned</Chip>
          </div>
          <div className="s-row">
            <div>
              <p className="s-row-title">Company bank</p>
              <p className="s-row-sub">
                Planned: export an approved run to your bank's bulk-upload format. Your bank's own
                approval steps stay in place.
              </p>
            </div>
            <Chip kind="attention">Planned</Chip>
          </div>
        </div>
      </section>
    </div>
  );
}
