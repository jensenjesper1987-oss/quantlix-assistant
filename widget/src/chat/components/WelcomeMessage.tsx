import React from "react";

type WelcomeMessageProps = {
  text: string;
};

export function WelcomeMessage(props: WelcomeMessageProps): React.ReactElement {
  const { text } = props;

  return (
    <div className="ql-chat-welcome">
      <div className="ql-chat-ai ql-chat-ai--welcome">
        <span className="ql-chat-ai-label">
          <span aria-hidden>🤖</span> AI
        </span>
        <p className="ql-chat-ai-text">{text}</p>
      </div>
    </div>
  );
}
