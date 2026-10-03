#!/bin/sh
set -eu
python3 - <<'PY'
import json, subprocess, socket

program = r'''
const fs = require('fs');
const paths = ['/app', '/app/node_modules', '/app/apps', '/app/apps/server', '/app/apps/server/node_modules', '/app/apps/server/dist', '/app/apps/server/dist/main.js'];
const result = {cwd: process.cwd(), paths: Object.fromEntries(paths.map(p => [p, fs.existsSync(p)]))};
for (const base of ['/app', '/app/apps/server']) {
  result[base + '/directories'] = fs.existsSync(base) ? fs.readdirSync(base, {withFileTypes:true}).filter(x => x.isDirectory()).map(x => x.name).slice(0, 25) : [];
}
console.log(JSON.stringify(result));
'''
result = subprocess.run(['docker', 'exec', 'guoxue-server', 'node', '-e', program], text=True, capture_output=True, timeout=20)
if result.returncode:
    print(json.dumps({'node': socket.gethostname(), 'status': 'FAILED', 'exitCode': result.returncode}))
    raise SystemExit(1)
data = json.loads(result.stdout)
data['node'] = socket.gethostname()
print(json.dumps(data, ensure_ascii=False))
PY
