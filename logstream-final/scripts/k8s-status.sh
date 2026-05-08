#!/usr/bin/env bash
# scripts/k8s-status.sh
# Shows the health of every LogStream pod, service, and PVC in the cluster.
#
# Usage: bash scripts/k8s-status.sh

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; }
info() { echo -e "${YELLOW}  → $1${NC}"; }
head() { echo -e "\n${CYAN}[ $1 ]${NC}"; }

echo ""
echo "═══════════════════════════════════════════"
echo "   LogStream Kubernetes Status"
echo "═══════════════════════════════════════════"

# ── Pods ──────────────────────────────────────────────────────────────────────
head "Pods"
kubectl get pods -n logstream -o wide 2>/dev/null || fail "Could not get pods (is kubectl configured?)"

# ── Deployments ───────────────────────────────────────────────────────────────
head "Deployments"
kubectl get deployments -n logstream 2>/dev/null

# ── Services ──────────────────────────────────────────────────────────────────
head "Services"
kubectl get services -n logstream 2>/dev/null

# ── PVCs ─────────────────────────────────────────────────────────────────────
head "Persistent Volume Claims"
kubectl get pvc -n logstream 2>/dev/null

# ── Pod readiness per component ───────────────────────────────────────────────
head "Readiness check per component"
COMPONENTS=(loki promtail json-app syslog-app text-app backend frontend grafana)
for comp in "${COMPONENTS[@]}"; do
  READY=$(kubectl get pods -n logstream -l app="$comp" \
    -o jsonpath='{.items[*].status.containerStatuses[*].ready}' 2>/dev/null)
  if echo "$READY" | grep -q "true"; then
    pass "$comp — ready"
  else
    fail "$comp — not ready (run: kubectl describe pod -n logstream -l app=$comp)"
  fi
done

# ── Quick log pipeline check via Loki ─────────────────────────────────────────
head "Loki pipeline check"
LOKI_POD=$(kubectl get pod -n logstream -l app=loki -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$LOKI_POD" ]; then
  READY=$(kubectl exec "$LOKI_POD" -n logstream -- wget -qO- http://localhost:3100/ready 2>/dev/null)
  if [ "$READY" = "ready" ]; then
    pass "Loki HTTP /ready = ready"
    # Count log streams
    STREAMS=$(kubectl exec "$LOKI_POD" -n logstream -- \
      wget -qO- 'http://localhost:3100/loki/api/v1/query?query={job="logstream"}' 2>/dev/null | \
      python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',{}).get('result',[])))" 2>/dev/null || echo "?")
    info "Loki has $STREAMS active log stream(s) from {job=\"logstream\"}"
  else
    fail "Loki not ready inside pod"
  fi
else
  fail "No Loki pod found"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "  Useful commands:"
echo "    kubectl logs -n logstream -l app=backend --tail=50"
echo "    kubectl logs -n logstream -l app=loki    --tail=30"
echo "    kubectl logs -n logstream -l app=promtail --tail=30"
echo "    kubectl exec -it <pod> -n logstream -- sh"
echo "═══════════════════════════════════════════"
echo ""
