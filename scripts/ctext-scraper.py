"""
ctext.org 古籍采集器
==================
通过 ctext.org 官方 API 采集学术级古籍全文。
与殆知阁互补：ctext 管"质"（学术校对+版本信息）。

用法:
  py scripts/ctext-scraper.py index                        # 获取全部书目列表
  py scripts/ctext-scraper.py download N [W] [API_KEY]     # 并发下载前N部（W并发数，默认8）
  py scripts/ctext-scraper.py generate                     # 生成种子文件

API Key: 设置环境变量 CTEXT_API_KEY 或作为 download 的第三个参数传入
  获取 API Key: https://ctext.org/tools/subscribe
"""

import json
import os
import re
import sys
import time
import ctext
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_FILE = os.path.join(BASE_DIR, "temp_ctext_books.json")
BOOKS_DIR = os.path.join(BASE_DIR, "temp_ctext_books")
SEED_INDEX = os.path.join(BASE_DIR, "temp_ctext_seeds_index.json")

# 朝代英文→中文映射
DYNASTY_MAP = {
    "Spring and Autumn": "春秋",
    "Warring States": "战国",
    "Han": "汉",
    "Western Han": "西汉",
    "Eastern Han": "东汉",
    "Jin": "晋",
    "Eastern Jin": "东晋",
    "Western Jin": "西晋",
    "Northern and Southern": "南北朝",
    "Liu-Song": "刘宋",
    "Southern Qi": "南齐",
    "Liang": "梁",
    "Chen": "陈",
    "Northern Wei": "北魏",
    "Northern Qi": "北齐",
    "Northern Zhou": "北周",
    "Sui": "隋",
    "Tang": "唐",
    "Five Dynasties": "五代",
    "Song": "宋",
    "Northern Song": "北宋",
    "Southern Song": "南宋",
    "Liao": "辽",
    "Jin dynasty": "金",
    "Yuan": "元",
    "Ming": "明",
    "Qing": "清",
    "Republic": "民国",
    "Zhou": "周",
    "Shang": "商",
    "Xia": "夏",
    "Pre-Qin": "先秦",
    "Three Kingdoms": "三国",
}

# ctext tags 到分类映射
TAG_CATEGORY = {
    "經部": "经",
    "儒家": "经",
    "史部": "史",
    "子部": "子",
    "集部": "集",
    "道家": "道",
    "佛家": "释",
    "兵家": "子",
    "法家": "子",
    "墨家": "子",
    "名家": "子",
    "縱橫家": "子",
    "農家": "子",
    "雜家": "子",
    "醫家": "子",
    "天文": "子",
    "術數": "子",
    "藝術": "子",
    "小說": "集",
}


def guess_category(title: str, tags: list[str], urn: str) -> str:
    """根据标签/标题/URN 推测分类"""
    for tag in tags:
        if tag in TAG_CATEGORY:
            return TAG_CATEGORY[tag]
    # 从 URN 推测
    urn_lower = urn.lower()
    if "confucian" in urn_lower or "jing" in urn_lower:
        return "经"
    if "hist" in urn_lower or "shi" in urn_lower:
        return "史"
    if "dao" in urn_lower:
        return "道"
    if "buddh" in urn_lower:
        return "释"
    # 默认子部
    return "子"


def _setup_api_key(api_key: str | None = None):
    """设置 ctext API key（参数 > 环境变量）"""
    key = api_key or os.environ.get("CTEXT_API_KEY", "")
    if key:
        ctext.setapikey(key)
        return True
    return False


def build_index(api_key: str | None = None):
    """从 ctext API 获取全部书目"""
    _setup_api_key(api_key)
    print("Fetching book list from ctext.org API...")
    data = ctext.gettexttitles()
    books = data.get("books", [])

    # 精简：只保留 URN 和标题
    index = [{"title": b["title"], "urn": b["urn"]} for b in books]

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"索引已保存: {len(index)} 部 -> {INDEX_FILE}")
    return index


def _fetch_one_book(book: dict, i: int) -> dict | None:
    """下载单部古籍（线程安全）"""
    urn = book["urn"]
    safe_name = re.sub(r'[\\/:*?"<>|]', "_", book["title"])[:40]
    json_path = os.path.join(BOOKS_DIR, f"{i:05d}_{safe_name}.json")
    txt_path = os.path.join(BOOKS_DIR, f"{i:05d}_{safe_name}.txt")

    # 跳过已下载
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    try:
        # 获取元数据
        info = ctext.gettextinfo(urn)
        if not info or "error" in str(info).lower():
            return None

        # 获取全文
        chapters_raw = ctext.gettextaschapterlist(urn)
        if not chapters_raw:
            return None

        # 处理朝代
        dynasty = ""
        dyn_data = info.get("dynasty", {})
        if dyn_data.get("from", {}).get("name"):
            eng = dyn_data["from"]["name"]
            dynasty = DYNASTY_MAP.get(eng, eng)

        # 处理标签
        tags = info.get("tags", [])

        # 分类
        category = guess_category(book["title"], tags or [], urn)

        # 处理章节
        chapters = []
        total_len = 0
        for j, ch_text in enumerate(chapters_raw):
            text = ch_text if isinstance(ch_text, str) else str(ch_text)
            title = f"第{j+1}章"
            # 尝试从文本开头提取标题
            heading_match = re.match(r"^(.{2,20})[\n\r]", text)
            if heading_match:
                title = heading_match[1].strip()
            chapters.append({"title": title[:80], "content": text[:5000]})
            total_len += len(text)

        edition = info.get("edition", {})
        edition_title = edition.get("title", "") if isinstance(edition, dict) else ""

        result = {
            "title": info.get("toptitle") or book["title"],
            "urn": urn,
            "dynasty": dynasty,
            "category": category,
            "tags": tags or [],
            "edition": edition_title,
            "source": f"ctext.org {urn}",
            "text_length": total_len,
            "chapters": chapters,
        }

        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("\n\n".join(str(c) for c in chapters_raw))
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)

        return result

    except Exception as e:
        with print_lock:
            print(f"  ✗ [{i}] {book['title'][:30]}: {e}")
        return None


print_lock = Lock()


def download_books(max_books: int = 100, workers: int = 8, api_key: str | None = None):
    """并发下载古籍全文"""
    _setup_api_key(api_key)
    if not os.path.exists(INDEX_FILE):
        print("Index not found. Run 'index' first.")
        return

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        books = json.load(f)

    os.makedirs(BOOKS_DIR, exist_ok=True)
    total = min(max_books, len(books))
    target_books = books[:total]

    # 分离已下载和待下载
    to_download = []
    cached_count = 0
    for i, book in enumerate(target_books):
        safe_name = re.sub(r'[\\/:*?"<>|]', "_", book["title"])[:40]
        json_path = os.path.join(BOOKS_DIR, f"{i:05d}_{safe_name}.json")
        if os.path.exists(json_path):
            cached_count += 1
        else:
            to_download.append((i, book))

    new_count = len(to_download)
    print(f"总计 {total} 部: 已有 {cached_count}, 待下载 {new_count}, 并发 {workers}\n")

    if not to_download:
        print("全部已下载。")
        return

    results_dict = {}
    completed = 0
    failed = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(_fetch_one_book, book, i): i
            for i, book in to_download
        }

        for future in as_completed(futures):
            i = futures[future]
            try:
                result = future.result()
                if result:
                    results_dict[i] = result
                    completed += 1
                else:
                    failed += 1
            except Exception as e:
                failed += 1

            if (completed + failed) % 50 == 0:
                with print_lock:
                    print(f"  进度: {completed + failed}/{new_count} (成功{completed}, 失败{failed})")

    # 加载缓存
    for i, book in enumerate(target_books[:total]):
        if i not in results_dict:
            safe_name = re.sub(r'[\\/:*?"<>|]', "_", book["title"])[:40]
            json_path = os.path.join(BOOKS_DIR, f"{i:05d}_{safe_name}.json")
            if os.path.exists(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    results_dict[i] = json.load(f)

    results = [results_dict[i] for i in range(total) if i in results_dict]
    print(f"\n完成: 新建 {completed}, 缓存 {cached_count}, 失败 {failed} / 总计 {total}")
    return results


def generate_seeds():
    """从下载结果生成种子数据（按分类分块）"""
    if not os.path.exists(BOOKS_DIR):
        print("No download directory found.")
        return

    # 从下载目录读取所有 JSON 文件
    seeds = []
    for fname in sorted(os.listdir(BOOKS_DIR)):
        if not fname.endswith(".json") or fname.startswith("_"):
            continue
        fpath = os.path.join(BOOKS_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        seed = {
            "title": data["title"],
            "author": "",
            "dynasty": data.get("dynasty", ""),
            "category": data["category"],
            "intro": f"ctext.org 收录古籍《{data['title']}》。版本：{data.get('edition', '')}。原文共{data['text_length']}字。URN: {data['urn']}",
            "source": data["source"],
            "chapters": [],
        }
        for ch in data.get("chapters", []):
            content = ch["content"]
            if len(content) > 5000:
                content = content[:5000] + "\n...（原文甚长，此处节录）"
            seed["chapters"].append({
                "title": ch["title"],
                "content": content,
                "tags": data.get("tags", []),
            })
        seeds.append(seed)

    # 按分类分块（300本/块）
    by_cat: dict[str, list] = {}
    for s in seeds:
        by_cat.setdefault(s["category"], []).append(s)

    CHUNK = 300
    idx: dict[str, list[str]] = {}
    total = 0

    for cat, items in sorted(by_cat.items()):
        chunks = [items[i:i + CHUNK] for i in range(0, len(items), CHUNK)]
        idx[cat] = []
        for ci, chunk in enumerate(chunks):
            fname = os.path.join(BASE_DIR, f"temp_ctext_seeds_{cat}_{ci:03d}.json")
            with open(fname, "w", encoding="utf-8") as f:
                json.dump(chunk, f, ensure_ascii=False, indent=2)
            idx[cat].append(f"temp_ctext_seeds_{cat}_{ci:03d}.json")
            print(f"  {cat}[{ci}]: {len(chunk)}")
        total += len(items)

    with open(SEED_INDEX, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False)

    print(f"\n总计 {total} 条种子，{len(by_cat)} 个分类 -> {SEED_INDEX}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "index":
        api_key = sys.argv[2] if len(sys.argv) > 2 else None
        build_index(api_key)
    elif cmd == "download":
        max_books = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        workers = int(sys.argv[3]) if len(sys.argv) > 3 else 8
        api_key = sys.argv[4] if len(sys.argv) > 4 else None
        download_books(max_books, workers, api_key)
    elif cmd == "generate":
        generate_seeds()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
