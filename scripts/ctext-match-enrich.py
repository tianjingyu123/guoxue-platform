"""
ctext 元数据精确匹配器
=====================
用本地 ctext 书名索引与殆知阁书单做本地匹配（无需API），
仅对匹配成功的拉取 gettextinfo 补充学术元数据。

用法:
  py scripts/ctext-match-enrich.py
"""

import json
import os
import re
import sys
import time
import requests
import ctext

# 给 ctext session 加超时（SDK 默认无超时，某些请求会永久挂起）
ctext.apisession = requests.Session()
_orig_get = ctext.apisession.get
def _get_with_timeout(url, **kwargs):
    kwargs.setdefault('timeout', 20)
    return _orig_get(url, **kwargs)
ctext.apisession.get = _get_with_timeout

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_FILE = os.path.join(BASE_DIR, "temp_ctext_books.json")
DAIZHIGE_DIR = os.path.join(BASE_DIR, "temp_daizhige_books")
OUTPUT_FILE = os.path.join(BASE_DIR, "temp_enriched_metadata.json")
MISSING_FILE = os.path.join(BASE_DIR, "temp_missing_key_books.json")

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

# 核心古籍关键词（ctext独有但平台应优先收录的）
PRIORITY_KEYWORDS = [
    "十三经", "二十四史", "四库全书", "全唐文", "全上古", "全汉赋",
    "敦煌", "出土", "简帛", "墓志", "碑刻", "甲骨",
    "大藏经", "道藏", "续藏",
    "永乐大典", "古今图书集成", "皇清经解",
]


def normalize(t: str) -> str:
    """标准化书名用于匹配"""
    t = re.sub(r'[《》「」""\s（）\(\)\[\]【】]', '', t)
    t = re.sub(r'(卷之?\d+|\d+卷|第\d+卷)$', '', t)
    return t.strip().lower()


def load_daizhige_books():
    """加载殆知阁已下载的书目"""
    books = {}
    if not os.path.exists(DAIZHIGE_DIR):
        return books
    for fname in os.listdir(DAIZHIGE_DIR):
        if fname.endswith(".json") and not fname.startswith("_"):
            d = json.load(open(os.path.join(DAIZHIGE_DIR, fname), "r", encoding="utf-8"))
            key = normalize(d["title"])
            books[key] = d
    return books


def main():
    sys.stdout.reconfigure(encoding='utf-8')

    # 1. 加载 ctext 索引
    print("加载 ctext 索引...", flush=True)
    ctext_books = json.load(open(INDEX_FILE, "r", encoding="utf-8"))
    print(f"  ctext: {len(ctext_books)} 部", flush=True)

    # 2. 加载殆知阁书单
    print("加载殆知阁书单...", flush=True)
    dz_books = load_daizhige_books()
    print(f"  殆知阁已下载: {len(dz_books)} 部", flush=True)

    # 3. 本地书名匹配
    print("执行书名匹配...", flush=True)
    ctext_index = {}  # normalized_name -> ctext_entry
    for b in ctext_books:
        ctext_index[normalize(b["title"])] = b

    matched = []    # 匹配成功
    unmatched = []  # 殆知阁有但ctext无
    ctext_only = [] # ctext有但殆知阁无

    dz_matched_urns = set()

    for dz_key, dz_book in dz_books.items():
        if dz_key in ctext_index:
            cb = ctext_index[dz_key]
            matched.append((dz_book, cb))
            dz_matched_urns.add(cb["urn"])
        elif len(dz_key) >= 3:
            # 模糊匹配
            found = None
            for ck, cb in ctext_index.items():
                if (len(ck) >= 3 and len(dz_key) >= 3 and
                        (dz_key in ck or ck in dz_key)):
                    found = cb
                    dz_matched_urns.add(cb["urn"])
                    break
            if found:
                matched.append((dz_book, found))
            else:
                unmatched.append(dz_book)

    # ctext独有的
    for ck, cb in ctext_index.items():
        if cb["urn"] not in dz_matched_urns:
            ctext_only.append(cb)

    print(f"\n匹配结果:", flush=True)
    print(f"  匹配成功: {len(matched)} 部", flush=True)
    print(f"  殆知阁独有: {len(unmatched)} 部", flush=True)
    print(f"  ctext 独有: {len(ctext_only)} 部", flush=True)

    # 4. 为匹配成功的书拉取 ctext 元数据（限速+增量保存）
    print(f"\n拉取 ctext 元数据（限速 2条/秒，增量保存）...", flush=True)
    enriched = []
    error_count = 0
    for i, (dz_book, cb) in enumerate(matched):
        try:
            info = ctext.gettextinfo(cb["urn"])
            time.sleep(0.4)

            dynasty = ""
            dyn_data = info.get("dynasty", {})
            if dyn_data.get("from", {}).get("name"):
                eng = dyn_data["from"]["name"]
                dynasty = DYNASTY_MAP.get(eng, eng)

            edition = info.get("edition", {})
            edition_title = edition.get("title", "") if isinstance(edition, dict) else ""

            enriched.append({
                "title": dz_book["title"],
                "dynasty": dynasty or dz_book.get("dynasty", ""),
                "category": dz_book.get("category", ""),
                "ctext_urn": cb["urn"],
                "ctext_edition": edition_title,
                "ctext_tags": info.get("tags", []),
                "dz_source": dz_book.get("source", ""),
            })
        except Exception as e:
            error_count += 1
            time.sleep(1.5)

        # 每100条增量保存
        if (i + 1) % 100 == 0:
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(enriched, f, ensure_ascii=False, indent=2)
            print(f"  进度: {i+1}/{len(matched)} (已保存{len(enriched)}, 错误{error_count})", flush=True)

    # 最终保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    # 5. 分析 ctext 独有的重要书籍
    print(f"\n分析 ctext 独有书目（{len(ctext_only)} 部）...", flush=True)
    priority_missing = []
    for cb in ctext_only:
        title = cb["title"]
        for kw in PRIORITY_KEYWORDS:
            if kw in title:
                priority_missing.append(cb)
                break

    # 6. 保存
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    with open(MISSING_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "ctext_only_count": len(ctext_only),
            "priority_missing": priority_missing[:500],
            "dz_only_count": len(unmatched),
        }, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"增强元数据: {len(enriched)} 部 -> {OUTPUT_FILE}")
    print(f"缺失清单: {MISSING_FILE}")
    print(f"优先补充: {len(priority_missing)} 部（{', '.join(PRIORITY_KEYWORDS)}）")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
