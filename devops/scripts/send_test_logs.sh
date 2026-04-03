#!/usr/bin/env bash
# scripts/send_test_logs.sh
# Sends a stream of sample logs to LogStream for local testing.
# Usage: ./scripts/send_test_logs.sh [API_KEY] [HOST]

API_KEY="${1:-dev-api-key}"
HOST="${2:-http://localhost:8080}"
ENDPOINT="$HOST/api/logs"

SERVICES=("auth-service" "payment-service" "user-service" "gateway" "notifications")
LEVELS=("DEBUG" "INFO" "INFO" "INFO" "WARN" "ERROR")
MESSAGES=(
  "Request received"
  "JWT validated successfully"
  "Database query executed in 12ms"
  "Cache miss — falling back to DB"
  "Retry attempt 2/3 for downstream call"
  "JWT validation failed — invalid signature"
  "Connection pool exhausted"
  "Payment processing timeout after 30s"
  "User not found: uid=9f3a"
  "Rate limit exceeded for IP 203.0.113.42"
)

echo "Sending test logs to $ENDPOINT..."
echo "Press Ctrl+C to stop."
echo ""

i=0
while true; do
  SERVICE="${SERVICES[$((RANDOM % ${#SERVICES[@]}))]}"
  LEVEL="${LEVELS[$((RANDOM % ${#LEVELS[@]}))]}"
  MESSAGE="${MESSAGES[$((RANDOM % ${#MESSAGES[@]}))]}"
  TRACE_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "trace-$RANDOM")

  PAYLOAD=$(cat <<JSON
{
  "service": "$SERVICE",
  "level":   "$LEVEL",
  "message": "$MESSAGE",
  "trace_id": "$TRACE_ID",
  "metadata": { "iteration": "$i" }
}
JSON
)

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$PAYLOAD")

  echo "[$i] $LEVEL $SERVICE — $HTTP_STATUS"
  i=$((i + 1))
  sleep 0.5
done
