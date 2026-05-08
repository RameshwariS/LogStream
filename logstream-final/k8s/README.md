# LogStream — Kubernetes Deployment Guide

## Architecture in Kubernetes

```
                        ┌─────────────────────────────────────────┐
                        │          Namespace: logstream            │
                        │                                          │
  Browser ──► Ingress ──┼──► frontend (Deployment, 2 replicas)    │
               nginx    │         │ /api, /socket.io               │
                        │         ▼                                │
                        │    backend (Deployment, 2 replicas)      │
                        │    HPA: scale 2→5 on CPU >60%            │
                        │         │ Loki tail WS                   │
                        │         ▼                                │
                        │    loki (StatefulSet, 1 replica)         │
                        │         ▲                                │
                        │    promtail (Deployment, 1 replica)      │
                        │         │ reads from PVC                 │
                        │         │ log-data (ReadWriteMany)        │
                        │         ▲                                │
                        │    json-app  ──┐                         │
                        │    syslog-app ─┼──► log-data PVC         │
                        │    text-app  ──┘                         │
                        │                                          │
                        │    grafana (Deployment, 1 replica)       │
                        └─────────────────────────────────────────┘
```

## Manifest Files

| File | What it creates |
|------|----------------|
| `00-namespace.yaml` | `logstream` namespace |
| `01-configmaps.yaml` | Loki config, Promtail config, Grafana provisioning, backend env |
| `02-storage.yaml` | 3 PVCs: `loki-data` (5Gi RWO), `log-data` (1Gi RWX), `grafana-data` (1Gi RWO) |
| `03-loki.yaml` | Loki StatefulSet + ClusterIP Service |
| `04-promtail.yaml` | ServiceAccount, ClusterRole, Promtail Deployment |
| `05-dummy-apps.yaml` | json-app, syslog-app, text-app Deployments |
| `06-backend.yaml` | Backend Deployment + Service (sticky) + HPA |
| `07-frontend.yaml` | Frontend Deployment + Service |
| `08-grafana.yaml` | Grafana Deployment + Service |
| `09-ingress.yaml` | nginx Ingress with WebSocket + path routing |

## Quick Start — Minikube

```bash
# 1. Start Minikube (if not already running)
minikube start --driver=docker --cpus=4 --memory=6g

# 2. Build images + deploy everything
bash scripts/k8s-deploy.sh minikube

# 3. Check everything is healthy
bash scripts/k8s-status.sh

# 4. Open the dashboard
minikube service frontend -n logstream
```

## Quick Start — Kind

```bash
# 1. Create a Kind cluster
kind create cluster --name logstream

# 2. Build images + deploy
bash scripts/k8s-deploy.sh kind

# 3. Port-forward to access services
kubectl port-forward svc/frontend -n logstream 5173:80 &
kubectl port-forward svc/backend  -n logstream 4000:4000 &
kubectl port-forward svc/grafana  -n logstream 3000:3000 &

# 4. Open http://localhost:5173
```

## Manual Step-by-Step

```bash
# Build images (Minikube)
eval $(minikube docker-env)
docker build -t logstream-json-app:latest   apps/json-logger
docker build -t logstream-syslog-app:latest apps/syslog-logger
docker build -t logstream-text-app:latest   apps/text-logger
docker build -t logstream-backend:latest    backend
docker build -t logstream-frontend:latest   frontend

# Apply the dev overlay (single replicas, NodePort services)
kubectl apply -k k8s/overlays/dev

# Watch pods come up
kubectl get pods -n logstream -w

# Check Loki is ready
kubectl exec -n logstream statefulset/loki -- wget -qO- http://localhost:3100/ready

# Query logs via Loki (inside the cluster)
kubectl exec -n logstream statefulset/loki -- \
  wget -qO- 'http://localhost:3100/loki/api/v1/query?query={job="logstream"}'
```

## Kustomize Overlays

### Dev (Minikube / Kind)
```bash
kubectl apply -k k8s/overlays/dev
```
- All deployments run at 1 replica
- Services exposed as NodePort (frontend:30080, backend:30400, grafana:30300)

### Production
```bash
# Edit k8s/overlays/prod/kustomization.yaml first:
#   - Set your real image registry (replace YOUR_ORG)
#   - Set your domain name
#   - Set image tags

kubectl apply -k k8s/overlays/prod
```
- 3 replicas for backend and frontend
- Real domain in Ingress with TLS
- Images pulled from GHCR

## Useful kubectl Commands

```bash
# Watch all pods in the namespace
kubectl get pods -n logstream -w

# Tail backend logs
kubectl logs -n logstream -l app=backend -f --tail=100

# Tail Loki logs
kubectl logs -n logstream -l app=loki -f --tail=50

# Check Promtail is scraping
kubectl logs -n logstream -l app=promtail | grep -i "files\|error"

# Exec into a pod
kubectl exec -it -n logstream deployment/backend -- sh

# Describe a failing pod
kubectl describe pod -n logstream -l app=backend

# Check events (useful for startup failures)
kubectl get events -n logstream --sort-by='.lastTimestamp'

# Scale backend manually
kubectl scale deployment backend -n logstream --replicas=3

# Restart a deployment
kubectl rollout restart deployment/backend -n logstream

# Check HPA status
kubectl get hpa -n logstream

# Delete everything (keeps PVC data)
bash scripts/k8s-teardown.sh

# Delete everything including data
bash scripts/k8s-teardown.sh --delete-data
```

## Ingress Setup

The Ingress requires the **nginx Ingress Controller**:

```bash
# Minikube (built-in)
minikube addons enable ingress

# Kind or bare cluster
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.5/deploy/static/provider/cloud/deploy.yaml

# Add to /etc/hosts for local testing
echo "$(minikube ip)  logstream.local" | sudo tee -a /etc/hosts

# Then open: http://logstream.local
```

## Socket.io Multi-Replica Note

The backend Service uses `sessionAffinity: ClientIP` to ensure each browser
client consistently reaches the same backend pod. This is required because
Socket.io's in-memory state (socket.logFilter) is per-process.

For production at scale, replace in-memory filter state with Redis adapter:
```bash
npm install @socket.io/redis-adapter ioredis
```
Then all replicas share state and true load balancing is possible.

## Storage Class Notes

| Environment | `log-data` PVC (ReadWriteMany) |
|-------------|-------------------------------|
| Minikube | Use `hostPath` (single node) |
| Kind | Use `local-path` provisioner |
| AWS | Amazon EFS + `efs-sc` StorageClass |
| GCP | Filestore + `nfs-client` |
| Azure | Azure Files + `azurefile` |

For Minikube, the `ReadWriteMany` PVC will provision automatically with the
`standard` storage class (backed by a single-node hostPath). This works
because all pods run on the same node.
