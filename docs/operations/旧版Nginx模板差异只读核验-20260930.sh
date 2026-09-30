#!/bin/sh
set -eu
python3 - <<'PY'
import difflib
import hashlib
import json
import tarfile
from pathlib import Path

root = Path('/opt/guoxue')
release_id = (root / 'current' / '.release-id').read_text(encoding='utf-8').strip()
directory = root / 'releases' / release_id
path = 'docker/nginx/nginx.clb.conf.template'
current_file = directory / path
backups = sorted(current_file.parent.glob(current_file.name + '.bak-*'))
archive = root / 'release-packages' / ('gx-deploy-91-' + release_id + '.tar.gz')
with tarfile.open(archive, 'r:gz') as package:
    member = next(part for part in package if part.name.lstrip('./') == path)
    original = package.extractfile(member).read()
current = current_file.read_bytes()
digest = lambda data: hashlib.sha256(data).hexdigest()
diff = list(difflib.unified_diff(original.decode('utf-8').splitlines(), current.decode('utf-8').splitlines(), lineterm=''))
print(json.dumps({
    'releaseId': release_id,
    'path': path,
    'archiveSha256': digest(original),
    'currentSha256': digest(current),
    'backupCount': len(backups),
    'backups': [{'name': file.name, 'sha256': digest(file.read_bytes()), 'equalsArchive': file.read_bytes() == original, 'equalsCurrent': file.read_bytes() == current} for file in backups],
    'diffLineCount': len(diff),
    'diff': diff[:80],
}, ensure_ascii=False))
PY
