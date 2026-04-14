const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chokepoints = searchParams.get("chokepoints") || "";
  const severity = searchParams.get("severity") || "full";

  try {
    const res = await fetch(
      `${BACKEND_URL}/v1/simulate?chokepoints=${encodeURIComponent(chokepoints)}&severity=${encodeURIComponent(severity)}`
    );
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error("[api/simulate] Proxy error:", error);
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}