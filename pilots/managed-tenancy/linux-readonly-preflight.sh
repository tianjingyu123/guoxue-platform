#!/bin/sh
set -eu
# 只读读取主机能力；不安装依赖、不读密钥、不改业务服务或数据库。
command -v python3 >/dev/null 2>&1 || { printf 'PREFLIGHT_PYTHON3_MISSING\n'; exit 2; }
exec python3 - <<'PY'
import json, os, pathlib, re, shutil, socket, subprocess

def version(command):
    executable = shutil.which(command[0])
    if not executable:
        return {"available": False}
    try:
        result = subprocess.run([executable, *command[1:]], capture_output=True, text=True, timeout=5, check=False)
        match = re.search(r"\b(?:v)?\d+\.\d+(?:\.\d+)?\b", result.stdout + result.stderr)
        return {"available": True, "exitCode": result.returncode, "version": match.group(0) if match else None}
    except (OSError, subprocess.SubprocessError):
        return {"available": True, "version": None, "readFailed": True}

release = {}
for line in pathlib.Path('/etc/os-release').read_text().splitlines():
    key, separator, value = line.partition('=')
    if separator and key in ('ID', 'VERSION_ID'):
        release[key] = value.strip('"')
memory = {}
for line in pathlib.Path('/proc/meminfo').read_text().splitlines():
    key, _, value = line.partition(':')
    if key in ('MemTotal', 'MemAvailable'):
        memory[key] = int(value.split()[0]) * 1024
disk = os.statvfs('/')
cgroup = pathlib.Path('/sys/fs/cgroup')
controllers = (cgroup / 'cgroup.controllers').read_text().split() if (cgroup / 'cgroup.controllers').is_file() else []
system_state = None
if shutil.which('systemctl'):
    result = subprocess.run(['systemctl', 'is-system-running'], capture_output=True, text=True, timeout=5, check=False)
    value = result.stdout.strip()
    if value in ('initializing', 'starting', 'running', 'degraded', 'maintenance', 'stopping', 'offline', 'unknown'):
        system_state = value
ports = {}
if shutil.which('ss'):
    result = subprocess.run(['ss', '-H', '-ltn'], capture_output=True, text=True, timeout=5, check=False)
    for port in (80, 443, 5432, 6379):
        ports[str(port)] = sum(1 for line in result.stdout.splitlines() if len(line.split()) >= 4 and line.split()[3].rsplit(':', 1)[-1] == str(port))
report = {
    "protocol": "managed-linux-readonly-v1", "hostname": socket.gethostname(),
    "os": release, "architecture": os.uname().machine, "cpuLogicalCount": os.cpu_count(),
    "memoryBytes": memory, "rootDiskBytes": {"total": disk.f_blocks * disk.f_frsize, "available": disk.f_bavail * disk.f_frsize},
    "cgroup": {"v2": bool(controllers), "controllers": sorted(controllers)},
    "systemd": {"version": version(['systemctl', '--version']), "state": system_state},
    "tools": {name: version(command) for name, command in {
        'node': ['node', '--version'], 'postgresClient': ['psql', '--version'],
        'redisServer': ['redis-server', '--version'], 'dockerClient': ['docker', '--version']
    }.items()}, "pnpmCommandPresent": bool(shutil.which('pnpm')), "fixedListeningPortCounts": ports,
    "businessReadOnly": True, "credentialsRead": False, "servicesChanged": False,
    "limits": ['只证明主机能力及瞬时余量，不代表客户运行隔离、负载容量或停机验收', '未连接数据库、Redis或Docker守护进程，未读取环境变量、业务配置或进程命令行', 'TAT执行代理仍会产生自身执行记录，不代表整个系统零文件写入']
}
print(json.dumps(report, ensure_ascii=False, separators=(',', ':')))
PY
