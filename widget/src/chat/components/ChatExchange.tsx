import React from "react";
import {
  blockedAiPlaceholder,
  statusIcon,
  statusLabel,
  type ChatTurnResult,
} from "../lib/chatTurnResult";

type ChatExchangeProps = {
  result: ChatTurnResult;
};

export function ChatExchange(props: ChatExchangeProps): React.ReactElement {
  const { result } = props;
  const showAi = result.aiResponse !== null;
  const aiText = showAi ? result.aiResponse : blockedAiPlaceholder();
  const aiMuted = !showAi;

  return (
    <div className="ql-chat-exchange-reply">
      <article className={`ql-chat-decision ql-chat-decision--${result.status}`}>
        <header className="ql-chat-decision-head">
          <span className="ql-chat-decision-icon" aria-hidden>
            {statusIcon(result.status)}
          </span>
          <span className="ql-chat-decision-status">
            {statusLabel(result.status)}
          </span>
          <span className="ql-chat-decision-latency">{result.latencyMs} ms</span>
        </header>
        <p className="ql-chat-decision-summary">{result.summary}</p>
        {result.detail ? <p className="ql-chat-decision-detail">{result.detail}</p> : null}
        {result.caught ? (
          <p className="ql-chat-decision-caught">Caught: {result.caught}</p>
        ) : null}
      </article>

      <div className={`ql-chat-ai ${aiMuted ? "ql-chat-ai--stopped" : ""}`}>
        <span className="ql-chat-ai-label">
          <span aria-hidden>🤖</span> AI
        </span>
        <p className="ql-chat-ai-text">{aiText}</p>
        {result.status === "flagged" && showAi ? (
          <span className="ql-chat-ai-flag" title="Response delivered under review">
            ⚠️ Review logged
          </span>
        ) : null}
      </div>
    </div>
  );
}
