"""逐条核对手写精选字的引文：字在句中、原文连续、篇目相符。"""

import json
import re
import sys
from pathlib import Path


EXTERNAL = {
    "青": ("荀子 · 劝学", "青，取之于蓝而青于蓝", "https://zh.wikisource.org/zh-hans/劝学"),
    "泊": ("诫子书", "非澹泊无以明志，非宁静无以致远", "https://zh.wikisource.org/wiki/誡子書"),
}


def main():
    if len(sys.argv) != 2:
        raise SystemExit("用法：python verify-hand-poems.py <corpus.jsonl>")
    root = Path(__file__).resolve().parents[2]
    code = (root / "src/modules/paipan/engine/qiming-engine.ts").read_text(encoding="utf-8")
    hand = re.findall(r'\{ char: "([^"]+)"[^\n]*?poem: \{ source: "([^"]+)", quote: "([^"]+)" \}', code)
    corpus = [json.loads(line) for line in Path(sys.argv[1]).open(encoding="utf-8")]
    assert len(hand) >= 50, "手写引文抽取异常"
    local = 0
    for char, source, quote in hand:
        assert char in quote, (char, source, quote)
        if char in EXTERNAL:
            assert (source, quote) == EXTERNAL[char][:2], char
            continue
        matches = [row for row in corpus if row["label"].startswith(source)
                   and any(quote in para["text"] for para in row["paragraphs"])]
        assert matches, (char, source, quote)
        local += 1
    print(f"手写引文 {len(hand)} 条：本地原文核对 {local}；另 2 条维基文库页面已人工核对")


if __name__ == "__main__":
    main()
