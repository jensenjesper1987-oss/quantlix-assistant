import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AssistantReplyLoader } from "./components/AssistantReplyLoader";
import { AssistantResponseCard } from "./components/AssistantResponseCard";
import { EnforcementInsight, type EnforcementEvent } from "./components/EnforcementInsight";
import { SuggestionChips } from "./components/SuggestionChips";
import type { Citation } from "./components/RelatedLinksRow";
import { inferResponseIntent } from "./lib/responseIntent";
import "./styles.css";

type AssistantResponse = {
  answer: string;
  citations: Citation[];
  confidence: number;
  out_of_scope: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  confidence?: number;
  outOfScope?: boolean;
};

type WidgetConfig = {
  backendUrl: string;
  title: string;
  showEnforcement: boolean;
};

declare global {
  interface Window {
    QuantlixAssistantConfig?: Partial<WidgetConfig>;
  }
}

const DEFAULT_CONFIG: WidgetConfig = {
  backendUrl: "http://localhost:8001/chat",
  title: "Quantlix Assistant",
  showEnforcement: true,
};

const JAILBREAK_PATTERNS: RegExp[] = [
  /\bignore (all )?(previous|prior|above) (instructions|rules|messages)\b/i,
  /\byou are now\b/i,
  /\bsystem\s*:/i,
  /\bdeveloper\s*:/i,
  /\bassistant\s*:/i,
  /\bact as (the )?(system|developer|admin)\b/i,
  /\breveal (the )?(system prompt|hidden instructions|developer message)\b/i,
];

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "true" || value === "1";
}

function readScriptConfig(): Partial<WidgetConfig> {
  const script =
    document.currentScript instanceof HTMLScriptElement
      ? document.currentScript
      : document.querySelector<HTMLScriptElement>("script[data-quantlix-assistant]");

  if (!script) {
    return {};
  }

  const config: Partial<WidgetConfig> = {};
  if (script.dataset.backendUrl) {
    config.backendUrl = script.dataset.backendUrl;
  }
  if (script.dataset.title) {
    config.title = script.dataset.title;
  }
  const showEnforcement = parseBoolean(script.dataset.showEnforcement);
  if (showEnforcement !== undefined) {
    config.showEnforcement = showEnforcement;
  }
  return config;
}

function resolveConfig(): WidgetConfig {
  const scriptConfig = readScriptConfig();
  const windowConfig = window.QuantlixAssistantConfig ?? {};

  return {
    ...DEFAULT_CONFIG,
    ...scriptConfig,
    ...windowConfig,
  };
}

function looksLikeJailbreak(text: string): boolean {
  return JAILBREAK_PATTERNS.some((pattern) => pattern.test(text));
}

function isCitation(value: unknown): value is Citation {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.doc_id === "string" &&
    typeof row.anchor === "string" &&
    typeof row.snippet === "string"
  );
}

function normalizeAssistantResponse(data: AssistantResponse): AssistantResponse {
  const raw = data.answer.trim();
  if (!raw.startsWith("{")) {
    return data;
  }
  try {
    const inner = JSON.parse(raw) as Record<string, unknown>;
    if (typeof inner.answer !== "string") {
      return data;
    }
    const citations = Array.isArray(inner.citations)
      ? inner.citations.filter(isCitation)
      : data.citations;
    return {
      answer: inner.answer,
      citations,
      confidence: typeof inner.confidence === "number" ? inner.confidence : data.confidence,
      out_of_scope:
        typeof inner.out_of_scope === "boolean" ? inner.out_of_scope : data.out_of_scope,
    };
  } catch {
    return data;
  }
}

function QuantlixGlyph(): React.ReactElement {
  return (
    <svg
      className="ql-brand-glyph"
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="12" height="12" rx="2" fill="url(#qlg1)" opacity="0.95" />
      <rect x="18" y="2" width="12" height="12" rx="2" fill="url(#qlg2)" opacity="0.75" />
      <rect x="2" y="18" width="12" height="12" rx="2" fill="url(#qlg2)" opacity="0.55" />
      <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#qlg1)" opacity="0.85" />
      <defs>
        <linearGradient id="qlg1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5fd6ff" />
          <stop offset="1" stopColor="#4da3ff" />
        </linearGradient>
        <linearGradient id="qlg2" x1="30" y1="2" x2="2" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4da3ff" />
          <stop offset="1" stopColor="#2d6bfd" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type PanelTab = "chat" | "governance";

function ChatWidget({ config }: { config: WidgetConfig }): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("chat");
  const [question, setQuestion] = useState<string>("");
  const [sessionId] = useState<string>(crypto.randomUUID());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<EnforcementEvent[]>([]);
  const [awaitingReply, setAwaitingReply] = useState<boolean>(false);
  const replyAnchorRef = useRef<HTMLDivElement | null>(null);
  const lastAssistantReplyRef = useRef<HTMLDivElement | null>(null);

  const history = useMemo(
    () => messages.map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  const governanceIssueCount = useMemo(
    () => events.filter((event) => event.outcome === "BLOCK").length,
    [events],
  );

  useLayoutEffect(() => {
    if (!awaitingReply) {
      return;
    }
    replyAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [awaitingReply]);

  useLayoutEffect(() => {
    if (awaitingReply) {
      return;
    }
    const last = messages[messages.length - 1];
    if (last?.role !== "assistant") {
      return;
    }
    lastAssistantReplyRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, awaitingReply]);

  const send = async (text?: string): Promise<void> => {
    if (awaitingReply) {
      return;
    }
    const trimmed = (text ?? question).trim();
    if (!trimmed) {
      return;
    }
    setQuestion("");
    setPanelTab("chat");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    const start = performance.now();
    if (looksLikeJailbreak(trimmed)) {
      const blockedEvent: EnforcementEvent = {
        id: crypto.randomUUID(),
        outcome: "BLOCK",
        policy: "client jailbreak precheck",
        latencyMs: Math.round(performance.now() - start),
        reason: "Prompt injection pattern detected before sending",
      };
      setEvents((prev) => [blockedEvent, ...prev].slice(0, 10));
      setPanelTab("governance");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Request blocked by governance policy.",
          citations: [],
          confidence: 0,
          outOfScope: false,
        },
      ]);
      return;
    }

    setAwaitingReply(true);
    try {
      const response = await fetch(config.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, session_id: sessionId, history }),
      });
      if (!response.ok) {
        const elapsed = Math.round(performance.now() - start);
        const blockedEvent: EnforcementEvent = {
          id: crypto.randomUUID(),
          outcome: "BLOCK",
          policy: "gateway policy",
          latencyMs: elapsed,
          reason: "Request blocked before model execution",
        };
        setEvents((prev) => [blockedEvent, ...prev].slice(0, 10));
        setPanelTab("governance");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Request blocked by governance policy.",
            citations: [],
            confidence: 0,
            outOfScope: false,
          },
        ]);
        return;
      }

      const data = normalizeAssistantResponse((await response.json()) as AssistantResponse);
      const elapsed = Math.round(performance.now() - start);
      const passEvent: EnforcementEvent = {
        id: crypto.randomUUID(),
        outcome: "PASS",
        policy: "scope + jailbreak + PII + budget + rate-limit",
        latencyMs: elapsed,
      };
      setEvents((prev) => [passEvent, ...prev].slice(0, 10));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations,
          confidence: data.confidence,
          outOfScope: data.out_of_scope,
        },
      ]);
    } catch (_error: unknown) {
      const elapsed = Math.round(performance.now() - start);
      const blockedEvent: EnforcementEvent = {
        id: crypto.randomUUID(),
        outcome: "BLOCK",
        policy: "network",
        latencyMs: elapsed,
        reason: "Backend unavailable",
      };
      setEvents((prev) => [blockedEvent, ...prev].slice(0, 10));
      setPanelTab("governance");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Backend is unavailable. Verify local services are running.",
          citations: [],
          confidence: 0,
          outOfScope: false,
        },
      ]);
    } finally {
      setAwaitingReply(false);
    }
  };

  return (
    <div className="ql-widget-shell">
      {!open ? (
        <button type="button" className="ql-launcher" onClick={() => setOpen(true)}>
          <QuantlixGlyph />
          <span className="ql-launcher-label">{config.title}</span>
        </button>
      ) : (
        <div className="ql-panel">
          <header className="ql-panel-header">
            <div className="ql-panel-header-main">
              <div className="ql-panel-avatar" aria-hidden>
                <QuantlixGlyph />
              </div>
              <div className="ql-panel-titles">
                <div className="ql-panel-title-row">
                  <h1 className="ql-panel-title">{config.title}</h1>
                  <span className="ql-panel-badge">Quantlix</span>
                </div>
                <p className="ql-panel-subtitle">
                  Runtime governance · same enforcement path as production
                </p>
              </div>
            </div>
            <button
              type="button"
              className="ql-panel-close"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
            >
              <span aria-hidden>×</span>
            </button>
          </header>

          {config.showEnforcement ? (
            <nav className="ql-tabs" aria-label="Assistant views">
              <button
                type="button"
                className={`ql-tab ${panelTab === "chat" ? "ql-tab--active" : ""}`}
                onClick={() => setPanelTab("chat")}
              >
                Chat
              </button>
              <button
                type="button"
                className={`ql-tab ${panelTab === "governance" ? "ql-tab--active" : ""}`}
                onClick={() => setPanelTab("governance")}
              >
                Governance
                {governanceIssueCount > 0 ? (
                  <span className="ql-tab-count">{governanceIssueCount}</span>
                ) : null}
              </button>
            </nav>
          ) : null}

          <div className="ql-panel-body">
            {panelTab === "chat" || !config.showEnforcement ? (
              <div className="ql-chat-scroll">
                {messages.length === 0 ? (
                  <div className="ql-empty-state">
                    <p className="ql-empty-title">Ask anything about Quantlix</p>
                    <p className="ql-empty-copy">
                      Deployments, contracts, enforcement, RAG patterns, and API behavior —
                      answers are governed before they reach the model.
                    </p>
                  </div>
                ) : null}
                <div className="ql-message-list">
                  {messages.map((message, index) => {
                    const isLast = index === messages.length - 1;
                    const attachAssistantScrollRef =
                      isLast && message.role === "assistant" ? lastAssistantReplyRef : undefined;
                    return message.role === "user" ? (
                      <div key={`user-${index}`} className="ql-msg-user-row">
                        <div className="ql-msg-user">{message.content}</div>
                      </div>
                    ) : (
                      <div
                        key={`asst-${index}`}
                        ref={attachAssistantScrollRef}
                        className="ql-msg-assistant-row"
                      >
                        <AssistantResponseCard
                          content={message.content}
                          citations={message.citations ?? []}
                          intent={inferResponseIntent(message.content)}
                          confidence={message.confidence ?? 0}
                          outOfScope={message.outOfScope ?? false}
                        />
                      </div>
                    );
                  })}
                  {awaitingReply ? (
                    <div ref={replyAnchorRef} className="ql-msg-assistant-row">
                      <AssistantReplyLoader />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="ql-gov-scroll">
                <p className="ql-gov-intro">
                  Recent gateway checks for this session. Blocks include policy id and reason
                  where available.
                </p>
                <EnforcementInsight events={events} />
              </div>
            )}
          </div>

          {panelTab === "chat" || !config.showEnforcement ? (
            <footer className="ql-panel-footer">
              <SuggestionChips
                disabled={awaitingReply}
                onSelect={(label) => void send(label)}
              />
              <div className="ql-composer">
                <textarea
                  className="ql-composer-input"
                  rows={2}
                  value={question}
                  disabled={awaitingReply}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (!awaitingReply) {
                        void send();
                      }
                    }
                  }}
                  placeholder="Ask about deployments, policies, RAG, or troubleshooting…"
                  aria-label="Message"
                />
                <button
                  type="button"
                  className="ql-composer-send"
                  disabled={awaitingReply}
                  onClick={() => void send()}
                >
                  <span className="ql-composer-send-icon" aria-hidden>
                    ↗
                  </span>
                  <span>Send</span>
                </button>
              </div>
              {config.showEnforcement && governanceIssueCount > 0 ? (
                <button
                  type="button"
                  className="ql-footer-link"
                  onClick={() => setPanelTab("governance")}
                >
                  Review governance alerts →
                </button>
              ) : null}
            </footer>
          ) : null}
        </div>
      )}
    </div>
  );
}

const config = resolveConfig();
const mountNode =
  document.getElementById("quantlix-assistant-root") ?? document.createElement("div");

if (!mountNode.id) {
  mountNode.id = "quantlix-assistant-root";
  document.body.appendChild(mountNode);
}

createRoot(mountNode).render(<ChatWidget config={config} />);
