import { calculateXuanKongDaGua } from "./xuankong-dagua.calculator";

/**
 * 玄空大卦回归（2026-09-19，接续文档 §2.103）
 *
 * ══ 修之前：爻位颠倒 ══
 *
 * 八卦爻象表的位序是 `[上,中,下]`，而代码注释写
 * `allYao = [...lowerYao, ...upperYao]; // 从下往上`，直接拼接导致每三爻内部倒序。
 *
 * | 标注 | 实际变的爻 |
 * |---|---|
 * | 初爻 | 第三爻 |
 * | 三爻 | 初爻 |
 * | 四爻 | 上爻 |
 * | 上爻 | 第四爻 |
 *
 * 二爻、五爻恰在中间故未受影响。
 *
 * ══ 为什么难发现 ══
 *
 * **六个变卦的集合仍然是对的**——读回时用同一张表，前后抵消。
 * 错的只是「哪一爻变」这个标签。而 `jiXiongMap` 正是按爻位派吉凶的，
 * 于是吉凶全落在错误的爻上。
 *
 * 这是第三次「集合对、位置错」（§2.92 穿山龙顺排、§2.102 山向遁型分界）。
 * **共同点：计数或集合层面的断言全绿，必须锚定具体位置才测得出。**
 *
 * 同一张 `[上,中,下]` 表在已删除的 `xiaochengtu.calculator.ts` 里也出现过，是同源。
 */

/** 乾卦六爻变的经典结果（自初至上） */
const QIAN_BIAN: [string, string][] = [
  ["初爻", "乾巽"], // 天风姤
  ["二爻", "乾离"], // 天火同人
  ["三爻", "乾兑"], // 天泽履
  ["四爻", "巽乾"], // 风天小畜
  ["五爻", "离乾"], // 火天大有
  ["上爻", "兑乾"], // 泽天夬
];

/** 八卦爻象，自下而上（阳1阴0） */
const TRI: Record<string, number[]> = {
  坤: [0, 0, 0], 震: [1, 0, 0], 坎: [0, 1, 0], 兑: [1, 1, 0],
  艮: [0, 0, 1], 离: [1, 0, 1], 巽: [0, 1, 1], 乾: [1, 1, 1],
};

const run = (guaNumber: number) => calculateXuanKongDaGua({ guaNumber }) as any;

describe("玄空大卦：爻变位置（外部基准）", () => {
  it.each(QIAN_BIAN)("乾为天 %s 变得「%s」", (yaoName, after) => {
    const r = run(1);
    const y = r.yaoBian.find((x: any) => x.yaoName === yaoName);
    expect(`${yaoName}→${y.afterGua}`).toBe(`${yaoName}→${after}`);
  });

  /**
   * 这一条才是真正的判据：**标注第 N 爻，就必须恰好是第 N 爻变**。
   * 修前六卦的集合是对的，只有位置错——只查集合的断言挡不住。
   */
  it("任一卦：标注的爻位与实际变动位置一致（逐卦逐爻）", () => {
    const bad: string[] = [];
    for (const n of [1, 2, 11, 12, 23, 44, 63, 64]) {
      const r = run(n);
      const before = [...TRI[r.lowerTrigram], ...TRI[r.upperTrigram]]; // 自下而上
      r.yaoBian.forEach((y: any, i: number) => {
        const m = /^(.)(.)$/.exec(y.afterGua);
        if (!m) return;
        const [, up, lo] = m;
        const after = [...TRI[lo], ...TRI[up]];
        const diff = before.map((v, k) => (v === after[k] ? -1 : k)).filter((k) => k >= 0);
        if (diff.length !== 1) bad.push(`卦${n} ${y.yaoName} 差${diff.length}爻`);
        else if (diff[0] !== i) bad.push(`卦${n} 标${y.yaoName}(第${i + 1}) 实变第${diff[0] + 1}爻`);
      });
    }
    expect(`错位=${bad.slice(0, 5).join(" ")}`).toBe("错位=");
  });

  it("每卦恰六条爻变，且六个变卦互不相同", () => {
    for (const n of [1, 2, 33, 64]) {
      const r = run(n);
      expect(`卦${n} 条数=${r.yaoBian.length}`).toBe(`卦${n} 条数=6`);
      expect(`卦${n} 去重=${new Set(r.yaoBian.map((y: any) => y.afterGua)).size}`).toBe(`卦${n} 去重=6`);
    }
  });

  it("变卦与本卦不同（自身不得出现在变卦里）", () => {
    for (const n of [1, 15, 42, 64]) {
      const r = run(n);
      const self = `${r.upperTrigram}${r.lowerTrigram}`;
      for (const y of r.yaoBian) expect(y.afterGua).not.toBe(self);
    }
  });
});

describe("玄空大卦：输入校验", () => {
  it("卦序号越界明确报错，不静默兜底", () => {
    for (const n of [0, 65, -1, 1.5]) {
      expect(() => calculateXuanKongDaGua({ guaNumber: n })).toThrow(/1-64/);
    }
  });

  it("六十四卦全可算，且各自有上下卦", () => {
    for (let n = 1; n <= 64; n++) {
      const r = run(n);
      expect(TRI[r.upperTrigram]).toBeDefined();
      expect(TRI[r.lowerTrigram]).toBeDefined();
    }
  });
});
