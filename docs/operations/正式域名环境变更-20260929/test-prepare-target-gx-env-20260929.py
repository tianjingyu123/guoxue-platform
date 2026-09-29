"""在临时文件上验证正式域名环境变更，不连接线上节点。"""

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path


SCRIPT = Path(__file__).with_name("prepare-target-gx-env-20260929.py")
BASE = """# 保留原注释
PUBLIC_API_URL=https://api.rebugx.cn
VITE_API_URL='https://api.rebugx.cn'
PUBLIC_ASSET_ORIGIN=https://static.rebugx.cn
VITE_PUBLIC_ASSET_ORIGIN=https://static.rebugx.cn
PUBLIC_H5_URL=https://api.rebugx.cn/h5/
VITE_PUBLIC_H5_URL=https://api.rebugx.cn/h5/
CORS_ORIGIN=https://api.rebugx.cn,https://old.example.cn
WS_CORS_ORIGIN='https://api.rebugx.cn,https://old.example.cn'
PRIVATE_TOKEN=TEST_VALUE_NOT_TO_PRINT
"""


def run(path: Path, *flags: str) -> tuple[int, dict]:
    process = subprocess.run(
        [sys.executable, str(SCRIPT), "--path", str(path), *flags],
        capture_output=True,
        text=True,
        check=False,
    )
    assert not process.stderr, "工具不得向标准错误输出配置或调用栈"
    assert "TEST_VALUE_NOT_TO_PRINT" not in process.stdout, "工具泄露了无关配置"
    return process.returncode, json.loads(process.stdout)


with tempfile.TemporaryDirectory(prefix="gx-env-test-") as directory:
    target = Path(directory) / ".env.production"
    original = BASE.encode("utf-8")
    target.write_bytes(original)
    before_sha = hashlib.sha256(original).hexdigest()

    code, check = run(target)
    assert code == 0 and check["mode"] == "check"
    assert check["changedKeys"] == sorted(
        ["PUBLIC_H5_URL", "VITE_PUBLIC_H5_URL", "CORS_ORIGIN", "WS_CORS_ORIGIN"]
    )
    assert target.read_bytes() == original, "默认预检不得写文件"

    code, stale = run(target, "--apply", "--expect-before-sha256", "0" * 64)
    assert code == 1 and stale["ok"] is False
    assert target.read_bytes() == original, "版本不匹配不得写文件"

    code, applied = run(target, "--apply", "--expect-before-sha256", before_sha)
    assert code == 0 and applied["ready"] and applied["postWriteVerified"]
    updated = target.read_text(encoding="utf-8")
    assert "PUBLIC_H5_URL=https://gx.yrydai.com/h5/" in updated
    assert "VITE_PUBLIC_H5_URL=https://gx.yrydai.com/h5/" in updated
    assert "CORS_ORIGIN=https://api.rebugx.cn,https://old.example.cn,https://gx.yrydai.com" in updated
    assert "WS_CORS_ORIGIN='https://api.rebugx.cn,https://old.example.cn,https://gx.yrydai.com'" in updated
    assert "PRIVATE_TOKEN=TEST_VALUE_NOT_TO_PRINT" in updated
    backup = target.with_name(target.name + ".bak.gx-h5." + before_sha[:12])
    assert backup.read_bytes() == original, "备份必须完整保留原字节"

    after = target.read_bytes()
    code, ready = run(target)
    assert code == 0 and ready["ready"] and not ready["changedKeys"]
    code, repeated = run(target, "--apply", "--expect-before-sha256", hashlib.sha256(after).hexdigest())
    assert code == 0 and repeated["ready"] and target.read_bytes() == after

    target.write_text(BASE.replace("CORS_ORIGIN=https://api.rebugx.cn,https://old.example.cn", "CORS_ORIGIN=*"), encoding="utf-8")
    code, rejected = run(target)
    assert code == 1 and rejected["ok"] is False, "通配符必须拒绝"

    target.write_text(BASE.replace("PUBLIC_API_URL=https://api.rebugx.cn\n", ""), encoding="utf-8")
    code, rejected = run(target)
    assert code == 1 and rejected["ok"] is False, "缺少公开键必须拒绝"

    target.write_text(BASE + "PUBLIC_H5_URL=https://duplicate.invalid\n", encoding="utf-8")
    code, rejected = run(target)
    assert code == 1 and rejected["ok"] is False, "重复公开键必须拒绝"

print("PASS: 预检不写入、四键定向变更、原字节备份、幂等、版本锁与异常拒绝")
