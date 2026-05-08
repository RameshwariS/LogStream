# LogStream Performance Testing Guide for Windows

A Windows-first, PowerShell-based guide to reproducing the benchmark results documented in the performance appendix.

This guide assumes Docker Desktop is running Linux containers. Commands are for PowerShell 7 or Windows PowerShell unless a command is explicitly run inside a Docker container.

---

## Prerequisites

Before running any tests, install the following tools and start the stack.

### Required Tools

```powershell
# Docker Desktop
docker --version
docker compose version

# Node.js and npm
node --version
npm --version

# k6 - HTTP load testing
winget install k6.k6
# Alternative:
# choco install k6

# curl.exe - use curl.exe to avoid PowerShell's Invoke-WebRequest alias
curl.exe --version

# wscat - WebSocket client testing
npm install -g wscat

# Docker stats - built into Docker
docker stats --no-stream
```

PowerShell does not need `jq`, `grep`, `bc`, or bash. This guide uses `ConvertFrom-Json`, `Select-String`, `Measure-Object`, and normal PowerShell loops instead.

### Start the Full Stack

```powershell
git clone https://github.com/your-org/logstream.git
Set-Location .\logstream
docker compose up -d

# Verify all services are healthy
docker compose ps
```

Expected output: all services should show `Up` or `healthy`.

```text
logstream-backend-1    Up (healthy)
logstream-loki-1       Up (healthy)
logstream-promtail-1   Up
logstream-frontend-1   Up
logstream-dummy-app-1  Up
logstream-dummy-app-2  Up
logstream-dummy-app-3  Up
```

Create a local folder for generated test files:

```powershell
New-Item -ItemType Directory -Force .\test-output | Out-Null
```

---

## B.1 - End-to-End Log Latency

**Goal:** Measure the time from a log line being written by a dummy app to it appearing in the browser dashboard.

### How It Works

The test instruments each stage of the pipeline separately, then sums the stages to get the total end-to-end figure.

### Step 1 - Instrument the Dummy App

Because the dummy apps run inside Linux containers, write the probe logs from inside the container instead of writing to a Linux path directly from Windows.

Create `.\log_writer.ps1`:

```powershell
$Container = "logstream-dummy-app-1"

1..100 | ForEach-Object {
    $writeTs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $isoTs = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $line = "{`"timestamp`":`"$isoTs`",`"level`":`"INFO`",`"write_ts`":$writeTs,`"msg`":`"latency-probe-$_`"}"

    docker exec $Container sh -c "mkdir -p /var/log/dummy && printf '%s\n' '$line' >> /var/log/dummy/app.log"
    Start-Sleep -Milliseconds 500
}
```

Run it:

```powershell
.\log_writer.ps1
```

### Step 2 - Measure Promtail Scrape Latency

Promtail's scrape interval is usually the dominant contributor. This script writes one probe log inside the dummy container, then polls Loki until the log appears.

Create `.\measure_scrape_latency.ps1`:

```powershell
$Container = "logstream-dummy-app-1"
$WriteTs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$Line = "{`"level`":`"INFO`",`"write_ts`":$WriteTs,`"msg`":`"probe-$WriteTs`"}"

docker exec $Container sh -c "mkdir -p /var/log/dummy && printf '%s\n' '$Line' >> /var/log/dummy/app.log"

$StartNs = ($WriteTs - 1000) * 1000000
$EndNs = ($WriteTs + 5000) * 1000000
$Query = "{job=`"logstream`"} |= `"probe-$WriteTs`""

while ($true) {
    $Result = curl.exe -sG "http://localhost:3100/loki/api/v1/query_range" `
        --data-urlencode "query=$Query" `
        --data-urlencode "start=$StartNs" `
        --data-urlencode "end=$EndNs" `
        --data-urlencode "limit=1" | ConvertFrom-Json

    if ($Result.data.result.Count -gt 0) {
        $AppearTs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        Write-Host "Scrape latency: $($AppearTs - $WriteTs) ms"
        break
    }

    Start-Sleep -Milliseconds 50
}
```

Run it:

```powershell
.\measure_scrape_latency.ps1
```

### Step 3 - Measure Each Pipeline Stage via Backend Logs

Enable verbose timing in the backend by setting `LOG_TIMING=true`, then restart:

```powershell
Add-Content -Path .\backend\.env -Value "LOG_TIMING=true"
docker compose restart backend
```

The backend should emit structured timing logs like:

```json
{"stage":"loki_recv","latency_ms":28}
{"stage":"socket_emit","latency_ms":4}
```

Collect 500 samples:

```powershell
docker compose logs backend |
    Select-String '"stage"' |
    Select-Object -First 500 |
    ForEach-Object { $_.Line } |
    Set-Content .\test-output\timing_samples.jsonl
```

### Step 4 - Calculate Percentiles

Create `.\percentiles.ps1`:

```powershell
$Stages = @{}

Get-Content .\test-output\timing_samples.jsonl | ForEach-Object {
    try {
        $Obj = $_ | ConvertFrom-Json
        if (-not $Stages.ContainsKey($Obj.stage)) {
            $Stages[$Obj.stage] = New-Object System.Collections.Generic.List[double]
        }
        $Stages[$Obj.stage].Add([double]$Obj.latency_ms)
    } catch {
        # Ignore non-JSON log lines.
    }
}

foreach ($Stage in $Stages.Keys) {
    $Vals = $Stages[$Stage] | Sort-Object
    $N = $Vals.Count
    if ($N -eq 0) { continue }

    $Avg = ($Vals | Measure-Object -Average).Average
    $P95 = $Vals[[Math]::Min([int][Math]::Floor($N * 0.95), $N - 1)]
    $P99 = $Vals[[Math]::Min([int][Math]::Floor($N * 0.99), $N - 1)]

    Write-Host ""
    Write-Host "$Stage (n=$N)"
    Write-Host ("  Min={0} Avg={1:n1} P95={2} P99={3} Max={4}" -f $Vals[0], $Avg, $P95, $P99, $Vals[-1])
}
```

Run it:

```powershell
.\percentiles.ps1
```

### Expected Results

| Measurement Point | Avg (ms) | P95 (ms) |
|---|---:|---:|
| App write to Promtail scrape | 380 | 620 |
| Promtail scrape to Loki store | 55 | 90 |
| Loki store to Backend tail recv. | 28 | 52 |
| Backend recv. to Socket.io emit | 4 | 9 |
| Socket.io to Browser render | 14 | 28 |
| **Total end-to-end** | **481** | **799** |

### Tuning Note

To reduce average latency below 200 ms, lower Promtail's scrape interval in `promtail-config.yml`:

```yaml
scrape_configs:
  - job_name: logstream
    pipeline_stages: []
    static_configs:
      - targets: [localhost]
        labels:
          job: logstream
    scrape_interval: 100ms
```

Then restart Promtail:

```powershell
docker compose restart promtail
```

---

## B.2 - Log Throughput: Backend HTTP Ingestion

**Goal:** Find the maximum sustained `POST /api/logs` throughput before errors exceed 1%.

### Step 1 - Write the k6 Load Test Script

Create `.\k6_ingestion_test.js`:

```javascript
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '60s', target: 25 },
        { duration: '60s', target: 50 },
        { duration: '60s', target: 100 },
        { duration: '60s', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<200'],
  },
};

const PAYLOAD = JSON.stringify({
  level: 'INFO',
  message: 'k6 load test probe',
  service: 'k6-tester',
});

export default function () {
  const res = http.post(`${BASE_URL}/api/logs`, PAYLOAD, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status 200': (r) => r.status === 200,
  });
}
```

### Step 2 - Run Each VU Level Independently

For cleaner per-VU metrics, run fixed-VU tests instead of the ramp scenario:

```powershell
foreach ($VU in 1, 10, 25, 50, 100, 200) {
    Write-Host "=== Testing $VU VUs ==="
    k6 run `
        --vus $VU `
        --duration 60s `
        --env BASE_URL=http://localhost:4000 `
        --summary-export ".\test-output\k6_${VU}vu.json" `
        .\k6_ingestion_test.js

    Start-Sleep -Seconds 10
}
```

### Step 3 - Monitor CPU During the Test

In a separate PowerShell window, record CPU usage every 5 seconds:

```powershell
while ($true) {
    docker stats --no-stream --format "{{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}" logstream-backend-1 |
        Add-Content .\test-output\cpu_log.tsv
    Start-Sleep -Seconds 5
}
```

Stop the monitor with `Ctrl+C` after the k6 runs finish.

### Step 4 - Extract Results

```powershell
foreach ($VU in 1, 10, 25, 50, 100, 200) {
    $Data = Get-Content ".\test-output\k6_${VU}vu.json" -Raw | ConvertFrom-Json
    $Reqs = $Data.metrics.http_reqs.values.rate
    $Avg = $Data.metrics.http_req_duration.values.avg
    $P95 = $Data.metrics.http_req_duration.values.'p(95)'
    $Err = $Data.metrics.http_req_failed.values.rate

    "VU=$VU | rps=$Reqs avg=$Avg p95=$P95 err=$Err"
}
```

### Expected Results

| Virtual Users | Req/sec | Avg Latency | P95 Latency | Error Rate | CPU |
|---:|---:|---:|---:|---:|---:|
| 1 | 187 | 5.3 ms | 11 ms | 0.0% | 2% |
| 10 | 980 | 10.1 ms | 19 ms | 0.0% | 12% |
| 25 | 1,842 | 13.5 ms | 28 ms | 0.0% | 28% |
| 50 | 2,914 | 17.2 ms | 41 ms | 0.2% | 51% |
| 100 | 3,701 | 27.0 ms | 68 ms | 1.8% | 78% |
| 200 | 3,890 | 52.4 ms | 124 ms | 8.3% | 94% |

The 1% error threshold is crossed between 50 and 100 VUs. Peak clean throughput is about **3,700 req/sec**.

---

## B.3 - Concurrent Socket.io Clients

**Goal:** Determine how many simultaneous browser clients can receive the live log stream before events are dropped.

### Step 1 - Write the Socket.io Client Simulator

Create `.\socket_load_test.mjs`:

```javascript
import { io } from 'socket.io-client';

const NUM_CLIENTS = parseInt(process.argv[2] || '10', 10);
const SERVER_URL = process.argv[3] || 'http://localhost:4000';

let totalReceived = 0;
const clients = [];

console.log(`Connecting ${NUM_CLIENTS} clients to ${SERVER_URL}...`);

for (let i = 0; i < NUM_CLIENTS; i++) {
  const socket = io(SERVER_URL, { transports: ['websocket'] });

  socket.on('connect', () => {
    if (i === 0) console.log('First client connected');
  });

  socket.on('log', (entry) => {
    totalReceived++;
    const now = Date.now();
    if (entry.emit_ts) {
      const latency = now - entry.emit_ts;
      process.stdout.write(`\rLatency: ${latency}ms | Received: ${totalReceived}    `);
    }
  });

  clients.push(socket);
  await new Promise((resolve) => setTimeout(resolve, 50));
}

console.log(`\nAll ${NUM_CLIENTS} clients connected. Running for 60 seconds...`);
await new Promise((resolve) => setTimeout(resolve, 60000));

clients.forEach((client) => client.disconnect());
console.log(`\nTotal events received: ${totalReceived}`);
process.exit(0);
```

Install the dependency:

```powershell
npm install socket.io-client
```

### Step 2 - Run for Each Client Count

```powershell
foreach ($Clients in 1, 5, 10, 25, 50, 100, 200) {
    Write-Host "=== Testing $Clients clients ==="
    $Process = Start-Process node -ArgumentList "socket_load_test.mjs $Clients http://localhost:4000" -PassThru -NoNewWindow

    1..12 | ForEach-Object {
        docker stats --no-stream --format "clients=$Clients | {{.CPUPerc}} | {{.MemUsage}}" logstream-backend-1
        Start-Sleep -Seconds 5
    }

    Stop-Process -Id $Process.Id -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
}
```

### Step 3 - Check Dropped Events in Backend Logs

The backend logs a warning when it skips a slow client:

```powershell
$Dropped = docker compose logs backend | Select-String "slow client"
$Dropped.Count
```

### Expected Results

| Concurrent Clients | Avg Broadcast Latency | Memory | CPU | Dropped Events |
|---:|---:|---:|---:|---:|
| 1 | 4 ms | 72 MB | 3% | 0 |
| 10 | 9 ms | 94 MB | 9% | 0 |
| 50 | 22 ms | 156 MB | 34% | 0 |
| 100 | 41 ms | 224 MB | 61% | 3 |
| 200 | 89 ms | 378 MB | 87% | 47 |

Zero dropped events are expected up to 50 clients. Drops begin at 100+ clients and are resolved by HPA scale-out in Kubernetes.

---

## B.4 - Resource Utilization: Steady-State

**Goal:** Measure per-container CPU and memory at normal operating load with 3 dummy apps and 10 browser clients.

### Step 1 - Establish Steady-State

```powershell
# Ensure all three dummy apps are running
docker compose up -d dummy-app-1 dummy-app-2 dummy-app-3

# Connect 10 browser clients using the simulator from B.3
$SocketProcess = Start-Process node -ArgumentList "socket_load_test.mjs 10 http://localhost:4000" -PassThru -NoNewWindow

# Wait 2 minutes for the system to reach steady-state
Start-Sleep -Seconds 120
```

### Step 2 - Capture a Snapshot

```powershell
docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}" `
    logstream-loki-1 `
    logstream-backend-1 `
    logstream-frontend-1 `
    logstream-promtail-1 `
    logstream-dummy-app-1 `
    logstream-dummy-app-2 `
    logstream-dummy-app-3
```

### Step 3 - Continuous 5-Minute Average

For a time-averaged reading, sample every 10 seconds for 5 minutes:

```powershell
"timestamp,container,cpu,mem_mb" | Set-Content .\test-output\steady_state.csv

1..30 | ForEach-Object {
    $Ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

    docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}}" |
        Select-String "logstream" |
        ForEach-Object {
            $Parts = $_.Line.Split(",", 3)
            $Name = $Parts[0]
            $Cpu = $Parts[1]
            $Mem = $Parts[2]
            $Match = [regex]::Match($Mem, "([\d.]+)MiB")
            $MemMb = if ($Match.Success) { $Match.Groups[1].Value } else { "" }
            "$Ts,$Name,$Cpu,$MemMb" | Add-Content .\test-output\steady_state.csv
        }

    Start-Sleep -Seconds 10
}

Write-Host "Results saved to .\test-output\steady_state.csv"
```

When finished, stop the socket simulator if it is still running:

```powershell
Stop-Process -Id $SocketProcess.Id -ErrorAction SilentlyContinue
```

### Expected Results

| Container | CPU | Memory |
|---|---:|---:|
| Loki | 8% | 214 MB |
| Backend | 9% | 94 MB |
| Frontend nginx | 1% | 12 MB |
| Promtail | 3% | 48 MB |
| 3x Dummy Apps | 6% total | shared |
| **Total** | **~27%** | **~368 MB** |

---

## B.5 - Loki Query Response Time

**Goal:** Measure how query latency scales with dataset size.

### Step 1 - Seed Loki with Known Log Volumes

Use the backend's ingestion endpoint to pre-populate Loki.

Create `.\seed_loki.ps1`:

```powershell
param(
    [int]$Count = 1000,
    [string]$Level = "INFO"
)

Write-Host "Seeding $Count $Level logs..."

1..$Count | ForEach-Object {
    $Body = @{
        level = $Level
        message = "seed entry $_"
        service = "seeder"
    } | ConvertTo-Json -Compress

    curl.exe -s -o NUL -X POST "http://localhost:4000/api/logs" `
        -H "Content-Type: application/json" `
        -d $Body
}

Write-Host "Done seeding $Count entries"
```

Run the initial seed:

```powershell
.\seed_loki.ps1 -Count 1000 -Level INFO
```

For larger volumes, use parallel ingestion.

Create `.\parallel_seed_loki.ps1`:

```powershell
param(
    [int]$Total = 10000,
    [int]$Jobs = 10
)

$PerJob = [Math]::Floor($Total / $Jobs)

$SeedJobs = 1..$Jobs | ForEach-Object {
    Start-Job -ScriptBlock {
        param($PerJob)

        1..$PerJob | ForEach-Object {
            $Body = @{
                level = "INFO"
                message = "parallel seed"
                service = "seeder"
            } | ConvertTo-Json -Compress

            curl.exe -s -o NUL -X POST "http://localhost:4000/api/logs" `
                -H "Content-Type: application/json" `
                -d $Body
        }
    } -ArgumentList $PerJob
}

$SeedJobs | Wait-Job | Receive-Job
$SeedJobs | Remove-Job
Write-Host "Done seeding $Total entries"
```

### Step 2 - Time Each Query Type

Create `.\time_queries.ps1`:

```powershell
function Measure-LogQuery {
    param(
        [string]$Url,
        [string]$Label
    )

    $TotalMs = 0

    1..10 | ForEach-Object {
        $Elapsed = Measure-Command {
            curl.exe -s -o NUL $Url
        }
        $TotalMs += $Elapsed.TotalMilliseconds
    }

    $Avg = [Math]::Round($TotalMs / 10)
    Write-Host "$Label: avg $Avg ms (over 10 runs)"
}

$Base = "http://localhost:4000"

Measure-LogQuery "$Base/api/logs?limit=200" "limit=200"
Measure-LogQuery "$Base/api/logs?limit=1000" "limit=1000"
Measure-LogQuery "$Base/api/logs?level=ERROR&limit=200" "filtered by level"
Measure-LogQuery "$Base/api/logs?keyword=seed&limit=200" "keyword pipeline"
```

Run it:

```powershell
.\time_queries.ps1
```

### Step 3 - Repeat at Each Data Volume

Run the timing script after each seeding stage:

| Logs in Loki | Run after seeding |
|---:|---|
| < 1,000 | Initial seed |
| 10,000 | `.\parallel_seed_loki.ps1 -Total 10000` |
| 100,000 | `.\parallel_seed_loki.ps1 -Total 100000` |
| 500,000 | `.\parallel_seed_loki.ps1 -Total 500000` |
| 1,000,000 | `.\parallel_seed_loki.ps1 -Total 1000000` |

### Expected Results

| Logs in Loki | limit=200 | limit=1000 | Filtered by level | Keyword pipeline |
|---:|---:|---:|---:|---:|
| < 1,000 | 8 ms | 12 ms | 6 ms | 9 ms |
| 10,000 | 14 ms | 23 ms | 11 ms | 16 ms |
| 100,000 | 28 ms | 51 ms | 19 ms | 34 ms |
| 500,000 | 67 ms | 142 ms | 38 ms | 82 ms |
| 1,000,000 | 118 ms | 289 ms | 61 ms | 154 ms |

Filtered queries consistently outperform unfiltered range queries because Loki's label index is consulted first, avoiding a full chunk scan.

---

## C - Algorithm Accuracy Validation

### Log Scraping Accuracy: Target >= 99.7%

Measure how many lines written are actually received by Loki:

```powershell
$Container = "logstream-dummy-app-1"

1..1000 | ForEach-Object {
    $Line = "{`"seq`":$_,`"level`":`"INFO`",`"msg`":`"accuracy-probe`"}"
    docker exec $Container sh -c "mkdir -p /var/log/dummy && printf '%s\n' '$Line' >> /var/log/dummy/app.log"
}

# Wait for Promtail to flush. Use about 2x the scrape interval.
Start-Sleep -Seconds 3

$Query = "count_over_time({job=`"logstream`"} |= `"accuracy-probe`" [10m])"
$Result = curl.exe -sG "http://localhost:3100/loki/api/v1/query" --data-urlencode "query=$Query" | ConvertFrom-Json
$Found = [int]$Result.data.result[0].value[1]
$Accuracy = [Math]::Round($Found / 10, 1)

Write-Host "Received $Found / 1000 -> accuracy: $Accuracy%"
```

### Severity Classification Accuracy: Target >= 99.4%

```powershell
foreach ($Level in "DEBUG", "INFO", "WARN", "ERROR") {
    1..125 | ForEach-Object {
        $Body = @{
            level = $Level
            message = "classify test"
            service = "classifier-test"
        } | ConvertTo-Json -Compress

        curl.exe -s -o NUL -X POST "http://localhost:4000/api/logs" `
            -H "Content-Type: application/json" `
            -d $Body
    }
}

foreach ($Level in "DEBUG", "INFO", "WARN", "ERROR") {
    $Result = curl.exe -s "http://localhost:4000/api/logs?level=$Level&keyword=classify+test&limit=200" | ConvertFrom-Json
    $Count = $Result.logs.Count
    Write-Host "$Level: $Count (expected about 125)"
}
```

### Socket.io Fan-out Accuracy: Target 100% at <= 50 Clients

```powershell
node -e @'
const { io } = require('socket.io-client');
let clients = [], counts = new Array(50).fill(0);
for (let i = 0; i < 50; i++) {
  const s = io('http://localhost:4000', { transports: ['websocket'] });
  s.on('log', () => counts[i]++);
  clients.push(s);
}
setTimeout(() => {
  clients.forEach(c => c.disconnect());
  const min = Math.min(...counts), max = Math.max(...counts);
  console.log(`Min: ${min}, Max: ${max}, Dropped: ${counts.filter(c => c < max).length} clients`);
  process.exit(0);
}, 35000);
'@
```

---

## Troubleshooting Common Test Issues

**Loki rejects old log timestamps**

Loki defaults to rejecting logs older than 1 hour. If seeding large volumes, set `reject_old_samples: false` in `loki-config.yaml` for testing, then restore it.

**k6 results show unexpectedly high error rates at low VUs**

Check if the backend container hit its memory limit:

```powershell
(docker inspect logstream-backend-1 | ConvertFrom-Json)[0].HostConfig.Memory
```

If it shows a low cap, remove the limit in `docker-compose.yml` for load testing.

**Socket.io clients disconnect immediately**

Ensure the backend's CORS config allows `http://localhost` origins. Check `CORS_ORIGIN` in your `.env` file.

**Promtail is not scraping logs**

Verify the volume mount from inside the Promtail container:

```powershell
docker exec logstream-promtail-1 ls /var/log/dummy/
```

If empty, the Docker volume mapping in `docker-compose.yml` is misconfigured.

**CPU percentage stays at 0% in docker stats**

Use `docker stats --no-stream` rather than streaming mode when scripting. The first sample in streaming mode is often 0%.

**PowerShell runs `curl` differently than expected**

Use `curl.exe`, not `curl`, so PowerShell does not route the command through its `Invoke-WebRequest` alias.

---

## Quick Reference - All Test Commands

```powershell
# B.1 End-to-end latency probe
.\log_writer.ps1
.\measure_scrape_latency.ps1
.\percentiles.ps1

# B.2 HTTP ingestion throughput
k6 run --vus 100 --duration 60s .\k6_ingestion_test.js

# B.3 Socket.io concurrent clients
node .\socket_load_test.mjs 50 http://localhost:4000

# B.4 Steady-state resource usage
docker stats --no-stream logstream-loki-1 logstream-backend-1 logstream-frontend-1 logstream-promtail-1

# B.5 Loki query timing
.\time_queries.ps1

# C Accuracy checks
# See the accuracy section above.
```
