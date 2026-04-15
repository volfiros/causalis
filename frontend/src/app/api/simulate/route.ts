const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chokepoints = searchParams.get("chokepoints") || "";
  const severity = searchParams.get("severity") || "full";

  try {
    const res = await fetch(
      `${BACKEND_URL}/v1/simulate?chokepoints=${encodeURIComponent(chokepoints)}&severity=${encodeURIComponent(severity)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[api/simulate] Backend returned ${res.status}: ${text.slice(0, 200)}`);
      return Response.json({ error: `Backend returned ${res.status}` }, { status: res.status >= 500 ? 502 : res.status });
    }
    const data = await res.json();
    return Response.json(data);
  } catch (error) {
    console.error("[api/simulate] Proxy error:", error);
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}