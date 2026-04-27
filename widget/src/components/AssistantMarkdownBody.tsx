import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CalloutBox } from "./CalloutBox";

type AssistantMarkdownBodyProps = {
  content: string;
  /** When true, numbered lists get step-card styling */
  emphasizeSteps?: boolean;
};

export function AssistantMarkdownBody(
  props: AssistantMarkdownBodyProps,
): React.ReactElement {
  const { content, emphasizeSteps } = props;

  return (
    <div
      className={
        emphasizeSteps
          ? "ql-md-root ql-md-root--steps"
          : "ql-md-root"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="ql-md-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="ql-md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="ql-md-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="ql-md-h4">{children}</h4>,
          p: ({ children }) => <p className="ql-md-p">{children}</p>,
          ul: ({ children }) => <ul className="ql-md-ul">{children}</ul>,
          ol: ({ children }) => (
            <ol className={emphasizeSteps ? "ql-md-ol ql-md-ol--steps" : "ql-md-ol"}>
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="ql-md-li">{children}</li>,
          blockquote: ({ children }) => (
            <CalloutBox variant="tip">{children}</CalloutBox>
          ),
          hr: () => <hr className="ql-md-hr" />,
          a: ({ href, children }) => (
            <a className="ql-md-a" href={href ?? "#"} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="ql-md-strong">{children}</strong>,
          code: ({ inline, className, children, ...rest }) => {
            if (inline) {
              return (
                <code className="ql-md-code-inline" {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code className={className ?? "ql-md-code-block"} {...rest}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="ql-md-pre">{children}</pre>,
          table: ({ children }) => (
            <div className="ql-md-table-wrap">
              <table className="ql-md-table">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
