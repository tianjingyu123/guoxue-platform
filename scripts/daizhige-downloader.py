"""
殆知阁古籍下载器 - GitHub API 版本
====================================
通过 GitHub API 遍历 frankslin/daizhigev20 仓库目录树，
逐个下载 TXT 文件，解析元数据，生成 TypeScript 种子文件。

优势：
- 逐文件下载，避免 2.15GB 大文件传输失败
- GitHub API 稳定可达
- 自动解析目录结构为分类/作者/朝代信息

用法:
  python scripts/daizhige-downloader.py explore       # 浏览目录结构
  python scripts/daizhige-downloader.py download TOP  # 下载前 TOP 个文件
  python scripts/daizhige-downloader.py generate      # 生成种子文件
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_BASE = "https://api.github.com/repos/frankslin/daizhigev20/contents"
RAW_BASE = "https://raw.githubusercontent.com/frankslin/daizhigev20/data"
DOWNLOAD_DIR = os.path.join(BASE_DIR, "temp_daizhige_txts")
INDEX_FILE = os.path.join(BASE_DIR, "temp_daizhige_index.json")
SEED_OUTPUT = os.path.join(BASE_DIR, "temp_daizhige_seeds.json")

# 分类映射 (daizhige 目录 → 我们的分类)
CATEGORY_MAP = {
    "儒藏": "经",
    "易藏": "经",
    "史藏": "史",
    "子藏": "子",
    "佛藏": "释",
    "道藏": "道",
    "集藏": "集",
    "诗藏": "集",
    "医藏": "子",
    "艺藏": "子",
}

# 已知作者-朝代映射 (从目录名/文件名推断)
DYNASTY_PATTERNS = [
    (r"[（(]唐[）)]", "唐"),
    (r"[（(]宋[）)]", "宋"),
    (r"[（(]元[）)]", "元"),
    (r"[（(]明[）)]", "明"),
    (r"[（(]清[）)]", "清"),
    (r"[（(]汉[）)]", "汉"),
    (r"[（(]先秦[）)]", "先秦"),
    (r"[（(]晋[）)]", "晋"),
    (r"[（(]隋[）)]", "隋"),
    (r"[（(]周[）)]", "周"),
    (r"[（(]战国[）)]", "先秦"),
    (r"[（(]三国[）)]", "三国"),
    (r"[（(]南北朝[）)]", "南北朝"),
    (r"[（(]南朝[）)]", "南朝"),
    (r"[（(]梁[）)]", "南朝梁"),
    (r"[（(]魏[）)]", "北魏"),
]


def api_request(url: str, retries: int = 3) -> dict | list:
    """GitHub API 请求（带重试）"""
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github.v3+json")
    req.add_header("User-Agent", "GuoxuePlatform/1.0")

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 403 and "rate limit" in str(e.read()):
                print("  Rate limited! Waiting 60s...")
                time.sleep(60)
                continue
            print(f"  HTTP {e.code}: {url}")
            return []
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3)
                continue
            print(f"  Error: {e}")
            return []

    return []


def explore_directory(path: str = "", depth: int = 0, max_depth: int = 4):
    """递归探索目录树"""
    # Properly URL-encode Chinese path components
    encoded_path = "/".join(
        urllib.parse.quote(part, safe="") for part in path.split("/") if part
    )
    url = f"{API_BASE}/{encoded_path}?ref=data" if encoded_path else f"{API_BASE}?ref=data"
    items = api_request(url)

    results = []
    if not isinstance(items, list):
        return results

    for item in items:
        if not isinstance(item, dict):
            continue

        name = item["name"]
        item_type = item["type"]
        full_path = f"{path}/{name}" if path else name

        if item_type == "dir" and depth < max_depth:
            print(f"  {'  ' * depth}[DIR] {name}")
            sub_results = explore_directory(full_path, depth + 1, max_depth)
            results.extend(sub_results)
        elif item_type == "file" and name.endswith(".txt"):
            results.append(
                {
                    "path": full_path,
                    "name": name,
                    "size": item.get("size", 0),
                    "download_url": item.get("download_url", ""),
                    "category": _infer_category(full_path),
                    "title": _parse_title(name),
                    "dynasty": _infer_dynasty(full_path + name),
                }
            )

    return results


def _infer_category(path: str) -> str:
    """从路径推断分类"""
    for dir_name, cat in CATEGORY_MAP.items():
        if dir_name in path:
            return cat
    return "子"


def _parse_title(filename: str) -> str:
    """从文件名解析书名"""
    # Remove .txt extension
    title = filename.replace(".txt", "")
    # Remove author/dynasty annotations
    title = re.sub(r"[（(][^)）]*[)）]", "", title)
    title = title.strip()
    return title if title else filename


def _infer_dynasty(text: str) -> str:
    """从文本中推断朝代"""
    for pattern, dynasty in DYNASTY_PATTERNS:
        if re.search(pattern, text):
            return dynasty
    return ""


def download_files(file_list: list, max_files: int = 100):
    """下载文件列表（限制数量）"""
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    total = min(max_files, len(file_list))
    print(f"\nDownloading {total} files...")

    success = 0
    for i, f in enumerate(file_list[:total]):
        if f["size"] == 0:
            continue

        local_path = os.path.join(DOWNLOAD_DIR, f["path"].replace("/", "_"))
        if os.path.exists(local_path):
            success += 1
            continue

        print(f"  [{i+1}/{total}] {f['title'][:30]} ({f['size']} bytes)")

        try:
            url = f["download_url"]
            if not url:
                url = f"{RAW_BASE}/{f['path']}"
            urllib.request.urlretrieve(url, local_path)
            success += 1

            if i > 0 and i % 10 == 0:
                time.sleep(1)  # Rate limit
        except Exception as e:
            print(f"    Failed: {e}")
            continue

    print(f"\nDone: {success}/{total} downloaded")
    return success


def categorize_files(index: list) -> dict:
    """按分类统计"""
    stats = {}
    for f in index:
        cat = f["category"]
        if cat not in stats:
            stats[cat] = {"count": 0, "total_size": 0}
        stats[cat]["count"] += 1
        stats[cat]["total_size"] += f["size"]
    return stats


def generate_seeds(file_list: list, downloaded_only: bool = True):
    """从下载的文件生成种子数据"""
    seeds = []

    for f in file_list:
        local_path = os.path.join(DOWNLOAD_DIR, f["path"].replace("/", "_"))

        if downloaded_only and not os.path.exists(local_path):
            continue

        try:
            with open(local_path, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read(5000)  # Read first 5000 chars
        except Exception:
            content = ""

        if not content.strip():
            continue

        seed = {
            "title": f["title"],
            "author": "",
            "dynasty": f["dynasty"],
            "category": f["category"],
            "intro": f"殆知阁收录古籍《{f['title']}》。",
            "source": f"殆知阁 daizhigev20 / {f['path']}",
            "chapters": [
                {
                    "title": f["title"],
                    "content": content,
                    "tags": [f["category"], "殆知阁"],
                }
            ],
        }
        seeds.append(seed)

    # Save seeds
    with open(SEED_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=2)

    print(f"\nGenerated {len(seeds)} seed entries → {SEED_OUTPUT}")

    # Print category breakdown
    cats = {}
    for s in seeds:
        c = s["category"]
        cats[c] = cats.get(c, 0) + 1
    for c, n in sorted(cats.items()):
        print(f"  {c}: {n} books")

    return seeds


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "explore"

    if cmd == "explore":
        print("Exploring daizhigev20 directory tree...")
        index = explore_directory(max_depth=4)

        # Save index
        with open(INDEX_FILE, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

        print(f"\nTotal TXT files found: {len(index)}")
        stats = categorize_files(index)
        for cat, info in sorted(stats.items()):
            size_mb = info["total_size"] / (1024 * 1024)
            print(f"  {cat}: {info['count']} files, {size_mb:.1f} MB")

    elif cmd == "download":
        max_files = int(sys.argv[2]) if len(sys.argv) > 2 else 100

        if not os.path.exists(INDEX_FILE):
            print("Index not found. Run 'explore' first.")
            return

        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index = json.load(f)

        print(f"Loaded index: {len(index)} files")

        # Sort by size descending (largest/most important first)
        index.sort(key=lambda x: x["size"], reverse=True)
        download_files(index, max_files)

    elif cmd == "generate":
        if not os.path.exists(INDEX_FILE):
            print("Index not found. Run 'explore' first.")
            return

        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index = json.load(f)

        generate_seeds(index)

    elif cmd == "stats":
        if os.path.exists(INDEX_FILE):
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                index = json.load(f)
            print(f"Indexed files: {len(index)}")
            stats = categorize_files(index)
            for cat, info in sorted(stats.items()):
                size_mb = info["total_size"] / (1024 * 1024)
                print(f"  {cat}: {info['count']} files, {size_mb:.1f} MB")
        else:
            print("No index found. Run 'explore' first.")

    else:
        print(__doc__)


if __name__ == "__main__":
    main()
