#!/usr/bin/env python3
"""
古籍字体 WOFF2 子集化构建脚本

将中文字体源文件分割为按 unicode-range 分层的 WOFF2 子集，
配合 classic-font.config.ts 中的 4 层回退链使用。

准备工作（手动一次）：
  1. 下载霞鹜文楷: https://github.com/lxgw/LxgwWenKai/releases
  2. 下载思源宋体: https://github.com/adobe-fonts/source-han-serif/releases
  3. 下载天珩全字库: https://github.com/THfont/TH-Khaai/releases
  4. npm install -g glyphhanger  # 或 glyphhanger 的子集化 CLI

用法：
  python scripts/build-fonts.py --source ./fonts/source --output ./fonts/public

环境变量：
  FONT_CDN_BASE  最终 CDN 地址（例如 https://cdn.guoxue.cn/fonts）
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

# ── 字体分层定义 ──
FONT_LAYERS = [
    {
        "name": "霞鹜文楷",
        "family": "LXGW WenKai",
        "source_files": {
            "LXGWWenKai-Regular.ttf": "LXGWWenKai-Regular.woff2",
            "LXGWWenKai-Bold.ttf": "LXGWWenKai-Bold.woff2",
        },
        "unicode_range": "U+4E00-9FFF,U+3400-4DBF",
        "glyphs": "CJK Unified Ideographs + Extension A (27,000+)",
    },
    {
        "name": "思源宋体",
        "family": "Source Han Serif",
        "source_files": {
            "SourceHanSerifCN-Regular.ttf": "SourceHanSerifCN-Regular.woff2",
        },
        "unicode_range": "U+4E00-9FFF,U+3400-4DBF,U+20000-2A6DF,U+2A700-2B73F,U+2B740-2B81F,U+2B820-2CEAF",
        "glyphs": "CJK Unified Ideographs + Extension A-F (44,000+)",
    },
    {
        "name": "天珩全字库-PP0",
        "family": "TH-Khaai-PP0",
        "source_files": {
            "TH-Khaai-PP0.ttf": "TH-Khaai-PP0.woff2",
        },
        "unicode_range": "U+30000-3134F,U+2CEB0-2EBEF",
        "glyphs": "CJK Extension G-I (生僻字)",
    },
    {
        "name": "天珩全字库-PP1",
        "family": "TH-Khaai-PP1",
        "source_files": {
            "TH-Khaai-PP1.ttf": "TH-Khaai-PP1.woff2",
        },
        "unicode_range": "U+2F800-2FA1F,U+E0000-E007F",
        "glyphs": "CJK Compatibility Ideographs Supplement + Tags",
    },
]


def check_glyphhanger() -> bool:
    """检查 glyphhanger 是否可用"""
    try:
        result = subprocess.run(
            ["npx", "glyphhanger", "--version"],
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode == 0
    except Exception:
        pass
    return False


def check_pyftsubset() -> bool:
    """检查 fonttools pyftsubset 是否可用"""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "fontTools.subset", "--version"],
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode == 0
    except Exception:
        pass
    # 尝试系统级 pyftsubset
    try:
        result = subprocess.run(
            ["pyftsubset", "--version"],
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode == 0
    except Exception:
        pass
    return False


def convert_to_woff2(src_path: Path, dst_path: Path) -> bool:
    """将 TTF/OTF 转换为 WOFF2"""
    dst_path.parent.mkdir(parents=True, exist_ok=True)

    # 优先使用 fonttools pyftsubset → woff2_compress 管线
    try:
        result = subprocess.run(
            ["pyftsubset", str(src_path),
             "--output-file=" + str(dst_path.with_suffix(".ttf")),
             "--flavor=woff2",
             "--layout-features='*'",
             "--no-hinting",
             ],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0:
            return True
    except Exception:
        pass

    # 回退：fonttools + woff2_compress
    try:
        tmp = dst_path.with_suffix(".ttf")
        result = subprocess.run(
            ["pyftsubset", str(src_path),
             "--output-file=" + str(tmp),
             "--layout-features='*'",
             ],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            return False
        subprocess.run(
            ["woff2_compress", str(tmp)],
            capture_output=True, timeout=120,
        )
        tmp.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def build_with_glyphhanger(source_dir: Path, output_dir: Path) -> bool:
    """使用 glyphhanger 进行智能子集化（基于实际网页使用字符）"""
    glyphhanger_available = check_glyphhanger()

    if not glyphhanger_available:
        print("  [警告] glyphhanger 未安装，跳过智能子集化")
        print("  安装: npm install -g glyphhanger")
        return False

    output_dir.mkdir(parents=True, exist_ok=True)

    for layer in FONT_LAYERS:
        for src_name, dst_name in layer["source_files"].items():
            src = source_dir / src_name
            dst = output_dir / dst_name

            if not src.exists():
                print(f"  [跳过] 源文件不存在: {src}")
                continue

            print(f"  处理 {layer['name']}: {src_name} → {dst_name}")

            cmd = [
                "npx", "glyphhanger",
                "--subset=" + str(src),
                "--formats=woff2",
                "--output=" + str(dst),
                "--family=" + layer["family"],
            ]
            try:
                subprocess.run(cmd, check=True, timeout=600)
            except Exception as e:
                print(f"  [错误] {e}")
                return False

    return True


def build_with_pyftsubset(source_dir: Path, output_dir: Path) -> bool:
    """使用 fonttools pyftsubset 进行 unicode-range 分片子集化"""
    if not check_pyftsubset():
        print("  [错误] pyftsubset 不可用，请安装: pip install fonttools brotli")
        return False

    output_dir.mkdir(parents=True, exist_ok=True)

    success_count = 0
    for layer in FONT_LAYERS:
        for src_name, dst_name in layer["source_files"].items():
            src = source_dir / src_name
            dst = output_dir / dst_name

            if not src.exists():
                print(f"  [跳过] 源文件不存在: {src}")
                continue

            print(f"  子集化 {layer['name']}: {src_name} → {dst_name}")
            print(f"    unicode-range: {layer['unicode_range']}")

            # 将 unicode-range 转换为 pyftsubset --unicodes 参数
            unicodes = layer["unicode_range"].replace("U+", "").replace(",", " ")
            # 展开范围 U+4E00-9FFF → 4E00-9FFF
            args = []
            for part in unicodes.split():
                if "-" in part:
                    args.extend(["--unicodes", part])
                else:
                    args.extend(["--unicodes", part])

            cmd = [
                sys.executable, "-m", "fontTools.subset",
                str(src),
                "--output-file=" + str(dst),
                "--flavor=woff2",
                "--layout-features='*'",
                "--no-hinting",
                "--drop-tables=''",
            ] + args

            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
                if result.returncode == 0:
                    size_kb = dst.stat().st_size / 1024 if dst.exists() else 0
                    print(f"    完成: {size_kb:.0f} KB")
                    success_count += 1
                else:
                    print(f"    [错误] pyftsubset 失败: {result.stderr[:200]}")
            except subprocess.TimeoutExpired:
                print(f"    [错误] 超时")
            except Exception as e:
                print(f"    [错误] {e}")

    return success_count > 0


def generate_manifest(output_dir: Path, cdn_base: str) -> None:
    """生成字体文件 manifest JSON（供前端按需加载参考）"""
    manifest = {
        "cdn_base": cdn_base,
        "layers": [],
    }

    for layer in FONT_LAYERS:
        layer_info = {
            "name": layer["name"],
            "family": layer["family"],
            "unicode_range": layer["unicode_range"],
            "glyphs": layer["glyphs"],
            "files": [],
        }
        for src_name, dst_name in layer["source_files"].items():
            dst = output_dir / dst_name
            if dst.exists():
                layer_info["files"].append({
                    "file": dst_name,
                    "url": f"{cdn_base}/{dst_name}",
                    "size_bytes": dst.stat().st_size,
                })
        manifest["layers"].append(layer_info)

    manifest_path = output_dir / "font-manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"  Manifest: {manifest_path}")


def generate_css(output_dir: Path, cdn_base: str) -> None:
    """生成 @font-face CSS 文件"""
    css_lines = ["/* 古籍竖排字体回退链 — 自动生成 */", ""]

    for layer in FONT_LAYERS:
        css_lines.append(f"/* {layer['name']} — {layer['glyphs']} */")
        unicode_range_line = f"  unicode-range: {layer['unicode_range']};"

        for src_name, dst_name in layer["source_files"].items():
            weight = "700" if "Bold" in src_name else "400"
            style = "italic" if "Italic" in src_name or "It" in src_name else "normal"

            css_lines.append("@font-face {")
            css_lines.append(f'  font-family: "{layer["family"]}";')
            css_lines.append(f"  font-weight: {weight};")
            css_lines.append(f"  font-style: {style};")
            css_lines.append(f'  src: url("{cdn_base}/{dst_name}") format("woff2");')
            css_lines.append(f"  font-display: swap;")
            css_lines.append(unicode_range_line)
            css_lines.append("}")
            css_lines.append("")

    css_path = output_dir / "classic-fonts.css"
    with open(css_path, "w", encoding="utf-8") as f:
        f.write("\n".join(css_lines))
    print(f"  CSS: {css_path}")


def main():
    parser = argparse.ArgumentParser(description="古籍字体 WOFF2 子集化构建")
    parser.add_argument("--source", type=str, default="./fonts/source",
                        help="源字体目录（TTF/OTF 原始文件）")
    parser.add_argument("--output", type=str, default="./fonts/public",
                        help="输出目录（WOFF2 子集文件）")
    parser.add_argument("--cdn-base", type=str,
                        default=os.environ.get("FONT_CDN_BASE", "/fonts"),
                        help="最终 CDN 地址")
    parser.add_argument("--method", choices=["pyftsubset", "glyphhanger", "auto"],
                        default="auto", help="子集化工具")
    parser.add_argument("--manifest-only", action="store_true",
                        help="仅生成 manifest + CSS，不重新子集化")
    args = parser.parse_args()

    source_dir = Path(args.source)
    output_dir = Path(args.output)

    if not source_dir.exists():
        print(f"源字体目录不存在: {source_dir}")
        print("请先下载字体文件:")
        print("  霞鹜文楷: https://github.com/lxgw/LxgwWenKai/releases")
        print("  思源宋体: https://github.com/adobe-fonts/source-han-serif/releases")
        print("  天珩全字库: https://github.com/THfont/TH-Khaai/releases")
        sys.exit(1)

    print(f"源目录: {source_dir}")
    print(f"输出目录: {output_dir}")
    print(f"CDN: {args.cdn_base}")
    print()

    if not args.manifest_only:
        ok = False
        if args.method == "pyftsubset":
            ok = build_with_pyftsubset(source_dir, output_dir)
        elif args.method == "glyphhanger":
            ok = build_with_glyphhanger(source_dir, output_dir)
        else:
            # auto: 优先 pyftsubset，回退 glyphhanger
            ok = build_with_pyftsubset(source_dir, output_dir)
            if not ok:
                ok = build_with_glyphhanger(source_dir, output_dir)

        if not ok:
            print("\n[失败] 字体子集化未成功，请检查工具安装")
            sys.exit(1)

    generate_manifest(output_dir, args.cdn_base)
    generate_css(output_dir, args.cdn_base)

    print(f"\n✓ 字体构建完成")
    print(f"  输出目录: {output_dir}")
    print(f"  部署到 CDN 后设置环境变量: FONT_CDN_BASE={args.cdn_base}")


if __name__ == "__main__":
    main()
