#!/bin/sh
set -eu
python3 - <<'PY'
import json
import os
import hashlib
import tarfile
from pathlib import Path

root = Path('/opt/guoxue')
release_id = 'preprod-cd055084-20260903-r1'
release_dir = root / 'releases' / release_id
current_link = root / 'current'
env_file = root / 'shared' / '.env.production'
template = release_dir / 'docker' / 'nginx' / 'nginx.clb.conf.template'
evidence = root / 'release-evidence' / release_id / 'immutability-repair-20260930'
expected_original = 'e0d9f30137ae618fe7bc6256fa5e2ed7415d8bae2c0bee941ad8fd5119afdddc'
expected_modified = '63149d212827ed9e351739d0dd006456fd13cfc74808c921f2cf34e9a37b9577'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def save_once(path, data):
    descriptor = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, 'wb') as handle:
        handle.write(data)

if not current_link.is_symlink() or current_link.resolve() != release_dir.resolve():
    raise SystemExit('CURRENT_RELEASE_CHANGED')
if (current_link / '.release-id').read_text(encoding='utf-8').strip() != release_id:
    raise SystemExit('RELEASE_ID_CHANGED')
if env_file.is_symlink() or (env_file.stat().st_mode & 0o777) != 0o600:
    raise SystemExit('ENV_MODE_CHANGED')
if template.is_symlink():
    raise SystemExit('TEMPLATE_NOT_REGULAR')
modified = template.read_bytes()
if digest(modified) != expected_modified:
    raise SystemExit('TEMPLATE_CHANGED')
backups = list(template.parent.glob(template.name + '.bak-*'))
if len(backups) != 1:
    raise SystemExit('BACKUP_COUNT_CHANGED')
backup = backups[0]
if backup.is_symlink():
    raise SystemExit('BACKUP_NOT_REGULAR')
original = backup.read_bytes()
if digest(original) != expected_original:
    raise SystemExit('BACKUP_CHANGED')
archive = root / 'release-packages' / ('gx-deploy-91-' + release_id + '.tar.gz')
with tarfile.open(archive, 'r:gz') as package:
    member = next(part for part in package if part.name.lstrip('./') == 'docker/nginx/nginx.clb.conf.template')
    archived_original = package.extractfile(member).read()
if archived_original != original:
    raise SystemExit('ARCHIVE_TEMPLATE_CHANGED')

env_before = env_file.read_bytes()
lines = env_before.splitlines(keepends=True)
matches = [index for index, line in enumerate(lines) if line.startswith(b'NGINX_SERVER_NAMES=')]
if len(matches) != 1:
    raise SystemExit('SERVER_NAMES_KEY_COUNT_CHANGED')
index = matches[0]
line = lines[index]
ending = b'\r\n' if line.endswith(b'\r\n') else (b'\n' if line.endswith(b'\n') else b'')
value = line[len(b'NGINX_SERVER_NAMES='):len(line) - len(ending) if ending else len(line)].decode('utf-8').strip()
quote = value[0] if len(value) >= 2 and value[0] in ('"', "'") and value[-1] == value[0] else ''
unquoted = value[1:-1] if quote else value
if '#' in unquoted or 'api.rebugx.cn' not in unquoted.split() or 'gx.yrydai.com' in unquoted.split():
    raise SystemExit('SERVER_NAMES_UNEXPECTED')
new_value = unquoted + ' gx.yrydai.com'
lines[index] = b'NGINX_SERVER_NAMES=' + (quote + new_value + quote).encode('utf-8') + ending
env_after = b''.join(lines)
if env_file.read_bytes() != env_before:
    raise SystemExit('ENV_CHANGED_BEFORE_WRITE')

evidence.mkdir(mode=0o700, parents=False, exist_ok=False)
save_once(evidence / 'env-before.bin', env_before)
save_once(evidence / 'template-modified.bin', modified)
save_once(evidence / 'template-original.bin', original)
temporary = env_file.with_name('.env.production.immutability-repair-20260930.tmp')
save_once(temporary, env_after)
try:
    os.replace(temporary, env_file)
    template.write_bytes(original)
    os.replace(backup, evidence / backup.name)
    if digest(template.read_bytes()) != expected_original:
        raise RuntimeError('RESTORED_TEMPLATE_MISMATCH')
    if env_file.read_bytes() != env_after:
        raise RuntimeError('ENV_UPDATE_MISMATCH')
    if backup.exists():
        raise RuntimeError('BACKUP_STILL_IN_RELEASE')
except Exception:
    restore = env_file.with_name('.env.production.immutability-restore-20260930.tmp')
    save_once(restore, env_before)
    os.replace(restore, env_file)
    template.write_bytes(modified)
    retained = evidence / backup.name
    if retained.exists() and not backup.exists():
        os.replace(retained, backup)
    raise

receipt = {
    'releaseId': release_id,
    'templateRestoredFromArchivedOriginal': True,
    'originalTemplateSha256': expected_original,
    'modifiedTemplatePreserved': True,
    'originalBackupPreservedOutsideRelease': True,
    'nginxServerNamesIncludesNewH5Host': True,
    'environmentValueOutput': False,
    'containerRestarted': False,
}
save_once(evidence / 'receipt.json', (json.dumps(receipt, ensure_ascii=False) + '\n').encode('utf-8'))
print(json.dumps(receipt, ensure_ascii=False))
PY
