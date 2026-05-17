# Widget

Two embeddable bundles ship from this package:

| Bundle | Output | Use case |
|--------|--------|----------|
| **Protected Chat** | `dist/chat/v1.js` | Go Live “Try it live”, 1-line embed on any site |
| **Quantlix Assistant** | `dist/quantlix-assistant.js` | Governed support bot (RAG + docs) |

## Protected Chat (Go Live / embed)

Browser calls your Quantlix deployment `POST /run` with a **publishable** key (`pk_…`) scoped to that deployment. For stricter setups, point `data-proxy-url` at your backend instead.

### Inline (Go Live page)

```html
<div id="quantlix-chat-root"></div>
<script
  src="https://cdn.quantlix.ai/chat/v1.js"
  data-deployment="YOUR_DEPLOYMENT_ID"
  data-api-key="pk_YOUR_PUBLISHABLE_KEY"
  data-mode="inline"
  data-lazy="false"
  async></script>
```

### 1-line floating embed

```html
<script
  src="https://cdn.quantlix.ai/chat/v1.js"
  data-deployment="YOUR_DEPLOYMENT_ID"
  data-api-key="pk_YOUR_PUBLISHABLE_KEY"
  async></script>
```

Defaults: floating launcher, bottom-right, lazy-load until click, “Powered by Quantlix” branding.

### Options

| Attribute | Description |
|-----------|-------------|
| `data-deployment` | Required deployment id |
| `data-api-key` | Publishable key (`pk_…`) for direct `/run` |
| `data-proxy-url` | Optional HTTPS proxy instead of direct `/run` |
| `data-api-base` | Quantlix API origin (default `https://api.quantlix.ai`) |
| `data-mode` | `inline` or `floating` |
| `data-theme` | `dark` or `light` |
| `data-position` | `bottom-right` or `bottom-left` (floating) |
| `data-greeting` | Empty-state copy |
| `data-title` | Header title |
| `data-lazy` | `true` — show launcher first (floating) |
| `data-show-branding` | `true` — “Powered by Quantlix” |
| `data-mount` | CSS selector for inline mount |

Or set `window.QuantlixChatConfig` before the script.

### Demo mode (no API keys)

If `deploymentId` / `apiKey` are missing or still placeholders (`YOUR_…`, `pk_...`), the widget
automatically runs in **demo mode** with simulated Blocked / Budget capped / Flagged / Allowed
outcomes. Force with `demo={true}` or `data-demo="true"`.

### React component (portal / Go Live page)

```tsx
import { ProtectedChat, buildEmbedSnippet } from "quantlix-assistant-widget/chat";
import "quantlix-assistant-widget/chat.css";

export function GoLiveTryIt({ deploymentId, publishableKey }: Props) {
  return (
    <ProtectedChat
      deploymentId={deploymentId}
      apiKey={publishableKey}
      mode="inline"
      showBranding
    />
  );
}

// Preview before keys exist:
<ProtectedChat demo mode="inline" />
```

Build the library bundle: `npm run build:lib` → `dist/lib/quantlix-chat.js`.

### Local dev

```bash
npm run dev:chat      # inline embed demo → chat.html (demo mode by default)
npm run dev:assistant # assistant widget → index.html
```

## Quantlix Assistant

The assistant widget calls **your** backend (`POST /chat`), not Quantlix directly. See existing embed attributes (`data-quantlix-assistant`, `data-backend-url`, …) in `embed.html` and `docs/CUSTOMIZE.md`.

## Build

```bash
npm ci && npm run build
```

Upload `dist/chat/v1.js` (+ hashed CSS under `dist/chat/`) and `dist/quantlix-assistant.js` to your CDN.
