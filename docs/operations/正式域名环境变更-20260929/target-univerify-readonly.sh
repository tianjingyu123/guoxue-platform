#!/usr/bin/env bash
set -euo pipefail

target=/opt/guoxue/shared/.env.production
if [ ! -f "$target" ] || [ -L "$target" ]; then
  printf 'ENV_FILE=missing_or_symlink\n'
  exit 2
fi

python3 - "$target" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
def values(key):
    pattern = re.compile(r"^\s*(?:export\s+)?" + re.escape(key) + r"\s*=\s*(.*)$", re.M)
    return [v.strip().strip("\"'") for v in pattern.findall(text)]

secret = values("REBU_UNIVERIFY_SHARED_SECRET")
print("UNIVERIFY_SECRET_KEY_COUNT=" + str(len(secret)))
print("UNIVERIFY_SECRET_READY=" + str(len(secret) == 1 and len(secret[0]) >= 32).lower())
redis = values("REDIS_URL")
print("REDIS_URL_KEY_COUNT=" + str(len(redis)))
print("REDIS_URL_PRESENT=" + str(len(redis) == 1 and bool(redis[0])).lower())
PY
