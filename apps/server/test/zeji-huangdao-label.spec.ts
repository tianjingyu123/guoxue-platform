import * as fs from "fs";
import * as path from "path";

/**
 * 择吉·黄道黑道标注口径（★36，2026-09-20）
 *
 * ══ 抓到的是什么 ══
 *
 * `apps/mobile/src/pkg-paipan/lib/zeji-engine.ts` 的 `scoreDay` 原先这样写理由：
 *
 *     const luck = dayLuck(lunar)
 *     if (luck === 'good') reasons.push(`黄道吉日（${lunar.getZhiXing()}日 · ${lunar.getDayTianShen()}）`)
 *
 * 但 `dayLuck()`（wannianli-engine）是 **建除吉凶 + 天神吉凶 + 宜忌条数差** 三项投票的
 * **复合启发式**，而「黄道/黑道」在术上是**十二天神的二值属性**
 * （青龙·明堂·金匮·天德·玉堂·司命为黄道，天刑·朱雀·白虎·天牢·玄武·勾陈为黑道），
 * 由月支加日支定，**与建除和宜忌条数无关**。
 *
 * 两者不等价，于是同一句话里会印出自相矛盾的内容：
 *
 *     「黄道吉日（成日 · 勾陈）」   ← 勾陈是黑道六神
 *
 * 全枚举 2024-01-01 起 1461 天：**246 天（16.8%）**天神为黑道却被判 good。
 * （反方向 0 天——黄道天神从不被判 bad，所以这不是对称的噪声，是单向的错标。）
 *
 * 修法：黄道/黑道按天神如实标；复合吉度另起一条，写清它由什么构成，不再冒用「黄道」二字。
 *
 * ══ 本测试守什么 ══
 *
 * ① 源码里必须有黄道六神集合，且恰好是那六个；
 * ② 判黄道/黑道只能依据 `getDayTianShen()`，不得再依据 `dayLuck()`；
 * ③ 「黄道吉日」这个把复合吉度冒充天神属性的旧句式不得复活。
 */

const ROOT = path.resolve(__dirname, "../../..");
const RAW = fs.readFileSync(
  path.join(ROOT, "apps/mobile/src/pkg-paipan/lib/zeji-engine.ts"), "utf8",
);
/** 只看代码，不看注释——注释里为了讲清错因，本来就会引用旧句式 */
const SRC = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("择吉·黄道黑道标注口径", () => {
  it("反证：源码读到了且含打分函数（读空会让下面全变空跑）", () => {
    expect(SRC.length).toBeGreaterThan(2000);
    expect(SRC).toMatch(/function scoreDay\(/);
  });

  it("① 黄道六神集合存在且恰为青龙·明堂·金匮·天德·玉堂·司命", () => {
    const m = /const HUANGDAO_SHEN = new Set\(\[([^\]]+)\]\)/.exec(SRC);
    expect(m).not.toBeNull();
    const got = [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    expect(new Set(got)).toEqual(new Set(["青龙", "明堂", "金匮", "天德", "玉堂", "司命"]));
    expect(got).toHaveLength(6); // 不重不漏
  });

  it("② 黄道/黑道判定依据天神，不依据复合启发式 dayLuck", () => {
    expect(SRC).toMatch(/HUANGDAO_SHEN\.has\(tianShen\)/);
    // dayLuck 仍可用于打分，但它的分支里不许再出现「黄道」二字
    const branch = /const luck = dayLuck\(lunar\)[\s\S]*?\n  \}/.exec(SRC);
    expect(branch).not.toBeNull();
    expect(branch![0]).not.toMatch(/黄道/);
    expect(branch![0]).not.toMatch(/黑道/);
  });

  it("③ 旧的自相矛盾句式「黄道吉日（…）」不得复活（只查代码，注释里讲错因不算）", () => {
    expect(RAW).toMatch(/黄道吉日/);      // 反证：注释里确实还留着这四个字，说明剥注释这步真的生效了
    expect(SRC).not.toMatch(/黄道吉日/);  // 代码里必须绝迹
  });

  it("④ 黑道分支必须由天神得出（而非 luck === 'bad'）", () => {
    // 「黑道日（天神X）」这条理由与 luck 无关，任何日子都会输出黄道或黑道其一
    expect(SRC).toMatch(/`黄道日（天神\$\{tianShen\}）`/);
    expect(SRC).toMatch(/`黑道日（天神\$\{tianShen\}），谨慎择用`/);
  });
});
