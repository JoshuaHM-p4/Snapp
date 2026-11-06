import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { playSnap, startSuction, type Suction } from "../lib/snapSound";
import { useSnappTheme } from "../theme/ThemeProvider";
import "./hold.css";

const HOLD_MS = 750; // --dur-hold; tuned in /dev/hold

/**
 * "Snap to approve" (SNAPP_BRAND.md §8, signature moment 2).
 * Pointer: hold 750 ms; the Slip mark's top arc draws as progress, release early
 * to cancel. Keyboard / assistive tech: Enter or Space opens a confirmation
 * dialog that repeats the exact summary. Sound only when the viewer enabled it.
 * This control only reports intent through `onSnap`; it never moves funds.
 */
export function HoldToSnap({
  label = "Hold to snap",
  approvedLabel = "Approved · locked",
  summary,
  confirmTitle = "Approve this exact snapshot?",
  confirmLabel = "Approve snapshot",
  onSnap,
  approved = false,
  disabled = false,
  size = "md",
  onHoldChange,
}: {
  label?: string;
  approvedLabel?: string;
  summary: ReactNode;
  confirmTitle?: string;
  confirmLabel?: string;
  onSnap: (via: "hold" | "dialog") => void;
  approved?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
  /** Optional: mirror the hold progress elsewhere (e.g. a hero graphic). */
  onHoldChange?: (holding: boolean) => void;
}) {
  const { sound } = useSnappTheme();
  const [holding, setHoldingState] = useState(false);
  const holdCb = useRef(onHoldChange);
  holdCb.current = onHoldChange;
  const setHolding = useCallback((h: boolean) => {
    setHoldingState(h);
    holdCb.current?.(h);
  }, []);
  const [burst, setBurst] = useState(0);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const suction = useRef<Suction | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const stopSound = () => {
    suction.current?.stop();
    suction.current = null;
  };
  const cancel = useCallback(
    (announce = true) => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = undefined;
      stopSound();
      setHolding(false);
      if (announce) setStatus("Released early. Nothing was approved.");
    },
    [setHolding],
  );
  const complete = (via: "hold" | "dialog") => {
    timer.current = undefined;
    stopSound();
    setHolding(false);
    setBurst((b) => b + 1);
    if (sound) {
      try {
        playSnap(0.6);
      } catch {
        /* audio unavailable: the visual state still confirms */
      }
    }
    setStatus(approvedLabel);
    onSnap(via);
  };

  useEffect(() => {
    const onHide = () => document.hidden && cancel(false);
    const onBlur = () => cancel(false);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHide);
      clearTimeout(timer.current);
      stopSound();
    };
  }, [cancel]);

  const locked = approved || disabled;

  return (
    <div className={`s-hold-wrap s-hold-wrap--${size}`}>
      <button
        type="button"
        className="s-btn s-btn--primary s-hold"
        data-holding={holding}
        data-approved={approved}
        aria-disabled={locked}
        aria-describedby={`${titleId}-hint`}
        onPointerDown={(e) => {
          if (locked || e.button !== 0 || !e.isPrimary || timer.current) return;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          setHolding(true);
          setStatus("Holding… release early to cancel.");
          if (sound) {
            try {
              suction.current = startSuction(HOLD_MS, 0.5);
            } catch {
              suction.current = null;
            }
          }
          timer.current = setTimeout(() => complete("hold"), HOLD_MS);
        }}
        onPointerUp={() => cancel()}
        onPointerCancel={() => cancel()}
        onLostPointerCapture={() => cancel()}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          // Keyboard activation (Enter/Space) has detail 0: confirm in a dialog instead.
          if (e.detail === 0 && !locked) dialog.current?.showModal();
        }}
      >
        <span className="s-hold-mark" aria-hidden="true">
          <svg viewBox="-13 -40 30 44" fill="none" strokeWidth={7}>
            <path className="track" d="M9 -27A9 9 0 1 0 0 -18" />
            <path className="track" d="M4 -18A9 9 0 1 1 -5 -9" />
            <path className="prep" d="M9 -27A9 9 0 1 0 0 -18" />
            <path className="release" d="M4 -18A9 9 0 1 1 -5 -9" />
          </svg>
          {burst > 0 && (
            <span key={burst} className="s-hold-echo">
              <span className="s-echo" />
              <span className="s-echo" />
            </span>
          )}
        </span>
        <span className="s-hold-text">
          {approved ? (
            <>
              <Lock size={16} aria-hidden="true" /> {approvedLabel}
            </>
          ) : (
            label
          )}
        </span>
      </button>
      <p id={`${titleId}-hint`} className="s-visually-hidden">
        Press and hold for {HOLD_MS} milliseconds, or press Enter to confirm in a dialog.
      </p>
      <p className="s-visually-hidden" role="status" aria-live="polite">
        {status}
      </p>
      <dialog
        ref={dialog}
        className="s-dialog"
        aria-labelledby={titleId}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <form method="dialog" className="s-dialog-body">
          <h2 id={titleId}>{confirmTitle}</h2>
          <div className="s-dialog-summary">{summary}</div>
          <div className="s-dialog-actions">
            <button className="s-btn" value="cancel">
              Cancel
            </button>
            <button
              className="s-btn s-btn--primary"
              value="confirm"
              onClick={(e) => {
                e.preventDefault();
                dialog.current?.close();
                complete("dialog");
              }}
            >
              <Lock size={16} aria-hidden="true" /> {confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
