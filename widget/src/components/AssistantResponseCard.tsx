import React from "react";
import { AssistantMarkdownBody } from "./AssistantMarkdownBody";
import { RelatedLinksRow } from "./RelatedLinksRow";
import type { Citation } from "./RelatedLinksRow";
import { type ResponseIntent, intentLabel } from "../lib/responseIntent";

export type { Citation };

type AssistantResponseCardProps = {
  content: string;
  citations: Citation[];
  intent: ResponseIntent;
  confidence: number;
  outOfScope: boolean;
};

export function AssistantResponseCard(
  props: AssistantResponseCardProps,
): React.ReactElement {
  const { content, citations, intent, confidence, outOfScope } = props;
  const emphasizeSteps = intent === "guide" || intent === "how-to";

  return (
    <article className={`ql-assistant-card ql-assistant-card--${intent}`}>
      <header className="ql-assistant-card-head">
        <span className="ql-intent-chip" data-intent={intent}>
          {intentLabel(intent)}
        </span>
        {outOfScope ? (
          <span className="ql-scope-pill" data-variant="out">
            Out of product scope
          </span>
        ) : null}
      </header>

      <div className="ql-assistant-card-body">
        <AssistantMarkdownBody content={content} emphasizeSteps={emphasizeSteps} />
      </div>

      <footer className="ql-assistant-card-foot">
        <RelatedLinksRow citations={citations} />
        <div className="ql-assistant-card-meta">
          <span className="ql-meta-hint">
            Continue this thread for follow-ups — context is preserved per session.
          </span>
          {confidence > 0 ? (
            <span className="ql-meta-confidence" title="Model-reported confidence">
              Confidence {(confidence * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="ql-meta-confidence ql-meta-confidence--muted">Not scored</span>
          )}
        </div>
      </footer>
    </article>
  );
}
