"""应用逐字审校决定；只改明确列出的字段，验证不会误改字库。"""

import json
import sys
from collections import Counter
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        raise SystemExit("用法：python apply-final-audit.py <naming-lexicon.json> <name-usage.json>")
    lex_path, usage_path = map(Path, sys.argv[1:])
    data = json.loads(lex_path.read_text(encoding="utf-8"))
    usage = json.loads(usage_path.read_text(encoding="utf-8"))["chars"]
    decisions = json.loads((Path(__file__).parent / "final-audit-decisions.json").read_text(encoding="utf-8"))
    assert len(data["chars"]) == 6500
    assert len(decisions) == 31
    for char, reason in decisions.items():
        entry = data["chars"][char]
        assert entry[0] == "宜", char
        assert usage.get(char, [0])[0] == 0, char
        assert not entry[5], char
        entry[0] = "可"
        entry[5] = "审校：" + reason
    data["_meta"]["final_audit"] = "2026-09-22：6500 字结构与读音复核；31 个词组/器物/动作字由宜降可，见 final-audit-decisions.json"
    counts = Counter(v[0] for v in data["chars"].values())
    assert counts == {"宜": 1046, "可": 2151, "忌": 3303}, counts
    lex_path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(dict(counts))


if __name__ == "__main__":
    main()
