import React from "react";

export type Citation = { doc_id: string; anchor: string; snippet: string };

type RelatedLinksRowProps = {
  citations: Citation[];
};

export function RelatedLinksRow(props: RelatedLinksRowProps): React.ReactElement | null {
  const { citations } = props;
  if (!citations.length) {
    return null;
  }

  return (
    <div className="ql-related">
      <span className="ql-related-label">Sources</span>
      <div className="ql-related-links">
        {citations.map((citation) => (
          <a
            key={`${citation.doc_id}-${citation.anchor}`}
            className="ql-related-pill"
            href={`#${citation.anchor}`}
            title={citation.snippet}
          >
            <span className="ql-related-pill-doc">{citation.doc_id}</span>
            <span className="ql-related-pill-sep">·</span>
            <span className="ql-related-pill-anchor">{citation.anchor}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
