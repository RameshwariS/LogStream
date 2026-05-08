#!/usr/bin/env bash
# scripts/k8s-build-images.sh
# Builds all Docker images and loads them into Minikube or Kind
# so Kubernetes can use them without a registry.
#
# Usage:
#   bash scripts/k8s-build-images.sh minikube   # for Minikube
#   bash scripts/k8s-build-images.sh kind        # for Kind

set -euo pipefail

TARGET=${1:-minikube}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { echo -e "\n${GREEN}▶ $1${NC}"; }
info() { echo -e "${YELLOW}  $1${NC}"; }

IMAGES=(
  "logstream-json-app:latest:apps/json-logger"
  "logstream-syslog-app:latest:apps/syslog-logger"
  "logstream-text-app:latest:apps/text-logger"
  "logstream-api-gateway:latest:apps/api-gateway"
  "logstream-notification-service:latest:apps/notification-service"
  "logstream-analytics-service:latest:apps/analytics-service"
  "logstream-backend:latest:backend"
  "logstream-frontend:latest:frontend"
)

# Point Docker CLI to Minikube's daemon so images land inside the cluster
if [ "$TARGET" = "minikube" ]; then
  step "Pointing Docker to Minikube daemon"
  eval "$(minikube docker-env)"
fi

for entry in "${IMAGES[@]}"; do
  IFS=':' read -r name tag context <<< "$entry"
  step "Building ${name}:${tag}"
  docker build -t "${name}:${tag}" "${ROOT}/${context}"
  info "Built ${name}:${tag}"

  if [ "$TARGET" = "kind" ]; then
    info "Loading into Kind cluster..."
    kind load docker-image "${name}:${tag}"
  fi
done

echo -e "\n${GREEN}All images built successfully!${NC}"
echo ""
echo "Next steps:"
echo "  kubectl apply -k k8s/overlays/dev"
echo "  bash scripts/k8s-status.sh"
