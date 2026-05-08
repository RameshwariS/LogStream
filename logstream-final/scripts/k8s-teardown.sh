#!/usr/bin/env bash
# scripts/k8s-teardown.sh
# Removes all LogStream resources from the cluster.
# Optionally deletes PVCs (permanent data loss — requires --delete-data flag).
#
# Usage:
#   bash scripts/k8s-teardown.sh                 # remove deployments, keep data
#   bash scripts/k8s-teardown.sh --delete-data   # also delete PVCs

DELETE_DATA=false
[[ "${1:-}" == "--delete-data" ]] && DELETE_DATA=true

echo "Removing LogStream from Kubernetes..."
kubectl delete namespace logstream --ignore-not-found

if $DELETE_DATA; then
  echo "Deleting PersistentVolumes..."
  kubectl delete pv -l app.kubernetes.io/part-of=logstream --ignore-not-found
fi

echo "Done. Namespace 'logstream' removed."
