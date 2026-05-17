import React, { useMemo } from "react";
import { ProtectedChatWidget } from "./ProtectedChatWidget";
import {
  createProtectedChatConfig,
  type ProtectedChatPropsInput,
} from "./lib/createConfig";

export type ProtectedChatProps = ProtectedChatPropsInput & {
  onClose?: () => void;
  className?: string;
};

/**
 * React embed for the Go Live page and portal apps.
 *
 * @example
 * ```tsx
 * import { ProtectedChat } from "quantlix-assistant-widget/chat";
 * import "quantlix-assistant-widget/chat.css";
 *
 * <ProtectedChat
 *   deploymentId={deployment.id}
 *   apiKey={publishableKey}
 *   mode="inline"
 * />
 * ```
 *
 * Omit keys or pass `demo` to preview governance without a live deployment.
 */
export function ProtectedChat(props: ProtectedChatProps): React.ReactElement {
  const { className, onClose, ...input } = props;

  const config = useMemo(
    () =>
      createProtectedChatConfig({
        mode: "inline",
        ...input,
      }),
    [
      input.deploymentId,
      input.apiKey,
      input.apiBase,
      input.proxyUrl,
      input.title,
      input.greeting,
      input.theme,
      input.position,
      input.mode,
      input.lazyLoad,
      input.showBranding,
      input.demo,
    ],
  );

  const shell = className ? `ql-chat-react-host ${className}` : "ql-chat-react-host";

  return (
    <div className={shell}>
      <ProtectedChatWidget config={config} onClose={onClose} />
    </div>
  );
}
