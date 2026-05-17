import React from "react";

export function ChatReplyLoader(): React.ReactElement {
  return (
    <div className="ql-chat-loading" aria-live="polite" aria-busy="true">
      <span className="ql-chat-loading-dot" />
      <span className="ql-chat-loading-dot" />
      <span className="ql-chat-loading-dot" />
      <span className="ql-chat-loading-label">Governance check…</span>
    </div>
  );
}
