export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const userMessage = messages?.[messages.length - 1]?.content ?? "";
  console.log(`[api/chat/stream] Incoming message: ${userMessage.slice(0, 100)}`);

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  console.log(`[api/chat/stream] Proxying to: ${backendUrl}/v1/chat/stream`);

  const response = await fetch(`${backendUrl}/v1/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  console.log(`[api/chat/stream] Backend responded: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[api/chat/stream] Backend error: ${errorBody.slice(0, 200)}`);
    return new Response(JSON.stringify({ error: 'Backend request failed', detail: errorBody }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return new Response('No response body', { status: 500 });
  }

  let totalChunks = 0;
  let totalBytes = 0;
  let firstChunk = "";

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          totalChunks++;
          totalBytes += chunk.length;
          if (totalChunks === 1) firstChunk = chunk.slice(0, 100);
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      } catch (error) {
        console.error('[api/chat/stream] Stream error:', error);
      } finally {
        reader.releaseLock();
        controller.close();
        console.log(`[api/chat/stream] Stream complete: ${totalChunks} chunks, ${totalBytes} bytes, first: ${firstChunk.slice(0, 80)}`);
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