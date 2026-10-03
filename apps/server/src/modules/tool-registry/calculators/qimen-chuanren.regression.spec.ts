import { calculateQimenChuanren } from "./qimen-chuanren.calculator";
import { calculateQimenYang } from "./qimen.calculator";
import { calculateDaLiuRen } from "./daliuren.calculator";

/**
 * 奇门穿壬的回归护栏（2026-09-19）。
 *
 * 背景：本计算器原先在正确的骨架上加了一层**编造的「七十二局表」**——
 * 按下标算术生成（starIdx=(ju+t-1)%9、menIdx=(ju+t)%8、tianJiangIdx=(ju*3+t*2)%12），
 * 吉凶靠硬编码下标桶打分，而且只覆盖前 8 个时支（申酉戌亥靠 %72 回绕硬凑）。
 *
 * 揭穿它的不是理论推敲，是**它与已核验的奇门引擎自相矛盾**：
 * 同一份 summary 里引擎说「值符：天心」，局表说「天柱值符」；
 * 采样 60 个时辰，58 盘值符对不上。该层已切除。
 *
 * 原 spec 有 10 条结构断言、**0 条值断言**，全绿却抓不出这个。
 * 所以这组用例只断值，且专盯「穿壬的结论必须与它所依赖的两个引擎同源」。
 */
describe("奇门穿壬（切除编造局表后）", () => {
  const at = (dt: string) =>
    calculateQimenChuanren({
      datetime: dt,
      method: "zhuanpan",
      qiJuMethod: "chaibu",
      trueSolar: false,
      birthYear: 1996,
      gender: "男",
    }) as any;

  const SAMPLES = [
    "2026-09-19T14:00:00",
    "2026-09-01T01:00:00",
    "2026-03-15T09:00:00",
    "2025-12-08T21:00:00",
    "2024-06-21T17:00:00",
  ];

  it("奇门那一半原样取自已核验引擎——值符、值使、局数逐项一致", () => {
    for (const dt of SAMPLES) {
      const r = at(dt);
      const q: any = calculateQimenYang({ datetime: dt, qiJuMethod: "chaibu" });
      expect(`${dt} 值符=${r.qimen.zhiFu}`).toBe(`${dt} 值符=${q.zhiFu}`);
      expect(`${dt} 值使=${r.qimen.zhiShiMen}`).toBe(`${dt} 值使=${q.zhiShiMen}`);
      // 穿壬内部把遁型转成了中文（「阴遁」），局数字段叫 juShu——比对时统一口径
      const dun = q.dunType === "yang" ? "阳遁" : "阴遁";
      expect(`${dt} 局=${r.qimen.dunType}${r.qimen.juShu}`).toBe(`${dt} 局=${dun}${q.juNumber}`);
    }
  });

  it("六壬那一半原样取自已核验引擎——三传与月将逐项一致", () => {
    for (const dt of SAMPLES) {
      const r = at(dt);
      const l: any = calculateDaLiuRen({ datetime: dt });
      expect(`${dt} 初传=${r.liuren.sanChuan.chu.zhi}`).toBe(`${dt} 初传=${l.sanChuan.chu.zhi}`);
      expect(`${dt} 末传=${r.liuren.sanChuan.mo.zhi}`).toBe(`${dt} 末传=${l.sanChuan.mo.zhi}`);
      expect(`${dt} 月将=${r.liuren.yueJiangZhi}`).toBe(`${dt} 月将=${l.yueJiangZhi}`);
    }
  });

  /**
   * 这一条就是当初揭穿编造局表的那个判据，保留下来当护栏：
   * summary 里出现的任何「值符」，都必须是引擎给的那一个。
   */
  it("summary 里不得出现与引擎打架的值符（编造局表正是栽在这里）", () => {
    for (const dt of SAMPLES) {
      const r = at(dt);
      const claimed = String(r.summary).match(/(\S+?)值符/)?.[1];
      // 切除后 summary 不再声称任何「X值符」；若将来有人加回这类文案，必须与引擎一致
      if (claimed) expect(`${dt} summary值符=${claimed}`).toBe(`${dt} summary值符=${r.qimen.zhiFu}`);
    }
  });

  it("不再有「七十二局」这类凭空生成的层", () => {
    const r = at("2026-09-19T14:00:00");
    expect(Object.keys(r.chuanren)).not.toContain("ju72Index");
    expect(Object.keys(r.chuanren)).not.toContain("ju72Name");
    expect(String(r.summary)).not.toContain("七十二局");
  });

  it("综合吉凶由九宫逐宫汇总而来，且随盘变化（不是固定档位）", () => {
    const got = new Set<string>();
    for (let d = 1; d <= 28; d += 3)
      for (const h of [1, 9, 17]) {
        const r = at(`2026-09-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00`);
        expect(["大吉", "吉", "平", "小凶", "凶"]).toContain(r.chuanren.overallJiXiong);
        got.add(r.chuanren.overallJiXiong);
      }
    // 若只出现一种档位，说明汇总逻辑没真正吃到盘面数据
    expect(got.size).toBeGreaterThan(1);
  });

  it("申酉戌亥时也照常出盘——旧局表这四个时辰本来是没有的", () => {
    for (const h of [15, 17, 19, 21]) {
      const r = at(`2026-09-19T${h}:00:00`);
      expect(r.chuanren.mappings.length).toBeGreaterThan(0);
      expect(r.chuanren.overallJiXiong).toBeTruthy();
    }
  });
});
