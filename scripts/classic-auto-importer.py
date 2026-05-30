"""
古籍自动导入流水线
=================
数据源优先级:
1. GitHub daizhigev20 (殆知阁全量 TXT) — 一次下载,永久使用
2. ctext.org API — 按需获取,自动分chapters
3. NiuTrans Classical-Modern — 带现代文译文的文本

用法:
  python scripts/classic-auto-importer.py list          # 列出 ctext 目录
  python scripts/classic-auto-importer.py download-ctext  # 从 ctext 批量下载核心古籍
  python scripts/classic-auto-importer.py import-daizhige # 从殆知阁 TXT 批量导入
  python scripts/classic-auto-importer.py seed-db        # 写入数据库种子文件
"""

import json
import os
import sys
import time
import re
import urllib.request
import urllib.error

# ============================================================
# 配置
# ============================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOG_FILE = os.path.join(BASE_DIR, "temp_ctext_catalog.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "apps/server/src/modules/classic/bazi-books")
SEED_OUTPUT = os.path.join(BASE_DIR, "temp_classic_seeds.json")

# 核心古籍优先列表 (URN -> 分类)
PRIORITY_TEXTS = {
    # 经部
    "ctp:analects": ("论语", "经", "先秦", "孔子弟子"),
    "ctp:mengzi": ("孟子", "经", "先秦", "孟子"),
    "ctp:shang-shu": ("尚书", "经", "先秦", ""),
    "ctp:shi-jing": ("诗经", "经", "先秦", ""),
    "ctp:yi-jing": ("易经", "经", "先秦", ""),
    "ctp:chun-qiu-zuo-zhuan": ("春秋左传", "经", "先秦", "左丘明"),
    "ctp:li-ji": ("礼记", "经", "先秦", ""),
    "ctp:xiao-jing": ("孝经", "经", "先秦", ""),
    "ctp:er-ya": ("尔雅", "经", "汉", ""),
    # 史部
    "ctp:shi-ji": ("史记", "史", "汉", "司马迁"),
    "ctp:han-shu": ("汉书", "史", "汉", "班固"),
    "ctp:hou-han-shu": ("后汉书", "史", "南朝宋", "范晔"),
    "ctp:san-guo-zhi": ("三国志", "史", "晋", "陈寿"),
    "ctp:zi-zhi-tong-jian": ("资治通鉴", "史", "宋", "司马光"),
    "ctp:zhan-guo-ce": ("战国策", "史", "汉", "刘向"),
    "ctp:guo-yu": ("国语", "史", "先秦", ""),
    # 子部
    "ctp:dao-de-jing": ("道德经", "子", "先秦", "老子"),
    "ctp:zhuangzi": ("庄子", "子", "先秦", "庄周"),
    "ctp:mozi": ("墨子", "子", "先秦", "墨翟"),
    "ctp:hanfeizi": ("韩非子", "子", "先秦", "韩非"),
    "ctp:sunzi-bing-fa": ("孙子兵法", "子", "先秦", "孙武"),
    "ctp:xunzi": ("荀子", "子", "先秦", "荀况"),
    "ctp:liezi": ("列子", "子", "先秦", "列御寇"),
    "ctp:huai-nan-zi": ("淮南子", "子", "汉", "刘安"),
    "ctp:shuo-yuan": ("说苑", "子", "汉", "刘向"),
    "ctp:lv-shi-chun-qiu": ("吕氏春秋", "子", "先秦", "吕不韦"),
    "ctp:gong-sun-long-zi": ("公孙龙子", "子", "先秦", "公孙龙"),
    "ctp:gui-gu-zi": ("鬼谷子", "子", "先秦", ""),
    "ctp:yan-tie-lun": ("盐铁论", "子", "汉", "桓宽"),
    "ctp:shang-jun-shu": ("商君书", "子", "先秦", "商鞅"),
    "ctp:shen-zi": ("慎子", "子", "先秦", "慎到"),
    "ctp:wu-zi": ("吴子", "子", "先秦", "吴起"),
    "ctp:wen-zi": ("文子", "子", "先秦", ""),
    "ctp:he-guan-zi": ("鹖冠子", "子", "先秦", ""),
    "ctp:yin-wen-zi": ("尹文子", "子", "先秦", ""),
    "ctp:kong-cong-zi": ("孔丛子", "子", "汉", "孔鲋"),
    # 医学
    "ctp:huangdi-neijing": ("黄帝内经", "子", "先秦", ""),
    "ctp:nan-jing": ("难经", "子", "汉", "扁鹊"),
    "ctp:shang-han-lun": ("伤寒论", "子", "汉", "张仲景"),
    "ctp:shen-nong-ben-cao-jing": ("神农本草经", "子", "汉", ""),
    # 集部
    "ctp:chu-ci": ("楚辞", "集", "先秦-汉", "屈原等"),
    "ctp:wen-xuan": ("文选", "集", "南朝梁", "萧统"),
    "ctp:gu-shi-yuan": ("古诗源", "集", "清", "沈德潜"),
    # 佛经
    "ctp:jin-gang-jing": ("金刚经", "释", "唐", "鸠摩罗什译"),
    "ctp:heart-sutra": ("心经", "释", "唐", "玄奘译"),
    "ctp:tan-jing": ("六祖坛经", "释", "唐", "惠能"),
    # 道教
    "ctp:zhuangzi": ("庄子", "道", "先秦", "庄周"),
    "ctp:liezi": ("列子", "道", "先秦", "列御寇"),
}


def load_catalog():
    """加载 ctext 目录"""
    if os.path.exists(CATALOG_FILE):
        with open(CATALOG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def download_ctext_text(urn: str) -> dict | None:
    """通过 ctext API 下载一部古籍的完整内容，自动分chapters"""
    try:
        # Use the built-in Python API approach instead of ctext lib
        # to have more control over rate limiting
        from ctext import (
            setlanguage,
            setremap,
            gettextaschapterlist,
            gettextinfo,
            gettexttitles,
        )

        setlanguage("zh")
        setremap("gb")

        # Get metadata
        info = gettextinfo(urn)
        if not info:
            print(f"  [WARN] 无元数据: {urn}")
            return None

        # Get chapter list
        chapters = gettextaschapterlist(urn)
        if not chapters:
            print(f"  [WARN] 无chapters节: {urn}")
            return None

        title = info.get("title", urn)
        print(f"  [OK] {title}: {len(chapters)} chapters")

        return {
            "urn": urn,
            "title": title,
            "author": info.get("author", ""),
            "chapters": [
                {"title": ch.get("title", f"Ch.{i+1}"), "content": ch.get("content", "")}
                for i, ch in enumerate(chapters)
            ],
        }

    except Exception as e:
        print(f"  [FAIL] {urn}: {e}")
        return None


def download_priority_texts(delay: float = 2.0):
    """下载优先级列表中的古籍"""
    print(f"\n{'='*60}")
    print(f"下载 {len(PRIORITY_TEXTS)} 部核心古籍")
    print(f"请求间隔: {delay}秒 (避免被封)")
    print(f"{'='*60}")

    results = []
    success = 0
    failed = 0

    for urn, (title, category, dynasty, author) in PRIORITY_TEXTS.items():
        print(f"\n[{category}] {title} ({urn})")
        time.sleep(delay)

        data = download_ctext_text(urn)
        if data:
            data["category"] = category
            data["dynasty"] = dynasty
            data["author"] = author or data.get("author", "")
            results.append(data)
            success += 1
        else:
            failed += 1

        # Progress
        total = len(PRIORITY_TEXTS)
        print(f"  进度: {success+failed}/{total} (成功{success}, 失败{failed})")

    # Save results
    output = os.path.join(BASE_DIR, "temp_ctext_downloads.json")
    with open(output, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n完成! 成功 {success}, 失败 {failed}")
    print(f"数据保存到: {output}")
    return results


def generate_seed_file(data: list):
    """将下载的古籍数据转换为 TypeScript 种子文件"""
    if not data:
        print("无数据可生成")
        return

    seeds = []
    for book in data:
        seed = {
            "title": book["title"],
            "author": book.get("author", "佚名"),
            "dynasty": book.get("dynasty", ""),
            "category": book.get("category", "子"),
            "intro": f"《{book['title']}》古典文献。来源: ctext.org",
            "source": f"ctext.org ({book.get('urn', '')})",
            "chapters": [],
        }

        for ch in book.get("chapters", []):
            content = ch.get("content", "")
            if len(content) > 5000:
                content = content[:5000] + "\n...（原文甚长，此处节录）"

            seed["chapters"].append(
                {"title": ch["title"], "content": content, "tags": [book["category"]]}
            )

        seeds.append(seed)

    # Write as JSON for later conversion to TS
    with open(SEED_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(seeds, f, ensure_ascii=False, indent=2)

    print(f"\n种子文件已生成: {SEED_OUTPUT}")
    print(f"共 {len(seeds)} 部古籍")

    # Also generate TypeScript seed file
    ts_path = os.path.join(
        BASE_DIR, "apps/server/src/modules/classic/classic-ctext-seeder.data.ts"
    )

    with open(ts_path, "w", encoding="utf-8") as f:
        f.write('import { BaziBookSeed } from "../classic-bazi-seeder.service";\n\n')
        f.write("/**\n * ctext.org 自动导入古籍数据\n")
        f.write(f" * 自动生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f" * 共 {len(seeds)} 部\n */\n")
        f.write("const ctextClassics: BaziBookSeed[] = [\n")

        for seed in seeds:
            f.write("  {\n")
            f.write(f'    title: "{_esc(seed["title"])}",\n')
            f.write(f'    author: "{_esc(seed["author"])}",\n')
            f.write(f'    dynasty: "{_esc(seed["dynasty"])}",\n')
            f.write(f'    intro: "{_esc(seed["intro"])}",\n')
            f.write(f'    source: "{_esc(seed["source"])}",\n')
            f.write("    chapters: [\n")

            for ch in seed["chapters"]:
                f.write("      {\n")
                f.write(f'        title: "{_esc(ch["title"])}",\n')
                f.write(f'        content:\n          "{_esc(ch["content"])}",\n')
                f.write(f"        tags: {json.dumps(ch['tags'])},\n")
                f.write("      },\n")

            f.write("    ],\n")
            f.write("  },\n")

        f.write("];\n\n")
        f.write("export default ctextClassics;\n")

    print(f"TypeScript 文件已生成: {ts_path}")


def _esc(s: str) -> str:
    """转义 TypeScript 字符串"""
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n").replace("\r", "")


def show_catalog(limit: int = 100):
    """显示 ctext 目录"""
    books = load_catalog()
    if not books:
        print("未找到目录，请先运行: python scripts/classic-auto-importer.py update-catalog")
        return

    print(f"ctext 目录共 {len(books)} 部古籍\n")

    # Filter for Chinese titles
    chinese_books = []
    for b in books:
        title = b.get("title", "") if isinstance(b, dict) else str(b)
        if any("一" <= c <= "鿿" for c in title):
            chinese_books.append(b)

    print(f"其中中文古籍: {len(chinese_books)} 部\n")

    # Show by category categories (heuristic)
    categories = {"经": 0, "史": 0, "子": 0, "集": 0, "释": 0, "道": 0, "其他": 0}
    for b in chinese_books[:limit]:
        title = b.get("title", "") if isinstance(b, dict) else str(b)
        urn = b.get("urn", "") if isinstance(b, dict) else ""
        print(f"  {title:20s} {urn}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "list":
        show_catalog()
    elif cmd == "download-ctext":
        data = download_priority_texts(delay=3.0)
        generate_seed_file(data)
    elif cmd == "seed-db":
        # Load from JSON and generate TS
        json_path = os.path.join(BASE_DIR, "temp_ctext_downloads.json")
        if not os.path.exists(json_path):
            print("请先运行 download-ctext")
            return
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        generate_seed_file(data)
    elif cmd == "stats":
        books = load_catalog()
        print(f"目录总数: {len(books)}")
        # Count by prefix
        prefixes = {}
        for b in books:
            urn = b.get("urn", "") if isinstance(b, dict) else ""
            prefix = urn.split(":")[-1].split("/")[0][:1] if ":" in urn else "?"
            prefixes[prefix] = prefixes.get(prefix, 0) + 1
        for k, v in sorted(prefixes.items(), key=lambda x: -x[1]):
            print(f"  {k}: {v}")
    else:
        print(f"未知命令: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
