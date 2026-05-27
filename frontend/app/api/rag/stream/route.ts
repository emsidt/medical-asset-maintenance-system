import { NextRequest, NextResponse } from "next/server";
import { issueRagToken, joinRagUrl } from "@/lib/rag-server";

export const dynamic = "force-dynamic";

function createMockStream(message: string) {
  const encoder = new TextEncoder();
  const chunks = [
    "Day la cau tra loi mock tu frontend. ",
    "Che do nay dung de test giao dien chat khi chua chay Spring backend. ",
    `Cau hoi cua ban la: "${message}". `,
    "Khi can test RAG that, hay tat RAG_CHAT_MOCK va chay backend cung RAG service.",
  ];

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`event: token\ndata: ${chunk}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
      controller.enqueue(encoder.encode(`event: done\ndata: mock-assistant-${Date.now()}\n\n`));
      controller.close();
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!payload?.sessionId || !payload?.message) {
      return NextResponse.json(
        { message: "sessionId and message are required" },
        { status: 400 }
      );
    }

    if (process.env.RAG_CHAT_MOCK === "true") {
      return new Response(createMockStream(payload.message), {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const ragToken = await issueRagToken();
    const response = await fetch(joinRagUrl(ragToken.ragBaseUrl, "/stream"), {
      method: "POST",
      headers: {
        Authorization: `${ragToken.tokenType} ${ragToken.accessToken}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        sessionId: payload.sessionId,
        message: payload.message,
        context: payload.context || {},
      }),
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      const message = await response.text();
      return NextResponse.json(
        { message: message || "RAG stream failed" },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not stream RAG response";
    const status = message === "Unauthorized" ? 401 : 502;
    return NextResponse.json({ message }, { status });
  }
}
