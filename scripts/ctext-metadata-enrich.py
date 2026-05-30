"""
ctext 元数据增强器
=================
用 ctext 免费 API 拉取 49,630 部古籍的学术元数据，
与殆知阁数据交叉匹配，补充朝代/版本/标签信息。

用法:
  py scripts/ctext-metadata-enrich.py fetch    # 拉取全部元数据
  py scripts/ctext-metadata-enrich.py match    # 与殆知阁交叉匹配
  py scripts/ctext-metadata-enrich.py report   # 生成缺失报告
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
META_FILE = os.path.join(BASE_DIR, "temp_ctext_metadata.json")
DAIZHIGE_DIR = os.path.join(BASE_DIR, "temp_daizhige_books")
ENRICH_FILE = os.path.join(BASE_DIR, "temp_ctext_enriched.json")
MISSING_FILE = os.path.join(BASE_DIR, "temp_ctext_missing.json")

print_lock = Lock()

# ctext 朝代英文→中文映射
DYNASTY_MAP = {
    "Spring and Autumn": "春秋", "Warring States": "战国",
    "Han": "汉", "Western Han": "西汉", "Eastern Han": "东汉",
    "Jin": "晋", "Eastern Jin": "东晋", "Western Jin": "西晋",
    "Northern and Southern": "南北朝",
    "Liu-Song": "刘宋", "Southern Qi": "南齐", "Liang": "梁", "Chen": "陈",
    "Northern Wei": "北魏", "Northern Qi": "北齐", "Northern Zhou": "北周",
    "Sui": "隋", "Tang": "唐", "Five Dynasties": "五代",
    "Song": "宋", "Northern Song": "北宋", "Southern Song": "南宋",
    "Liao": "辽", "Jin dynasty": "金", "Yuan": "元",
    "Ming": "明", "Qing": "清", "Republic": "民国",
    "Zhou": "周", "Shang": "商", "Xia": "夏",
    "Pre-Qin": "先秦", "Three Kingdoms": "三国",
}

# 古代作者→朝代参考（ctext元数据补充）
AUTHOR_DYNASTY = {
    "孔子": "春秋", "孟子": "战国", "荀子": "战国", "韩非": "战国",
    "庄子": "战国", "老子": "春秋", "墨子": "春秋", "孙子": "春秋",
    "司马迁": "西汉", "班固": "东汉", "许慎": "东汉",
    "朱熹": "南宋", "王阳明": "明", "顾炎武": "清",
    "屈原": "战国", "陶渊明": "东晋", "李白": "唐", "杜甫": "唐",
    "苏轼": "北宋", "陆游": "南宋", "曹雪芹": "清",
}

# 重要度分级（基于学术影响力）
IMPORTANCE_KEYWORDS = {
    "经部核心": ["论语", "孟子", "诗经", "尚书", "周易", "礼记", "春秋", "孝经", "尔雅", "大学", "中庸"],
    "史部核心": ["史记", "汉书", "后汉书", "三国志", "资治通鉴", "左传", "国语", "战国策"],
    "子部核心": ["老子", "庄子", "墨子", "荀子", "韩非子", "孙子", "吕氏春秋", "淮南子"],
    "集部核心": ["楚辞", "文选", "全唐诗", "全宋词", "古文观止", "唐诗三百首"],
}


def normalize_title(title: str) -> str:
    """标准化书名用于匹配"""
    t = title.strip()
    t = re.sub(r'[《》「」""\s]', '', t)
    # 去除常见后缀
    t = re.sub(r'(卷之?\d+|\d+卷|第\d+卷)$', '', t)
    return t.lower()


def fetch_metadata(workers: int = 30, max_books: int = 0):
    """并发拉取全部 ctext 书目元数据"""
    sys.stdout.reconfigure(encoding='utf-8')

    if not os.path.exists(INDEX_FILE):
        print("请先运行 ctext-scraper.py index")
        return

    books = json.load(open(INDEX_FILE, "r", encoding="utf-8"))
    if max_books > 0:
        books = books[:max_books]
    total = len(books)
    print(f"共 {total} 部，使用 {workers} 并发拉取元数据...")

    results = {}
    completed = 0
    failed = 0
    start = time.time()

    # 分批提交，避免一次创建 49,630 个 future
    CHUNK_SIZE = 2000

    for chunk_start in range(0, total, CHUNK_SIZE):
        chunk_end = min(chunk_start + CHUNK_SIZE, total)
        chunk = books[chunk_start:chunk_end]

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {}
            for i, book in enumerate(chunk):
                global_idx = chunk_start + i
                futures[executor.submit(
                    _fetch_one_book_info, global_idx, book
                )] = global_idx

            for future in as_completed(futures):
                idx, data = future.result()
                if data:
                    results[idx] = data
                    completed += 1
                else:
                    failed += 1

        elapsed = time.time() - start
        rate = (completed + failed) / elapsed if elapsed > 0 else 0
        print(f"  进度: {chunk_end}/{total} (成功{completed}, 失败{failed}, {rate:.0f}条/秒)",
              flush=True)

    # 按序号排序保存
    sorted_results = [results[i] for i in sorted(results)]

    with open(META_FILE, "w", encoding="utf-8") as f:
        json.dump(sorted_results, f, ensure_ascii=False)

    elapsed = time.time() - start
    print(f"\n完成: 成功 {completed}, 失败 {failed} / 总计 {total}, 耗时 {elapsed:.0f}秒",
          flush=True)
    return sorted_results


def _fetch_one_book_info(idx: int, book: dict):
    """获取单部书的元数据"""
    urn = book["urn"]
    try:
        info = ctext.gettextinfo(urn)
        if info and "error" not in str(info).lower():
            return (idx, {"title": book["title"], "urn": urn, "info": info})
    except Exception:
        pass
    return (idx, None)


def match_with_daizhige():
    """将 ctext 元数据与殆知阁数据交叉匹配"""
    if not os.path.exists(META_FILE):
        print("请先运行 fetch")
        return

    ctext_data = json.load(open(META_FILE, "r", encoding="utf-8"))

    # 加载殆知阁数据
    daizhige_books = {}
    if os.path.exists(DAIZHIGE_DIR):
        for fname in os.listdir(DAIZHIGE_DIR):
            if fname.endswith(".json"):
                d = json.load(open(os.path.join(DAIZHIGE_DIR, fname), "r", encoding="utf-8"))
                key = normalize_title(d["title"])
                daizhige_books[key] = d

    daizhige_keys = list(daizhige_books.keys())

    matched = []
    unmatched_ctext = []
    enriched_count = 0

    for item in ctext_data:
        ctitle = item["title"]
        cnorm = normalize_title(ctitle)
        info = item.get("info", {})

        # 尝试匹配
        matched_key = None
        if cnorm in daizhige_books:
            matched_key = cnorm
        else:
            # 模糊匹配：检查是否包含
            for dk in daizhige_keys:
                if len(cnorm) >= 4 and (cnorm in dk or dk in cnorm):
                    matched_key = dk
                    break

        if matched_key:
            dbook = daizhige_books[matched_key]
            # 用 ctext 元数据增强
            dynasty = ""
            dyn_data = info.get("dynasty", {})
            if dyn_data.get("from", {}).get("name"):
                eng = dyn_data["from"]["name"]
                dynasty = DYNASTY_MAP.get(eng, eng)

            edition = info.get("edition", {})
            edition_title = edition.get("title", "") if isinstance(edition, dict) else ""

            enriched = {
                **dbook,
                "ctext_dynasty": dynasty or dbook.get("dynasty", ""),
                "ctext_edition": edition_title,
                "ctext_tags": info.get("tags", []),
                "ctext_urn": item["urn"],
            }
            matched.append(enriched)
            enriched_count += 1
        else:
            # ctext 独有
            unmatched_ctext.append(item)

    with open(ENRICH_FILE, "w", encoding="utf-8") as f:
        json.dump(matched, f, ensure_ascii=False)

    with open(MISSING_FILE, "w", encoding="utf-8") as f:
        json.dump(unmatched_ctext, f, ensure_ascii=False)

    print(f"匹配成功: {enriched_count} 部（已用 ctext 元数据增强）")
    print(f"殆知阁独有: {len(daizhige_books) - enriched_count} 部")
    print(f"ctext 独有: {len(unmatched_ctext)} 部（潜在补充清单）")
    print(f"增强数据: {ENRICH_FILE}")
    print(f"缺失清单: {MISSING_FILE}")


def generate_report():
    """生成缺失古籍的重要性报告"""
    if not os.path.exists(MISSING_FILE):
        print("请先运行 match")
        return

    missing = json.load(open(MISSING_FILE, "r", encoding="utf-8"))

    print(f"\n{'='*60}")
    print(f"ctext 收录但平台缺失的古籍: {len(missing)} 部")
    print(f"{'='*60}\n")

    # 按重要度分类
    high = []
    medium = []
    standard = []

    for item in missing:
        title = item["title"]
        info = item.get("info", {})
        tags = info.get("tags", [])
        dynasty = ""
        dyn_data = info.get("dynasty", {})
        if dyn_data.get("from", {}).get("name"):
            dynasty = dyn_data["from"]["name"]

        # 评级
        importance = "standard"
        for cat, keywords in IMPORTANCE_KEYWORDS.items():
            for kw in keywords:
                if kw in title:
                    importance = "high" if "核心" in cat else "medium"
                    break

        # 有标签的优先
        if tags and importance == "standard":
            importance = "medium"

        entry = {"title": title, "dynasty": dynasty, "tags": tags, "urn": item["urn"]}

        if importance == "high":
            high.append(entry)
        elif importance == "medium":
            medium.append(entry)
        else:
            standard.append(entry)

    print(f"★★★ 核心缺失（优先补充）: {len(high)} 部")
    for e in high[:30]:
        print(f"  《{e['title']}》  {e['dynasty']}  tags={e['tags']}  {e['urn']}")

    print(f"\n★★ 重要缺失: {len(medium)} 部")
    for e in medium[:20]:
        print(f"  《{e['title']}》  {e['dynasty']}  tags={e['tags']}")

    print(f"\n★ 一般缺失: {len(standard)} 部（前20示例）")
    for e in standard[:20]:
        print(f"  《{e['title']}》  {e['dynasty']}")

    print(f"\n建议: 优先补充核心缺失 {len(high)} 部 + 重要缺失 {len(medium)} 部")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "fetch":
        workers = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        fetch_metadata(workers, limit)
    elif cmd == "match":
        match_with_daizhige()
    elif cmd == "report":
        generate_report()
    else:
        print(f"Unknown: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
