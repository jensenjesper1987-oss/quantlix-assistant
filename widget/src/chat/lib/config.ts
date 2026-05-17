import { createProtectedChatConfig } from "./createConfig";

export type ChatTheme = "dark" | "light";
export type ChatPosition = "bottom-right" | "bottom-left";
export type ChatMode = "inline" | "floating";

export type ProtectedChatConfig = {
  deploymentId: string;
  apiKey: string;
  apiBase: string;
  proxyUrl?: string;
  title: string;
  greeting: string;
  theme: ChatTheme;
  position: ChatPosition;
  mode: ChatMode;
  lazyLoad: boolean;
  showBranding: boolean;
  /** Simulated governance when true (preview / missing credentials). */
  demo: boolean;
  /** Opening assistant message shown before the first user turn. */
  welcomeMessage: string;
  mountSelector?: string;
};

declare global {
  interface Window {
    QuantlixChatConfig?: Partial<ProtectedChatConfig> & { demo?: boolean };
  }
}

const DEFAULT_API_BASE = "https://api.quantlix.ai";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "true" || value === "1";
}

function readScriptElement(): HTMLScriptElement | null {
  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }
  return (
    document.querySelector<HTMLScriptElement>("script[data-deployment]") ??
    document.querySelector<HTMLScriptElement>('script[src*="chat/v1"]')
  );
}

function readScriptConfig(): Partial<ProtectedChatConfig> {
  const script = readScriptElement();
  if (!script) {
    return {};
  }

  const config: Partial<ProtectedChatConfig> = {};
  if (script.dataset.deployment) {
    config.deploymentId = script.dataset.deployment;
  }
  if (script.dataset.apiKey) {
    config.apiKey = script.dataset.apiKey;
  }
  if (script.dataset.apiBase) {
    config.apiBase = script.dataset.apiBase;
  }
  if (script.dataset.proxyUrl) {
    config.proxyUrl = script.dataset.proxyUrl;
  }
  if (script.dataset.backendUrl) {
    config.proxyUrl = script.dataset.backendUrl;
  }
  if (script.dataset.title) {
    config.title = script.dataset.title;
  }
  if (script.dataset.greeting) {
    config.greeting = script.dataset.greeting;
  }
  if (script.dataset.welcomeMessage) {
    config.welcomeMessage = script.dataset.welcomeMessage;
  }
  if (script.dataset.theme === "light" || script.dataset.theme === "dark") {
    config.theme = script.dataset.theme;
  }
  if (
    script.dataset.position === "bottom-right" ||
    script.dataset.position === "bottom-left"
  ) {
    config.position = script.dataset.position;
  }
  if (script.dataset.mode === "inline" || script.dataset.mode === "floating") {
    config.mode = script.dataset.mode;
  }
  const lazyLoad = parseBoolean(script.dataset.lazy);
  if (lazyLoad !== undefined) {
    config.lazyLoad = lazyLoad;
  }
  const showBranding = parseBoolean(script.dataset.showBranding);
  if (showBranding !== undefined) {
    config.showBranding = showBranding;
  }
  const demo = parseBoolean(script.dataset.demo);
  if (demo !== undefined) {
    config.demo = demo;
  }
  if (script.dataset.mount) {
    config.mountSelector = script.dataset.mount;
  }
  return config;
}

function inferDefaultMode(): ChatMode {
  if (
    document.getElementById("quantlix-chat-root") ||
    document.querySelector("[data-quantlix-chat]")
  ) {
    return "inline";
  }
  return "floating";
}

export function resolveProtectedChatConfig(): ProtectedChatConfig {
  const scriptConfig = readScriptConfig();
  const windowConfig = window.QuantlixChatConfig ?? {};
  const defaultMode = inferDefaultMode();

  return createProtectedChatConfig({
    deploymentId: scriptConfig.deploymentId ?? windowConfig.deploymentId,
    apiKey: scriptConfig.apiKey ?? windowConfig.apiKey,
    apiBase: scriptConfig.apiBase ?? windowConfig.apiBase ?? DEFAULT_API_BASE,
    proxyUrl: scriptConfig.proxyUrl ?? windowConfig.proxyUrl,
    title: scriptConfig.title ?? windowConfig.title,
    greeting: scriptConfig.greeting ?? windowConfig.greeting,
    welcomeMessage: scriptConfig.welcomeMessage ?? windowConfig.welcomeMessage,
    theme: scriptConfig.theme ?? windowConfig.theme,
    position: scriptConfig.position ?? windowConfig.position,
    mode: scriptConfig.mode ?? windowConfig.mode ?? defaultMode,
    lazyLoad: scriptConfig.lazyLoad ?? windowConfig.lazyLoad,
    showBranding: scriptConfig.showBranding ?? windowConfig.showBranding,
    demo: scriptConfig.demo ?? windowConfig.demo,
  });
}

export function resolveMountNode(config: ProtectedChatConfig): HTMLElement {
  if (config.mountSelector) {
    const selected = document.querySelector<HTMLElement>(config.mountSelector);
    if (selected) {
      return selected;
    }
  }

  const inlineRoot =
    document.getElementById("quantlix-chat-root") ??
    document.querySelector<HTMLElement>("[data-quantlix-chat]");

  if (inlineRoot) {
    return inlineRoot;
  }

  const floatingRoot = document.createElement("div");
  floatingRoot.id = "quantlix-chat-root";
  document.body.appendChild(floatingRoot);
  return floatingRoot;
}
