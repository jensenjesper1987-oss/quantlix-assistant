import React from "react";

const DEFAULT_SUGGESTIONS: readonly string[] = [
  "How do I deploy a model?",
  "Explain enforcement packs",
  "Show me a RAG setup",
  "Help me troubleshoot a workflow",
];

type SuggestionChipsProps = {
  suggestions?: readonly string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
};

export function SuggestionChips(props: SuggestionChipsProps): React.ReactElement {
  const { suggestions = DEFAULT_SUGGESTIONS, onSelect, disabled } = props;

  return (
    <div className="ql-suggestions" aria-label="Suggested questions">
      {suggestions.map((label) => (
        <button
          key={label}
          type="button"
          className="ql-suggestion-chip"
          disabled={disabled}
          onClick={() => onSelect(label)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
