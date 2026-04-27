# Deploy

## Managed Quantlix (5 min)

1. Create a new Quantlix deployment in the dashboard.
2. Upload `contracts/support-bot.json` and attach the policy files from `policies/`.
3. Bind **provider-backed inference** so `POST /run` returns inline `output.generated`
   (this assistant expects a synchronous answer in the gateway response, not a queued
   self-hosted job):
   - Create a provider (`POST /providers`) for your org.
   - Store credentials (`POST /providers/{provider_id}/credentials`).
   - Sync provider models (`POST /providers/{provider_id}/models/sync`), then pick a
     chat-capable model id from `GET /providers/{provider_id}/models`.
   - Bind the deployment: `POST /providers/inference-targets` with
     `{ "deployment_id": "...", "target_type": "provider_model", "provider_model_id": "..." }`.
   - Confirm `GET /deployments/{deployment_id}` includes a non-null `inference_target`
     pointing at your provider model.
4. Copy your gateway API key and deployment id into `.env`.
5. Deploy the backend and widget.
6. Verify `POST /chat` requests return enforced responses and include gateway request ids.

## Self-hosted Quantlix (20 min)

1. Deploy Quantlix in your environment.
2. Set `QUANTLIX_API_BASE` to your internal gateway URL.
3. Apply the same contract and policy set.
4. Deploy backend and widget in your VPC.
5. Validate enforcement events in your dashboard traces.

For self-hosting details, see the main Quantlix self-host guide:
[https://github.com/quantlix/cloud](https://github.com/quantlix/cloud).

## Widget on the live Quantlix site (or any production origin)

The widget **never** calls Quantlix from the browser with your API key. It only
calls **your** assistant `POST /chat` over HTTPS; the backend holds secrets and
calls `POST {QUANTLIX_API_BASE}/run`.

1. **Deploy the backend** (FastAPI) to a stable HTTPS URL, for example
   `https://assistant.quantlix.ai/chat`. Set `QUANTLIX_API_BASE`, `QUANTLIX_API_KEY`,
   `QUANTLIX_DEPLOYMENT_ID`, database, Redis, and indexing as in `.env.example`.
2. **CORS**: set `WIDGET_PUBLIC_ORIGIN` to include every origin that will load the
   widget (comma-separated), e.g. `https://quantlix.ai,https://www.quantlix.ai`.
3. **Build the widget**: from `widget/`, run `npm ci && npm run build`. Upload the
   full **`widget/dist/`** folder to your static host or CDN (keep `index.html`,
   **`quantlix-assistant.js`**, and the hashed **`.css`** file in the same path the
   HTML expects—usually the CDN root—or mirror the paths from `dist/index.html`).
   If you embed **only** the script tag, ensure the **`.css`** asset is reachable at
   the relative URL your built JS requests (same directory is simplest).
4. **Embed in the Quantlix app** (portal layout or marketing site): add a module
   script that loads the bundle and points at your backend:

```html
<script
  type="module"
  src="https://cdn.example.com/quantlix-assistant.js"
  data-quantlix-assistant
  data-backend-url="https://assistant.quantlix.ai/chat"
  data-title="Quantlix Assistant"
  data-show-enforcement="true"></script>
```

Alternatively set `window.QuantlixAssistantConfig = { backendUrl: "...", ... }`
before the script. See `docs/CUSTOMIZE.md`.

5. **Quantlix deployment** (same as above): contract, policies, provider-backed
   inference so `/run` returns inline answers.

If the portal and assistant are on **different** domains, the browser enforces
CORS on `/chat`; keep `WIDGET_PUBLIC_ORIGIN` aligned with the portal origin.

## Kubernetes (production cluster)

See the repository **README → Production (Kubernetes)** for the container image,
`infra/kubernetes/` kustomize layout, `scripts/deploy-prod.sh`, Secrets, and
ingress/TLS alignment with the main Quantlix cluster.

For **all-in-Hetzner** deployments, the base manifests include an in-cluster
pgvector PostgreSQL (`pgvector/pgvector:pg16`) StatefulSet with persistent
volume and init SQL (`CREATE EXTENSION vector`). See:
`infra/kubernetes/base/postgres/` and `README → Production (Kubernetes)`.

After first deploy (or any new DB), run the indexer job to create/populate
`doc_chunks`:

```bash
kubectl create job -n quantlix \
  --from=cronjob/quantlix-assistant-indexer \
  quantlix-assistant-indexer-manual-$(date +%s)
```

