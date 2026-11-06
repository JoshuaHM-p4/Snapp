import { useCallback, useEffect, useState } from "react";

const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(apiBase + path, { signal });
  if (!r.ok) throw new Error(`Server returned ${r.status}`);
  return (await r.json()) as T;
}

/** Read-only GET with explicit loading/error state and a retry. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    getJson<T>(path, ctrl.signal)
      .then((d) => setData(d))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [path, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading, retry };
}
