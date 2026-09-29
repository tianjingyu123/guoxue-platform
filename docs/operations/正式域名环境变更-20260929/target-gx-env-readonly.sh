#!/usr/bin/env bash
set -euo pipefail

target=/opt/guoxue/shared/.env.production
printf 'HOST=%s\n' "$(hostname)"
if [ ! -f "$target" ] || [ -L "$target" ]; then
  printf 'ENV_FILE=missing_or_symlink\n'
  exit 2
fi

printf 'ENV_FILE=regular\n'
printf 'ENV_SHA256=%s\n' "$(sha256sum "$target" | cut -d ' ' -f 1)"
printf 'ENV_UID_GID_MODE=%s\n' "$(stat -c '%u:%g:%a' "$target")"
printf 'ENV_MOUNT_TYPE=%s\n' "$(findmnt -T "$target" -no FSTYPE | head -n 1)"

if command -v python3 >/dev/null 2>&1; then
  printf 'PYTHON3=available\n'
  python3 -c 'import sys; print("PYTHON_VERSION=" + ".".join(map(str, sys.version_info[:3])))'
else
  printf 'PYTHON3=missing\n'
fi
