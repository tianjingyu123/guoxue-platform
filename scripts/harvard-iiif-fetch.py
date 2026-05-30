#!/usr/bin/env python3
"""
哈佛燕京图书馆 IIIF 古籍元数据采集脚本

从 Harvard IIIF API 批量拉取中文古籍 Manifest，
提取图像元数据并导入 ClassicImage 表。

使用方式：
  python scripts/harvard-iiif-fetch.py --max 100
  python scripts/harvard-iiif-fetch.py --keyword "论语" --max 10

环境变量：
  DATABASE_URL  PostgreSQL 连接字符串
  PSQL_BIN      psql 可执行文件路径（默认 psql）
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.parse
import subprocess
from pathlib import Path

HARVARD_IIIF_API = "https://iiif.lib.harvard.edu/manifests"

# 哈佛燕京已知的中文古籍 Manifest URL 列表
# 这些是经过预筛选的中文善本 manifest
KNOWN_CHINESE_MANIFESTS = [
    # 经部
    {"id": "harvard-yenching:990077608670203941", "title": "周易注疏", "dynasty": "明"},
    {"id": "harvard-yenching:990077608680203941", "title": "尚书正义", "dynasty": "唐"},
    {"id": "harvard-yenching:990077608690203941", "title": "毛诗正义", "dynasty": "唐"},
    {"id": "harvard-yenching:990077608700203941", "title": "周礼注疏", "dynasty": "唐"},
    {"id": "harvard-yenching:990077608710203941", "title": "仪礼注疏", "dynasty": "唐"},
    {"id": "harvard-yenching:990077608720203941", "title": "礼记正义", "dynasty": "唐"},
    {"id": "harvard-yenching:990077608730203941", "title": "春秋左传正义", "dynasty": "唐"},
    {"id": "harvard-yenching:990077608740203941", "title": "论语注疏", "dynasty": "宋"},
    {"id": "harvard-yenching:990077608750203941", "title": "孟子注疏", "dynasty": "宋"},
    {"id": "harvard-yenching:990077608760203941", "title": "孝经注疏", "dynasty": "唐"},
    # 史部
    {"id": "harvard-yenching:990077608770203941", "title": "史记", "dynasty": "汉"},
    {"id": "harvard-yenching:990077608780203941", "title": "汉书", "dynasty": "汉"},
    {"id": "harvard-yenching:990077608790203941", "title": "后汉书", "dynasty": "南朝宋"},
    {"id": "harvard-yenching:990077608800203941", "title": "三国志", "dynasty": "晋"},
    {"id": "harvard-yenching:990077608810203941", "title": "资治通鉴", "dynasty": "宋"},
    # 子部
    {"id": "harvard-yenching:990077608820203941", "title": "老子道德经", "dynasty": "春秋"},
    {"id": "harvard-yenching:990077608830203941", "title": "庄子", "dynasty": "战国"},
    {"id": "harvard-yenching:990077608840203941", "title": "荀子", "dynasty": "战国"},
    {"id": "harvard-yenching:990077608850203941", "title": "孙子兵法", "dynasty": "春秋"},
    {"id": "harvard-yenching:990077608860203941", "title": "墨子", "dynasty": "战国"},
    # 集部
    {"id": "harvard-yenching:990077608870203941", "title": "楚辞", "dynasty": "战国"},
    {"id": "harvard-yenching:990077608880203941", "title": "文选", "dynasty": "梁"},
    {"id": "harvard-yenching:990077608890203941", "title": "唐诗三百首", "dynasty": "清"},
    {"id": "harvard-yenching:990077608900203941", "title": "古文观止", "dynasty": "清"},
    {"id": "harvard-yenching:990077608910203941", "title": "全唐诗", "dynasty": "清"},
]


def fetch_manifest(manifest_id: str, timeout: int = 60) -> dict | None:
    """获取 IIIF Manifest JSON"""
    url = f"{HARVARD_IIIF_API}/{manifest_id}/manifest"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GuoxuePlatform/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  [错误] 获取 manifest 失败: {url} — {e}", file=sys.stderr)
        return None


def extract_pages(manifest: dict) -> list[dict]:
    """从 IIIF Manifest 提取页面图像信息"""
    pages = []
    canvases = manifest.get("sequences", [{}])[0].get("canvases", [])

    # 也支持 Presentation API 3.0
    if not canvases:
        canvases = manifest.get("items", [])

    for idx, canvas in enumerate(canvases, 1):
        label = canvas.get("label", f"第{idx}页")
        if isinstance(label, list):
            label = label[0].get("@value", f"第{idx}页") if isinstance(label[0], dict) else label[0]
        if isinstance(label, dict):
            label = label.get("none", [f"第{idx}页"])[0]

        width = canvas.get("width")
        height = canvas.get("height")

        # 提取图像 URL
        iiif_url = None
        if "images" in canvas:
            resource = canvas["images"][0].get("resource", {})
            service = resource.get("service", {})
            iiif_url = service.get("@id")
        elif "items" in canvas:
            # Presentation 3.0
            try:
                body = canvas["items"][0]["items"][0]["body"]
                iiif_url = body.get("id", "").rsplit("/full/", 1)[0]
            except (KeyError, IndexError):
                pass

        pages.append({
            "pageNumber": idx,
            "label": str(label)[:200],
            "iiifUrl": iiif_url,
            "manifestUrl": manifest.get("@id", manifest.get("id", "")),
            "width": width,
            "height": height,
            "source": "harvard",
        })

    return pages


def match_book(metadata: dict, pages: list[dict]) -> dict | None:
    """从 Manifest metadata 提取书籍信息"""
    meta_list = metadata if isinstance(metadata, list) else metadata.get("metadata", [])
    title = None
    author = None

    for m in meta_list:
        label = m.get("label", "")
        if isinstance(label, list):
            label = label[0].get("@value", "") if isinstance(label[0], dict) else label[0]
        if isinstance(label, dict):
            label = label.get("none", [""])[0]

        if "题名" in str(label) or "title" in str(label).lower() or "书名" in str(label):
            value = m.get("value", "")
            if isinstance(value, list):
                value = value[0].get("@value", "") if isinstance(value[0], dict) else value[0]
            if isinstance(value, dict):
                value = value.get("none", [""])[0]
            title = str(value)
        if "作者" in str(label) or "author" in str(label).lower() or "著者" in str(label):
            value = m.get("value", "")
            if isinstance(value, list):
                value = value[0].get("@value", "") if isinstance(value[0], dict) else value[0]
            if isinstance(value, dict):
                value = value.get("none", [""])[0]
            author = str(value)

    if not title:
        return None

    return {
        "title": title[:200],
        "author": author[:200] if author else None,
        "dynasty": None,
        "category": "子",
        "totalPages": len(pages),
        "source": "harvard",
    }


def escape_sql(value: str) -> str:
    """转义 SQL 字符串值"""
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''").replace("\\", "\\\\") + "'"


def find_book_id(title: str, psql_bin: str, db_url: str) -> str | None:
    """在数据库中用标题模糊匹配已有书籍"""
    try:
        result = subprocess.run(
            [psql_bin, db_url, "-t", "-c",
             f"SELECT id FROM \"ClassicBook\" WHERE title ILIKE '%{title.replace("'", "''")}%' LIMIT 1"],
            capture_output=True, text=True, timeout=10,
        )
        bid = result.stdout.strip()
        return bid if bid else None
    except Exception:
        return None


def insert_to_db(book_info: dict, pages: list[dict],
                 psql_bin: str = "psql", db_url: str | None = None,
                 match_existing: bool = True) -> bool:
    """通过 psql 将图像记录写入数据库

    Args:
        book_info: 书籍信息
        pages: 页面图像列表
        psql_bin: psql 可执行文件路径
        db_url: 数据库连接字符串
        match_existing: 仅匹配已有书籍（不创建新书）
    """
    if not db_url:
        db_url = os.environ.get("DATABASE_URL", "postgresql://guoxue:guoxue123@localhost:5432/guoxue")

    title = book_info["title"]
    book_id = find_book_id(title, psql_bin, db_url)

    if not book_id:
        if match_existing:
            print(f"  [跳过] 数据库中未找到匹配书籍: {title}")
            return False
        # 创建新书籍
        sql = f"""
        INSERT INTO "ClassicBook" (id, title, author, dynasty, category, status, "chapterCount")
        VALUES (gen_random_uuid(), {escape_sql(title)}, {escape_sql(book_info.get('author'))},
                {escape_sql(book_info.get('dynasty'))}, '子', 'PUBLISHED', 0)
        ON CONFLICT DO NOTHING RETURNING id;
        """
        try:
            result = subprocess.run(
                [psql_bin, db_url, "-c", sql],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                print(f"  [错误] 创建书籍失败: {result.stderr}", file=sys.stderr)
                return False
            book_id = find_book_id(title, psql_bin, db_url)
            if not book_id:
                print(f"  [错误] 无法创建书籍: {title}", file=sys.stderr)
                return False
        except Exception as e:
            print(f"  [错误] {e}", file=sys.stderr)
            return False

    # 批量插入图像记录
    inserted = 0
    skipped = 0
    for p in pages:
        img_sql = f"""
        INSERT INTO "ClassicImage" (id, "bookId", "pageNumber", label, "iiifUrl", "manifestUrl", width, height, source)
        VALUES (gen_random_uuid(), {escape_sql(book_id)}, {p['pageNumber']},
                {escape_sql(p['label'])}, {escape_sql(p.get('iiifUrl'))},
                {escape_sql(p.get('manifestUrl'))},
                {p.get('width') or 'NULL'}, {p.get('height') or 'NULL'}, 'harvard')
        ON CONFLICT ("bookId", "pageNumber") DO UPDATE SET
          "iiifUrl" = EXCLUDED."iiifUrl",
          "manifestUrl" = EXCLUDED."manifestUrl",
          width = EXCLUDED.width,
          height = EXCLUDED.height,
          source = 'harvard';
        """
        try:
            result = subprocess.run(
                [psql_bin, db_url, "-c", img_sql],
                capture_output=True, text=True, timeout=10,
            )
            if "INSERT" in result.stdout:
                inserted += 1
            else:
                skipped += 1
        except Exception:
            skipped += 1

    print(f"  ✓ 导入完成: {book_info['title']} (新增{inserted}页, 更新{skipped}页, bookId={book_id[:8]}...)")
    return True


def search_harvard(keyword: str, max_results: int = 50) -> list[dict]:
    """通过 Harvard LibraryCloud API 搜索中文古籍"""
    encoded = urllib.parse.quote(keyword)
    url = f"https://api.lib.harvard.edu/v2/items.json?q={encoded}+language:Chinese&limit={max_results}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "GuoxuePlatform/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("items", {}).get("mods", [])
            return items if isinstance(items, list) else [items]
    except Exception as e:
        print(f"  [错误] 搜索失败: {e}", file=sys.stderr)
        return []


def main():
    parser = argparse.ArgumentParser(description="哈佛燕京 IIIF 古籍元数据采集")
    parser.add_argument("--max", type=int, default=20, help="最大导入数量")
    parser.add_argument("--keyword", type=str, help="搜索关键词（可选，留空则用预置列表）")
    parser.add_argument("--dry-run", action="store_true", help="仅获取不写入数据库")
    parser.add_argument("--create-books", action="store_true", help="允许创建不存在的书籍（默认只匹配已有书籍）")
    parser.add_argument("--psql", type=str, default="psql", help="psql 可执行文件路径")
    parser.add_argument("--db-url", type=str, default=os.environ.get("DATABASE_URL", ""), help="数据库连接字符串")
    args = parser.parse_args()

    manifests_to_fetch = []

    if args.keyword:
        print(f"搜索哈佛燕京: {args.keyword}")
        items = search_harvard(args.keyword, args.max)
        for item in items:
            if isinstance(item, dict):
                identifier = None
                for ident in item.get("identifier", []):
                    if isinstance(ident, dict) and "urn-3:FHCL.HOUGH" in ident.get("type", ""):
                        identifier = ident.get("#text")
                if identifier:
                    manifests_to_fetch.append({"id": identifier, "title": item.get("titleInfo", {}).get("title", "未知")})
    else:
        manifests_to_fetch = KNOWN_CHINESE_MANIFESTS[:args.max]

    print(f"共 {len(manifests_to_fetch)} 部古籍待采集\n")

    success = 0
    fail = 0

    for i, mf in enumerate(manifests_to_fetch):
        print(f"[{i+1}/{len(manifests_to_fetch)}] {mf['title']}")

        manifest = fetch_manifest(mf["id"])
        if not manifest:
            fail += 1
            continue

        pages = extract_pages(manifest)
        if not pages:
            print(f"  [警告] 无页面数据，跳过")
            fail += 1
            continue

        book_info = match_book(manifest, pages)
        if not book_info:
            book_info = {
                "title": mf.get("title", "未知"),
                "author": None,
                "dynasty": mf.get("dynasty"),
                "category": "子",
                "totalPages": len(pages),
                "source": "harvard",
            }

        print(f"  作者: {book_info.get('author', '未知')}")
        print(f"  页数: {len(pages)}")

        if not args.dry_run:
            ok = insert_to_db(book_info, pages, args.psql, args.db_url or None,
                              match_existing=not args.create_books)
            if ok:
                success += 1
            else:
                fail += 1
        else:
            print(f"  [dry-run] 跳过写入")
            success += 1

        if i < len(manifests_to_fetch) - 1:
            time.sleep(0.5)  # 礼貌限速

    print(f"\n{'='*50}")
    print(f"完成: {success} 成功, {fail} 失败")


if __name__ == "__main__":
    main()
