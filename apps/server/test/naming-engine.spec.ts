import { generateNames, sanCaiJiXiong, toneScore, type ShuLiJiXiong } from "@guoxue/shared/paipan";
import { getShuLi } from "../src/modules/tool-registry/calculators/xingming-data";

/**
 * 起名候选生成（2026-09-19，接续文档 §2.97）
 *
 * ══ 本文件测的是机制，不是名字好不好 ══
 *
 * 重名有两个成因：字库小（已由 `naming-pool` 解决）、**打分完全确定性**。
 * 后者更要命且与字库无关——原实现按总分降序取前 60，
 * 同姓＋同八字＋同风格恒得同一批名字，字库再大所有人也拿同一个 argmax。
 * 6M 用户下，工具本身就是重名制造机：**推荐得越多，重名越集中**。
 *
 * 解法是「先筛合格，再从合格集按种子抽样」。
 * 下面的用例验的就是这套机制：合格线是硬的、抽样确实换批、不给种子可复现。
 *
 * ⚠️ **名字的「好不好」本文件测不了**，因为那要靠字义数据，而那层还没有。
 * 实测不带适名字表时头十个是「张喃复、张筲匾、张茎毯…」——
 * 全是规范汉字、五格三才声调全合格，但没人会这么取名。
 * 故引擎带 `unfiltered` 标记，本文件专门有一条验这个标记不会漏。
 */

const shuLi = (n: number): ShuLiJiXiong => {
  let k = n;
  while (k > 81) k -= 81;
  if (k < 1) k = 1;
  return (getShuLi(k) as unknown as { jiXiong: ShuLiJiXiong }).jiXiong;
};

const REQ = { surname: "张", givenLength: 2 as const, xiYong: ["木"] as never, limit: 60 };

describe("起名引擎：合格集规模（字库扩容后的直接效果）", () => {
  it("张姓双名喜用木的合格集在十万量级（原实现组合总数仅 72–650）", () => {
    const r = generateNames(REQ, shuLi);
    expect(r.qualifiedCount).toBeGreaterThan(100_000);
  });

  it("硬条件确实生效：人格/地格/总格数理不得犯凶，三才不得犯凶", () => {
    const r = generateNames({ ...REQ, limit: 200 }, shuLi);
    for (const c of r.candidates) {
      expect(`${c.given} 人格=${c.geJiXiong.renGe}`).not.toMatch(/[大]?凶$/);
      expect(`${c.given} 地格=${c.geJiXiong.diGe}`).not.toMatch(/[大]?凶$/);
      expect(`${c.given} 总格=${c.geJiXiong.zongGe}`).not.toMatch(/[大]?凶$/);
      expect(c.sanCai.jiXiong).not.toBe("凶");
    }
  });

  it("指定喜用五行时，名中至少一字合喜用", () => {
    const r = generateNames({ ...REQ, limit: 200 }, shuLi);
    for (const c of r.candidates) {
      expect(`${c.given} 含木=${c.chars.some((x) => x.wuXing === "木")}`).toBe(`${c.given} 含木=true`);
    }
  });

  it("名不与姓同字，排除字生效", () => {
    const r = generateNames({ ...REQ, excludeChars: "林森", limit: 200 }, shuLi);
    for (const c of r.candidates) {
      expect(c.given).not.toContain("张");
      expect(c.given).not.toContain("林");
      expect(c.given).not.toContain("森");
    }
  });
});

describe("起名引擎：抽样解决重名（本模块的核心）", () => {
  it("同输入换种子，两批 60 个几乎不重叠", () => {
    const a = generateNames({ ...REQ, seed: 1 }, shuLi).candidates.map((c) => c.given);
    const b = generateNames({ ...REQ, seed: 2 }, shuLi).candidates.map((c) => c.given);
    const overlap = a.filter((x) => new Set(b).has(x)).length;
    // 原实现此处必然 60/60 重叠——同输入恒得同一批
    expect(`重叠=${overlap} 应 <6`).toBe(`重叠=${overlap < 6 ? overlap : "过多"} 应 <6`);
    expect(overlap).toBeLessThan(6);
  });

  it("多个种子两两之间都不撞车", () => {
    const batches = [11, 22, 33, 44].map((s) =>
      new Set(generateNames({ ...REQ, seed: s, limit: 40 }, shuLi).candidates.map((c) => c.given)),
    );
    for (let i = 0; i < batches.length; i++) {
      for (let j = i + 1; j < batches.length; j++) {
        const ov = [...batches[i]].filter((x) => batches[j].has(x)).length;
        expect(`批${i}×批${j} 重叠=${ov < 5}`).toBe(`批${i}×批${j} 重叠=true`);
      }
    }
  });

  it("不给种子时确定性可复现（便于测试与问题排查）", () => {
    const a = generateNames(REQ, shuLi).candidates.map((c) => c.given).join(" ");
    const b = generateNames(REQ, shuLi).candidates.map((c) => c.given).join(" ");
    expect(b).toBe(a);
  });

  it("种子回传，据此可复现同一批", () => {
    const first = generateNames({ ...REQ, seed: 12345 }, shuLi);
    expect(first.seed).toBe(12345);
    const again = generateNames({ ...REQ, seed: first.seed }, shuLi);
    expect(again.candidates.map((c) => c.given)).toEqual(first.candidates.map((c) => c.given));
  });

  it("抽样只在合格集内部发生——每批都仍然全部合格", () => {
    for (const seed of [7, 77, 777]) {
      const r = generateNames({ ...REQ, seed, limit: 50 }, shuLi);
      for (const c of r.candidates) expect(c.sanCai.jiXiong).not.toBe("凶");
    }
  });
});

describe("起名引擎：适名字表闸门（未过滤不得直接展示）", () => {
  it("不给 allowChars 时必须标 unfiltered", () => {
    const r = generateNames(REQ, shuLi);
    expect(r.unfiltered).toBe(true);
  });

  it("给了 allowChars 则不再标 unfiltered，且候选只用表内字", () => {
    const allow = [..."梓萱睿瑶芷彦嘉禾林松柏桐楠榕杉枫柳"];
    const r = generateNames({ ...REQ, allowChars: allow, limit: 30 }, shuLi);
    expect(r.unfiltered).toBe(false);
    const allowSet = new Set(allow);
    for (const c of r.candidates) {
      for (const ch of c.chars) expect(`${c.given} 用字${ch.char}在表内=${allowSet.has(ch.char)}`).toBe(`${c.given} 用字${ch.char}在表内=true`);
    }
  });

  it("适名字表收窄后合格集显著变小（说明过滤确实在起作用）", () => {
    const wide = generateNames(REQ, shuLi).qualifiedCount;
    const narrow = generateNames({ ...REQ, allowChars: [..."梓萱睿瑶芷彦嘉禾林松柏桐楠榕杉枫柳"] }, shuLi).qualifiedCount;
    expect(narrow).toBeLessThan(wide / 100);
  });
});

describe("起名引擎：定字与单名", () => {
  it("辈字定在首位", () => {
    const r = generateNames({ ...REQ, fixedChar: "嘉", fixedPosition: "first", limit: 20 }, shuLi);
    for (const c of r.candidates) expect(c.given[0]).toBe("嘉");
  });

  it("辈字定在末位", () => {
    const r = generateNames({ ...REQ, fixedChar: "嘉", fixedPosition: "last", limit: 20 }, shuLi);
    for (const c of r.candidates) expect(c.given[1]).toBe("嘉");
  });

  it("单名只出一字", () => {
    const r = generateNames({ surname: "张", givenLength: 1, xiYong: ["木"] as never, limit: 20 }, shuLi);
    for (const c of r.candidates) expect(`${c.given} 长度=${[...c.given].length}`).toBe(`${c.given} 长度=1`);
  });

  it("姓中有字不在康熙表则明确报错，不臆测", () => {
    expect(() => generateNames({ surname: "\u{20BB7}", givenLength: 2 }, shuLi)).toThrow(/康熙笔画表/);
  });

  it("指定字不在规范表内则报错", () => {
    expect(() => generateNames({ ...REQ, fixedChar: "\u{20BB7}" }, shuLi)).toThrow(/规范汉字表/);
  });
});

describe("起名引擎：评分构件", () => {
  it("三才：人才被克为凶，相生为吉", () => {
    expect(sanCaiJiXiong("金", "木", "水")).toBe("凶"); // 金克木，天克人
    expect(sanCaiJiXiong("水", "木", "土")).toBe("吉"); // 水生木
    expect(sanCaiJiXiong("木", "火", "土")).toBe("吉"); // 木生火、火生土
  });

  it("声调：全同调最低，三字三调最高", () => {
    expect(toneScore([2, 2, 2])).toBeLessThan(toneScore([1, 2, 3]));
    expect(toneScore([1, 2, 3])).toBe(95);
    expect(toneScore([2, 2])).toBe(40);
  });

  it("分数在 0–100 且四项拆分齐备", () => {
    const r = generateNames({ ...REQ, limit: 30 }, shuLi);
    for (const c of r.candidates) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      for (const k of ["shuLi", "sanCai", "wuXing", "tone"] as const) {
        expect(typeof c.detail[k]).toBe("number");
      }
    }
  });
});
