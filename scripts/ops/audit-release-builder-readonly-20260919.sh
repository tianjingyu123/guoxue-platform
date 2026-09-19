#!/usr/bin/env bash
set -euo pipefail

container="$(docker ps --filter label=com.docker.compose.service=server --format '{{.ID}}' | head -n 1)"
if [[ -z "$container" ]]; then
  echo 'SERVER_CONTAINER=NOT_FOUND'
  exit 2
fi

echo "NODE=$(hostname)"
echo "SERVER_CONTAINER=${container:0:12}"
docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$container" \
  | awk -F= '$1=="VITE_API_URL" || $1=="VITE_PUBLIC_H5_URL" || $1=="VITE_PUBLIC_ASSET_ORIGIN" || $1=="VITE_RELEASE_CHANNEL" {print}' \
  | sort
config_files="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$container")"
IFS=',' read -r -a config_paths <<< "$config_files"
for config_path in "${config_paths[@]}"; do
  if [[ -f "$config_path" ]]; then
    grep -E '"?VITE_(API_URL|PUBLIC_H5_URL|PUBLIC_ASSET_ORIGIN|RELEASE_CHANNEL)"?[[:space:]]*[:=]' "$config_path" \
      | sed -E 's/^[[:space:]]+//' \
      | sort -u || true
  fi
done
find /opt/guoxue -maxdepth 6 -type f \
  \( -name '.env*' -o -name '*.json' -o -name '*.yml' -o -name '*.yaml' \) -print0 \
  | xargs -0 -r grep -hE '^[[:space:]]*"?VITE_(API_URL|PUBLIC_H5_URL|PUBLIC_ASSET_ORIGIN|RELEASE_CHANNEL)"?[[:space:]]*[:=]' \
  | sed -E 's/^[[:space:]]+//' \
  | sort -u || true
echo "DOCKER_SERVER=$(docker version --format '{{.Server.Version}}')"
echo "DOCKER_OS=$(docker info --format '{{.OSType}}/{{.Architecture}}')"
echo "DISK_AVAILABLE_KB=$(df -Pk /opt | awk 'NR==2 {print $4}')"
echo "MEM_AVAILABLE_KB=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)"
echo 'READ_ONLY_BUILDER_AUDIT_OK'
