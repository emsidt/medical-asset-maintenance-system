"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import { Bot, Loader2, RefreshCw, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface RagSessionResponse {
  sessionId: string;
  title: string;
  createdAt: string;
}

const starterPrompts = [
  "Huong dan quy trinh bao cao su co thiet bi",
  "Khi nao can bao tri dinh ky thiet bi y te?",
  "Cach xu ly khi may do sinh hieu bi loi?",
];

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

function parseSseEvents(buffer: string) {
  const blocks = buffer.split("\n\n");
  return {
    completeBlocks: blocks.slice(0, -1),
    remainder: blocks[blocks.length - 1] || "",
  };
}

function readEventData(block: string) {
  return block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n");
}

export function RagChatView() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function ensureSession() {
    if (sessionId) return sessionId;

    const response = await fetch("/api/rag/sessions", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Khong the tao phien chat RAG.");
    }

    const data = (await response.json()) as RagSessionResponse;
    setSessionId(data.sessionId);
    return data.sessionId;
  }

  async function sendMessage(messageText: string) {
    const trimmed = messageText.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setIsSending(true);
    setInput("");
    setMessages((current) => [
      ...current,
      createMessage("user", trimmed),
      createMessage("assistant", ""),
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const activeSessionId = await ensureSession();
      const response = await fetch("/api/rag/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: trimmed,
          context: {},
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Chatbot RAG khong tra ve du lieu hop le.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { completeBlocks, remainder } = parseSseEvents(buffer);
        buffer = remainder;

        for (const block of completeBlocks) {
          const data = readEventData(block);
          if (!data || block.includes("event: done")) continue;

          setMessages((current) => {
            const updated = [...current];
            const lastIndex = updated.length - 1;
            const last = updated[lastIndex];
            if (last?.role === "assistant") {
              updated[lastIndex] = { ...last, content: last.content + data };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Da co loi khi goi chatbot RAG.");
        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: "Khong the ket noi chatbot RAG. Vui long thu lai sau.",
            };
          }
          return updated;
        });
      }
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function resetChat() {
    abortRef.current?.abort();
    setSessionId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setIsSending(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[560px] flex-col overflow-hidden rounded-lg border bg-white">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Chatbot RAG</h2>
            <p className="text-sm text-gray-500">Hoi dap ve quy trinh, su co va bao tri thiet bi y te.</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={resetChat} disabled={isSending}>
          <RefreshCw className="h-4 w-4" />
          Lam moi
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-3xl flex-col justify-center">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">Can tra cuu thong tin gi?</h3>
              <p className="mt-2 text-sm text-gray-600">
                Chatbot se tra loi dua tren lich su hoi thoai va tri thuc da nap vao RAG service.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-lg border bg-white p-4 text-left text-sm font-medium text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white",
                    message.role === "assistant" ? "text-emerald-700" : "text-blue-700"
                  )}
                >
                  {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "max-w-[78%] whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "assistant"
                      ? "bg-white text-gray-800"
                      : "border-blue-600 bg-blue-600 text-white"
                  )}
                >
                  {message.content || (
                    <span className="inline-flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dang tra loi...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="border-t bg-red-50 px-5 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="border-t bg-white p-4">
        <div className="mx-auto flex max-w-4xl items-end gap-3">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhap cau hoi cho chatbot RAG..."
            className="max-h-40 min-h-11 resize-none bg-white"
            disabled={isSending}
          />
          <Button type="submit" size="icon-lg" disabled={!canSend} aria-label="Gui cau hoi">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
