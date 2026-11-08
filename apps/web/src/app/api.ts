import { useCallback, useEffect, useState } from "react";

const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

/** Non-2xx reply. `status` lets callers tell 401 (bad signature) from 503 (auth not configured). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Server returned ${status}`);
  }
}

/** The web and the API sit on different origins (Vercel, Render); the session cookie only travels with this. */
const credentials: RequestCredentials = "include";

async function parse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let detail = "";
    try {
      const body: unknown = await r.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string")
        detail = body.error;
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(r.status, detail);
  }
  return (await r.json()) as T;
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return parse<T>(await fetch(apiBase + path, { signal, credentials }));
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(apiBase + path, {
      method: "POST",
      credentials,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
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
