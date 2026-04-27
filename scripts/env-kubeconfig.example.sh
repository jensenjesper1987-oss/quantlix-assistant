#!/usr/bin/env bash
# Kubeconfig for kubectl against your Quantlix cluster (deploy, secrets, apply -k).
#
# Setup (recommended):
#   cp scripts/env-kubeconfig.example.sh scripts/env-kubeconfig.local.sh
#   # Edit scripts/env-kubeconfig.local.sh — set the real path (that file is gitignored).
#   source scripts/env-kubeconfig.local.sh
#
# One-liner without a local copy (replace the path):
#   export KUBECONFIG=/absolute/path/to/kubeconfig.yaml

export KUBECONFIG="/path/to/your/kubeconfig.yaml"
