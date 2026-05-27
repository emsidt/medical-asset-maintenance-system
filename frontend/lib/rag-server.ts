import { getAuthHeaders } from "@/lib/server-auth";

const API_URL = process.env.API_URL || "http://localhost:8080/api";
const RAG_DIRECT_BASE_URL = process.env.RAG_DIRECT_BASE_URL;
const RAG_DIRECT_TOKEN = process.env.RAG_DIRECT_TOKEN;

export function isRagStandaloneMode() {
  return process.env.RAG_CHAT_MOCK === "true" || Boolean(RAG_DIRECT_BASE_URL && RAG_DIRECT_TOKEN);
}

export interface RagTokenPayload {
  ragBaseUrl: string;
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  user: {
    username: string;
    role: string;
  };
}

export async function issueRagToken(): Promise<RagTokenPayload> {
  if (RAG_DIRECT_BASE_URL && RAG_DIRECT_TOKEN) {
    return {
      ragBaseUrl: RAG_DIRECT_BASE_URL,
      tokenType: "Bearer",
      accessToken: RAG_DIRECT_TOKEN,
      expiresIn: 0,
      user: {
        username: "direct-rag-user",
        role: "ADMIN",
      },
    };
  }

  const authHeaders = await getAuthHeaders();

  if (!authHeaders.Authorization) {
    throw new Error("Unauthorized");
  }

  const response = await fetch(`${API_URL}/rag/token`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not issue RAG token: ${response.status}`);
  }

  return response.json();
}

export function joinRagUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}
