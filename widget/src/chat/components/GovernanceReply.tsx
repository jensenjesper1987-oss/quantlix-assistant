import React from "react";
import {
  statusLabel,
  type GovernanceOutcome,
  type GovernanceStatus,
} from "../lib/governanceOutcome";

type GovernanceReplyProps = {
  outcome: GovernanceOutcome;
};

function statusIcon(status: GovernanceStatus): string {
  switch (status) {
    case "allowed":
      return "✓";
    case "blocked":
      return "🛡️";
    case "budget_capped":
      return "💸";
    case "flagged":
      return "⚑";
  }
}

export function GovernanceReply(props: GovernanceReplyProps): React.ReactElement {
  const { outcome } = props;
  const status = outcome.status;

  if (status === "allowed") {
    return (
      <article className={`ql-gov-reply ql-gov-reply--${status}`}>
        <header className="ql-gov-reply-head">
          <span className="ql-gov-reply-icon" aria-hidden>
            {statusIcon(status)}
          </span>
          <span className="ql-gov-reply-status">{statusLabel(status)}</span>
        </header>
        <p className="ql-gov-reply-text">{outcome.text}</p>
      </article>
    );
  }

  if (status === "flagged") {
    return (
      <article className={`ql-gov-reply ql-gov-reply--${status}`}>
        <header className="ql-gov-reply-head">
          <span className="ql-gov-reply-icon" aria-hidden>
            {statusIcon(status)}
          </span>
          <span className="ql-gov-reply-status">{statusLabel(status)}</span>
        </header>
        <p className="ql-gov-reply-text">{outcome.text}</p>
        <p className="ql-gov-reply-note">{outcome.note}</p>
      </article>
    );
  }

  if (status === "budget_capped") {
    return (
      <article className={`ql-gov-reply ql-gov-reply--${status}`}>
        <header className="ql-gov-reply-head">
          <span className="ql-gov-reply-icon" aria-hidden>
            {statusIcon(status)}
          </span>
          <span className="ql-gov-reply-status">{statusLabel(status)}</span>
        </header>
        <p className="ql-gov-reply-text">{outcome.detail}</p>
      </article>
    );
  }

  return (
    <article className={`ql-gov-reply ql-gov-reply--${status}`}>
      <header className="ql-gov-reply-head">
        <span className="ql-gov-reply-icon" aria-hidden>
          {statusIcon(status)}
        </span>
        <span className="ql-gov-reply-status">{statusLabel(status)}</span>
      </header>
      <p className="ql-gov-reply-headline">{outcome.headline}</p>
      {outcome.detail ? <p className="ql-gov-reply-text">{outcome.detail}</p> : null}
      {outcome.caught ? (
        <p className="ql-gov-reply-caught">(Caught: {outcome.caught})</p>
      ) : null}
    </article>
  );
}
