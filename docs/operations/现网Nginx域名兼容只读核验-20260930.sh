#!/bin/sh
set -eu
python3 - <<'PY'
import json
import subprocess
from pathlib import Path

env_file = Path('/opt/guoxue/shared/.env.production')
server_names = ''
for line in env_file.read_text(encoding='utf-8').splitlines():
    if line.startswith('NGINX_SERVER_NAMES='):
        server_names = line.partition('=')[2].strip().strip('"\'')
        break

containers = subprocess.check_output(['docker', 'ps', '--format', '{{.Names}}'], text=True, timeout=20).splitlines()
nginx_names = [name for name in containers if 'nginx' in name.lower()]
active = []
for name in nginx_names:
    config = subprocess.check_output(['docker', 'exec', name, 'cat', '/etc/nginx/nginx.conf'], text=True, timeout=20)
    active.append({
        'container': name,
        'apiHostPresent': 'api.rebugx.cn' in config,
        'h5HostPresent': 'gx.yrydai.com' in config,
    })

print(json.dumps({
    'nginxServerNamesKeyPresent': bool(server_names),
    'envApiHostPresent': 'api.rebugx.cn' in server_names.split(),
    'envH5HostPresent': 'gx.yrydai.com' in server_names.split(),
    'activeNginx': active,
}, ensure_ascii=False))
PY
