# -*- coding: utf-8 -*-
"""
生成古籍简体阅读版的「异体字归一表」 src/modules/classic/simplified/variant-map-1.json

用法（数据文件需先下载到 DATA 目录，校验和会写进产物）：
  DATA=<目录> python scripts/build-variant-map.py
  DATA 目录需包含：
    OpenCC ver.1.1.9 data/dictionary/ 下的 TSCharacters.txt JPVariants.txt JPShinjitaiCharacters.txt TWVariants.txt HKVariants.txt
    Unicode Unihan.zip 解压出的 Unihan_Variants.txt Unihan_OtherMappings.txt

规则：
  归一目标是「标准繁体字」，归一后再走原有的 词组优先 → 平台保留 → 单字 转换，所以「宫商角徴羽」先成「徵」再被词组表保护。
  自动来源：OpenCC 地区/日本变体表的反向（变体 → 标准繁体）、Unihan kZVariant（同字异形）。
  人工来源：MANUAL，按真实古籍数据残留频次挑选、逐字核对语境（Unihan kSemanticVariant 仅作参考，不自动收）。
  收录条件（全部满足）：
    1. 变体本身不在《通用规范汉字表》（Unihan kTGH）里——规范字一律不动
    2. 变体不在 OpenCC 繁简字表里（已由字表处理）
    3. 变体与目标都在基本多文种平面（UTF-16 长度都为 1，保证等长）
    4. 目标经繁简字表后落在《通用规范汉字表》里，且候选唯一
    5. 不在 EXCLUDE（本身是独立的古汉字、或语境里两义并存）
"""
import collections, hashlib, io, json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
DATA = os.environ.get("DATA", ".")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "modules", "classic", "simplified", "variant-map-1.json")

# 本身是独立古汉字，或真实语境里两义并存：不归一
EXCLUDE = {
    "糸": "說文部首（mì，細絲），不是「絲」的日本新字体",
    "睪": "獨立字（yì，伺視），不是「睾」",
    "枱": "古籍中多為「耜」的異體，不是「檯」",
    "県": "古籍中多為「懸」，不是「縣」",
    "寉": "多為「鶴」，Unihan 給的「隺」不合古籍用法",
    "豊": "真實數據兩義並存：豐（歲豊、豊州）與 禮器之豊（說文「从示从豊」）",
    "遯": "卦名（天山遯），同「乾」按原字保留",
}

# 人工核定（真实数据高频残留字；目标为标准繁体，括号内为最终简体）
MANUAL = {
    "隂": "陰",  # 阴
    "髙": "高",
    "逺": "遠",  # 远
    "寕": "寧",  # 宁
    "寜": "寧",
    "厯": "歷",  # 历（歷/曆 两用，简体同为「历」）
    "㑹": "會",  # 会
    "葢": "蓋",  # 盖
    "賔": "賓",  # 宾
    "寳": "寶",  # 宝
    "扵": "於",  # 于（真实语境均为介词「於」）
    "虗": "虛",  # 虚
    "㣲": "微",
    "竒": "奇",
    "徃": "往",
    "闗": "關",  # 关
    "乆": "久",
    "夀": "壽",  # 寿
    "畧": "略",
    "宻": "密",
    "徧": "遍",
    "㫖": "旨",
    "䇿": "策",
    "栁": "柳",
    "鳯": "鳳",  # 凤
    "劒": "劍",  # 剑
    "㪚": "散",
    "㡬": "幾",  # 几
    "麄": "粗",
    "麤": "粗",
    "疎": "疏",
    "踈": "疏",
    "䝉": "蒙",
    "囘": "回",
    "胷": "胸",
    "邉": "邊",  # 边
    "冦": "寇",
    "甞": "嘗",  # 尝
    "隄": "堤",
    "脇": "脅",  # 胁
    "廵": "巡",
    "熈": "熙",
    "覩": "睹",
    "叅": "參",  # 参
    "鴈": "雁",
    "逹": "達",  # 达
    "㸃": "點",  # 点
    "䕶": "護",  # 护
    "欵": "款",
    "眀": "明",
    "觧": "解",
    "臯": "皋",
    "岀": "出",
    "㸔": "看",
    "逰": "遊",  # 游
    "輙": "輒",  # 辄
    "毘": "毗",
    "峩": "峨",
    "亷": "廉",
    "畨": "番",
    "栢": "柏",
    "飬": "養",  # 养
    "艸": "草",
    "煑": "煮",
    "遶": "繞",  # 绕
    "鼔": "鼓",
    "竝": "並",  # 并
    "䏻": "能",
    "颕": "穎",  # 颖
    "㕔": "廳",  # 厅
    "圗": "圖",  # 图
    "羙": "美",
    "廻": "迴",  # 回
    "犂": "犁",
    "諌": "諫",  # 谏
    "隣": "鄰",  # 邻
    "䖍": "虔",
    "濶": "闊",  # 阔
    "槩": "概",
    "㦸": "戟",
    "䘮": "喪",  # 丧
    "冝": "宜",
    "姪": "侄",
    "茍": "苟",  # 真实数据均为「苟」的讹形（苟且、苟非其道）
    "荅": "答",  # 真实数据均为「答」（荅命、问荅、荅吕子约）
    # 第二批：第一批归一后真实数据残留第 1—160 名中能确定的异体
    # （不收：揲 揲蓍、寘 韵目、剉 祫 愬 蘗 夲 冡 柤 鉏 禆 貎 本身是独立字；觔 鎗 搆 秪 湏 陜 疋 勑 彊 濬 欬 两义并存；炁 道家用字）
    "衇": "脈",  # 脉
    "䟽": "疏",
    "囬": "回",
    "夘": "卯",
    "尅": "剋",  # 克
    "羮": "羹",
    "靣": "面",
    "凖": "準",  # 准
    "㫁": "斷",  # 断
    "歛": "斂",  # 敛
    "畆": "畝",  # 亩
    "塲": "場",  # 场
    "騐": "驗",  # 验
    "㕘": "參",  # 参
    "㳺": "游",
    "蘓": "蘇",  # 苏
    "㱕": "歸",  # 归
    "刼": "劫",
    "慙": "慚",  # 惭
    "冩": "寫",  # 写
    "寃": "冤",
    "倣": "仿",
    "聨": "聯",  # 联
    "䑓": "臺",  # 台
    "窓": "窗",
    "牕": "窗",
    "窻": "窗",
    "偹": "備",  # 备
    "糓": "穀",  # 谷
    "㓜": "幼",
    "恱": "悅",  # 悦
    "攷": "考",
    "悮": "誤",  # 误
    "刋": "刊",
    "皷": "鼓",
    "拏": "拿",
    "濇": "澀",  # 涩
    "澁": "澀",
    "聼": "聽",  # 听
    "䖏": "處",  # 处
    "冐": "冒",
    "煖": "暖",
    "昻": "昂",
    "濵": "濱",  # 滨
    "庻": "庶",
    "讐": "讎",  # 雠
    "纎": "纖",  # 纤
    "軰": "輩",  # 辈
    "覔": "覓",  # 觅
    "䧟": "陷",
    "砲": "炮",
    "僣": "僭",
    "鬬": "鬥",  # 斗
    "鬭": "鬥",
    "兎": "兔",
    "愼": "慎",
    "㧞": "拔",
    "逈": "迥",
    "㨗": "捷",
    "彛": "彝",
    "䟦": "跋",
    "桞": "柳",
    "㝷": "尋",  # 寻
    "凢": "凡",
    "蠧": "蠹",
    "筭": "算",
    "舩": "船",
    "塟": "葬",
    "玅": "妙",
    "蔲": "蔻",
    "夣": "夢",  # 梦
    "昬": "昏",
    "頥": "頤",  # 颐
    "兊": "兌",  # 兑（卦名同字，归一后仍是兑）
    "鐡": "鐵",  # 铁
    "䑕": "鼠",
    "壻": "婿",
    "緫": "總",  # 总
    "噐": "器",
    "妬": "妒",
    "恊": "協",  # 协
    "彚": "彙",  # 汇
    "廼": "乃",
    "廹": "迫",
    "纒": "纏",  # 缠
    "勦": "剿",
    "㝠": "冥",
    "衂": "衄",
    "䕫": "夔",
    "慿": "憑",  # 凭
    "厐": "龐",  # 庞
    "噉": "啖",
    "㓂": "寇",
    "呌": "叫",
    "厰": "廠",  # 厂
    "䕃": "蔭",  # 荫
    "朶": "朵",
    "簒": "篡",
    "籖": "籤",  # 签
    "媿": "愧",
    "懃": "勤",
    "䘏": "恤",
    "欝": "鬱",  # 郁
    "瓌": "瑰",
    "㢘": "廉",
    "寖": "浸",
    "趂": "趁",
    "婬": "淫",
    "畱": "留",
    "牋": "箋",  # 笺
    "憍": "驕",  # 骄
    "槖": "橐",
    "狥": "徇",
    # 第三批：第二批后残留中的清晰异体
    # （剩余高频残留为：馀 平台定规则、丨〇 符号、嚩㗚攞誐抳跢佉儞呬 佛经陀罗尼音译用字、炁 道家用字，以及上面排除的两义字）
    "淸": "清",
    "靑": "青",
    "丗": "世",
    "麁": "粗",
    "槀": "槁",
    "陁": "陀",
    "䭾": "馱",  # 驮
}


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def cp(s):
    return chr(int(s[2:].split("<")[0], 16))


def pairs(fn):
    m = {}
    for line in io.open(os.path.join(DATA, fn), encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#"):
            k, v = line.split("\t")
            m[k] = v.split(" ")
    return m


tgh = set()
for line in io.open(os.path.join(DATA, "Unihan_OtherMappings.txt"), encoding="utf-8"):
    if "\tkTGH\t" in line:
        tgh.add(cp(line.split("\t")[0]))
assert len(tgh) == 8105, len(tgh)

ts = pairs("TSCharacters.txt")
tsfirst = {k: v[0] for k, v in ts.items()}
bmp = lambda c: len(c) == 1 and ord(c) < 0x10000


def final(c):
    return tsfirst.get(c, c)


auto = collections.defaultdict(lambda: collections.defaultdict(set))
for fn in ["JPVariants.txt", "TWVariants.txt", "HKVariants.txt"]:
    for k, vs in pairs(fn).items():
        for v in vs:
            if len(k) == 1 and len(v) == 1 and v != k:
                auto[v][k].add("opencc:" + fn)
for k, vs in pairs("JPShinjitaiCharacters.txt").items():
    for v in vs:
        if len(k) == 1 and len(v) == 1 and v != k:
            auto[v][k].add("opencc:JPShinjitaiCharacters.txt")
for line in io.open(os.path.join(DATA, "Unihan_Variants.txt"), encoding="utf-8"):
    if line.startswith("#") or "\tkZVariant\t" not in line:
        continue
    a, _, v = line.rstrip("\n").split("\t")
    for t in v.split(" "):
        auto[cp(a)][cp(t)].add("unihan:kZVariant")


def eligible(k, t):
    return bmp(k) and bmp(t) and k != t and k not in tgh and k not in ts and k not in EXCLUDE and final(t) in tgh


entries = {}
for k, m in auto.items():
    ok = {t: srcs for t, srcs in m.items() if eligible(k, t)}
    if not ok:
        continue
    finals = {final(t) for t in ok}
    if len(finals) != 1:
        print("歧义跳过", k, dict(ok))
        continue
    # 多个等价目标时优先 OpenCC 给的标准繁体
    t = sorted(ok, key=lambda x: (not any(s.startswith("opencc") for s in ok[x]), x))[0]
    entries[k] = {"to": t, "src": sorted(ok[t])}

for k, t in MANUAL.items():
    if not eligible(k, t):
        raise SystemExit(f"人工条目不合条件: {k}->{t} tgh={k in tgh} ts={k in ts} final={final(t)} in_tgh={final(t) in tgh}")
    if k in entries and final(entries[k]["to"]) != final(t):
        raise SystemExit(f"人工条目与自动来源冲突: {k} {entries[k]} vs {t}")
    entries.setdefault(k, {"to": t, "src": []})
    entries[k]["src"] = sorted(set(entries[k]["src"]) | {"manual"})

# 不允许链式（目标本身又是变体）
for k, e in entries.items():
    assert e["to"] not in entries, (k, e)

out = {
    "version": "variant-map-1",
    "note": "变体 -> 标准繁体；归一后再走 OpenCC 繁简转换。生成脚本 apps/server/scripts/build-variant-map.py",
    "sources": {
        "opencc": "OpenCC ver.1.1.9 (Apache-2.0)",
        "unihan": "Unicode Unihan Database (Unicode License v3)",
        "sha256": {fn: sha(os.path.join(DATA, fn)) for fn in [
            "TSCharacters.txt", "JPVariants.txt", "JPShinjitaiCharacters.txt", "TWVariants.txt", "HKVariants.txt",
            "Unihan_Variants.txt", "Unihan_OtherMappings.txt"]},
    },
    "excluded": EXCLUDE,
    "entries": dict(sorted(entries.items())),
}
io.open(OUT, "w", encoding="utf-8", newline="\n").write(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("entries", len(entries), "manual", len(MANUAL), "->", os.path.abspath(OUT))
