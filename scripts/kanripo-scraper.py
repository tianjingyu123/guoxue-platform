"""
Kanripo (汉籍リポジトリ) 古籍采集器
===================================
从 GitHub kanripo org 获取完整古籍文本。
KR5=道藏 (~4600部), KR6=大正藏/佛经 (~4700部), KR1-4=四库全书+。

分阶段执行:
  py scripts/kanripo-scraper.py --phase 1   # 拉取全部repo列表
  py scripts/kanripo-scraper.py --phase 2   # 批量读Readme.org获取书名
  py scripts/kanripo-scraper.py --phase 3   # 对比现有书库+下载新书
  py scripts/kanripo-scraper.py --phase 4   # 导入数据库

用法 (一键全流程):
  py scripts/kanripo-scraper.py --all
"""

import json
import os
import re
import sys
import time
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_LIST_FILE = os.path.join(BASE_DIR, "temp_kanripo_repos.json")
TITLE_CACHE_FILE = os.path.join(BASE_DIR, "temp_kanripo_titles.json")
COMPARISON_FILE = os.path.join(BASE_DIR, "temp_kanripo_new_books.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "temp_kanripo_seeds")
SEED_PREFIX = "temp_kanripo_seeds"

GITHUB_API = "https://api.github.com"
RAW_BASE = "https://raw.githubusercontent.com"
ORG = "kanripo"
API_PER_PAGE = 100
API_DELAY = 1.2  # GitHub API 未认证限速 60/小时

# KR类别映射
CATEGORY_MAP = {
    "KR1": "经", "KR2": "史", "KR3": "子", "KR4": "集",
    "KR5": "道藏", "KR6": "释",
}

# kanripo 特有分类名映射（用于去向判断）
KANRIPO_SPECIAL = {
    "KR5": "道藏",
    "KR6": "大正藏",
}


def fetch_page(page: int) -> list[dict]:
    """获取单页repo列表"""
    url = f"{GITHUB_API}/orgs/{ORG}/repos?per_page={API_PER_PAGE}&page={page}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_all_repos():
    """阶段1: 拉取全部kanripo repo列表 (94页)"""
    sys.stdout.reconfigure(encoding='utf-8')

    # 先获取总页数
    print("获取总页数...", flush=True)
    resp = requests.get(
        f"{GITHUB_API}/orgs/{ORG}/repos?per_page={API_PER_PAGE}&page=1",
        timeout=30
    )
    # 从 Link header 推断最后一页
    link = resp.headers.get("Link", "")
    last_page = 94  # 已知
    if 'rel="last"' in link:
        import re as _re
        m = _re.search(r'page=(\d+)>; rel="last"', link)
        if m:
            last_page = int(m.group(1))

    print(f"总页数: {last_page}，每页{API_PER_PAGE}个仓库", flush=True)
    print(f"预计耗时: {last_page * API_DELAY / 60:.0f}分钟", flush=True)

    all_repos = []
    error_pages = []

    for page in range(1, last_page + 1):
        try:
            repos = fetch_page(page)
            all_repos.extend(repos)
            cats = {}
            for r in repos:
                prefix = r["name"][:3] if len(r["name"]) > 3 and r["name"][2].isdigit() else r["name"][:4]
                cats[prefix] = cats.get(prefix, 0) + 1
            cat_str = ", ".join(f"{k}:{v}" for k, v in sorted(cats.items()))
            print(f"  [{page}/{last_page}] +{len(repos)}个 ({cat_str})", flush=True)

            # 每10页增量保存
            if page % 10 == 0:
                with open(REPO_LIST_FILE, "w", encoding="utf-8") as f:
                    json.dump(all_repos, f, ensure_ascii=False, indent=2)
                print(f"  已保存 {len(all_repos)} 条到 {REPO_LIST_FILE}", flush=True)

            time.sleep(API_DELAY)
        except Exception as e:
            print(f"  [{page}/{last_page}] 失败: {e}", flush=True)
            error_pages.append(page)
            time.sleep(2)

    # 最终保存
    with open(REPO_LIST_FILE, "w", encoding="utf-8") as f:
        json.dump(all_repos, f, ensure_ascii=False, indent=2)

    print(f"\n完成: {len(all_repos)} 个仓库 -> {REPO_LIST_FILE}")
    if error_pages:
        print(f"失败页: {error_pages}")


def read_title(repo_name: str) -> str | None:
    """从 raw.githubusercontent.com 读取 Readme.org 获取书名"""
    try:
        url = f"{RAW_BASE}/{ORG}/{repo_name}/master/Readme.org"
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            return None
        # 查找 #+TITLE: 行
        for line in resp.text.splitlines()[:30]:
            m = re.match(r'^#\+TITLE:\s*(.+)', line, re.IGNORECASE)
            if m:
                title = m.group(1).strip()
                # 清理特殊字符
                title = re.sub(r'\s+', '', title) if len(title) <= 3 else title.strip()
                return title if title else None
        return None
    except Exception:
        return None


def normalize_title(t: str) -> str:
    """标准化书名用于匹配"""
    t = re.sub(r'[《》「」""\s（）\(\)\[\]【】]', '', t)
    t = re.sub(r'(卷之?\d+|\d+卷|第\d+卷)$', '', t)
    return t.strip().lower()


def load_existing_titles() -> set[str]:
    """加载已有书目标题（从殆知阁seed和数据库）"""
    titles = set()

    # 从殆知阁 temp 文件
    dz_dir = os.path.join(BASE_DIR, "temp_daizhige_books")
    if os.path.exists(dz_dir):
        for fname in os.listdir(dz_dir):
            if fname.endswith(".json") and not fname.startswith("_"):
                try:
                    d = json.load(open(os.path.join(dz_dir, fname), "r", encoding="utf-8"))
                    if isinstance(d, dict) and "title" in d:
                        titles.add(normalize_title(d["title"]))
                except Exception:
                    pass

    # 从 NiuTrans seeds
    nt_file = os.path.join(BASE_DIR, "temp_niutrans_seeds_new_books.json")
    if os.path.exists(nt_file):
        try:
            nt = json.load(open(nt_file, "r", encoding="utf-8"))
            for b in nt:
                if isinstance(b, dict) and "title" in b:
                    titles.add(normalize_title(b["title"]))
        except Exception:
            pass

    return titles


def resolve_titles_phase2(workers: int = 30):
    """阶段2: 批量读取 Readme.org 获取书名（并发）"""
    sys.stdout.reconfigure(encoding='utf-8')

    if not os.path.exists(REPO_LIST_FILE):
        print("请先运行 --phase 1 获取repo列表")
        return

    repos = json.load(open(REPO_LIST_FILE, "r", encoding="utf-8"))
    print(f"共 {len(repos)} 个仓库，批量读取书名...", flush=True)

    # 加载缓存
    title_cache = {}
    if os.path.exists(TITLE_CACHE_FILE):
        title_cache = json.load(open(TITLE_CACHE_FILE, "r", encoding="utf-8"))
        print(f"已有 {len(title_cache)} 条缓存", flush=True)

    to_fetch = [(r["name"], r.get("description", ""))
                for r in repos if r["name"] not in title_cache]

    print(f"待获取: {len(to_fetch)} 个", flush=True)
    success = 0
    empty = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(read_title, name): name
                   for name, _ in to_fetch}
        for i, future in enumerate(as_completed(futures)):
            name = futures[future]
            try:
                title = future.result()
                if title:
                    title_cache[name] = title
                    success += 1
                else:
                    empty += 1
            except Exception:
                errors += 1

            # 每500条保存进度
            if (i + 1) % 500 == 0:
                with open(TITLE_CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(title_cache, f, ensure_ascii=False, indent=2)
                print(f"  进度: {i+1}/{len(to_fetch)} (成功{success}, 空{empty}, 错{errors})",
                      flush=True)

    # 最终保存
    with open(TITLE_CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(title_cache, f, ensure_ascii=False, indent=2)

    print(f"\n完成: 成功{success}, 空Readme.org{empty}, 错误{errors}")
    print(f"书名缓存: {TITLE_CACHE_FILE}")


def compare_and_download_phase3(max_books: int | None = None):
    """阶段3: 对比现有书库，下载新书并生成seed文件"""
    sys.stdout.reconfigure(encoding='utf-8')

    if not os.path.exists(TITLE_CACHE_FILE):
        print("请先运行 --phase 2 获取书名")
        return

    title_cache = json.load(open(TITLE_CACHE_FILE, "r", encoding="utf-8"))
    print(f"书名缓存: {len(title_cache)} 条", flush=True)

    existing = load_existing_titles()
    print(f"现有书库: {len(existing)} 部", flush=True)

    # 分类对比
    new_books = []
    existing_matches = []
    no_title = []

    for repo_name, title in title_cache.items():
        norm = normalize_title(title)
        if norm in existing:
            existing_matches.append((repo_name, title))
        else:
            cat_code = repo_name[:3] if repo_name[2].isdigit() else repo_name[:4]
            category = CATEGORY_MAP.get(cat_code, "其他")
            new_books.append({
                "repo_name": repo_name,
                "title": title,
                "category": category,
                "kr_code": cat_code,
            })

    # 检查没有Readme.org的repo
    if os.path.exists(REPO_LIST_FILE):
        repos = json.load(open(REPO_LIST_FILE, "r", encoding="utf-8"))
        for r in repos:
            if r["name"] not in title_cache:
                cat_code = r["name"][:3] if r["name"][2].isdigit() else r["name"][:4]
                category = CATEGORY_MAP.get(cat_code, "其他")
                no_title.append({
                    "repo_name": r["name"],
                    "title": f"[{r['name']}]",
                    "category": category,
                    "kr_code": cat_code,
                })

    print(f"\n对比结果:")
    print(f"  新书: {len(new_books)} 部")
    print(f"  已收录: {len(existing_matches)} 部")
    print(f"  无Readme.org: {len(no_title)} 部（将以repo名导入）")

    # 分类统计
    from collections import Counter
    all_new = new_books + no_title
    cats = Counter(b["category"] for b in all_new)
    print(f"\n新书分类分布:")
    for cat, cnt in cats.most_common():
        print(f"  {cat}: {cnt} 部")

    # 下载新书
    to_download = all_new
    if max_books:
        # 优先道藏和释
        priority = [b for b in to_download if b["category"] in ("道藏", "释")]
        others = [b for b in to_download if b["category"] not in ("道藏", "释")]
        to_download = priority + others
        to_download = to_download[:max_books]
        print(f"\n限制: 最多下载 {max_books} 部")

    print(f"\n开始下载 {len(to_download)} 部新书...", flush=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = []
    total_success = 0
    total_fail = 0

    for i, book in enumerate(to_download):
        repo = book["repo_name"]
        title = book["title"]
        try:
            result = download_book(repo, title, book["category"])
            if result:
                results.append(result)
                total_success += 1
                # 单独保存
                safe_name = re.sub(r'[\\/:*?"<>|]', "_", f"{repo}_{title[:20]}")
                fpath = os.path.join(OUTPUT_DIR, f"{safe_name}.json")
                with open(fpath, "w", encoding="utf-8") as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                if (total_success) % 20 == 0 or i < 5:
                    print(f"  [{i+1}/{len(to_download)}] {repo} {title} "
                          f"({len(result['chapters'])}章, {result['text_length']}字)", flush=True)
            else:
                total_fail += 1
                print(f"  [{i+1}/{len(to_download)}] {repo} {title} FAIL(无内容)", flush=True)
        except Exception as e:
            total_fail += 1
            if total_fail <= 5:
                print(f"  [{i+1}/{len(to_download)}] {repo} {title} ERROR: {e}", flush=True)

        time.sleep(0.15)  # 控制下载速率

    # 生成合并seed文件
    seed_file = os.path.join(BASE_DIR, f"{SEED_PREFIX}_all.json")
    with open(seed_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # 保存对比清单
    with open(COMPARISON_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "new_books": [{"repo": b["repo_name"], "title": b["title"],
                           "category": b["category"]} for b in new_books],
            "existing_matches": [{"repo": r, "title": t} for r, t in existing_matches],
            "no_readme": [{"repo": b["repo_name"], "category": b["category"]}
                          for b in no_title],
            "new_count": len(new_books),
            "existing_count": len(existing_matches),
            "no_readme_count": len(no_title),
        }, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"下载完成: {total_success} 成功, {total_fail} 失败")
    print(f"合并seed: {seed_file} ({len(results)} 部)")
    print(f"对比清单: {COMPARISON_FILE}")

    # 打印导入命令
    if results:
        print(f"\n导入命令:")
        print(f"  cd apps/server && NODE_OPTIONS=\"--max-old-space-size=4096\" "
              f"npx ts-node --transpile-only scripts/import-daizhige-seeds.ts "
              f"--file ../../{SEED_PREFIX}_all.json")


def download_book(repo_name: str, title: str, category: str) -> dict | None:
    """下载单个Kanripo仓库的所有txt文件"""
    # 先获取文件列表
    try:
        resp = requests.get(
            f"{GITHUB_API}/repos/{ORG}/{repo_name}/contents",
            timeout=20
        )
        if resp.status_code != 200:
            return None
        files = resp.json()
    except Exception:
        return None

    txt_files = [f for f in files
                 if f["name"].endswith(".txt") and f["name"] != ".gitignore"
                 and f["size"] > 100]  # 过滤空文件

    if not txt_files:
        return None

    # 下载每个txt文件
    chapters = []
    total_len = 0

    for tf in sorted(txt_files, key=lambda x: x["name"]):
        try:
            # 从文件名提取章节名
            fname = os.path.splitext(tf["name"])[0]
            # KR5a0001_001 -> 卷一
            ch_title = fname.replace(f"{repo_name}_", "")
            if ch_title.isdigit():
                ch_title = f"卷{int(ch_title)}"

            resp = requests.get(tf["download_url"], timeout=30)
            resp.raise_for_status()
            text = resp.text

            if text.strip():
                chapters.append({
                    "title": ch_title[:80],
                    "content": text[:10000],
                })
                total_len += len(text)
        except Exception:
            pass

    if not chapters:
        return None

    return {
        "title": title,
        "author": "",
        "dynasty": "",
        "category": category,
        "intro": f"来源: 汉籍リポジトリ (kanripo) GitHub。{title}共{len(chapters)}章，{total_len}字。",
        "source": f"github.com/{ORG}/{repo_name}",
        "chapters": chapters,
        "text_length": total_len,
    }


def main():
    parser = argparse.ArgumentParser(description="Kanripo 古籍采集器")
    parser.add_argument("--phase", type=int, choices=[1, 2, 3, 4],
                        help="执行阶段 (1-4)")
    parser.add_argument("--all", action="store_true",
                        help="一键全流程")
    parser.add_argument("--max-books", type=int, default=None,
                        help="最多下载新书数量（用于测试）")
    parser.add_argument("--workers", type=int, default=30,
                        help="阶段2并发数 (默认30)")
    args = parser.parse_args()

    if args.all:
        print("=" * 60)
        print("Kanripo 古籍采集 - 全流程")
        print("=" * 60)
        if not os.path.exists(REPO_LIST_FILE) or not os.path.exists(TITLE_CACHE_FILE):
            print("\n[阶段1] 拉取repo列表...")
            fetch_all_repos()
        if not os.path.exists(TITLE_CACHE_FILE):
            print("\n[阶段2] 读取书名...")
            resolve_titles_phase2(args.workers)
        print("\n[阶段3] 对比+下载...")
        compare_and_download_phase3(args.max_books)
        return

    if args.phase == 1:
        fetch_all_repos()
    elif args.phase == 2:
        resolve_titles_phase2(args.workers)
    elif args.phase == 3:
        compare_and_download_phase3(args.max_books)
    elif args.phase == 4:
        print("阶段4请手动执行导入命令（见阶段3输出）")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
