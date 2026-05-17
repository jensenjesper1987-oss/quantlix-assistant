import type {
  ChatMode,
  ChatPosition,
  ChatTheme,
  ProtectedChatConfig,
} from "./config";

export type ProtectedChatPropsInput = {
  deploymentId?: string;
  apiKey?: string;
  apiBase?: string;
  proxyUrl?: string;
  title?: string;
  greeting?: string;
  theme?: ChatTheme;
  position?: ChatPosition;
  mode?: ChatMode;
  lazyLoad?: boolean;
  showBranding?: boolean;
  /** Force simulated responses (Go Live preview without keys). */
  demo?: boolean;
  welcomeMessage?: string;
};

const DEFAULT_WELCOME_LIVE =
  "Hi! I'm connected through your Quantlix deployment. Ask anything — or click a prompt below to see governance in action.";

const DEFAULT_WELCOME_DEMO =
  "Hi! I'm a real AI assistant connected through Quantlix. Try asking me anything — or click a prompt below to see how Quantlix handles risky prompts.";

const DEFAULT_API_BASE = "https://api.quantlix.ai";

const PLACEHOLDER_MARKERS = [
  "YOUR_",
  "your_",
  "pk_...",
  "pk_YOUR",
  "qxl_...",
  "REPLACE",
  "CHANGEME",
  "example",
  "xxx",
] as const;

export function isPlaceholderCredential(value: string | undefined): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return true;
  }
  const upper = trimmed.toUpperCase();
  return PLACEHOLDER_MARKERS.some(
    (marker) => upper.includes(marker.toUpperCase()) || trimmed.includes("..."),
  );
}

export function shouldUseDemoMode(input: ProtectedChatPropsInput): boolean {
  if (input.demo === true) {
    return true;
  }
  if (input.demo === false) {
    return false;
  }
  if (input.proxyUrl?.trim()) {
    return false;
  }
  return (
    isPlaceholderCredential(input.apiKey) || isPlaceholderCredential(input.deploymentId)
  );
}

export function createProtectedChatConfig(
  input: ProtectedChatPropsInput = {},
): ProtectedChatConfig {
  const demo = shouldUseDemoMode(input);
  const mode = input.mode ?? "inline";

  const config: ProtectedChatConfig = {
    deploymentId: (input.deploymentId ?? (demo ? "demo-deployment" : "")).trim(),
    apiKey: (input.apiKey ?? "").trim(),
    apiBase: (input.apiBase ?? DEFAULT_API_BASE).replace(/\/$/, ""),
    proxyUrl: input.proxyUrl?.trim() || undefined,
    title: input.title?.trim() || "Quantlix Chat",
    greeting: input.greeting?.trim() || "",
    welcomeMessage:
      input.welcomeMessage?.trim() || (demo ? DEFAULT_WELCOME_DEMO : DEFAULT_WELCOME_LIVE),
    theme: input.theme ?? "dark",
    position: input.position ?? "bottom-right",
    mode,
    lazyLoad: input.lazyLoad ?? mode === "floating",
    showBranding: input.showBranding ?? true,
    demo,
  };

  if (!demo) {
    if (!config.deploymentId) {
      throw new Error("ProtectedChat: deploymentId is required");
    }
    if (!config.proxyUrl && !config.apiKey) {
      throw new Error("ProtectedChat: apiKey or proxyUrl is required");
    }
  }

  return config;
}
