"""
殆知阁古籍批量采集器
=====================
直接从 daizhige.org 抓取古籍全文。
已验证可行 - 每部书的 HTML 页面包含完整原文。

流程:
1. 遍历十大分类 → 获取子目录
2. 遍历子目录 → 获取书籍列表
3. 下载每部书的 HTML → 提取正文
4. 解析章节结构 → 生成种子数据

用法:
  python scripts/daizhige-scraper.py index              # 建立完整书籍索引
  python scripts/daizhige-scraper.py download N [W]     # 下载前N部书（W并发数，默认10）
  python scripts/daizhige-scraper.py generate           # 生成种子文件
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from threading import Lock

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAIZHIGE_BASE = "https://daizhige.org"
INDEX_FILE = os.path.join(BASE_DIR, "temp_daizhige_books.json")
BOOKS_DIR = os.path.join(BASE_DIR, "temp_daizhige_books")
SEED_OUTPUT = os.path.join(BASE_DIR, "temp_daizhige_all_seeds.json")

# 十大分类
CATEGORIES = [
    ("%E5%84%92%E8%97%8F", "经"),
    ("%E5%8F%B2%E8%97%8F", "史"),
    ("%E5%AD%90%E8%97%8F", "子"),
    ("%E9%9B%86%E8%97%8F", "集"),
    ("%E8%AF%97%E8%97%8F", "集"),
    ("%E8%89%BA%E8%97%8F", "子"),
    ("%E6%98%93%E8%97%8F", "经"),
    ("%E5%8C%BB%E8%97%8F", "子"),
    ("%E4%BD%9B%E8%97%8F", "释"),
    ("%E9%81%93%E8%97%8F", "道"),
]


class TextExtractor(HTMLParser):
    """从 HTML 中提取纯文本"""

    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False
        self.skip_tags = {"script", "style", "nav", "header", "footer"}

    def handle_starttag(self, tag, attrs):
        if tag in self.skip_tags:
            self.skip = True

    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.skip = False
        if tag in ("p", "div", "br", "li", "h1", "h2", "h3", "h4"):
            self.text.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)


def fetch_url(url: str, retries: int = 3) -> str:
    """下载 URL 内容"""
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "GuoxuePlatform/1.0")

    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3)
            else:
                print(f"  Fetch error: {e}")
                return ""

    return ""


def extract_text_from_html(html: str) -> str:
    """从 HTML 提取正文"""
    # Remove scripts and styles
    html = re.sub(r"<script[^>]*>[\s\S]*?</script>", "", html)
    html = re.sub(r"<style[^>]*>[\s\S]*?</style>", "", html)

    # Extract body
    body_match = re.search(r"<body[^>]*>([\s\S]*)</body>", html)
    if not body_match:
        return ""

    body = body_match[1]

    # Strip all tags
    text = re.sub(r"<[^>]+>", "\n", body)
    text = text.replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&amp;", "&").replace("&#?\\w+;", "")

    # Clean up whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)

    return text.strip()


def parse_chapters(text: str) -> list:
    """将文本分割为章节"""
    chapters = []

    # Try common chapter patterns
    patterns = [
        r"(卷[第]?[一二三四五六七八九十百千\d]+[：:\s]*[^\n]*)",
        r"([第]?[一二三四五六七八九十百千\d]+[章节回篇][：:\s]*[^\n]*)",
        r"([一二三四五六七八九十]+[、．.][^\n]{2,40})",
    ]

    for pattern in patterns:
        parts = re.split(pattern, text)
        if len(parts) > 3:
            # Parts[0] is preamble, then alternating (title, content)
            if len(parts[0].strip()) > 50:
                chapters.append({"title": "前言", "content": parts[0].strip()[:3000]})

            for i in range(1, len(parts) - 1, 2):
                title = parts[i].strip()[:60]
                content = (parts[i] + "\n" + parts[i + 1]).strip() if i + 1 < len(parts) else parts[i].strip()
                chapters.append({"title": title, "content": content[:5000]})
            break
    else:
        # No chapter structure found, treat as single chapter
        chapters.append({"title": "全文", "content": text[:5000]})

    return chapters if chapters else [{"title": "全文", "content": text[:5000]}]


def build_index():
    """建立全部书籍索引"""
    print("Building book index from daizhige.org...\n")

    all_books = []
    total = 0

    for dir_enc, category in CATEGORIES:
        cat_url = f"{DAIZHIGE_BASE}/{dir_enc}/"
        html = fetch_url(cat_url)
        if not html:
            continue

        # Find subcategory links (case-insensitive - page uses lowercase hex)
        # HTML: <a href="/path/"><h3>NAME</h3><div>N 部</div></a>
        subcats = re.findall(
            rf'href="(/{dir_enc}/([^/"]+)/)"[^>]*>\s*<h3>([^<]+)</h3>', html, re.IGNORECASE
        )
        print(f"\n[{category}] {len(subcats)} subcategories")

        for full_path, sub_name_enc, sub_name in subcats:
            sub_url = f"{DAIZHIGE_BASE}{full_path}"
            sub_html = fetch_url(sub_url)
            if not sub_html:
                continue

            # Find book links (*.html) - case-insensitive
            books = re.findall(
                rf'href="({full_path}[^/"]+\.html)"[^>]*>([^<]+)<', sub_html, re.IGNORECASE
            )

            for book_path, book_title in books:
                all_books.append(
                    {
                        "title": book_title.strip(),
                        "url": f"{DAIZHIGE_BASE}{book_path}",
                        "category": category,
                        "subcategory": sub_name.strip(),
                    }
                )

            print(f"  {sub_name}: {len(books)} books")
            total += len(books)
            time.sleep(0.5)  # Rate limit

        time.sleep(1)

    # Save index
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(all_books, f, ensure_ascii=False, indent=2)

    print(f"\nTotal books indexed: {len(all_books)}")
    print(f"Index saved to: {INDEX_FILE}")
    return all_books


def _download_one_book(book: dict, i: int) -> dict | None:
    """下载单部书籍（线程安全）"""
    safe_name = re.sub(r'[\\/:*?"<>|]', "_", book["title"])[:50]
    json_path = os.path.join(BOOKS_DIR, f"{i:04d}_{safe_name}.json")
    txt_path = os.path.join(BOOKS_DIR, f"{i:04d}_{safe_name}.txt")

    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)

    html = fetch_url(book["url"])
    if not html:
        return None

    text = extract_text_from_html(html)
    if len(text) < 100:
        return None

    chapters = parse_chapters(text)

    result = {
        "title": book["title"],
        "category": book["category"],
        "subcategory": book["subcategory"],
        "url": book["url"],
        "text_length": len(text),
        "chapters": chapters,
    }

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)

    return result


def download_books(max_books: int = 100, workers: int = 10):
    """并发下载书籍全文"""
    if not os.path.exists(INDEX_FILE):
        print("Index not found. Run 'index' first.")
        return

    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        books = json.load(f)

    os.makedirs(BOOKS_DIR, exist_ok=True)
    total = min(max_books, len(books))
    target_books = books[:total]

    # 分离：已下载的跳过，未下载的并发抓取
    cached_results = {}
    to_download = []

    for i, book in enumerate(target_books):
        safe_name = re.sub(r'[\\/:*?"<>|]', "_", book["title"])[:50]
        json_path = os.path.join(BOOKS_DIR, f"{i:04d}_{safe_name}.json")
        if os.path.exists(json_path):
            cached_results[i] = None  # placeholder, will load in worker
        else:
            to_download.append((i, book))

    cached_count = len(cached_results)
    new_count = len(to_download)
    print(f"总计 {total} 部: 已有 {cached_count}, 待下载 {new_count}")
    print(f"并发数: {workers}\n")

    if not to_download:
        # 全部已下载，直接加载结果
        results = []
        for i in range(total):
            safe_name = re.sub(r'[\\/:*?"<>|]', "_", target_books[i]["title"])[:50]
            json_path = os.path.join(BOOKS_DIR, f"{i:04d}_{safe_name}.json")
            with open(json_path, "r", encoding="utf-8") as f:
                results.append(json.load(f))
        combined = os.path.join(BOOKS_DIR, "_all_results.json")
        with open(combined, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False)
        print(f"全部已下载: {total} 部")
        return results

    # 并发下载
    results_dict = {}
    completed = 0
    failed = 0
    print_lock = Lock()

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(_download_one_book, book, i): i
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
                with print_lock:
                    print(f"  ✗ [{i}] {target_books[i]['title'][:30]}: {e}")

            # 进度报告
            if (completed + failed) % 50 == 0:
                with print_lock:
                    print(f"  进度: {completed + failed}/{new_count} (成功{completed}, 失败{failed})")

    # 加载缓存的结果
    for i in cached_results:
        safe_name = re.sub(r'[\\/:*?"<>|]', "_", target_books[i]["title"])[:50]
        json_path = os.path.join(BOOKS_DIR, f"{i:04d}_{safe_name}.json")
        with open(json_path, "r", encoding="utf-8") as f:
            results_dict[i] = json.load(f)

    # 按索引排序（跳过下载失败的条目）
    results = [results_dict[i] for i in range(total) if i in results_dict]

    # 保存合并结果
    combined = os.path.join(BOOKS_DIR, "_all_results.json")
    with open(combined, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False)

    print(f"\n完成: 新建 {completed}, 缓存 {cached_count}, 失败 {failed} / 总计 {total}")
    return results


def generate_seeds():
    """从下载结果生成种子数据（按分类拆分文件，避免内存溢出）"""
    combined = os.path.join(BOOKS_DIR, "_all_results.json")
    if not os.path.exists(combined):
        print("No download results found.")
        return

    with open(combined, "r", encoding="utf-8") as f:
        results = json.load(f)

    # 按分类分组
    by_cat: dict[str, list] = {}
    for r in results:
        seed = {
            "title": r["title"],
            "author": "",
            "dynasty": "",
            "category": r["category"],
            "intro": f"殆知阁收录古籍《{r['title']}》。分类：{r['subcategory']}。原文共{r['text_length']}字。",
            "source": f"殆知阁 {r['url']}",
            "chapters": [],
        }

        for ch in r.get("chapters", []):
            content = ch["content"]
            if len(content) > 5000:
                content = content[:5000] + "\n...（原文甚长，此处节录）"
            seed["chapters"].append(
                {"title": ch["title"], "content": content, "tags": [r["category"], r["subcategory"]]}
            )

        by_cat.setdefault(r["category"], []).append(seed)

    # 为每个分类写分块文件（每块300本，避免Node.js内存溢出）
    CHUNK = 300
    total = 0
    idx: dict[str, list[str]] = {}

    for cat, seeds in sorted(by_cat.items()):
        chunks = [seeds[i:i+CHUNK] for i in range(0, len(seeds), CHUNK)]
        idx[cat] = []
        for ci, chunk in enumerate(chunks):
            fname = os.path.join(BASE_DIR, f"temp_daizhige_seeds_{cat}_{ci:03d}.json")
            with open(fname, "w", encoding="utf-8") as f:
                json.dump(chunk, f, ensure_ascii=False, indent=2)
            idx[cat].append(fname)
            print(f"  {cat}[{ci}]: {len(chunk)} -> {os.path.basename(fname)}")
        total += len(seeds)

    # 写索引文件
    idx_path = os.path.join(BASE_DIR, "temp_daizhige_seeds_index.json")
    with open(idx_path, "w", encoding="utf-8") as f:
        json.dump(idx, f, ensure_ascii=False)

    print(f"\n总计 {total} 条种子，按 {len(by_cat)} 个分类拆分")
    print(f"索引文件: {idx_path}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "index":
        build_index()
    elif cmd == "download":
        max_books = int(sys.argv[2]) if len(sys.argv) > 2 else 100
        workers = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        download_books(max_books, workers)
    elif cmd == "generate":
        generate_seeds()
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
