import React, { useLayoutEffect, useRef, useState } from "react";
import type { ProtectedChatConfig } from "./lib/config";
import { DemoPromptChips } from "./components/DemoPromptChips";
import { ChatReplyLoader } from "./components/ChatReplyLoader";
import { ChatExchange } from "./components/ChatExchange";
import { WelcomeMessage } from "./components/WelcomeMessage";
import type { ChatTurnResult } from "./lib/chatTurnResult";
import { runProtectedChat } from "./lib/quantlixRun";
import type { HistoryTurn } from "./lib/governanceOutcome";

type MessageGroup = {
  id: string;
  user: string;
  loading?: boolean;
  result?: ChatTurnResult;
};

type ProtectedChatWidgetProps = {
  config: ProtectedChatConfig;
  onClose?: () => void;
};

function groupsToHistory(groups: MessageGroup[]): HistoryTurn[] {
  return groups.flatMap((group) => {
    const rows: HistoryTurn[] = [{ role: "user", content: group.user }];
    if (group.result?.aiResponse) {
      rows.push({ role: "assistant", content: group.result.aiResponse });
    }
    return rows;
  });
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
      <rect x="2" y="2" width="12" height="12" rx="2" fill="url(#qlchat1)" opacity="0.95" />
      <rect x="18" y="2" width="12" height="12" rx="2" fill="url(#qlchat2)" opacity="0.75" />
      <rect x="2" y="18" width="12" height="12" rx="2" fill="url(#qlchat2)" opacity="0.55" />
      <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#qlchat1)" opacity="0.85" />
      <defs>
        <linearGradient id="qlchat1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5fd6ff" />
          <stop offset="1" stopColor="#4da3ff" />
        </linearGradient>
        <linearGradient id="qlchat2" x1="30" y1="2" x2="2" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4da3ff" />
          <stop offset="1" stopColor="#2d6bfd" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ProtectedChatWidget(props: ProtectedChatWidgetProps): React.ReactElement {
  const { config, onClose } = props;
  const [question, setQuestion] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const isInline = config.mode === "inline";
  const shellClass = [
    "ql-chat-shell",
    isInline ? "ql-chat-shell--inline" : "ql-chat-shell--floating",
    `ql-chat-shell--${config.position}`,
    `ql-chat-shell--theme-${config.theme}`,
  ].join(" ");

  useLayoutEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [groups, awaitingReply]);

  const send = async (text?: string): Promise<void> => {
    if (awaitingReply) {
      return;
    }
    const trimmed = (text ?? question).trim();
    if (!trimmed) {
      return;
    }
    setQuestion("");

    const historyBefore = groupsToHistory(groups);
    const groupId = crypto.randomUUID();
    setGroups((prev) => [...prev, { id: groupId, user: trimmed, loading: true }]);
    setAwaitingReply(true);

    try {
      const result = await runProtectedChat(config, {
        question: trimmed,
        sessionId,
        history: historyBefore,
      });
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId ? { ...group, loading: false, result } : group,
        ),
      );
    } catch {
      setGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? {
                ...group,
                loading: false,
                result: {
                  latencyMs: 0,
                  status: "blocked",
                  summary: "Network error",
                  detail:
                    "Could not reach Quantlix. Check deployment, API key, and CORS settings.",
                  aiResponse: null,
                },
              }
            : group,
        ),
      );
    } finally {
      setAwaitingReply(false);
    }
  };

  return (
    <div className={shellClass}>
      <section className="ql-chat-panel" aria-label={config.title}>
        <header className="ql-chat-header">
          <div className="ql-chat-header-main">
            <div className="ql-chat-header-icon" aria-hidden>
              <QuantlixGlyph />
            </div>
            <div>
              <div className="ql-chat-title-row">
                <h2 className="ql-chat-title">{config.title}</h2>
                <span className="ql-chat-protected-badge">🛡️ Protected</span>
              </div>
              {!isInline ? (
                <p className="ql-chat-subtitle">Governed before the model sees your message</p>
              ) : null}
            </div>
          </div>
          {!isInline && onClose ? (
            <button type="button" className="ql-chat-close" aria-label="Close chat" onClick={onClose}>
              ×
            </button>
          ) : null}
        </header>

        <div className="ql-chat-body">
          <div className="ql-chat-messages">
            <WelcomeMessage text={config.welcomeMessage} />
            {groups.map((group) => (
              <div key={group.id} className="ql-chat-exchange">
                <div className="ql-chat-user-row">
                  <div className="ql-chat-user-bubble">
                    <span className="ql-chat-user-icon" aria-hidden>
                      You
                    </span>
                    {group.user}
                  </div>
                </div>
                {group.loading ? (
                  <ChatReplyLoader />
                ) : group.result ? (
                  <ChatExchange result={group.result} />
                ) : null}
              </div>
            ))}
            <div ref={scrollAnchorRef} />
          </div>
        </div>

        <footer className="ql-chat-footer">
          <DemoPromptChips disabled={awaitingReply} onSelect={(label) => void send(label)} />
          <div className="ql-chat-composer">
            <textarea
              className="ql-chat-composer-input"
              rows={1}
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
              placeholder="Type a message…"
              aria-label="Message"
            />
            <button
              type="button"
              className="ql-chat-composer-send"
              disabled={awaitingReply}
              onClick={() => void send()}
            >
              Send
            </button>
          </div>
          {config.showBranding ? (
            <p className="ql-chat-branding">
              Powered by <strong>Quantlix</strong>
            </p>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
