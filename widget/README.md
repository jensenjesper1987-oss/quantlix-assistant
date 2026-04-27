# Widget

The widget is an embeddable React chat surface for Quantlix Assistant, including
an Enforcement Drawer that makes policy outcomes visible to end users.

## Runtime configuration

The widget is safe to use on customer websites because it calls a public
assistant backend, not Quantlix directly. Keep `QUANTLIX_API_KEY`,
`QUANTLIX_DEPLOYMENT_ID`, and provider keys on the backend.

Embed a built widget bundle with script attributes:

```html
<script
  src="https://cdn.example.com/quantlix-assistant-widget.js"
  data-quantlix-assistant
  data-backend-url="https://assistant.example.com/chat"
  data-title="Quantlix Assistant"
  data-show-enforcement="true">
</script>
```

Or configure it before loading the script:

```html
<script>
  window.QuantlixAssistantConfig = {
    backendUrl: "https://assistant.example.com/chat",
    title: "Acme Assistant",
    showEnforcement: true
  };
</script>
```

The browser-to-backend request stays stable: `{ question, session_id, history }`.
The backend is responsible for calling Quantlix production.

## Jailbreak and security model

The widget includes a lightweight client-side precheck for obvious prompt
injection strings, and it renders model output as React text rather than raw
HTML. This prevents the widget from becoming an XSS or prompt-injection
amplifier.

Do not treat browser code as the security boundary. Attackers can bypass the
widget and call the backend directly, so jailbreak prevention must also be
enforced in Quantlix through `policies/jailbreak-prevention.json` and the
`contracts/support-bot.json` pipeline lock.

