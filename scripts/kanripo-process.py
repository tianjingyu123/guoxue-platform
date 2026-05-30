"""
Kanripo 批量处理脚本：读标题 → 对比 → 下载
=============================================
使用 git clone --depth 1 下载（绕过 raw.githubusercontent.com 被墙问题）。
每个 repo 下载后立即生成 seed，然后删除 clone 以节省空间。

用法:
  py scripts/kanripo-process.py                 # 对比+下载全部新书
  py scripts/kanripo-process.py --limit 100     # 限制数量(测试)
  py scripts/kanripo-process.py --compare-only  # 仅对比，不下载
  py scripts/kanripo-process.py --priority      # 仅道藏+释
"""

import json
import os
import re
import sys
import time
import argparse
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_LIST_FILE = os.path.join(BASE_DIR, "temp_kanripo_repos.json")
TITLE_CACHE_FILE = os.path.join(BASE_DIR, "temp_kanripo_titles.json")
SEED_DIR = os.path.join(BASE_DIR, "temp_kanripo_seeds")
SEED_FILE = os.path.join(BASE_DIR, "temp_kanripo_seeds_all.json")
PROGRESS_FILE = os.path.join(BASE_DIR, "temp_kanripo_progress.json")

CATEGORY_MAP = {
    "KR1": "经", "KR2": "史", "KR3": "子", "KR4": "集",
    "KR5": "道藏", "KR6": "释",
}


def normalize(t: str) -> str:
    t = re.sub(r'[《》「」""\s（）\(\)\[\]【】]', '', t)
    t = re.sub(r'(卷之?\d+|\d+卷|第\d+卷)$', '', t)
    return t.strip().lower()


def load_existing_titles() -> set:
    titles = set()
    dz_dir = os.path.join(BASE_DIR, "temp_daizhige_books")
    if os.path.exists(dz_dir):
        for fname in os.listdir(dz_dir):
            if fname.endswith(".json") and not fname.startswith("_"):
                try:
                    d = json.load(open(os.path.join(dz_dir, fname), "r", encoding="utf-8"))
                    if isinstance(d, dict) and "title" in d:
                        titles.add(normalize(d["title"]))
                except:
                    pass
    nt_file = os.path.join(BASE_DIR, "temp_niutrans_seeds_new_books.json")
    if os.path.exists(nt_file):
        try:
            for b in json.load(open(nt_file, "r", encoding="utf-8")):
                if isinstance(b, dict) and "title" in b:
                    titles.add(normalize(b["title"]))
        except:
            pass
    return titles


def parse_readme_title(clone_dir: str) -> tuple[str, str]:
    """从克隆目录读取 Readme.org 获取书名"""
    readme = os.path.join(clone_dir, "Readme.org")
    if not os.path.exists(readme):
        return None, None
    try:
        with open(readme, "r", encoding="utf-8") as f:
            for line in f:
                m = re.match(r'^#\+TITLE:\s*(.+)', line, re.IGNORECASE)
                if m:
                    raw = m.group(1).strip()
                    clean = re.sub(r'\s*/\s*\w+\s*$', '', raw).strip()
                    return raw, clean
    except:
        pass
    return None, None


def download_zip_and_process(repo_name: str, title: str, category: str,
                             max_chars_per_chapter: int = 50000) -> dict | None:
    """通过 GitHub API zipball 下载整本古籍（codeload.github.com 可访问）"""
    import io, zipfile

    zip_url = f"https://api.github.com/repos/kanripo/{repo_name}/zipball/master"

    try:
        # 请求重定向（api.github.com，不消耗限速）
        resp = requests.get(zip_url, allow_redirects=False, timeout=15)
        if resp.status_code != 302:
            return None
        redirect_url = resp.headers.get("Location", "")
        if not redirect_url:
            return None

        # 从 codeload.github.com 下载 zip
        zip_resp = requests.get(redirect_url, timeout=60)
        if zip_resp.status_code != 200:
            return None

        # 在内存中解压
        with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as zf:
            # 找到根目录前缀
            names = zf.namelist()
            prefix = names[0].split("/")[0] + "/" if names else ""

            # 筛选 txt 文件
            txt_names = sorted(
                [n for n in names
                 if n.endswith(".txt") and n.startswith(prefix)],
                key=lambda x: x
            )

            if not txt_names:
                return None

            chapters = []
            total_len = 0

            for name in txt_names:
                try:
                    text = zf.read(name).decode("utf-8", errors="replace")
                    if text.strip():
                        # 提取章节名
                        fname = os.path.splitext(os.path.basename(name))[0]
                        ch_title = fname.replace(f"{repo_name}_", "")
                        if ch_title.isdigit():
                            ch_title = f"卷{int(ch_title)}"

                        content = text[:max_chars_per_chapter]
                        chapters.append({"title": ch_title[:80], "content": content})
                        total_len += len(content)
                except:
                    pass

            if not chapters:
                return None

            # 尝试读 Readme.org 补充标题
            final_title = title
            readme_name = prefix + "Readme.org"
            if readme_name in names:
                try:
                    readme_text = zf.read(readme_name).decode("utf-8", errors="replace")
                    for line in readme_text.splitlines()[:30]:
                        m = re.match(r'^#\+TITLE:\s*(.+)', line, re.IGNORECASE)
                        if m:
                            raw = m.group(1).strip()
                            clean = re.sub(r'\s*/\s*\w+\s*$', '', raw).strip()
                            if clean and clean != title:
                                # 更新标题
                                final_title = clean
                                # 同时更新类别
                                if repo_name.startswith("KR5"):
                                    category = "道藏"
                                elif repo_name.startswith("KR6"):
                                    category = "释"
                            break
                except:
                    pass

            return {
                "title": final_title,
                "author": "",
                "dynasty": "",
                "category": category,
                "intro": f"来源: 汉籍リポジトリ (kanripo)。{final_title}共{len(chapters)}章，{total_len}字。",
                "source": f"github.com/kanripo/{repo_name}",
                "chapters": chapters,
                "text_length": total_len,
            }

    except Exception:
        return None


def save_progress(results: list, ok: int, fail: int, completed: set):
    """保存进度用于断点续传"""
    progress = {
        "total_ok": ok,
        "total_fail": fail,
        "completed_repos": list(completed),
        "result_count": len(results),
    }
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False)


def load_progress() -> tuple[set, int, int]:
    if os.path.exists(PROGRESS_FILE):
        try:
            p = json.load(open(PROGRESS_FILE, "r", encoding="utf-8"))
            return set(p.get("completed_repos", [])), p.get("total_ok", 0), p.get("total_fail", 0)
        except:
            pass
    return set(), 0, 0


def phase_compare_and_download(max_books: int = None, priority_only: bool = False,
                                concurrency: int = 6):
    """对比现有书库 + 下载新书（使用 git clone）"""
    sys.stdout.reconfigure(encoding='utf-8')

    # 加载标题缓存
    cache = json.load(open(TITLE_CACHE_FILE, "r", encoding="utf-8"))
    print(f"标题缓存: {len(cache)} 条", flush=True)

    existing = load_existing_titles()
    print(f"现有书库: {len(existing)} 部", flush=True)

    # 对比
    new_books = []
    matched = []
    no_title = []

    for name, info in cache.items():
        norm = normalize(info["clean"])
        if norm in existing:
            matched.append((name, info["clean"]))
        else:
            new_books.append((name, info["clean"], info["category"]))

    # 未缓存标题的 repo
    repos = json.load(open(REPO_LIST_FILE, "r", encoding="utf-8"))
    for r in repos:
        if r["name"] not in cache:
            cat = CATEGORY_MAP.get(r["name"][:4] if r["name"].startswith("KR6") else r["name"][:3], "其他")
            no_title.append((r["name"], r["name"], cat))

    print(f"\n新书: {len(new_books)} 部, 已收录: {len(matched)} 部, 无标题: {len(no_title)} 部", flush=True)

    # 分类统计
    cat_count = {}
    for _, _, cat in new_books:
        cat_count[cat] = cat_count.get(cat, 0) + 1
    for _, _, cat in no_title:
        cat_count[cat] = cat_count.get(cat, 0) + 1
    print("分类分布:", flush=True)
    for cat, cnt in sorted(cat_count.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {cnt}", flush=True)

    # 排序：优先道藏和释
    all_new = new_books + no_title
    priority = [(n, t, c) for n, t, c in all_new if c in ("道藏", "释")]
    others = [(n, t, c) for n, t, c in all_new if c not in ("道藏", "释")]

    if priority_only:
        to_download = priority
        print(f"\n仅处理道藏+释: {len(to_download)} 部", flush=True)
    else:
        to_download = priority + others
        print(f"\n待下载: {len(to_download)} 部", flush=True)

    if max_books:
        to_download = to_download[:max_books]
        print(f"限制: {max_books} 部", flush=True)

    # 加载进度（断点续传）
    completed_set, total_ok, total_fail = load_progress()
    to_download = [(n, t, c) for n, t, c in to_download if n not in completed_set]
    print(f"已完成: {len(completed_set)} 部, 剩余: {len(to_download)} 部", flush=True)

    if not to_download:
        print("全部完成!", flush=True)
        return

    # 下载
    os.makedirs(SEED_DIR, exist_ok=True)

    results = []
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = {
            executor.submit(download_zip_and_process, repo_name, title, category): repo_name
            for repo_name, title, category in to_download
        }

        for i, future in enumerate(as_completed(futures)):
            repo_name = futures[future]
            try:
                result = future.result()
                if result:
                    results.append(result)
                    total_ok += 1
                    # 单独保存 seed
                    safe = re.sub(r'[\\/:*?"<>|]', "_", f"{repo_name}_{result['title'][:30]}")
                    with open(os.path.join(SEED_DIR, f"{safe}.json"), "w",
                              encoding="utf-8") as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                else:
                    total_fail += 1
            except Exception:
                total_fail += 1

            completed_set.add(repo_name)

            # 每50条保存进度 + 合并seed
            if (i + 1) % 50 == 0:
                save_progress(results, total_ok, total_fail, completed_set)
                # 增量保存合并seed
                with open(SEED_FILE, "w", encoding="utf-8") as f:
                    json.dump(results, f, ensure_ascii=False, indent=2)

                elapsed = time.time() - t0
                done = total_ok + total_fail
                rate = done / elapsed if elapsed > 0 else 0
                eta = (len(to_download) - i - 1) / rate if rate > 0 else 0
                print(f"  [{done}/{len(to_download)}] OK{total_ok} FAIL{total_fail} "
                      f"{rate:.1f}本/s ETA{eta/60:.0f}min", flush=True)

    # 最终保存
    save_progress(results, total_ok, total_fail, completed_set)
    with open(SEED_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    elapsed = time.time() - t0
    print(f"\n{'='*60}")
    print(f"下载完成: {total_ok} 成功, {total_fail} 失败 ({elapsed/60:.0f}min)")
    print(f"合并 seed: {SEED_FILE}")

    if results:
        print(f"\n导入命令:")
        print(f"  cd apps/server && NODE_OPTIONS=\"--max-old-space-size=4096\" "
              f"npx ts-node --transpile-only scripts/import-daizhige-seeds.ts "
              f"--file ../../temp_kanripo_seeds_all.json")


def main():
    parser = argparse.ArgumentParser(description="Kanripo 批量处理")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--workers", type=int, default=6)
    parser.add_argument("--compare-only", action="store_true")
    parser.add_argument("--priority", action="store_true")
    args = parser.parse_args()

    if not os.path.exists(REPO_LIST_FILE):
        print("请先运行 kanripo-scraper.py --phase 1")
        return

    if not os.path.exists(TITLE_CACHE_FILE):
        print("警告: 无标题缓存，将用 repo 名作为书名")

    if args.compare_only:
        cache = json.load(open(TITLE_CACHE_FILE, "r", encoding="utf-8")) if os.path.exists(TITLE_CACHE_FILE) else {}
        existing = load_existing_titles()
        new_count = 0
        for name, info in cache.items():
            if normalize(info["clean"]) not in existing:
                new_count += 1
        print(f"新书: {new_count}/{len(cache)}")
        return

    phase_compare_and_download(
        max_books=args.limit,
        priority_only=args.priority,
        concurrency=args.workers,
    )


if __name__ == "__main__":
    main()
