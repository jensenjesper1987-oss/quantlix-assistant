import type { ProtectedChatConfig } from "./config";

/** One-line embed snippet for Go Live / docs copy buttons. */
export function buildEmbedSnippet(config: Pick<ProtectedChatConfig, "deploymentId" | "apiKey">): string {
  const deployment = config.deploymentId;
  const apiKey = config.apiKey ? `${config.apiKey.slice(0, 12)}...` : "pk_...";
  return `<script
  src="https://cdn.quantlix.ai/chat/v1.js"
  data-deployment="${deployment}"
  data-api-key="${apiKey}"
  async></script>`;
}
