#!/usr/bin/env bash

set -u

duration_seconds="${1:-90}"
base_url="${BASE_URL:-https://pre-api.rebugx.cn}"
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
    code="$(curl -ksS \
      --connect-timeout 3 \
      --max-time 10 \
      -o /dev/null \
      -w '%{http_code}' \
      "${base_url}${path}")"
    rc=$?
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
