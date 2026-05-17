import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ProtectedChatWidget } from "./ProtectedChatWidget";
import { resolveMountNode, resolveProtectedChatConfig } from "./lib/config";
import { buildEmbedSnippet } from "./lib/embedSnippet";
import "../styles.css";
import "./chat.css";

type LauncherProps = {
  title: string;
  onOpen: () => void;
};

function QuantlixGlyph(): React.ReactElement {
  return (
    <svg
      className="ql-brand-glyph"
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="2" y="2" width="12" height="12" rx="2" fill="url(#qlchatL1)" opacity="0.95" />
      <rect x="18" y="2" width="12" height="12" rx="2" fill="url(#qlchatL2)" opacity="0.75" />
      <rect x="2" y="18" width="12" height="12" rx="2" fill="url(#qlchatL2)" opacity="0.55" />
      <rect x="18" y="18" width="12" height="12" rx="2" fill="url(#qlchatL1)" opacity="0.85" />
      <defs>
        <linearGradient id="qlchatL1" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5fd6ff" />
          <stop offset="1" stopColor="#4da3ff" />
        </linearGradient>
        <linearGradient id="qlchatL2" x1="30" y1="2" x2="2" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4da3ff" />
          <stop offset="1" stopColor="#2d6bfd" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ChatLauncher(props: LauncherProps): React.ReactElement {
  const { title, onOpen } = props;
  return (
    <button type="button" className="ql-chat-launcher" onClick={onOpen}>
      <QuantlixGlyph />
      <span>{title}</span>
    </button>
  );
}

function FloatingChatHost(): React.ReactElement {
  const config = resolveProtectedChatConfig();
  const [open, setOpen] = useState(!config.lazyLoad);

  if (!open) {
    return <ChatLauncher title={config.title} onOpen={() => setOpen(true)} />;
  }

  return <ProtectedChatWidget config={config} onClose={() => setOpen(false)} />;
}

let mountedRoot: Root | null = null;

function mountWidget(): void {
  const config = resolveProtectedChatConfig();
  const mountNode = resolveMountNode(config);

  if (!mountedRoot) {
    mountedRoot = createRoot(mountNode);
  }

  if (config.mode === "inline") {
    mountedRoot.render(<ProtectedChatWidget config={config} />);
    return;
  }

  mountedRoot.render(<FloatingChatHost />);
}

import { createProtectedChatConfig } from "./lib/createConfig";

declare global {
  interface Window {
    QuantlixChat?: {
      buildEmbedSnippet: typeof buildEmbedSnippet;
      createProtectedChatConfig: typeof createProtectedChatConfig;
    };
  }
}

window.QuantlixChat = { buildEmbedSnippet, createProtectedChatConfig };

try {
  mountWidget();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Quantlix Chat failed to load";
  console.error(message);
}
