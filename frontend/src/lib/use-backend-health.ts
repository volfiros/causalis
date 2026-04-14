import { useState, useEffect, useCallback, useRef } from "react";

type BackendStatus = "checking" | "waking" | "ready" | "unavailable";

const MAX_RETRIES = 12;
const RETRY_INTERVAL_MS = 5000;
const TIMEOUT_MS = 30000;

function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://localhost:8000";
}

async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`${getApiBase()}/api/spatial/ports`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const startPinging = useCallback(() => {
    setStatus("waking");

    let retries = 0;

    const attempt = async () => {
      if (!mountedRef.current) return;

      const isUp = await pingBackend();

      if (!mountedRef.current) return;

      if (isUp) {
        setStatus("ready");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      retries++;
      setRetryCount(retries);

      if (retries >= MAX_RETRIES) {
        setStatus("unavailable");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    attempt();
    intervalRef.current = setInterval(attempt, RETRY_INTERVAL_MS);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    pingBackend().then((isUp) => {
      if (!mountedRef.current) return;
      if (isUp) {
        setStatus("ready");
      } else {
        startPinging();
      }
    });

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startPinging]);

  const progress = status === "ready" ? 100 : Math.min((retryCount / MAX_RETRIES) * 80, 80);

  return { status, retryCount, progress };
}