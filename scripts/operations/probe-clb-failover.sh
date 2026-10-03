#!/usr/bin/env bash

set -Eeuo pipefail

duration_seconds="${1:-90}"
: "${BASE_URL:?必须通过 BASE_URL 指定本次切换要探测的公网入口}"
base_url="${BASE_URL%/}"
if [[ ! "${base_url}" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] \
  || [[ "${base_url}" == *".example.com"* ]]; then
  echo "BASE_URL 必须是无路径、非占位符的 HTTPS 公网根地址：${base_url}" >&2
  exit 2
fi
paths=(
  "/h5/"
  "/api/v1/health/ready"
  "/socket.io/?EIO=4&transport=polling"
)

end_seconds=$((SECONDS + duration_seconds))
cycles=0
total=0
failed=0

while (( SECONDS < end_seconds )); do
  for path in "${paths[@]}"; do
    if code="$(curl -ksS \
      --connect-timeout 3 \
      --max-time 10 \
      -o /dev/null \
      -w '%{http_code}' \
      "${base_url}${path}")"; then
      rc=0
    else
      rc=$?
    fi
    total=$((total + 1))

    if (( rc != 0 )) || [[ "$code" != "200" ]]; then
      failed=$((failed + 1))
      printf 'FAIL cycle=%d path=%s rc=%d code=%s\n' \
        "$cycles" "$path" "$rc" "$code"
    fi
  done

  cycles=$((cycles + 1))
  if (( cycles % 10 == 0 )); then
    printf 'progress cycles=%d total=%d failed=%d\n' \
      "$cycles" "$total" "$failed"
  fi
  sleep 1
done

printf 'RESULT cycles=%d total=%d failed=%d\n' \
  "$cycles" "$total" "$failed"

(( failed == 0 ))
