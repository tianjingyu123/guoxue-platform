"""归一已取得的古籍快照，保留原文，按作品去重。

用法：python build-corpus.py <诗词快照目录> <输出目录>
输入目录由交接文档列出的公开来源取得；本脚本不修改输入文件。
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

from opencc import OpenCC


cc = OpenCC("t2s")


def simple(value, preserve_qian=False):
    # OpenCC t2s 会把卦名「乾」转成「干」；周易语境须保留原卦名。
    value = (value or "").replace("乾", "\ue000") if preserve_qian else (value or "")
    converted = cc.convert(value).strip()
    return converted.replace("\ue000", "乾") if preserve_qian else converted


def flatten(values):
    for value in values:
        if isinstance(value, str):
            yield value
        elif isinstance(value, dict):
            yield from flatten(value.get("paragraphs", []))


def clean_wiki(raw, name):
    # 模板中有多行 Header，先整块删除，再处理正文中的简单模板。
    raw = re.sub(r"\{\{(?:Header|header2|NoteTA|Textquality)[\s\S]*?\}\}", "", raw)
    raw = re.sub(r"\{\{[^{}]*\}\}", "", raw)
    raw = re.sub(r"-\{(?:T\|)?([^}]*)\}-", r"\1", raw)
    raw = re.sub(r"\[\[File:[^\]]*\]\]", "", raw, flags=re.I)
    raw = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", raw)
    raw = re.sub(r"周易/([一-鿿]+)", r"\1", raw)
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = raw.replace("'''", "").replace("''", "")
    lines = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith(("#REDIRECT", "#重定向", "|")):
            continue
        if re.fullmatch(r"=+.*=+", line) or line in ("周易", "易經："):
            continue
        line = re.sub(r"^[*#;:]+\s*", "", line).strip()
        if (line == name or line in ("易經：", "易经：") or line.startswith("周易/")
                or re.match(r"^周易[\s　]+第[一二三四五六七八九十百]+卦$", line)
                or re.fullmatch(r"[一-鿿]{1,2}下[一-鿿]{1,2}上", line)):
            continue
        if re.search(r"[一-鿿]", line) and not line.startswith(("分類:", "Category:")):
            lines.append(line)
    return lines


def key_of(paragraphs):
    text = "".join(paragraphs)
    return re.sub(r"[^\w一-鿿]", "", text)


def build(source):
    records = []
    inputs = {}

    def read(name):
        path = source / name
        inputs[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        return json.loads(path.read_text(encoding="utf-8"))

    def add(group, label, values, origin):
        raw = [x.strip() for x in flatten(values) if isinstance(x, str) and x.strip()]
        if raw:
            keep_qian = group == "周易"
            records.append({"group": group, "label": simple(label, keep_qian), "origin": origin,
                            "paragraphs": [{"raw": x, "text": simple(x, keep_qian)} for x in raw]})

    for item in read("shijing.json"):
        section = item["section"] if item["chapter"] == "国风" else item["chapter"]
        add("诗经", f"诗经 · {section} · {item['title']}", item["content"], "shijing.json")
    for item in read("chuci.json"):
        label = f"楚辞 · {item['section']}" + ("" if item["title"] == item["section"] else f" · {item['title']}")
        add("楚辞", label, item["content"], "chuci.json")
    for name, book in (("lunyu.json", "论语"), ("mengzi.json", "孟子")):
        for item in read(name):
            add("四书", f"{book} · {item['chapter'].replace('篇', '')}", item["paragraphs"], name)
    for name, book in (("daxue.json", "大学"), ("zhongyong.json", "中庸")):
        add("四书", book, read(name)["paragraphs"], name)
    for item in read("唐诗三百首.json"):
        add("唐诗", f"唐 · {item['author']}《{item['title']}》", item["paragraphs"], "唐诗三百首.json")
    for item in read("宋词三百首.json"):
        add("宋词", f"宋 · {item['author']}《{item['rhythmic']}》", item["paragraphs"], "宋词三百首.json")
    for group in read("qianjiashi.json")["content"]:
        for item in group["content"]:
            match = re.match(r"[（(](.+?)[）)](.+)", simple(item.get("author", "")))
            dynasty, author = match.groups() if match else ("", simple(item.get("author", "")))
            add("千家诗", f"{dynasty + ' · ' if dynasty else ''}{author}《{item['chapter']}》",
                item["paragraphs"], "qianjiashi.json")
    for volume in read("guwenguanzhi.json")["content"]:
        for item in volume["content"]:
            author = simple(item.get("author", "")).split("：")[-1].strip()
            add("古文观止", f"{author}《{item['chapter']}》", item["paragraphs"], "guwenguanzhi.json")
    for item in read("caocao.json"):
        add("曹操", f"汉 · 曹操《{item['title']}》", item["paragraphs"], "caocao.json")
    for item in read("纳兰性德诗集.json"):
        add("纳兰", f"清 · 纳兰性德《{item['title']}》", item["para"], "纳兰性德诗集.json")

    wings = {"彖", "大象", "小象", "文言", "繫辭上", "繫辭下", "說卦", "序卦", "雜卦"}
    for path in sorted((source / "zhouyi").glob("*.txt")):
        if path.name == "pages.txt":
            continue
        raw = path.read_text(encoding="utf-8")
        if raw.lstrip().startswith(("#REDIRECT", "#重定向")):
            raise ValueError(f"十翼重定向未解析：{path}")
        origin = "zhouyi/" + path.name
        inputs[origin] = hashlib.sha256(path.read_bytes()).hexdigest()
        name = path.stem
        label = f"周易 · {name}" if name in wings else f"周易 · {name}卦"
        add("周易", label, clean_wiki(raw, name), origin)

    # 同一全文可在《唐诗三百首》《千家诗》等合集重复。保留首份正文与所有出处。
    unique = {}
    duplicates = []
    for item in records:
        key = key_of(p["text"] for p in item["paragraphs"])
        if not key:
            continue
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
        if digest in unique:
            prior = unique[digest]
            conflict = author_of(prior["label"]) != author_of(item["label"]) and all(
                author_of(x) for x in (prior["label"], item["label"]))
            prior.setdefault("also_in", []).append({"label": item["label"], "origin": item["origin"]})
            if conflict:
                prior["attribution_conflict"] = True
            duplicates.append({"kept": prior["label"], "other": item["label"],
                               "origin": item["origin"], "attribution_conflict": conflict})
        else:
            item["id"] = digest[:16]
            unique[digest] = item
    by_label = {}
    for item in unique.values():
        by_label.setdefault(item["label"], []).append(item["id"])
    variants = {label: ids for label, ids in by_label.items() if len(ids) > 1}
    return list(unique.values()), duplicates, variants, inputs, len(records)


def author_of(label):
    match = re.search(r"(?:^| · )([^ ·《]+)《", label)
    return match.group(1) if match else ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    rows, duplicates, variants, inputs, total = build(args.source)
    with (args.output / "corpus.jsonl").open("w", encoding="utf-8") as out:
        for row in rows:
            out.write(json.dumps(row, ensure_ascii=False) + "\n")
    report = {"input_sha256": inputs, "source_records": total, "unique_records": len(rows),
              "exact_duplicates": duplicates, "same_label_variants": variants,
              "by_group": dict(Counter(r["group"] for r in rows))}
    (args.output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"原作品 {total}；全文去重后 {len(rows)}；重复 {len(duplicates)}")


if __name__ == "__main__":
    main()
