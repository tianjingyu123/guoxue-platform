#!/bin/sh
set -eu
python3 - <<'PY'
import json
import os
import hashlib
import tarfile
from pathlib import Path

root = Path('/opt/guoxue')
current = root / 'current'
shared_env = root / 'shared' / '.env.production'
packages = root / 'release-packages'
releases = root / 'releases'
evidence = root / 'release-evidence'
history = root / 'release-history.tsv'

release_id = None
marker = current / '.release-id'
if marker.is_file():
    release_id = marker.read_text(encoding='utf-8').strip()[:100]

archives = sorted(path.name for path in packages.glob('gx-deploy-91-*.tar.gz')) if packages.is_dir() else []
release_dirs = sorted(path.name for path in releases.iterdir() if path.is_dir()) if releases.is_dir() else []
archive_name = 'gx-deploy-91-' + release_id + '.tar.gz' if release_id else ''
archive = packages / archive_name if archive_name else None
archive_checksum = Path(str(archive) + '.sha256') if archive else None
archive_sha_matches = None
manifest_sha_matches = None
if archive and archive.is_file() and archive_checksum and archive_checksum.is_file():
    checksum_line = archive_checksum.read_text(encoding='utf-8').strip().splitlines()[0]
    expected_sha = checksum_line.split()[0].lower()
    digest = hashlib.sha256()
    with archive.open('rb') as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b''):
            digest.update(chunk)
    archive_sha_matches = len(expected_sha) == 64 and digest.hexdigest() == expected_sha
    manifest = releases / release_id / 'RELEASE-MANIFEST.json'
    if archive_sha_matches and manifest.is_file():
        with tarfile.open(archive, 'r:gz') as package:
            member = next((part for part in package if part.name.lstrip('./') == 'RELEASE-MANIFEST.json'), None)
            archived = package.extractfile(member).read() if member else None
        manifest_sha_matches = archived is not None and hashlib.sha256(archived).digest() == hashlib.sha256(manifest.read_bytes()).digest()
history_has_current = False
if release_id and history.is_file():
    with history.open(encoding='utf-8') as handle:
        history_has_current = any(len(fields := line.rstrip('\n').split('\t')) > 2 and fields[2] == release_id for line in handle)

print(json.dumps({
    'currentExists': current.exists(),
    'currentIsSymlink': current.is_symlink(),
    'currentTarget': str(current.resolve()) if current.exists() else None,
    'releaseId': release_id,
    'sharedEnvExists': shared_env.is_file(),
    'sharedEnvMode': oct(shared_env.stat().st_mode & 0o777) if shared_env.is_file() else None,
    'retainedFixedArchiveCount': len(archives),
    'releaseDirectoryCount': len(release_dirs),
    'fixedArchiveForCurrentExists': bool(archive and archive.is_file()),
    'fixedArchiveChecksumForCurrentExists': bool(archive and Path(str(archive) + '.sha256').is_file()),
    'fixedArchiveShaMatchesChecksum': archive_sha_matches,
    'deployedManifestMatchesArchive': manifest_sha_matches,
    'currentReleaseDirectoryExists': bool(release_id and (releases / release_id).is_dir()),
    'currentReleaseManifestExists': bool(release_id and (releases / release_id / 'RELEASE-MANIFEST.json').is_file()),
    'currentReleaseEvidenceExists': bool(release_id and (evidence / release_id).exists()),
    'historyExists': history.is_file(),
    'historyHasCurrent': history_has_current,
}, ensure_ascii=False))
PY
