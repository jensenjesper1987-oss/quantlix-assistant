# Customize

## Swap documentation source

Run `python backend/scripts/index_docs.py /path/to/your/docs` against a directory containing indexable source files. Supported extensions: `.md`, `.mdx`, `.txt`, `.rst`, `.tsx`. The indexer chunks by heading when present and refreshes retrieval data in pgvector.

## Tune policy thresholds safely

Adjust policy values in `policies/*.json` and redeploy the same `contracts/support-bot.json` without changing backend code. This keeps governance changes declarative and auditable.

## Change model provider

Use your Quantlix deployment configuration to route to Anthropic, OpenAI, or your self-hosted provider. The backend keeps the same request/response schema.

## Style the widget

Update `widget/src/styles.css` to match your host brand while preserving visibility for enforcement outcomes.

## Point the widget at production

The widget should call your own assistant backend, not Quantlix directly. Set the
runtime backend URL when embedding the script:

```html
<script
  src="https://cdn.example.com/quantlix-assistant-widget.js"
  data-quantlix-assistant
  data-backend-url="https://assistant.example.com/chat"
  data-title="Acme Assistant"
  data-show-enforcement="true">
</script>
```

Your backend keeps `QUANTLIX_API_KEY`, `QUANTLIX_DEPLOYMENT_ID`, provider keys,
and policy configuration private while forwarding governed requests through
Quantlix.

## Disable governance tab

If you do not want the **Governance** tab (runtime check history) in the widget, set
`data-show-enforcement="false"` or configure
`window.QuantlixAssistantConfig.showEnforcement = false`. Backend governance
still runs unchanged.

