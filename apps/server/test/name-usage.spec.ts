import nameUsage from "../src/modules/paipan/engine/data/name-usage.json";
import handPoems from "../src/modules/paipan/engine/data/hand-poems.json";
import { nameSampleHeat } from "../src/modules/paipan/engine/name-usage";
import { namingCharPool } from "../src/modules/paipan/engine/qiming-engine";
import { analyzeName } from "../src/modules/paipan/engine/xingming-engine";
import * as fs from "fs";
import * as path from "path";

describe("起名开放姓名样本整合", () => {
  it("输入快照固定，产品只携带派生统计与样本限制", () => {
    expect(nameUsage._meta.sha256).toBe("30d83f3e682d355ac1d3f18482c14ff5e2bdd0ebe704bff1ef196eabdf93939b");
    expect(nameUsage._meta.records).toBe(1144225);
    expect(nameUsage._meta.invalid).toBe(1);
    expect(Object.keys(nameUsage.chars)).toHaveLength(2238);
    expect(nameUsage.chars["海"][0]).toBe(19172);
    expect(Object.values(nameUsage.chars).every((row) => row[0] === row[1] + row[2] + row[3])).toBe(true);
    expect(Object.keys(nameUsage.given).length).toBeGreaterThan(20000);
    expect(Object.values(nameUsage.given).every((count) => count >= 10)).toBe(true);
    expect(Object.keys(nameUsage.given).every((name) => [...name].length <= 2)).toBe(true);
  });

  it("热度来自样本出现次数，未观察到的名字只报区间", () => {
    expect(nameSampleHeat("志强")).toMatchObject({ level: "high", count: 313 });
    expect(nameSampleHeat("梓涵")).toMatchObject({ level: "mid", count: 25 });
    expect(nameSampleHeat("衢瀑")).toMatchObject({ level: "low", count: null });
    expect(nameSampleHeat("衢瀑").note).toContain("不足 10 次");
    expect(nameSampleHeat("甲乙丙").note).toContain("只覆盖一至二字的名");
    expect(nameSampleHeat("志强").note).toContain("不能据此推算全国重名率");
  });

  it("自动推荐排除审校降级字；全部展示引文须包含对应字", () => {
    const pool = namingCharPool();
    for (const char of [..."拂诵撰瀑襟巅虬岿迥诣赳笈珥珰砥倜隼袅笺笳眺眸谔谙蒹跻嶂篆遴濯衢"]) {
      expect(pool.some((entry) => entry.char === char)).toBe(false);
    }
    expect(pool.filter((entry) => entry.poem).every((entry) => entry.poem!.quote.includes(entry.char))).toBe(true);
  });

  it("详批页复用字库释义、人名读音和核验引文", () => {
    const detail = analyzeName({ fullName: "张清泉", gender: "男" });
    expect(detail.charExplains[1].meaning).toBe(namingCharPool().find((x) => x.char === "清")!.meaning);
    expect(detail.charExplains[2].poems).toEqual([{ source: "唐 · 王维《山居秋暝》", quote: "明月松间照，清泉石上流。" }]);
    const polyphone = analyzeName({ fullName: "张长", gender: "男" });
    expect(polyphone.charExplains[1].pinyin).toBe("cháng");
    expect(polyphone.candidate.chars[1].tone).toBe(2);
    expect(detail.baziFit.note).toContain("无法判断喜用神");
    expect(detail.baziFit.source).toBe("");
    expect(detail.baziFit.quote).toBe("");
  });

  it("手写精选引文的详批副本与起名引擎逐条一致", () => {
    const source = fs.readFileSync(path.join(__dirname, "../src/modules/paipan/engine/qiming-engine.ts"), "utf8");
    const rows = [...source.matchAll(/\{ char: "([^"]+)"[^\n]*?poem: \{ source: "([^"]+)", quote: "([^"]+)" \}/g)];
    const poems = Object.fromEntries(rows.map((m) => [m[1], { source: m[2], quote: m[3] }]));
    expect(rows.length).toBeGreaterThanOrEqual(50);
    expect(poems).toEqual(handPoems);
  });
});
