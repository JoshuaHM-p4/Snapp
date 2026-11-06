import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SnappControlProvider } from "../components/ui/SnappControls";
import { themeVariables } from "./tokens";

export type SnappTheme = "dark" | "light";

type ThemeState = {
  theme: SnappTheme;
  setTheme: (theme: SnappTheme) => void;
  reduced: boolean;
  sound: boolean;
  setSound: (on: boolean) => void;
};

const ThemeContext = createContext<ThemeState>({
  theme: "dark",
  setTheme: () => {},
  reduced: false,
  sound: false,
  setSound: () => {},
});

/** Browser storage is a per-viewer convenience only; every read/write may throw. */
function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode or blocked storage: keep the in-memory value */
  }
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Applies the Snapp v0.2 theme variables to a `.snapp-ui` root and to portalled
 * controls. Ink (dark) is the signature theme; Paper (light) is fully supported.
 * Sound is off by default (SNAPP_BRAND.md §8).
 */
export function SnappThemeProvider({
  children,
  forceTheme,
  className = "",
}: {
  children: ReactNode;
  forceTheme?: SnappTheme;
  className?: string;
}) {
  const [stored, setStored] = useState<SnappTheme>(() =>
    readPref("snapp.theme") === "light" ? "light" : "dark",
  );
  const [sound, setSoundState] = useState(() => readPref("snapp.sound") === "on");
  const reduced = useReducedMotion();
  const theme = forceTheme ?? stored;
  const setTheme = useCallback((t: SnappTheme) => {
    setStored(t);
    writePref("snapp.theme", t);
  }, []);
  const setSound = useCallback((on: boolean) => {
    setSoundState(on);
    writePref("snapp.sound", on ? "on" : "off");
  }, []);
  const variables = useMemo(
    () => themeVariables(theme) as CSSProperties,
    [theme],
  );
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.snappTheme = theme;
    root.style.colorScheme = theme;
  }, [theme]);
  const value = useMemo(
    () => ({ theme, setTheme, reduced, sound, setSound }),
    [theme, setTheme, reduced, sound, setSound],
  );
  return (
    <ThemeContext.Provider value={value}>
      <SnappControlProvider theme={theme} reduced={reduced} variables={variables}>
        <div
          className={`snapp-ui snapp-root ${className}`}
          data-snapp-theme={theme}
          data-reduced={reduced}
          style={variables}
        >
          {children}
        </div>
      </SnappControlProvider>
    </ThemeContext.Provider>
  );
}

export const useSnappTheme = () => useContext(ThemeContext);
