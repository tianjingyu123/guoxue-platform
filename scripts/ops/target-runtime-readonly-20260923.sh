#!/bin/sh
set -eu
python3 - <<'PY'
import json, subprocess, socket

container = json.loads(subprocess.check_output(['docker', 'inspect', 'guoxue-server'], text=True, timeout=20))[0]
image = json.loads(subprocess.check_output(['docker', 'image', 'inspect', container['Image']], text=True, timeout=20))[0]
labels = image.get('Config', {}).get('Labels') or {}
safe_labels = {key: value for key, value in labels.items() if key.lower() in {
    'org.opencontainers.image.revision', 'org.opencontainers.image.version',
    'org.opencontainers.image.created', 'revision', 'version', 'git_commit',
}}
env_names = sorted(entry.partition('=')[0] for entry in container['Config'].get('Env') or [])
server_hash = subprocess.check_output(['docker', 'exec', 'guoxue-server', 'sha256sum', '/app/apps/server/dist/main.js'], text=True, timeout=20).split()[0]
print(json.dumps({
    'node': socket.gethostname(),
    'image': container['Image'],
    'workingDir': container['Config'].get('WorkingDir'),
    'entrypoint': container['Config'].get('Entrypoint'),
    'command': container['Config'].get('Cmd'),
    'safeImageLabels': safe_labels,
    'serverMainSha256': server_hash,
    'databaseUrlPresent': 'DATABASE_URL' in env_names,
    'databaseEnvNames': [name for name in env_names if name.startswith('DATABASE_') or name.startswith('PRISMA_')],
}, ensure_ascii=False))
PY
