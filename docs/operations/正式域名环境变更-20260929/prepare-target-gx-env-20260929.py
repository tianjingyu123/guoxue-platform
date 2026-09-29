"""对正式环境文件做受控的公开域名变更；默认只预检，不输出原文件内容。"""

import argparse
import hashlib
import json
import os
import re
import stat
import tempfile
from pathlib import Path

TARGET_H5 = "https://gx.yrydai.com/h5/"
TARGET_ORIGIN = "https://gx.yrydai.com"
EXPECTED_UNCHANGED = {
    "PUBLIC_API_URL": "https://api.rebugx.cn",
    "VITE_API_URL": "https://api.rebugx.cn",
    "PUBLIC_ASSET_ORIGIN": "https://static.rebugx.cn",
    "VITE_PUBLIC_ASSET_ORIGIN": "https://static.rebugx.cn",
}
CHANGED = {"PUBLIC_H5_URL", "VITE_PUBLIC_H5_URL", "CORS_ORIGIN", "WS_CORS_ORIGIN"}
LINE = re.compile(r"^(?P<prefix>\s*(?:export\s+)?(?P<key>[A-Z0-9_]+)\s*=\s*)(?P<value>.*?)(?P<newline>\r?\n?)$")


def plain_value(value: str) -> tuple[str, str]:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        return value[1:-1], value[0]
    if " #" in value or "\t#" in value:
        raise ValueError("公开配置含行尾注释，请人工审阅后再变更")
    return value, ""


def make_plan(content: str) -> tuple[str, list[str]]:
    lines = content.splitlines(keepends=True)
    found = {}
    for index, line in enumerate(lines):
        matched = LINE.match(line)
        if not matched:
            continue
        key = matched.group("key")
        if key not in CHANGED and key not in EXPECTED_UNCHANGED:
            continue
        if key in found:
            raise ValueError("公开配置存在重复键：" + key)
        value, quote = plain_value(matched.group("value"))
        found[key] = (index, matched, value, quote)

    missing = (CHANGED | EXPECTED_UNCHANGED.keys()) - found.keys()
    if missing:
        raise ValueError("缺少公开配置键：" + ",".join(sorted(missing)))
    for key, expected in EXPECTED_UNCHANGED.items():
        if found[key][2].rstrip("/") != expected:
            raise ValueError("现有正式 API/静态域名不符合预期：" + key)

    replacements = {}
    for key in ("PUBLIC_H5_URL", "VITE_PUBLIC_H5_URL"):
        replacements[key] = TARGET_H5
    for key in ("CORS_ORIGIN", "WS_CORS_ORIGIN"):
        old = found[key][2]
        origins = [part.strip() for part in old.split(",") if part.strip()]
        if not origins or "*" in origins:
            raise ValueError("跨域列表为空或包含通配符：" + key)
        if TARGET_ORIGIN not in origins:
            origins.append(TARGET_ORIGIN)
        replacements[key] = ",".join(origins)

    changed = []
    for key, desired in replacements.items():
        index, matched, old, quote = found[key]
        if old == desired:
            continue
        newline = matched.group("newline")
        lines[index] = matched.group("prefix") + quote + desired + quote + newline
        changed.append(key)
    return "".join(lines), sorted(changed)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=Path, default=Path("/opt/guoxue/shared/.env.production"))
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--expect-before-sha256")
    args = parser.parse_args()

    target = args.path
    if target.is_symlink() or not target.is_file():
        raise ValueError("目标必须是存在的普通文件，不能是符号链接")
    original = target.read_bytes()
    before_sha = hashlib.sha256(original).hexdigest()
    if args.apply and (not args.expect_before_sha256 or args.expect_before_sha256.lower() != before_sha):
        raise ValueError("应用模式必须提供与当前文件一致的 SHA-256，未改动")
    content = original.decode("utf-8")
    updated, changed = make_plan(content)
    updated_bytes = updated.encode("utf-8")
    report = {"mode": "apply" if args.apply else "check", "ready": not changed,
              "needsChange": bool(changed), "changedKeys": changed,
              "nonTargetBytesPreserved": True}
    if not args.apply or not changed:
        print(json.dumps(report, ensure_ascii=False))
        return

    current = target.read_bytes()
    if current != original:
        raise ValueError("预检后目标文件已变化，未改动")
    info = target.stat()
    backup = target.with_name(target.name + ".bak.gx-h5." + before_sha[:12])
    with backup.open("xb") as out:
        out.write(original)
        out.flush()
        os.fsync(out.fileno())
    os.chmod(backup, stat.S_IMODE(info.st_mode))
    try:
        os.chown(backup, info.st_uid, info.st_gid)
    except AttributeError:
        pass

    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".env.gx-h5.", delete=False) as out:
            temp_name = out.name
            out.write(updated_bytes)
            out.flush()
            os.fsync(out.fileno())
        os.chmod(temp_name, stat.S_IMODE(info.st_mode))
        try:
            os.chown(temp_name, info.st_uid, info.st_gid)
        except AttributeError:
            pass
        if target.read_bytes() != original:
            raise ValueError("写入前目标文件再次变化，未替换")
        os.replace(temp_name, target)
        if hasattr(os, "O_DIRECTORY"):
            fd = os.open(target.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)
    report["ready"] = True
    report["backupCreated"] = True
    report["postWriteVerified"] = target.read_bytes() == updated_bytes
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        raise SystemExit(1)
