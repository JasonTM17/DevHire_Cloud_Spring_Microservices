"use client";

import { Bot, BrainCircuit, FileText, Loader2, Send, Sparkles, TerminalSquare } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { AiChatResponse, AiCitation, AiToolTrace } from "@/types/domain";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  fallback?: boolean;
  citations?: AiCitation[];
  toolTraces?: AiToolTrace[];
};

const suggestedPrompts = [
  "Explain this microservices platform to a recruiter",
  "Find senior Java jobs matching Kafka and AWS",
  "Show the 10-minute demo path",
  "What production risks does this system handle?",
  "How do you handle prompt injection and secret safety?"
];

export default function AssistantPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState(suggestedPrompts[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me to explain the DevHire Cloud architecture, search jobs, walk through the demo, or summarize production readiness. I use Claude Haiku when configured and a deterministic fallback otherwise."
    }
  ]);
  const [model, setModel] = useState("claude-haiku-4-5-20251001");
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    setHasSession(Boolean(session?.accessToken));
    setSessionReady(true);
  }, []);

  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant"), [messages]);

  async function submit(event?: FormEvent, override?: string) {
    event?.preventDefault();
    const prompt = (override ?? input).trim();
    if (!prompt || loading) {
      return;
    }
    const session = getSession();
    if (!session?.accessToken) {
      setError("Sign in first so the Gateway can attach JWT identity headers to ai-service.");
      return;
    }
    setLoading(true);
    setError("");
    setMessages((current) => [...current, { role: "user", content: prompt }, { role: "assistant", content: "" }]);
    setInput("");
    try {
      let streamed = "";
      const response = await streamChat(prompt, session.accessToken, conversationId, (delta) => {
        streamed += delta;
        setMessages((current) => {
          const next = [...current];
          const last = next.length - 1;
          next[last] = { ...next[last], content: streamed };
          return next;
        });
      });
      setConversationId(response.conversationId);
      setModel(response.model);
      setFallback(response.fallback);
      setMessages((current) => {
        const next = [...current];
        const last = next.length - 1;
        next[last] = {
          role: "assistant",
          content: response.answer,
          fallback: response.fallback,
          citations: response.citations,
          toolTraces: response.toolTraces
        };
        return next;
      });
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "AI assistant request failed");
      setMessages((current) => current.filter((_, index) => index < current.length - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack" data-testid="assistant-page">
      <div className="hero-strip assistant-hero">
        <div>
          <span className="eyebrow">CLAUDE HAIKU RAG</span>
          <h2>Portfolio assistant for recruiters and engineering reviewers</h2>
          <p>
            Ask architecture, job search, demo, security, or operations questions. The assistant shows model state,
            fallback mode, citations, and tool traces instead of hiding the machinery.
          </p>
        </div>
        <div className="hero-actions">
          <span className={fallback ? "badge warn" : "badge live"}>
            <Sparkles size={14} />
            {fallback ? "Fallback mode" : "Claude ready"}
          </span>
          <span className="badge">
            <BrainCircuit size={14} />
            {model}
          </span>
        </div>
      </div>

      {!hasSession && sessionReady ? (
        <div className="panel assistant-login">
          <Bot size={24} />
          <div>
            <h2>Sign in to use the AI assistant</h2>
            <p>AI endpoints are protected by Gateway JWT validation. Use any demo role to try the assistant.</p>
          </div>
          <Link className="button primary" href="/login">
            Sign in
          </Link>
        </div>
      ) : null}

      <div className="assistant-layout">
        <div className="panel chat-panel">
          <div className="chat-transcript" aria-live="polite">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`chat-message ${message.role}`}
                data-testid={message.role === "assistant" ? "assistant-message" : "user-message"}
              >
                <div className="chat-avatar">{message.role === "assistant" ? <Bot size={17} /> : "You"}</div>
                <div className="chat-bubble">
                  {message.content ? <p>{message.content}</p> : <p className="muted">Streaming answer...</p>}
                  {message.fallback ? <span className="badge warn">deterministic fallback</span> : null}
                  {message.citations?.length ? (
                    <div className="citation-list">
                      {message.citations.map((citation) => (
                        <div key={`${citation.sourcePath}-${citation.title}`} className="citation" data-testid="assistant-citation">
                          <FileText size={14} />
                          <span>
                            <strong>{citation.title}</strong>
                            <small>{citation.sourcePath}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          <form className="assistant-compose" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about architecture, jobs, demo flow, SLOs, security..."
              rows={3}
            />
            <button className="button primary" type="submit" disabled={loading || !hasSession}>
              {loading ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
              Ask
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </div>

        <aside className="panel assistant-inspector">
          <span className="eyebrow">Suggested prompts</span>
          <div className="prompt-list">
            {suggestedPrompts.map((prompt) => (
              <button key={prompt} className="prompt-chip" type="button" disabled={loading || !hasSession} onClick={() => submit(undefined, prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <div className="tool-trace-list">
            <div className="section-title">
              <TerminalSquare size={18} />
              <h2>Tool traces</h2>
            </div>
            {(latestAssistant?.toolTraces ?? []).map((trace) => (
              <div key={trace.name} className="tool-trace" data-testid="assistant-tool-trace">
                <strong>{trace.name}</strong>
                <span className={trace.status === "OK" ? "badge live" : "badge warn"}>{trace.status}</span>
                <p>{trace.summary}</p>
              </div>
            ))}
            {!latestAssistant?.toolTraces?.length ? <p className="muted">Tool traces appear after the first answer.</p> : null}
          </div>
          <div className="safety-note">
            <strong>Safety guard</strong>
            <span>Provider keys, hidden prompts, tokens, and credentials are refused before provider execution.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

async function streamChat(
  message: string,
  accessToken: string,
  conversationId: string | undefined,
  onDelta: (delta: string) => void
): Promise<AiChatResponse> {
  const response = await fetch(`${api.baseUrl}/api/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ message, conversationId })
  });
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `AI assistant failed with ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: AiChatResponse | undefined;
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const parsed = parseSseEvent(event);
      if (parsed?.type === "metadata") {
        finalResponse = parsed.payload as AiChatResponse;
      }
      if (parsed?.type === "delta" && typeof parsed.payload === "string") {
        onDelta(parsed.payload);
      }
    }
  }
  if (!finalResponse) {
    throw new Error("AI stream ended before metadata arrived");
  }
  return finalResponse;
}

function parseSseEvent(raw: string): { type: string; payload: unknown } | undefined {
  const dataLine = raw
    .split("\n")
    .find((line) => line.startsWith("data:"));
  if (!dataLine) {
    return undefined;
  }
  const event = JSON.parse(dataLine.slice(5).trim()) as { type: string; payload: unknown };
  return event;
}
