import React from "react";

/**
 * Structured step for guide layouts. Use alongside ordered lists in markdown,
 * or when rendering JSON step arrays from the API in the future.
 */
type StepCardProps = {
  step: number;
  title?: string;
  children: React.ReactNode;
};

export function StepCard(props: StepCardProps): React.ReactElement {
  const { step, title, children } = props;

  return (
    <div className="ql-step-card">
      <div className="ql-step-card-index" aria-hidden>
        {step}
      </div>
      <div className="ql-step-card-main">
        {title ? <h4 className="ql-step-card-title">{title}</h4> : null}
        <div className="ql-step-card-body">{children}</div>
      </div>
    </div>
  );
}
