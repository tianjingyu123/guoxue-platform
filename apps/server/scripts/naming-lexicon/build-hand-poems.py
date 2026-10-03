"""从起名精选字的已审校引文生成姓名详批复用数据。"""

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CODE = ROOT / "src/modules/paipan/engine/qiming-engine.ts"
OUTPUT = ROOT / "src/modules/paipan/engine/data/hand-poems.json"


def main():
    code = CODE.read_text(encoding="utf-8")
    rows = re.findall(r'\{ char: "([^"]+)"[^\n]*?poem: \{ source: "([^"]+)", quote: "([^"]+)" \}', code)
    assert len(rows) >= 50
    assert len({char for char, _, _ in rows}) == len(rows)
    assert all(char in quote for char, _, quote in rows)
    data = {char: {"source": source, "quote": quote} for char, source, quote in rows}
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"精选字引文 {len(data)} 条")


if __name__ == "__main__":
    main()
