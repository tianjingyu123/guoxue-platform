"""将已审阅的 Python 预检脚本封装为 TAT 可执行的只读 Bash 脚本。"""

import argparse
import base64
import hashlib
import json
from pathlib import Path
from textwrap import wrap


SOURCE = Path(__file__).with_name("prepare-target-gx-env-20260929.py")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    source = SOURCE.read_bytes()
    source_hash = hashlib.sha256(source).hexdigest()
    encoded = "\n".join(wrap(base64.b64encode(source).decode("ascii"), 76))
    shell = f"""#!/usr/bin/env bash
set -euo pipefail
tmp=$(mktemp /tmp/rebu-gx-env-check.XXXXXXXX.py)
trap 'rm -f "$tmp"' EXIT
base64 --decode > "$tmp" <<'REBU_GX_ENV_SCRIPT'
{encoded}
REBU_GX_ENV_SCRIPT
actual=$(sha256sum "$tmp" | cut -d ' ' -f 1)
test "$actual" = '{source_hash}' || {{ printf 'SCRIPT_HASH_MISMATCH\\n'; exit 2; }}
python3 "$tmp" --path /opt/guoxue/shared/.env.production
"""
    output = args.output
    if output.exists():
        raise ValueError("目标文件已存在，拒绝覆盖")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(shell.encode("utf-8"))
    print(json.dumps({"output": str(output), "sourceSha256": source_hash,
                      "wrapperSha256": hashlib.sha256(shell.encode("utf-8")).hexdigest()}))


if __name__ == "__main__":
    main()
