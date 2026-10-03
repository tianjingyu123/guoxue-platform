// ── 排盘一致性契约测试（2026-07-14 去伪存真后新增）──
//
// 取代原先的 qimen / qimen-yangpan / qimen-chuanren / liuyao / daliuren 五份 *.calculator.spec.ts。
//
// 为什么换：那五份是**旧实现的白盒测试**——它们断言的是后端自带那套算法的内部行为。
// 而那套算法已被证明与 C 端用户看到的盘不一致（奇门局数/值符/值使、大六壬月将全错），
// 现已下线，calculator 改为调用全平台唯一真源 @guoxue/shared/paipan。
// 继续维护一套只测「旧实现怎么想」的测试没有意义，反而会把人往回带。
//
// 现在这份测什么：**calculator 的输出必须与 shared 引擎逐值同源**。
// 算法本身的正确性由 shared 那边的黄金测试负责（84 项奇门 / 73 项六爻 / 56 项大六壬，
// 对竞品逐值校准），不在这里重复断言 —— 算法真源只有一个，算法测试也只该有一处。
// 这份的职责是拦住「有人又在 calculator 里手写算法」这类回归。

import { calculateQimenYang } from "./qimen.calculator";
import { calculateLiuYao } from "./liuyao.calculator";
import { calculateDaLiuRen } from "./daliuren.calculator";
import { computeQimen, computeLiuyao, computeLiuren } from "@guoxue/shared/paipan";

/** 覆盖阴阳遁、上中下元、交节前后、早晚子时 */
const CASES = [
  { label: "2024-02-05 10:30 立春后·阳遁", y: 2024, m: 2, d: 5, hh: 10, mi: 30 },
  { label: "2024-06-21 14:00 夏至后·阴遁", y: 2024, m: 6, d: 21, hh: 14, mi: 0 },
  { label: "2024-12-21 23:30 冬至·晚子时", y: 2024, m: 12, d: 21, hh: 23, mi: 30 },
  { label: "2025-09-08 16:45", y: 2025, m: 9, d: 8, hh: 16, mi: 45 },
  { label: "1990-01-01 00:30 早子时", y: 1990, m: 1, d: 1, hh: 0, mi: 30 },
];

const iso = (c: (typeof CASES)[number]) =>
  `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}T${String(c.hh).padStart(2, "0")}:${String(c.mi).padStart(2, "0")}:00`;

describe("排盘 calculator ⇄ shared 引擎 一致性（唯一真源）", () => {
  describe("奇门遁甲", () => {
    it.each(CASES)("$label：局数/遁/值符/值使与引擎一致", (c) => {
      const back = calculateQimenYang({ datetime: iso(c), qiJuMethod: "chaibu" });
      const front = computeQimen(new Date(c.y, c.m - 1, c.d, c.hh, c.mi), {
        panMethod: "zhuan",
        startMethod: "chaibu",
      });

      expect(back.juNumber).toBe(front.ju.num);
      expect(back.dunType).toBe(front.ju.isYang ? "yang" : "yin");
      expect(back.zhiFu).toBe(front.zhifu.star);
      expect(back.zhiShiMen).toBe(front.zhishi.men);
    });

    it("九宫结构完整（每宫都有门/星/神/天地盘干）", () => {
      const r = calculateQimenYang({ datetime: iso(CASES[0]) });
      expect(r.gongs).toHaveLength(9);
      for (const g of r.gongs) {
        expect(g.index).toBeGreaterThanOrEqual(1);
        expect(g.index).toBeLessThanOrEqual(9);
        expect(typeof g.men).toBe("string");
        expect(typeof g.star).toBe("string");
        expect(typeof g.shen).toBe("string");
        expect(typeof g.diPan).toBe("string");
      }
    });
  });

  describe("大六壬", () => {
    it.each(CASES)("$label：日柱/月将/贵人与引擎一致", (c) => {
      const back = calculateDaLiuRen({ datetime: iso(c) });
      const front = computeLiuren(new Date(c.y, c.m - 1, c.d, c.hh, c.mi));

      expect(back.riGanZhi).toBe(`${front.sizhu.day.gan}${front.sizhu.day.zhi}`);
      // 月将随中气换将，是起天盘的根 —— 旧实现正是错在这里
      expect(back.yueJiangZhi).toBe(front.yuejiang.zhi);
      expect(back.yueJiang).toBe(front.yuejiang.name);
      expect(back.dayNight).toBe(front.guiren.isDay ? "昼" : "夜");
    });

    it("十二宫齐全 + 四课三传结构完整", () => {
      const r = calculateDaLiuRen({ datetime: iso(CASES[0]) });
      expect(r.gongs).toHaveLength(12);
      expect(r.siKe).toHaveLength(4);
      expect(r.sanChuan.chu.zhi).toBeTruthy();
      expect(r.sanChuan.zhong.zhi).toBeTruthy();
      expect(r.sanChuan.mo.zhi).toBeTruthy();
    });
  });

  describe("六爻", () => {
    it.each(CASES)("$label：本卦/卦宫/世应与引擎一致", (c) => {
      const back = calculateLiuYao({ method: "time", datetime: iso(c) });
      const front = computeLiuyao({
        year: c.y, month: c.m, day: c.d, hour: c.hh, minute: c.mi, methodKey: "time",
      });

      expect(back.benGua.name).toBe(front.chart.benShort);
      expect(back.guaGong).toBe(front.chart.palace);
      expect(back.shiYao).toBe(front.chart.shiPos);
      expect(back.yingYao).toBe(front.chart.yingPos);
    });

    it("六爻齐全且恰有一世一应", () => {
      const r = calculateLiuYao({ method: "time", datetime: iso(CASES[0]) });
      expect(r.yaos).toHaveLength(6);
      expect(r.yaos.filter((y) => y.shiYing === "世")).toHaveLength(1);
      expect(r.yaos.filter((y) => y.shiYing === "应")).toHaveLength(1);
    });
  });
});
