import { NA_YIN } from "../../../packages/bazi-engine/src/constants";
import { naYin } from "@guoxue/shared/paipan";

/**
 * 纳音全枚举回归（2026-09-20，接续文档 §2.106）
 *
 * ══ 为什么必须是全枚举，不能抽样 ══
 *
 * 原实现 `packages/shared/src/paipan/ganzhi.ts` 的 `naYin()` **60 个错 40 个**，
 * 而它在线上跑了很久没人发现。原因是错法太"体面"：
 * 乙巳年得「泉中水」——是个真纳音名、五行也说得通，
 * 除非拿着三十纳音表逐个比对，否则永远看不出来。
 *
 * 更要命的是错的分布：偏移表 `[0,10,20,30,40,50]` 顺写，
 * 而旬首地支序号是 子→戌→申→午→辰→寅 **逆着退 2**，
 * 于是**只有甲子旬与甲午旬（两端与中点）碰巧落对**。
 * 抽查若恰好落在这两旬（甲子、乙丑、甲午、乙未…共 20 个），**全绿**。
 *
 * 这是 desktop-44 在穿山七十二龙那次给出的教训的第二次命中：
 * **凡查表/映射类，必须全枚举比对，抽样没有判别力。**
 *
 * ══ 参照系为什么可信 ══
 *
 * 参照 `@guoxue/bazi-engine` 的 `NA_YIN`——那是一张**独立手写**的 60 条表，
 * 与 shared 的「30 名数组 + 下标算术」是两种完全不同的实现路径。
 * 两条路径独立得出同一结果，比任何一方自证都强。
 *
 * ⚠️ 注意：本文件**不手写期望值**。手写期望值在本项目已栽过五次
 * （最近一次是五运六气按 JS `sort()` 的 UTF-16 序手写中文顺序）。
 * 期望值一律来自 bazi-engine 那张表。
 */

const GANS = [..."甲乙丙丁戊己庚辛壬癸"];
const ZHIS = [..."子丑寅卯辰巳午未申酉戌亥"];

/** 「井泉水」与「泉中水」是同一纳音的异名，比对前归一 */
const norm = (s: string) => s.replace("井泉水", "泉中水");

/** 六十甲子序号 n → 干支 */
const gz = (n: number) => GANS[n % 10] + ZHIS[n % 12];

describe("纳音：六十甲子全枚举", () => {
  it("60 个干支逐个与 bazi-engine 独立手写表一致", () => {
    const bad: string[] = [];
    for (let n = 0; n < 60; n++) {
      const gan = GANS[n % 10], zhi = ZHIS[n % 12];
      const got = norm(naYin(gan, zhi));
      const want = norm(NA_YIN[gan + zhi]);
      if (got !== want) bad.push(`${gan}${zhi} 得「${got}」应「${want}」`);
    }
    // 修复前此处为 40 个。把错例列进断言消息，回归时能直接看出错在哪几旬
    expect(`错=${bad.length}${bad.length ? "：" + bad.slice(0, 8).join("，") : ""}`).toBe("错=0");
  });

  it("反证：参照表本身齐全（60 条，缺一条则上一条检查失效）", () => {
    expect(Object.keys(NA_YIN)).toHaveLength(60);
    for (let n = 0; n < 60; n++) expect(`${gz(n)}=${NA_YIN[gz(n)] ?? "缺"}`).not.toContain("=缺");
  });

  /**
   * 这一条守的是「两干支一组」这个结构性事实，
   * 它与上面的逐项比对互相独立——即便参照表整体错位，这条也能报警。
   */
  it("结构：相邻两个干支必同纳音，且恰好三十组", () => {
    const groups = new Set<string>();
    for (let n = 0; n < 60; n += 2) {
      const a = naYin(GANS[n % 10], ZHIS[n % 12]);
      const b = naYin(GANS[(n + 1) % 10], ZHIS[(n + 1) % 12]);
      expect(`${gz(n)}/${gz(n + 1)}: ${a}=${b}`).toBe(`${gz(n)}/${gz(n + 1)}: ${a}=${a}`);
      groups.add(a);
    }
    expect(groups.size).toBe(30);
  });

  /**
   * 错例定点：修复前这四个整旬全错，且错得"看着正常"。
   * 留在这里是为了让回归失败时一眼认出是**同一个 bug 回来了**，
   * 而不是别的什么问题。
   */
  it("定点：四个曾整旬出错的旬首现在正确", () => {
    const cases: [string, string][] = [
      ["甲戌", "山头火"], // 修复前得「大溪水」
      ["甲申", "井泉水"], // 修复前得「沙中土」
      ["甲辰", "覆灯火"], // 修复前得「涧下水」
      ["甲寅", "大溪水"], // 修复前得「白蜡金」
    ];
    for (const [g, want] of cases) {
      expect(`${g}=${norm(naYin(g[0], g[1]))}`).toBe(`${g}=${norm(want)}`);
    }
  });

  it("甲子旬与甲午旬（原本就碰巧正确的两旬）没有被改坏", () => {
    expect(naYin("甲", "子")).toBe("海中金");
    expect(naYin("乙", "丑")).toBe("海中金");
    expect(norm(naYin("甲", "午"))).toBe("沙中金");
    expect(norm(naYin("乙", "未"))).toBe("沙中金");
  });
});
