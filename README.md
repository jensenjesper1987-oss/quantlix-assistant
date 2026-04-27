# Quantlix Assistant — a governed support chatbot, including the source it's governed by.

This repository contains the complete implementation and governance config.

## What this is

Quantlix Assistant is the public support chatbot used to answer product, API,
deployment, and governance questions about Quantlix. The full source code,
contract, and policy pack are open so teams can inspect exactly what is
enforced in production. Every inference call goes through Quantlix runtime
enforcement before it reaches a model provider. You can fork this repository
and deploy your own governed assistant in under an hour.

## Why it exists

Quantlix dogfoods its own runtime control plane in public. The same gateway that
protects customer traffic protects this assistant, and enforcement outcomes are
visible so governance is not a black box.

This repository is also the reference template for a production-grade governed
RAG chatbot: schema contracts, policy enforcement, budget caps, rate limits,
and an auditable decision trail. Prospects can fork it and adapt it directly to
their own documentation corpus.

## Architecture

The chatbot follows a simple request path with explicit enforcement boundaries;
see `architecture.html` for the full visual.

```text
+------------------+      +------------------+      +------------------------+      +-------------------------+
| Browser Widget   | ---> | Bot Backend      | ---> | Quantlix Gateway       | ---> | LLM Provider            |
| (React/Tailwind) |      | (FastAPI + RAG)  |      | (policy + schema gate) |      | (Claude/OpenAI/vLLM)    |
+------------------+      +------------------+      +------------------------+      +-------------------------+
         ^                           |                          |
         |                           v                          v
         |                    +-------------+            +------------------+
         +--------------------| pgvector DB |            | Signed Audit Log |
                              +-------------+            +------------------+
```

## Governance in action

Policy behavior is defined in `policies/POLICIES.md` and enforced at the
Quantlix gateway:

- Scope enforcement: blocks questions outside Quantlix topics.
- Jailbreak prevention: blocks prompt injection and role-swap attempts.
- PII redaction: redacts sensitive data in input and output paths.
- Budget per session: caps message and token usage per `session_id`.
- Rate limit per IP: enforces hourly and daily limits with `429` responses.

## Quick start

1. Clone this repo, run `cp .env.example .env`, then set your Quantlix API key and
   deployment id. For the chat UX, bind **provider-backed inference** so Quantlix
   `POST /run` returns inline `output.generated` (see `docs/DEPLOY.md`).
2. Run `docker compose up -d` to start Postgres, Redis, backend, and widget.
3. Index your docs with
   `python backend/scripts/index_docs.py path/to/docs`, then visit
   `http://localhost:3030`.

## Customize

See `docs/CUSTOMIZE.md`. You can point ingestion to any markdown folder,
adjust policy thresholds, and swap the backing provider without changing the UI
contract.

## Deploy

See `docs/DEPLOY.md`. You can deploy with managed Quantlix for fastest setup, or
self-host Quantlix inside your own VPC.

## Production (Kubernetes)

This repo follows the same **build → registry → kustomize apply → rollout** pattern
as the main Quantlix `cloud` monorepo: root **`Dockerfile`**, **`infra/kubernetes/`**
(kustomize base + `overlays/prod`), and **`scripts/deploy-prod.sh`**.

### Image and port

- **Build context:** repository root; **`Dockerfile`** copies `backend/` and runs
  **`uvicorn app.main:app`** as a non-root user (`uid 10001`).
- **Listen port:** **`8000`** (env **`PORT`**, default `8000`). **`EXPOSE 8000`**.
  Probes: **`GET /health`** (liveness), **`GET /health/ready`** (Postgres `SELECT 1`).

### Registry and deploy script

1. Point Docker at your registry (`docker login …`).
2. Set **`REGISTRY`** and optionally **`IMAGE_NAME`** (defaults: `docker.io/quantlix`,
   `quantlix-assistant`).
3. Edit **`infra/kubernetes/overlays/prod/kustomization.yaml`** → **`images`**
   so **`newName`** matches **`${REGISTRY}/${IMAGE_NAME}`** (same as the tag the
   script pushes).
4. Point **`kubectl`** at your cluster kubeconfig. Copy
   **`scripts/env-kubeconfig.example.sh`** → **`scripts/env-kubeconfig.local.sh`**,
   set the real path inside, then **`source scripts/env-kubeconfig.local.sh`**
   (the `.local.sh` file is gitignored). Or export **`KUBECONFIG`** manually.
5. From repo root: **`./scripts/deploy-prod.sh`**

The script runs **`docker build --platform linux/amd64`**, tags **`${REGISTRY}/${IMAGE_NAME}:latest`**,
pushes with retries, **`kubectl apply -k infra/kubernetes/overlays/prod`**, then
**`kubectl rollout restart`** and **`rollout status`**. Use **`SKIP_KUBECTL=1`**
to only build and push.

### Autoscaling

- **HPA** (`infra/kubernetes/base/assistant/hpa.yaml`): CPU target **70%**, min
  **2** / max **8** replicas. Remove the resource from `base/kustomization.yaml`
  if your cluster does not run metrics-server yet.

### Namespace, ingress, TLS

- **Namespace:** **`quantlix`** (set in kustomize); the namespace must exist (same
  as other Quantlix workloads).
- **Ingress:** **`assistant.quantlix.ai`** in the prod overlay (patch over base
  placeholder host). **IngressClass:** **`traefik`**; **TLS:** cert-manager
  **`ClusterIssuer`** name **`letsencrypt`** (align with ops if your cluster uses
  different class/issuer names).
- **DNS:** point **`assistant.quantlix.ai`** to the cluster ingress/load balancer
  before Let’s Encrypt can issue.

### Secrets and ConfigMap

- **Secret `quantlix-assistant`** in namespace **`quantlix`**: required keys
  **`quantlix-api-key`**, **`quantlix-deployment-id`**, **`database-url`**,
  **`voyage-api-key`**. Optional: **`quantlix-contract-id`**, **`redis-url`**
  (see **`.env.example`** footer for `kubectl create secret` example).
- **In-cluster pgvector (Hetzner path):** base kustomize now includes
  **`postgres/`** manifests (`pgvector/pgvector:pg16` StatefulSet + PVC + init SQL
  for `CREATE EXTENSION vector`). Create secret **`quantlix-assistant-postgres`**
  before apply (example in `infra/kubernetes/base/postgres/secret-example.yaml`):

```bash
kubectl create secret generic quantlix-assistant-postgres -n quantlix \
  --from-literal=username='postgres' \
  --from-literal=password='replace-me' \
  --from-literal=database='quantlix_assistant' \
  --dry-run=client -o yaml | kubectl apply -f -
```

  Then set the assistant DB DSN in secret `quantlix-assistant`:

```bash
--from-literal=database-url='postgresql://postgres:replace-me@quantlix-assistant-postgres.quantlix.svc.cluster.local:5432/quantlix_assistant'
```
- **ConfigMap `quantlix-assistant-config`:** generated in **`overlays/prod`**
  with **`widget-public-origin`** (comma-separated CORS origins). Edit the
  literal in **`overlays/prod/kustomization.yaml`** for your portal hosts.

### RAG indexing job (required for `/chat`)

- The API expects pgvector table **`doc_chunks`**. Use the built-in indexer
  template **`infra/kubernetes/base/assistant/indexer-cronjob.yaml`**.
- It is a **suspended CronJob** by default (`quantlix-assistant-indexer`) so it
  does not run unintentionally on every apply.
- Set `volumes[].persistentVolumeClaim.claimName` to a PVC containing markdown
  docs (mounted at `/docs` in the job). Base manifests now include
  **`assistant/docs-pvc.yaml`** with this name: **`quantlix-assistant-docs`**
  (`storageClassName: hcloud-volumes`, `10Gi`). Then run it manually:

```bash
kubectl create job -n quantlix \
  --from=cronjob/quantlix-assistant-indexer \
  quantlix-assistant-indexer-manual-$(date +%s)

kubectl logs -n quantlix -l app=quantlix-assistant-indexer --tail=200
```

- Re-run the manual job after docs updates or when bootstrapping a fresh DB.

### Verify

```bash
kubectl get pods -n quantlix -l app=quantlix-assistant
curl -fsS https://assistant.quantlix.ai/health
curl -fsS https://assistant.quantlix.ai/health/ready
```

Point the widget **`data-backend-url`** at **`https://assistant.quantlix.ai/chat`**
(or your chosen host/path).

## Roadmap

- [ ] Feedback loop with thumbs-up and thumbs-down on each answer.
- [ ] Answer citations with stable document anchors.
- [ ] Session memory with PII-aware summarization.
- [ ] Multilingual support for global support teams.
- [ ] Slack integration for internal support channels.

## License

MIT.

