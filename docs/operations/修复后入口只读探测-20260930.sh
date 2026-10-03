#!/bin/sh
set -eu
python3 - <<'PY'
import json
import subprocess

checks = [
    ('api-live', 'api.rebugx.cn', '/api/v1/health/live'),
    ('h5-root', 'gx.yrydai.com', '/h5/'),
]
results = []
for label, host, path in checks:
    code = subprocess.check_output([
        'curl', '-sS', '--connect-timeout', '3', '--max-time', '10',
        '-o', '/dev/null', '-w', '%{http_code}',
        '-H', 'Host: ' + host, 'http://127.0.0.1' + path,
    ], text=True, timeout=15).strip()
    results.append({'check': label, 'statusCode': code})
print(json.dumps(results, ensure_ascii=False))
PY
