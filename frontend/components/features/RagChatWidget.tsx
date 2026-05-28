"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Loader2, MessageCircle, Send, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  isStreaming?: boolean;
}

interface RagSessionResponse {
  sessionId: string;
}

const SESSION_STORAGE_KEY = "rag_chat_session_id";
const MESSAGES_STORAGE_KEY = "rag_chat_messages";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.8em] text-gray-800">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md bg-gray-900 p-3 text-xs text-gray-50">{children}</pre>
  ),
  a: ({ children, href }) => (
    <a className="font-medium text-blue-700 underline" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed)
      ? parsed.map((message) => ({
          ...message,
          isStreaming: false,
        }))
      : [];
  } catch {
    return [];
  }
}

interface SseEvent {
  event: string;
  data: string;
}

function parseSseBlock(block: string): SseEvent | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue;

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);

    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "event") {
      event = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0 && event === "message") {
    return null;
  }

  return {
    event,
    data: dataLines.join("\n"),
  };
}

function drainSseEvents(buffer: string, flush = false) {
  const events: SseEvent[] = [];
  let normalizedBuffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let boundaryIndex = normalizedBuffer.indexOf("\n\n");

  while (boundaryIndex !== -1) {
    const block = normalizedBuffer.slice(0, boundaryIndex);
    normalizedBuffer = normalizedBuffer.slice(boundaryIndex + 2);

    const event = parseSseBlock(block);
    if (event) {
      events.push(event);
    }

    boundaryIndex = normalizedBuffer.indexOf("\n\n");
  }

  if (flush && normalizedBuffer.trim()) {
    const event = parseSseBlock(normalizedBuffer);
    if (event) {
      events.push(event);
    }
    normalizedBuffer = "";
  }

  return {
    events,
    remainder: normalizedBuffer,
  };
}

export function RagChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const assistantContentRef = useRef("");
  const pendingTokenRef = useRef("");
  const animationFrameRef = useRef<number | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  useEffect(() => {
    setSessionId(localStorage.getItem(SESSION_STORAGE_KEY));
    setMessages(loadMessages());
    setHasLoadedHistory(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedHistory) return;

    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [hasLoadedHistory, messages]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [sessionId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  function updateAssistantMessage(messageId: string, content: string, isStreaming: boolean) {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content,
              isStreaming,
            }
          : message
      )
    );
  }

  function flushPendingTokens(isStreaming = true) {
    const messageId = assistantMessageIdRef.current;
    if (!messageId || !pendingTokenRef.current) return;

    assistantContentRef.current += pendingTokenRef.current;
    pendingTokenRef.current = "";
    updateAssistantMessage(messageId, assistantContentRef.current, isStreaming);
  }

  function scheduleTokenFlush() {
    if (animationFrameRef.current !== null) return;

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      flushPendingTokens(true);
    });
  }

  function appendAssistantToken(token: string) {
    pendingTokenRef.current += token;
    scheduleTokenFlush();
  }

  function completeAssistantMessage() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    flushPendingTokens(false);

    const messageId = assistantMessageIdRef.current;
    if (messageId) {
      updateAssistantMessage(messageId, assistantContentRef.current, false);
    }
  }

  async function ensureSession() {
    if (sessionId) return sessionId;

    const response = await fetch("/api/rag/sessions", { method: "POST" });
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
    setInput("");
    setIsSending(true);
    const assistantMessage = {
      ...createMessage("assistant", ""),
      isStreaming: true,
    };
    assistantMessageIdRef.current = assistantMessage.id;
    assistantContentRef.current = "";
    pendingTokenRef.current = "";
    setMessages((current) => [...current, createMessage("user", trimmed), assistantMessage]);

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
      let streamDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = drainSseEvents(buffer);
        buffer = remainder;

        for (const event of events) {
          if (event.event === "done") {
            streamDone = true;
            completeAssistantMessage();
          } else if (event.data) {
            appendAssistantToken(event.data);
          }
        }
      }

      buffer += decoder.decode();
      const { events } = drainSseEvents(buffer, true);
      for (const event of events) {
        if (event.event === "done") {
          streamDone = true;
          completeAssistantMessage();
        } else if (event.data) {
          appendAssistantToken(event.data);
        }
      }

      if (!streamDone) {
        completeAssistantMessage();
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        completeAssistantMessage();
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
      completeAssistantMessage();
      abortRef.current = null;
      assistantMessageIdRef.current = null;
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

  function toggleWidget() {
    setIsOpen((current) => !current);
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <div
        className={cn(
          "absolute bottom-[72px] right-0 flex h-[min(600px,calc(100vh-112px))] w-[calc(100vw-48px)] max-w-[380px] origin-bottom-right flex-col overflow-hidden rounded-lg border bg-white shadow-2xl transition-all duration-200 ease-out md:h-[600px] md:w-[380px]",
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Chatbot RAG</div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Online
              </div>
            </div>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => setIsOpen(false)} aria-label="Dong chatbot">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col justify-center text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Bot className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-gray-900">Hoi dap ve thiet bi y te</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Dat cau hoi ve quy trinh, su co, bao tri hoac thong tin trong kho tri thuc RAG.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex items-start gap-2", message.role === "user" && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white",
                      message.role === "assistant" ? "text-emerald-700" : "text-blue-700"
                    )}
                  >
                    {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm",
                      message.role === "assistant"
                        ? "border bg-white text-gray-800"
                        : "bg-blue-600 text-white"
                    )}
                  >
                    {message.role === "assistant" && message.content && !message.isStreaming ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {message.content}
                      </ReactMarkdown>
                    ) : message.content ? (
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Dang tra loi...
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        {error && <div className="border-t bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="shrink-0 border-t bg-white p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhap cau hoi..."
              className="max-h-28 min-h-10 resize-none bg-white text-sm"
              disabled={isSending}
            />
            <Button type="submit" size="icon-lg" disabled={!canSend} aria-label="Gui cau hoi">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </div>

      <Button
        type="button"
        onClick={toggleWidget}
        aria-label={isOpen ? "Thu gon chatbot" : "Mo chatbot"}
        className="h-14 w-14 rounded-full bg-blue-600 text-white shadow-xl transition-transform hover:scale-105 hover:bg-blue-700"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
