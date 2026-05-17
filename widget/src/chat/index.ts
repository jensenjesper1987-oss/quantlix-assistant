import "./chat.css";

export { ProtectedChat } from "./ProtectedChat";
export type { ProtectedChatProps } from "./ProtectedChat";

export { ProtectedChatWidget } from "./ProtectedChatWidget";

export {
  createProtectedChatConfig,
  isPlaceholderCredential,
  shouldUseDemoMode,
} from "./lib/createConfig";
export type { ProtectedChatPropsInput } from "./lib/createConfig";

export type {
  ProtectedChatConfig,
  ChatMode,
  ChatPosition,
  ChatTheme,
} from "./lib/config";

export { buildEmbedSnippet } from "./lib/embedSnippet";
export { DEMO_PROMPTS } from "./lib/demoPrompts";
export type { DemoPrompt } from "./lib/demoPrompts";

export type { GovernanceOutcome, GovernanceStatus } from "./lib/governanceOutcome";
export { statusLabel } from "./lib/governanceOutcome";

export { runProtectedChat } from "./lib/quantlixRun";
export type { ChatRunRequest } from "./lib/quantlixRun";

export { runDemoChat } from "./lib/demoRun";
