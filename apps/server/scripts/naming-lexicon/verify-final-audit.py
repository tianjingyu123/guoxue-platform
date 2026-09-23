"""独立核对服务端字库结构、读音与本轮逐字审校决定。

用法：python verify-final-audit.py <naming-lexicon.json> <ref.jsonl>
ref.jsonl 是上轮 build-reference.py 的本地快照，不随产品发布。
"""

import json
import sys
import unicodedata
from collections import Counter
from pathlib import Path


def untone(value):
    return "".join(ch for ch in unicodedata.normalize("NFD", value.lower()) if not unicodedata.combining(ch)).replace("ü", "v")


def main():
    if len(sys.argv) != 3:
        raise SystemExit("用法：python verify-final-audit.py <naming-lexicon.json> <ref.jsonl>")
    lex = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["chars"]
    ref = {row["c"]: row for row in map(json.loads, Path(sys.argv[2]).read_text(encoding="utf-8").splitlines())}
    decisions = json.loads((Path(__file__).parent / "final-audit-decisions.json").read_text(encoding="utf-8"))
    assert len(lex) == len(ref) == 6500 and set(lex) == set(ref)
    assert len(decisions) == 31
    counts = Counter()
    for char, entry in lex.items():
        assert len(entry) == 6, char
        suit, pinyin, fit, styles, meaning, note = entry
        assert suit in {"宜", "可", "忌"} and fit in {"m", "f", "u"}, char
        assert isinstance(pinyin, str) and pinyin and isinstance(meaning, str) and meaning, char
        assert isinstance(styles, list) and set(styles) <= {"classic", "steady", "fresh", "auspicious"}, char
        assert (not styles) if suit == "忌" else 1 <= len(styles) <= 2, char
        readings = ref[char]["xhc"]
        assert not readings or untone(pinyin) in {untone(x) for x in readings}, char
        if char in decisions:
            assert suit == "可" and note == "审校：" + decisions[char], char
        counts[suit] += 1
    assert counts == {"宜": 1046, "可": 2151, "忌": 3303}, counts
    print(f"6500 字结构、参考读音与 31 条终审决定通过；{dict(counts)}")


if __name__ == "__main__":
    main()
