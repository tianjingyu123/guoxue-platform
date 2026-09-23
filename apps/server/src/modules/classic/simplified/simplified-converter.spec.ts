import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { KEEP_ORIGINAL, SIMPLIFIED_DICT_META, mapRangeToOriginal, toSimplified } from "./simplified-converter";
import dict from "./opencc-ts-1.1.9.json";
import variantMap from "./variant-map-1.json";

describe("古籍简体阅读版转换", () => {
  it("卦名「乾」不被改成「干」；词组「乾隆」「乾坤」「乾元」按词组处理；「乾淨」按词组转「干净」", () => {
    const r = toSimplified("乾：元亨利貞。乾為天。乾隆年間，乾坤定矣。");
    expect(r.text).toBe("乾：元亨利贞。乾为天。乾隆年间，乾坤定矣。");
    // 两处单字「乾」保留并记位置待复核；词组里的不算
    expect(r.keptAmbiguous.map((k) => k.char)).toEqual(["乾", "乾"]);
    const p = toSimplified("大哉乾元。乾乾淨淨");
    expect(p.text).toBe("大哉乾元。干干净净");
    expect(p.keptAmbiguous).toHaveLength(0);
  });

  it("常见繁体字按规范转换：於→于、後→后、裏→里、雲→云", () => {
    expect(toSimplified("於是雲從龍，風從虎，後乃入裏").text).toBe("于是云从龙，风从虎，后乃入里");
  });

  it("五音之「徵」按词组保留；其余「徵」按规范转「征」；「餘」按规范用「馀」；「夥」保留原字", () => {
    const r = toSimplified("宮商角徵羽，其餘夥矣");
    expect(r.text).toBe("宫商角徵羽，其馀夥矣");
    // 「角徵羽」命中 OpenCC 词组，按词组保留，不计入待复核；餘→馀 是定规则；只有夥走保留表并记位置
    expect(r.keptAmbiguous.map((k) => k.char)).toEqual(["夥"]);
    // 与第一人称「余」区分开
    expect(toSimplified("余讀其餘書").text).toBe("余读其馀书");
    for (const k of r.keptAmbiguous) expect(KEEP_ORIGINAL[k.char]).toBeTruthy();
    expect(toSimplified("風蕭蕭兮，為變徵之聲").text).toBe("风萧萧兮，为变徵之声");
    expect(toSimplified("徵召天下之士，此其徵兆").text).toBe("征召天下之士，此其征兆");
  });

  it("字表外的罕见字、私用区字、符号与卦象符号原样保留", () => {
    const src = "䷀䷁〔缺字〕𠀀☯㊣";
    expect(toSimplified(src).text).toBe(src);
  });

  it("空文本与纯标点", () => {
    expect(toSimplified("").text).toBe("");
    expect(toSimplified("，。！？").text).toBe("，。！？");
  });

  it("等长：任何输入的码点数与 UTF-16 长度都不变，区间可原样映射回原文", () => {
    const samples = [
      "子曰：學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？人不知而不慍，不亦君子乎？",
      "大哉乾元，萬物資始，乃統天。雲行雨施，品物流形。",
      "𠀀𠀁乾隆𡃁鍾鐘",
    ];
    for (const s of samples) {
      const r = toSimplified(s);
      expect(r.sameLength).toBe(true);
      expect(r.text.length).toBe(s.length);
      expect(Array.from(r.text).length).toBe(Array.from(s).length);
      // 在简体版上选中「时习之」，映射回原文恰是「時習之」
      const i = r.text.indexOf("时习之");
      if (i >= 0) {
        const { start, end } = mapRangeToOriginal(i, i + 3);
        expect(s.slice(start, end)).toBe("時習之");
      }
    }
  });

  it("全字表枚举：每个被收录的映射都是等长的（不靠抽样）", () => {
    const d = dict as any;
    let checked = 0;
    for (const k of Object.keys(d.chars)) {
      const r = toSimplified(k);
      expect(r.text.length).toBe(k.length);
      checked++;
    }
    for (const k of Object.keys(d.phrases)) {
      expect(toSimplified(k).text.length).toBe(k.length);
      checked++;
    }
    expect(checked).toBe(Object.keys(d.chars).length + Object.keys(d.phrases).length);
  });

  it("确定性：同一输入多次转换结果一致", () => {
    const s = "大哉乾元，萬物資始";
    expect(toSimplified(s)).toEqual(toSimplified(s));
  });

  it("词典来源可核对：入库 JSON 与记录的来源校验和、许可证文件同在", () => {
    expect(SIMPLIFIED_DICT_META.version).toBe("opencc-1.1.9");
    expect(SIMPLIFIED_DICT_META.sha256["TSCharacters.txt"]).toMatch(/^[0-9a-f]{64}$/);
    const lic = fs.readFileSync(path.join(__dirname, "OPENCC-LICENSE.txt"), "utf8");
    expect(lic).toMatch(/Apache License/);
    expect(createHash("sha256").update(JSON.stringify((dict as any).chars)).digest("hex")).toMatch(/^[0-9a-f]{64}$/);
  });

  describe("异体字归一（variant-map-1）", () => {
    const V = variantMap as any;
    const entries = Object.entries(V.entries) as [string, { to: string; src: string[] }][];
    const tsChars = (dict as any).chars as Record<string, string[]>;

    it("真实数据高频异体：先归一到标准繁体再转简体", () => {
      expect(toSimplified("隂陽之氣，徳髙望重，逺近咸寕").text).toBe("阴阳之气，德高望重，远近咸宁");
      expect(toSimplified("増損扵古厯，葢有由矣").text).toBe("增损于古历，盖有由矣");
      const r = toSimplified("呉王毎歳巡郷");
      expect(r.text).toBe("吴王每岁巡乡");
      expect(r.variantCount).toBe(4); // 呉 毎 歳 郷
      expect(r.changedCount).toBe(4); // 改动字数按最终结果与原字比较，王、巡 不变
    });

    it("归一在词组规则之前：「宫商角徴羽」的日本新字体「徴」也按五音保留为「徵」", () => {
      expect(toSimplified("宮商角徴羽").text).toBe("宫商角徵羽");
      expect(toSimplified("徴召").text).toBe("征召");
    });

    it("排除项与卦名不动：糸、睪、豊、遯 原样；规范字不被归一", () => {
      expect(toSimplified("糸睪豊遯").text).toBe("糸睪豊遯");
      for (const k of Object.keys(V.excluded)) expect(V.entries[k]).toBeUndefined();
      // 规范字本身（如 余、台、芸、弁）从不作为变体键
      for (const c of "余台芸弁欠缶虫予") expect(V.entries[c]).toBeUndefined();
    });

    it("全表枚举：每条等长、无链式、键不在繁简字表里、归一后结果与「目标字」转换一致", () => {
      expect(entries.length).toBe(SIMPLIFIED_DICT_META.variantEntries);
      for (const [k, e] of entries) {
        expect(k.length).toBe(1);
        expect(e.to.length).toBe(1);
        expect(Array.from(k)).toHaveLength(1);
        expect(V.entries[e.to]).toBeUndefined(); // 不链式
        expect(tsChars[k]).toBeUndefined(); // 已由字表处理的不重复收
        expect(e.src.length).toBeGreaterThan(0);
        const r = toSimplified(k);
        expect(r.text).toBe(toSimplified(e.to).text);
        expect(r.text).not.toBe(k);
        expect(r.variantCount).toBe(1);
        expect(r.sameLength).toBe(true);
      }
    });

    it("全字表/词组表枚举：OpenCC 的任何输出都不再含异体键（頴 经字表成「颕」后再归一为「颖」）", () => {
      expect(toSimplified("頴川").text).toBe("颖川");
      for (const k of [...Object.keys(tsChars), ...Object.keys((dict as any).phrases)]) {
        for (const c of Array.from(toSimplified(k).text)) expect(V.entries[c]).toBeUndefined();
      }
    });

    it("来源可核对：记录了 OpenCC 与 Unihan 数据文件校验和", () => {
      expect(V.version).toBe(SIMPLIFIED_DICT_META.variantVersion);
      for (const fn of ["TSCharacters.txt", "JPVariants.txt", "Unihan_Variants.txt", "Unihan_OtherMappings.txt"]) {
        expect(V.sources.sha256[fn]).toMatch(/^[0-9a-f]{64}$/);
      }
      // 与繁简字表是同一份 OpenCC 数据
      expect(V.sources.sha256["TSCharacters.txt"]).toBe(SIMPLIFIED_DICT_META.sha256["TSCharacters.txt"]);
    });
  });
});
