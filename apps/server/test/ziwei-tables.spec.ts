import * as fs from "fs";
import * as path from "path";

/**
 * 紫微斗数·表结构可推导性（2026-09-20）
 *
 * ══ 背景 ══
 *
 * `apps/mobile/scripts/verify-ziwei.ts` 是竞品「吉真紫微」的黄金测试，123 条断言全过 ——
 * 但那只有**两张盘**。两个案例覆盖不了空间（这是本项目栽过三次的老问题），
 * 所以另配全枚举与结构判据。
 *
 * 全枚举部分在 `artifacts/paipan-compare-20260919/` 下三个脚本里（不进 CI，需真跑引擎）：
 *   ziwei-verify.mts        4392 盘 —— 紫府相对位移、十四主星齐全、命身对称、宫干五虎遁、
 *                                     长生起点与方向、生年四化、十二宫名序
 *   ziwei-anchor-verify.mts 锚点   —— 纳音五行局与已验证 bazi 核心六十甲子逐柱比对（60/60）；
 *                                     紫微诀（补/商/奇退偶进）独立实现逐盘比对（651/651）
 *   ziwei-minor-verify.mts  1830 盘 —— 辅弼/昌曲/空劫成对之和、羊陀相对禄存、禄存与天马
 *                                     跨文件一致、魁钺稳定、大限十二段方向与首限
 *
 * 本文件守的是**源码层的表结构**，这些不需要跑引擎，适合放进 CI 防漂移。
 */

const ROOT = path.resolve(__dirname, "../../..");
const SRC = fs.readFileSync(
  path.join(ROOT, "apps/server/src/modules/paipan/engine/ziwei-engine.ts"), "utf8",
);

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const M = (n: number) => ((n % 12) + 12) % 12;

/** 抽 const NAME = ["a","b",…] */
function arr(name: string): string[] {
  const m = new RegExp(`const ${name} = \\[([^\\]]+)\\]`).exec(SRC);
  if (!m) throw new Error(`${name} 没解析到`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

describe("紫微斗数 · 命主身主", () => {
  const MINGZHU = arr("MINGZHU");
  const SHENZHU = arr("SHENZHU");

  it("反证：两张表都解析到且各 12 项", () => {
    expect(MINGZHU).toHaveLength(12);
    expect(SHENZHU).toHaveLength(12);
  });

  /**
   * 命主以命宫支取，结构上关于子（0）镜像对称：
   * 贪狼 | 巨门 禄存 文曲 廉贞 武曲 | 破军 | 武曲 廉贞 文曲 禄存 巨门
   * 即 MINGZHU[i] === MINGZHU[(12 - i) % 12]，子与午自成轴。
   */
  it("命主关于子轴镜像对称：MINGZHU[i] === MINGZHU[-i]", () => {
    const bad: string[] = [];
    for (let i = 0; i < 12; i++) {
      if (MINGZHU[i] !== MINGZHU[M(-i)]) bad.push(`${ZHI[i]}=${MINGZHU[i]} vs ${ZHI[M(-i)]}=${MINGZHU[M(-i)]}`);
    }
    expect(bad).toEqual([]);
    // 轴上两宫（子、午）自身即镜像点，不参与配对，故互异星共 7 个
    expect(new Set(MINGZHU).size).toBe(7);
  });

  it("身主以年支取，周期为 6：SHENZHU[i] === SHENZHU[i+6]", () => {
    const bad: string[] = [];
    for (let i = 0; i < 6; i++) {
      if (SHENZHU[i] !== SHENZHU[i + 6]) bad.push(`${ZHI[i]}=${SHENZHU[i]} vs ${ZHI[i + 6]}=${SHENZHU[i + 6]}`);
    }
    expect(bad).toEqual([]);
    expect(new Set(SHENZHU).size).toBe(6);
  });

  it("反证：周期改成 5 时身主必须报红（说明周期 6 是真在起作用）", () => {
    const bad = [0, 1, 2, 3, 4, 5, 6].filter((i) => SHENZHU[i] !== SHENZHU[(i + 5) % 12]);
    expect(bad.length).toBeGreaterThan(0);
  });
});

describe("紫微斗数 · 十二神序列", () => {
  const CASES: [string, number, string][] = [
    ["CHANGSHENG_SEQ", 12, "长生"],
    ["BOSHI_SEQ", 12, "博士"],
    ["JIANGQIAN_SEQ", 12, "将星"],
    ["SUIQIAN_SEQ", 12, "岁建"],
  ];
  it.each(CASES)("%s：恰 %i 项、互不重复、首项为「%s」", (name, len, head) => {
    const a = arr(name);
    expect(a).toHaveLength(len);
    expect(new Set(a).size).toBe(len);
    expect(a[0]).toBe(head);
  });
});

describe("紫微斗数 · 纳音五行局", () => {
  it("NAYIN_PAIR15 恰 15 项，且五行各出现 3 次（六十甲子每行五行各 12 柱）", () => {
    const a = arr("NAYIN_PAIR15");
    expect(a).toHaveLength(15);
    const c: Record<string, number> = {};
    for (const w of a) c[w] = (c[w] ?? 0) + 1;
    expect(c).toEqual({ 金: 3, 火: 3, 木: 3, 土: 3, 水: 3 });
  });

  it("五行 → 局数与长生起点：水二申 木三亥 金四巳 土五申 火六寅", () => {
    const blk = /const JU_BY_WUXING[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC);
    expect(blk).not.toBeNull();
    const got: Record<string, [number, string]> = {};
    for (const m of blk![1].matchAll(/(.): \{ name: "(\S+?)", num: (\d), changsheng: (\d+) \}/g)) {
      got[m[1]] = [Number(m[3]), ZHI[Number(m[4])]];
    }
    expect(got).toEqual({
      水: [2, "申"], 木: [3, "亥"], 金: [4, "巳"], 土: [5, "申"], 火: [6, "寅"],
    });
    // 局数与名字自洽（水二局的 num 必须是 2）
    for (const m of blk![1].matchAll(/(.): \{ name: "(\S+?)", num: (\d)/g)) {
      const cn = ["", "一", "二", "三", "四", "五", "六"][Number(m[3])];
      expect(m[2]).toBe(`${m[1]}${cn}局`);
    }
  });
});

describe("紫微斗数 · 生年四化", () => {
  const blk = /const SIHUA_TABLE[^=]*=\s*\{([\s\S]*?)\n\}/.exec(SRC)!;
  const T: Record<string, string[]> = {};
  for (const m of blk[1].matchAll(/(.): \["(\S+?)", "(\S+?)", "(\S+?)", "(\S+?)"\]/g)) {
    T[m[1]] = [m[2], m[3], m[4], m[5]];
  }

  it("反证：十干全解析到，每干四星", () => {
    expect(Object.keys(T).sort()).toEqual([...GAN].sort());
    for (const g of GAN) expect(T[g]).toHaveLength(4);
  });

  it("同一干的禄权科忌四星互异（不得一星兼两化）", () => {
    const bad = GAN.filter((g) => new Set(T[g]).size !== 4);
    expect(bad).toEqual([]);
  });

  it("四化只落在十四主星与文昌文曲左辅右弼上（十八星之内）", () => {
    const ALLOWED = new Set([
      "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府", "太阴",
      "贪狼", "巨门", "天相", "天梁", "七杀", "破军",
      "文昌", "文曲", "左辅", "右弼",
    ]);
    const out = [...new Set(GAN.flatMap((g) => T[g]))].filter((s) => !ALLOWED.has(s));
    expect(out).toEqual([]);
  });
});

describe("紫微斗数 · 十二宫名", () => {
  it("恰 12 宫、互不重复、首宫为命宫", () => {
    const a = arr("PALACE_NAMES");
    expect(a).toHaveLength(12);
    expect(new Set(a).size).toBe(12);
    expect(a[0]).toBe("命宫");
  });
});

describe("紫微斗数 · 黄金测试脚本仍在", () => {
  it("verify-ziwei.ts 必须存在（竞品两案例 123 断言，与本文件互补）", () => {
    const p = path.join(ROOT, "apps/mobile/scripts/verify-ziwei.ts");
    expect(fs.existsSync(p)).toBe(true);
    const s = fs.readFileSync(p, "utf8");
    expect(s).toMatch(/computeZiwei/);
  });

  /**
   * 引擎头注释引用了 docs/ziwei-golden-test.md，但该文件并不存在（2026-09-20 查）。
   * 七政引擎头也有同样的悬空引用（docs/qizheng-golden-test.md）。
   * 这里不强制补文档，只把「引用的东西要么存在、要么别写成像存在」这条记下来：
   * 若哪天补上了文档，把本断言改成 existsSync(true) 即可。
   */
  it("已知悬空引用：docs/ziwei-golden-test.md 至今不存在（基准实际在 verify-ziwei.ts 里）", () => {
    expect(fs.existsSync(path.join(ROOT, "docs/ziwei-golden-test.md"))).toBe(false);
    expect(SRC).toMatch(/docs\/ziwei-golden-test\.md/);
  });
});
