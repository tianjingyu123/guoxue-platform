#!/bin/sh
set -eu
python3 - <<'PY'
import hashlib
import json
import subprocess
from urllib.parse import urlsplit

container = json.loads(subprocess.check_output(
    ['docker', 'inspect', 'guoxue-server'], text=True, timeout=15,
))[0]
env = dict(item.split('=', 1) for item in container['Config'].get('Env', []) if '=' in item)
url = env.get('REDIS_URL', '')
sentinels = env.get('REDIS_SENTINEL_HOSTS', '')
mode = 'sentinel' if sentinels else ('url' if url else 'none')
identity = (sentinels + '|' + env.get('REDIS_SENTINEL_NAME', 'mymaster')) if sentinels else url
parsed = urlsplit(url) if url else None
host = (parsed.hostname or '').lower() if parsed else ''
loopback = host in ('localhost', '127.0.0.1', '::1')

# 仅对真实运行容器做 PING，不写键、不打印连接串、密码或错误详情。
probe = r'''
let Redis;
try { Redis = require('/app/apps/server/node_modules/ioredis'); }
catch { process.stdout.write('MODULE_FAIL'); process.exit(2); }
const { checkServerIdentity } = require('node:tls');
const url = process.env.REDIS_URL;
if (!url || process.env.REDIS_SENTINEL_HOSTS) process.exit(2);
const parsed = new URL(url);
const tls = parsed.protocol === 'rediss:' ? {
  rejectUnauthorized: true,
  checkServerIdentity(host, cert) {
    const error = checkServerIdentity(host, cert);
    return error && !(host === parsed.hostname && cert.subject?.CN === parsed.hostname) ? error : undefined;
  },
} : undefined;
const redis = new Redis(url, {
  lazyConnect: true, connectTimeout: 4000, maxRetriesPerRequest: 1,
  retryStrategy: () => null, ...(tls ? { tls } : {}),
});
redis.on('error', () => {});
(async () => {
  try {
    await redis.connect();
    process.stdout.write((await redis.ping()) === 'PONG' ? 'PING_OK' : 'PING_FAIL');
  } catch {
    process.stdout.write('CONNECT_OR_PING_FAIL');
  } finally {
    redis.disconnect();
  }
})().catch(() => process.exit(3));
'''
ping = 'not_attempted'
if mode == 'url':
    result = subprocess.run(
        ['docker', 'exec', '-i', 'guoxue-server', 'node', '-'],
        input=probe, text=True, capture_output=True, timeout=20,
    )
    ping = 'ok' if result.returncode == 0 and result.stdout.strip() == 'PING_OK' else 'fail'
    ping_category = result.stdout.strip() if result.stdout.strip() in ('MODULE_FAIL', 'CONNECT_OR_PING_FAIL') else None
else:
    ping_category = None

print(json.dumps({
    'redisMode': mode,
    'runtimeConfigFingerprint': hashlib.sha256(identity.encode()).hexdigest() if identity else None,
    'urlUsesTls': bool(parsed and parsed.scheme == 'rediss'),
    'urlIsLoopback': loopback,
    'directPing': ping,
    'pingFailureCategory': ping_category if ping != 'ok' else None,
}, ensure_ascii=False))
PY
