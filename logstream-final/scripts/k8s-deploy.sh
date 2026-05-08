#!/usr/bin/env bash
# scripts/k8s-deploy.sh
# One-command deploy for local development (Minikube or Kind).
# Builds images, applies manifests, waits for pods, prints URLs.
#
# Usage:
#   bash scripts/k8s-deploy.sh              # Minikube (default)
#   bash scripts/k8s-deploy.sh kind         # Kind cluster

set -euo pipefail

TARGET=${1:-minikube}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OVERLAY="$ROOT/k8s/overlays/dev"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${GREEN}══ $1 ══${NC}"; }
info() { echo -e "${YELLOW}  → $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

# ── 1. Pre-flight ─────────────────────────────────────────────────────────────
step "Pre-flight checks"

command -v kubectl  >/dev/null || fail "kubectl not found"
command -v docker   >/dev/null || fail "docker not found"

if [ "$TARGET" = "minikube" ]; then
  command -v minikube >/dev/null || fail "minikube not found"
  minikube status | grep -q "Running" || { info "Starting Minikube..."; minikube start --driver=docker; }
  info "Minikube running"
elif [ "$TARGET" = "kind" ]; then
  command -v kind >/dev/null || fail "kind not found"
  kind get clusters | grep -q "kind" || { info "Creating Kind cluster..."; kind create cluster --name logstream; }
  kubectl cluster-info --context kind-logstream
fi

# ── 2. Build images ───────────────────────────────────────────────────────────
step "Building Docker images"
bash "$ROOT/scripts/k8s-build-images.sh" "$TARGET"

# ── 3. Apply manifests ────────────────────────────────────────────────────────
step "Applying Kubernetes manifests (dev overlay)"
kubectl apply -k "$OVERLAY"

# ── 4. Wait for rollout ───────────────────────────────────────────────────────
step "Waiting for pods to become ready"
DEPLOYMENTS=(loki promtail json-app syslog-app text-app backend frontend grafana)

for deploy in "${DEPLOYMENTS[@]}"; do
  info "Waiting for $deploy..."
  # Use StatefulSet wait for loki
  if [ "$deploy" = "loki" ]; then
    kubectl rollout status statefulset/loki -n logstream --timeout=120s
  else
    kubectl rollout status deployment/"$deploy" -n logstream --timeout=120s
  fi
done

# ── 5. Print access URLs ──────────────────────────────────────────────────────
step "Deployment complete!"

if [ "$TARGET" = "minikube" ]; then
  MINIKUBE_IP=$(minikube ip)
  echo ""
  echo "  Dashboard :  http://${MINIKUBE_IP}:30080"
  echo "  Backend   :  http://${MINIKUBE_IP}:30400/health"
  echo "  Grafana   :  http://${MINIKUBE_IP}:30300"
  echo ""
  echo "  Or run:  minikube service frontend -n logstream"
elif [ "$TARGET" = "kind" ]; then
  echo ""
  echo "  Port-forward commands:"
  echo "    kubectl port-forward svc/frontend -n logstream 5173:80"
  echo "    kubectl port-forward svc/backend  -n logstream 4000:4000"
  echo "    kubectl port-forward svc/grafana  -n logstream 3000:3000"
fi

echo ""
echo "  Check status:  bash scripts/k8s-status.sh"
echo ""
