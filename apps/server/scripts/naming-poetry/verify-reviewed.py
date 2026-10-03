"""用带原文映射的归一语料核对人工选定的诗词出处。"""

import json
import sys
from pathlib import Path

from opencc import OpenCC


def main():
    if len(sys.argv) != 2:
        raise SystemExit("用法：python verify-reviewed.py <corpus.jsonl>")
    corpus = [json.loads(line) for line in Path(sys.argv[1]).open(encoding="utf-8")]
    root = Path(__file__).resolve().parents[2]
    data = root / "src/modules/paipan/engine/data"
    reviewed = json.loads((data / "reviewed-poems.json").read_text(encoding="utf-8"))
    lexicon = json.loads((data / "naming-lexicon.json").read_text(encoding="utf-8"))["chars"]
    converter = OpenCC("t2s")
    for char, item in reviewed.items():
        assert lexicon[char][0] == "宜", char
        assert char in item["quote"], char
        assert converter.convert(item["raw_quote"]) == item["quote"], char
        matches = [row for row in corpus if row["label"] == item["source"]
                   and row["origin"] == item["origin"] and not row.get("attribution_conflict")
                   and any(item["raw_quote"] in p["raw"] and item["quote"] in p["text"]
                           for p in row["paragraphs"])]
        assert len(matches) == 1, (char, len(matches))
        print(char, item["source"], matches[0]["id"])
    print(f"已核对 {len(reviewed)} 条原文、归一引文与出处")


if __name__ == "__main__":
    main()
