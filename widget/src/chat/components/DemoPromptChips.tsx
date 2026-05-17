import React from "react";
import { DEMO_PROMPTS, type DemoPrompt } from "../lib/demoPrompts";

type DemoPromptChipsProps = {
  prompts?: readonly DemoPrompt[];
  disabled?: boolean;
  onSelect: (text: string) => void;
};

export function DemoPromptChips(props: DemoPromptChipsProps): React.ReactElement {
  const { prompts = DEMO_PROMPTS, disabled, onSelect } = props;

  return (
    <div className="ql-chat-demo" aria-label="Try these prompts">
      <p className="ql-chat-demo-label">Try these prompts ↓</p>
      <div className="ql-chat-demo-chips">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            className={`ql-chat-demo-chip ql-chat-demo-chip--${prompt.id}`}
            disabled={disabled}
            onClick={() => onSelect(prompt.text)}
          >
            <span className={`ql-chip-icon ql-chip-icon--${prompt.id}`} aria-hidden />
            <span className="ql-chip-label">{prompt.label}</span>
            <span className="ql-chip-arrow" aria-hidden>
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
