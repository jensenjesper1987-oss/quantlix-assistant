import React from "react";

type CalloutVariant = "tip" | "warning";

type CalloutBoxProps = {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
};

export function CalloutBox(props: CalloutBoxProps): React.ReactElement {
  const { variant = "tip", title, children } = props;

  return (
    <aside className={`ql-callout ql-callout--${variant}`} role="note">
      {title ? <div className="ql-callout-title">{title}</div> : null}
      <div className="ql-callout-body">{children}</div>
    </aside>
  );
}
