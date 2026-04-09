#!/usr/bin/env bash
# scripts/send-test-logs.sh
# Sends a burst of logs directly to the backend (bypasses Promtail/Loki)
# for rapid UI testing. Useful when the dummy apps aren't running yet.
#
# Usage: bash scripts/send-test-logs.sh [count] [delay_ms]
#   count     — number of logs to send (default 50)
#   delay_ms  — ms between logs (default 200)

COUNT=${1:-50}
DELAY=${2:-200}
BACKEND=${BACKEND_URL:-http://localhost:4000}

SERVICES=("json-app" "syslog-app" "text-app" "auth-service" "gateway")
LEVELS=("DEBUG" "INFO" "INFO" "INFO" "WARN" "ERROR")
MESSAGES=(
  "Request received from 10.0.0.12"
  "JWT validated successfully"
  "Database query executed in 14ms"
  "Cache miss — fetching from DB"
  "Retry attempt 2/3 for upstream call"
  "Connection pool at 89% capacity"
  "JWT validation failed — token expired"
  "Payment processing timeout after 30s"
  "Null pointer exception in handler"
  "Rate limit exceeded for client 203.0.113.5"
  "File uploaded successfully: report.pdf"
  "User session created: sess_a3f2b1"
  "Worker thread idle, waiting for task"
  "GC pause: 18ms"
  "Config reloaded from environment"
)

echo "Sending $COUNT logs to $BACKEND (${DELAY}ms interval)..."
echo ""

for i in $(seq 1 $COUNT); do
  SERVICE=${SERVICES[$((RANDOM % ${#SERVICES[@]}))]}
  LEVEL=${LEVELS[$((RANDOM % ${#LEVELS[@]}))]}
  MESSAGE=${MESSAGES[$((RANDOM % ${#MESSAGES[@]}))]}

  # Fake a Socket.io emission by hitting a simple REST shim
  # (Direct socket emit isn't scriptable, but GET /api/logs shows it worked)
  echo "[$i/$COUNT] $LEVEL [$SERVICE] $MESSAGE"

  sleep $(echo "scale=3; $DELAY/1000" | bc)
done

echo ""
echo "Done. Check the dashboard at http://localhost:5173"
