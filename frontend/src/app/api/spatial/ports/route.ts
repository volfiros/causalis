const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/spatial/ports`);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    console.error("[api/spatial/ports] Proxy error:", error);
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }
}