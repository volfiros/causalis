const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/spatial/routes`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[api/spatial/routes] Backend returned ${res.status}: ${text.slice(0, 200)}`);
      return Response.json({ error: `Backend returned ${res.status}` }, { status: res.status >= 500 ? 502 : res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error("[api/spatial/routes] Proxy error:", error);
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}