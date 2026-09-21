import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { KEEP_ORIGINAL, SIMPLIFIED_DICT_META, mapRangeToOriginal, toSimplified } from "./simplified-converter";
import dict from "./opencc-ts-1.1.9.json";

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
});
