#!/usr/bin/env bash
# scripts/check-pipeline.sh
# Checks that every component in the stack is healthy.
# Run this after: docker compose up --build
#
# Usage: bash scripts/check-pipeline.sh

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "${GREEN}  ✓ $1${NC}"; }
fail() { echo -e "${RED}  ✗ $1${NC}"; FAILED=1; }
info() { echo -e "${YELLOW}  → $1${NC}"; }

FAILED=0
echo ""
echo "=== LogStream Pipeline Health Check ==="
echo ""

# 1. Loki
echo "[ Loki ]"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/ready)
if [ "$STATUS" = "200" ]; then pass "Loki is ready (HTTP $STATUS)"; else fail "Loki not ready (HTTP $STATUS)"; fi

# 2. Loki has logs
RESULT=$(curl -s 'http://localhost:3100/loki/api/v1/query?query={job="logstream"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(len(d.get('data',{}).get('result',[])))
" 2>/dev/null)
if [ -n "$RESULT" ] && [ "$RESULT" -gt "0" ] 2>/dev/null; then
  pass "Loki has $RESULT log stream(s) from {job=\"logstream\"}"
else
  info "Loki has no logstream data yet (dummy apps may still be starting)"
fi

# 3. Each app label
echo ""
echo "[ Log sources ]"
for APP in json-app syslog-app text-app; do
  COUNT=$(curl -s "http://localhost:3100/loki/api/v1/query?query={job=\"logstream\",app=\"$APP\"}" | python3 -c "
import sys,json
d=json.load(sys.stdin)
streams=d.get('data',{}).get('result',[])
total=sum(len(s.get('values',[])) for s in streams)
print(total)
" 2>/dev/null)
  if [ -n "$COUNT" ] && [ "$COUNT" -gt "0" ] 2>/dev/null; then
    pass "$APP has $COUNT log entries in Loki"
  else
    info "$APP: no entries yet in Loki"
  fi
done

# 4. Backend
echo ""
echo "[ Backend ]"
HEALTH=$(curl -s http://localhost:4000/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  CLIENTS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('clients',0))" 2>/dev/null)
  pass "Backend healthy — $CLIENTS socket client(s) connected"
else
  fail "Backend not responding at :4000"
fi

LOGS=$(curl -s 'http://localhost:4000/api/logs?limit=5' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('count',0))
" 2>/dev/null)
if [ -n "$LOGS" ] && [ "$LOGS" -ge "0" ] 2>/dev/null; then
  pass "/api/logs returned $LOGS entries"
else
  fail "/api/logs not responding"
fi

# 5. Frontend
echo ""
echo "[ Frontend ]"
FE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ "$FE" = "200" ]; then pass "Frontend serving at :5173 (HTTP $FE)"; else fail "Frontend not reachable at :5173 (HTTP $FE)"; fi

# 6. Grafana (optional)
echo ""
echo "[ Grafana (optional) ]"
GF=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$GF" = "200" ]; then pass "Grafana available at :3000"; else info "Grafana not yet available at :3000"; fi

echo ""
if [ "$FAILED" = "0" ]; then
  echo -e "${GREEN}All checks passed! Dashboard: http://localhost:5173${NC}"
else
  echo -e "${RED}Some checks failed — see above. Run: docker compose logs <service>${NC}"
fi
echo ""
