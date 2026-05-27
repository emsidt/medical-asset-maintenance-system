import { NextResponse } from "next/server";
import { issueRagToken, joinRagUrl } from "@/lib/rag-server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (process.env.RAG_CHAT_MOCK === "true") {
      return NextResponse.json({
        sessionId: `mock-${Date.now()}`,
        title: "Mock RAG Chat",
        createdAt: new Date().toISOString(),
      });
    }

    const ragToken = await issueRagToken();
    const response = await fetch(joinRagUrl(ragToken.ragBaseUrl, "/sessions"), {
      method: "POST",
      headers: {
        Authorization: `${ragToken.tokenType} ${ragToken.accessToken}`,
      },
      cache: "no-store",
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create RAG session";
    const status = message === "Unauthorized" ? 401 : 502;
    return NextResponse.json({ message }, { status });
  }
}
