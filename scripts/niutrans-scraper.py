"""
NiuTrans/Classical-Modern 古籍采集器
====================================
从 GitHub NiuTrans/Classical-Modern 仓库下载古文原文，
转换为平台种子格式。仅下载殆知阁缺少的 22 部新书。

用法:
  py scripts/niutrans-scraper.py
"""

import json
import os
import re
import sys
import time
from urllib.parse import quote
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TREE_FILE = os.path.join(BASE_DIR, "temp_gh_tree.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "temp_niutrans_seeds")
SEED_PREFIX = "temp_niutrans_seeds"

# 22 部新书
NEW_BOOKS = [
    "三刻拍案惊奇", "三略", "东游记", "伤寒论", "僧伽吒经", "兵法二十四篇",
    "册府元龟", "医学源流论", "千金方", "古今谭概", "商君书", "四圣心源",
    "奇经八脉考", "左传", "扁鹊心书", "文始真经", "文昌孝经", "新齐谐",
    "无量寿经", "易传", "智囊(选录)", "本草纲目",
]

# 分类推断
CATEGORY_HINTS = {
    "经": ["左传", "易传", "文昌孝经"],
    "史": ["册府元龟", "古今谭概"],
    "子": ["商君书", "三略", "兵法二十四篇", "智囊(选录)"],
    "集": ["三刻拍案惊奇", "东游记", "新齐谐", "文始真经"],
    "医": ["伤寒论", "千金方", "本草纲目", "扁鹊心书", "四圣心源", "医学源流论", "奇经八脉考"],
    "释": ["僧伽吒经", "无量寿经"],
}

BASE_URL = "https://raw.githubusercontent.com/NiuTrans/Classical-Modern/main"


def guess_category(title: str) -> str:
    for cat, titles in CATEGORY_HINTS.items():
        if title in titles:
            return cat
    return "子"


def download_book(book_name: str, files: list[dict]) -> dict | None:
    """下载单部古籍的所有文件并合并"""
    chapters = []
    total_len = 0
    errors = 0

    for f in sorted(files, key=lambda x: x["path"]):
        try:
            # URL 编码路径，但保留斜杠
            path_parts = f["path"].split("/")
            encoded_parts = [quote(p, safe="") for p in path_parts]
            url = f"{BASE_URL}/{'/'.join(encoded_parts)}"

            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            text = resp.text

            if text.strip():
                # 从文件名提取章节标题
                fname = os.path.splitext(path_parts[-1])[0]
                title = fname if fname != "text" else f"第{len(chapters)+1}章"
                if title.startswith("第") and "章" not in title:
                    title = f"{title}章"

                chapters.append({
                    "title": title[:80],
                    "content": text[:10000],  # 限制长度避免过大
                })
                total_len += len(text)
        except Exception as e:
            errors += 1

    if not chapters:
        return None

    return {
        "title": book_name,
        "author": "",
        "dynasty": "",
        "category": guess_category(book_name),
        "intro": f"来源: NiuTrans/Classical-Modern GitHub 开源数据集。{book_name}共{len(chapters)}章，{total_len}字。",
        "source": f"github.com/NiuTrans/Classical-Modern",
        "chapters": chapters,
        "text_length": total_len,
    }


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    if not os.path.exists(TREE_FILE):
        print("请先获取 GitHub tree: curl -s ... > temp_gh_tree.json")
        return

    # 1. 解析 GitHub tree，按书名分组文件
    with open(TREE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    book_files: dict[str, list] = {}
    for item in data["tree"]:
        if item["type"] != "blob":
            continue
        parts = item["path"].split("/")
        if parts[0] == "古文原文" and len(parts) >= 3:
            book = parts[1]
            if book in NEW_BOOKS:
                book_files.setdefault(book, []).append({
                    "path": item["path"],
                    "sha": item["sha"],
                    "size": item.get("size", 0),
                })

    print(f"待下载: {len(book_files)} 部新书")
    for b in NEW_BOOKS:
        if b not in book_files:
            print(f"  ✗ {b}: 未在仓库中找到")

    # 2. 并发下载
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 先按顺序下载（节省带宽，避免并发过多被限）
    results = []
    for i, book_name in enumerate(NEW_BOOKS):
        if book_name not in book_files:
            continue
        files = book_files[book_name]
        total_kb = sum(f["size"] for f in files) / 1024
        print(f"  [{i+1}/{len(NEW_BOOKS)}] {book_name} ({len(files)}文件, {total_kb:.0f}KB)...",
              end=" ", flush=True)

        t0 = time.time()
        result = download_book(book_name, files)
        elapsed = time.time() - t0

        if result:
            results.append(result)
            # 单独保存每本书的种子
            safe_name = re.sub(r'[\\/:*?"<>|]', "_", book_name)
            fpath = os.path.join(OUTPUT_DIR, f"{safe_name}.json")
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"OK ({len(result['chapters'])}章, {elapsed:.0f}s)")
            # 控制下载速率
            time.sleep(0.3)
        else:
            print(f"FAIL ({elapsed:.0f}s)")

    # 3. 生成合并种子文件
    seed_file = os.path.join(BASE_DIR, f"{SEED_PREFIX}_new_books.json")
    with open(seed_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n完成: {len(results)}/{len(book_files)} 部 -> {seed_file}")
    print(f"分类分布:")
    from collections import Counter
    cats = Counter(r["category"] for r in results)
    for cat, cnt in cats.most_common():
        print(f"  {cat}: {cnt}")

    # 4. 打印导入命令
    print(f"\n导入命令:")
    print(f"  cd apps/server && NODE_OPTIONS=\"--max-old-space-size=4096\" npx ts-node --transpile-only scripts/import-daizhige-seeds.ts --file ../../{SEED_PREFIX}_new_books.json")


if __name__ == "__main__":
    main()
