export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const response = await fetch(`${backendUrl}/v1/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Backend request failed' }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return new Response('No response body', { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      } catch (error) {
        console.error('Stream error:', error);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
