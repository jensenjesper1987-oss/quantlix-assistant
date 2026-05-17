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
      <p className="ql-chat-demo-label">Try these:</p>
      <div className="ql-chat-demo-chips">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            className="ql-chat-demo-chip"
            disabled={disabled}
            onClick={() => onSelect(prompt.text)}
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
