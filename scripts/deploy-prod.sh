#!/usr/bin/env bash
# Build and deploy Quantlix Assistant backend to production Kubernetes.
#
# Prerequisites: docker, kubectl; docker login to your registry.
# Export KUBECONFIG to a cluster-admin kubeconfig before running.
#
# Environment overrides:
#   REGISTRY          e.g. docker.io/yourorg (default: docker.io/quantlix)
#   IMAGE_NAME        image repository name (default: quantlix-assistant)
#   PUSH_RETRIES      docker push retries (default: 5)
#   PUSH_RETRY_SLEEP  seconds between push retries (default: 20)
#   SKIP_KUBECTL=1    only build and push images
#
# Example:
#   export KUBECONFIG=/path/to/kubeconfig
#   export REGISTRY=docker.io/jesperjensen888
#   ./scripts/deploy-prod.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

REGISTRY="${REGISTRY:-docker.io/quantlix}"
IMAGE_NAME="${IMAGE_NAME:-quantlix-assistant}"
PUSH_RETRIES="${PUSH_RETRIES:-5}"
PUSH_RETRY_SLEEP="${PUSH_RETRY_SLEEP:-20}"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:latest"

docker_push_retry() {
  local image=$1
  local attempt=1
  while true; do
    if docker push "$image"; then
      return 0
    fi
    if [ "$attempt" -ge "$PUSH_RETRIES" ]; then
      echo "Error: docker push failed after ${PUSH_RETRIES} attempts: $image" >&2
      return 1
    fi
    echo "Push failed (attempt ${attempt}/${PUSH_RETRIES}), retrying in ${PUSH_RETRY_SLEEP}s..."
    attempt=$((attempt + 1))
    sleep "$PUSH_RETRY_SLEEP"
  done
}

echo "1. Building image (linux/amd64)..."
docker build --platform linux/amd64 -t "${IMAGE_NAME}:latest" -f Dockerfile .

echo "2. Tagging for registry (${FULL_IMAGE})..."
docker tag "${IMAGE_NAME}:latest" "${FULL_IMAGE}"

echo "3. Pushing (retries: ${PUSH_RETRIES}, sleep: ${PUSH_RETRY_SLEEP}s)..."
docker_push_retry "${FULL_IMAGE}"

if ! kubectl cluster-info &>/dev/null; then
  if [ "${SKIP_KUBECTL:-}" = "1" ]; then
    echo "SKIP_KUBECTL=1: skipping kubectl (image pushed to ${FULL_IMAGE})."
    echo "Update infra/kubernetes/overlays/prod/kustomization.yaml images.newName to match, then:"
    echo "  kubectl apply -k infra/kubernetes/overlays/prod --validate=false"
    echo "  kubectl rollout restart deployment/quantlix-assistant -n quantlix"
    exit 0
  fi
  echo "Error: kubectl cannot reach a cluster." >&2
  echo "Set KUBECONFIG, or run with SKIP_KUBECTL=1 after pushing." >&2
  exit 1
fi

echo "4. Applying prod overlay..."
kubectl apply -k infra/kubernetes/overlays/prod --validate=false

echo "5. Rollout restart + wait..."
kubectl rollout restart deployment/quantlix-assistant -n quantlix
kubectl rollout status deployment/quantlix-assistant -n quantlix --timeout=300s

echo ""
echo "Done. Verify:"
echo "  kubectl get pods -n quantlix -l app=quantlix-assistant"
echo "  curl -fsS https://assistant.quantlix.ai/health"
echo "  curl -fsS https://assistant.quantlix.ai/health/ready"
