"""从公开姓名样本构建服务端统计，不把原始全名带入产品。

用法：python build-name-usage.py <cnc-gender.txt> <输出 JSON>
来源：wainshine/Chinese-Names-Corpus（Apache-2.0）；样本不是人口登记数据。
"""

import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


COMPOUND = set("欧阳 司马 上官 诸葛 东方 皇甫 尉迟 公孙 慕容 长孙 宇文 司徒 夏侯 轩辕 令狐 端木 澹台 百里 南宫 西门 独孤 呼延 太史 申屠 闻人 东郭 万俟 钟离 赫连 公羊 淳于 濮阳 宗政 第五 拓跋 完颜 司空 南门 羊舌 微生 梁丘 左丘 东门 仲孙 单于 公冶 巫马 乐正 壤驷 谷梁 宰父 夹谷 漆雕 段干 归海 墨哈 年爱 阳佟".split())


def main():
    if len(sys.argv) != 3:
        raise SystemExit("用法：python build-name-usage.py <cnc-gender.txt> <输出 JSON>")
    source, output = map(Path, sys.argv[1:])
    chars = defaultdict(lambda: [0, 0, 0, 0])
    given = Counter()
    records = 0
    invalid = 0
    sex_index = {"男": 1, "女": 2}
    with source.open(encoding="utf-8-sig") as stream:
        for line in stream:
            if "," not in line:
                continue
            full, sex = line.strip().rsplit(",", 1)
            if full == "dict" or not full:
                continue
            name = full[2:] if full[:2] in COMPOUND else full[1:]
            if len(name) not in (1, 2) or any(not ("一" <= ch <= "鿿") for ch in name):
                invalid += 1
                continue
            records += 1
            given[name] += 1
            for ch in set(name):
                chars[ch][0] += 1
                chars[ch][sex_index.get(sex, 3)] += 1
    data = {
        "_meta": {
            "source": "wainshine/Chinese-Names-Corpus，Chinese_Names_Corpus_Gender（120W）.txt",
            "license": "Apache-2.0",
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "records": records,
            "invalid": invalid,
            "char_schema": "[出现于多少条姓名,男,女,性别未知]；名字内同字只计一次",
            "given_schema": "名字在不同全名样本中的出现次数；仅存样本次数≥10的名字",
            "warning": "样本非人口登记统计，性别和年代分布有偏差；不能推出全国重名率",
        },
        "chars": dict(sorted(chars.items())),
        "given": dict(sorted((k, v) for k, v in given.items() if v >= 10)),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"有效姓名 {records}，异常 {invalid}，用字 {len(chars)}，保留名字 {len(data['given'])}")


if __name__ == "__main__":
    main()
