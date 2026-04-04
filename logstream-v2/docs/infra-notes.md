# LogStream — Infrastructure Notes & LogQL Reference

Written by Member 1 (Rameshwari) after validating the Promtail → Loki pipeline.
Member 2 (Pooja) should use these queries directly in `lokiService.js`.

## Loki API Base URL

- Inside Docker: `http://loki:3100`
- Local dev (outside Docker): `http://localhost:3100`

## Health Check

```bash
curl http://localhost:3100/ready
# Expected: "ready"
```

## LogQL Queries

### All logstream logs (last 1 hour)
```
{job="logstream"}
```

### Filter by app
```
{job="logstream", app="json-app"}
{job="logstream", app="syslog-app"}
{job="logstream", app="text-app"}
```

### Filter by level (Promtail extracts this label)
```
{job="logstream", level="ERROR"}
{job="logstream", level="WARN"}
```

### Keyword search via pipeline
```
{job="logstream"} |= "timeout"
{job="logstream"} |= "failed"
```

### Combined filter
```
{job="logstream", app="json-app", level="ERROR"} |= "connection"
```

### Parse JSON fields inline
```
{job="logstream", app="json-app"} | json | level="ERROR"
```

## Loki HTTP API Reference

### Range query (history)
```
GET /loki/api/v1/query_range
  ?query={job="logstream"}
  &start=<unix_ns>
  &end=<unix_ns>
  &limit=200
  &direction=backward
```

Response format:
```json
{
  "data": {
    "result": [
      {
        "stream": { "app": "json-app", "level": "INFO", "job": "logstream" },
        "values": [
          ["1720000000000000000", "{\"timestamp\":\"...\",\"level\":\"INFO\",\"message\":\"...\"}"]
        ]
      }
    ]
  }
}
```

### Tail endpoint (real-time)
```
WebSocket: ws://loki:3100/loki/api/v1/tail?query={job="logstream"}
```

Tail message format:
```json
{
  "streams": [
    {
      "stream": { "app": "json-app", "level": "INFO" },
      "values": [["<ns_timestamp>", "<raw log line>"]]
    }
  ]
}
```

## Docker Volumes

- `log-data` — shared volume between dummy apps and Promtail
  - `/logs/json-app.log`   — written by json-logger container
  - `/logs/syslog-app.log` — written by syslog-logger container
  - `/logs/text-app.log`   — written by text-logger container
  - Promtail mounts this volume as **read-only** at `/logs`

## Verify Pipeline End-to-End

```bash
# 1. Check all containers running
docker compose ps

# 2. Check Loki health
curl http://localhost:3100/ready

# 3. Query all logstream logs
curl 'http://localhost:3100/loki/api/v1/query?query={job="logstream"}'

# 4. Check Promtail is scraping (look for "files found" not "no files found")
docker compose logs promtail | grep -i "files"

# 5. Confirm all 3 apps have logs in Loki
curl 'http://localhost:3100/loki/api/v1/query?query={job="logstream",app="json-app"}'
curl 'http://localhost:3100/loki/api/v1/query?query={job="logstream",app="syslog-app"}'
curl 'http://localhost:3100/loki/api/v1/query?query={job="logstream",app="text-app"}'
```
