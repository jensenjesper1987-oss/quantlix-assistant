import React from "react";

/**
 * Placeholder shown in the assistant column while the governed reply is in flight.
 */
export function AssistantReplyLoader(): React.ReactElement {
  return (
    <div
      className="ql-assistant-loading"
      role="status"
      aria-live="polite"
      aria-label="Assistant is generating a reply"
    >
      <div className="ql-assistant-loading-card">
        <header className="ql-assistant-loading-head">
          <span className="ql-assistant-loading-chip">Generating</span>
          <span className="ql-assistant-loading-sub">Governed inference</span>
        </header>
        <div className="ql-assistant-loading-body">
          <div className="ql-assistant-loading-dots" aria-hidden>
            <span className="ql-assistant-loading-dot" />
            <span className="ql-assistant-loading-dot" />
            <span className="ql-assistant-loading-dot" />
          </div>
          <p className="ql-assistant-loading-copy">Running policy checks and model…</p>
        </div>
      </div>
    </div>
  );
}
