import { calculateLiuYao } from "../tool-registry/calculators/liuyao.calculator";

/**
 * 起卦参数必须真正生效。
 *
 * 修复前：DTO 里的 manualYao 从未传给引擎，calculator 也不读它，
 * 引擎在参数缺失时兜底用时间起卦 —— 用户摇出来的卦被丢掉，起出的是另一卦。
 * 六爻一卦一事，卦错了后面全错，因此这里逐项锁死。
 */
describe("六爻起卦参数", () => {
  const base = { datetime: "2026-06-22T12:00:00", matter: "测试" };

  it("不同的铜钱摇卦结果必须得到不同的卦（不能都回落到时间起卦）", () => {
    const a = calculateLiuYao({ ...base, method: "coin", coins: "6,7,8,9,7,8" });
    const b = calculateLiuYao({ ...base, method: "coin", coins: "9,8,7,6,8,7" });
    expect(a.benGua.name).not.toBe(b.benGua.name);
  });

  it("同样的摇卦结果必须复现同一卦", () => {
    const a = calculateLiuYao({ ...base, method: "coin", coins: "6,7,8,9,7,8" });
    const b = calculateLiuYao({ ...base, method: "coin", coins: "6,7,8,9,7,8" });
    expect(a.benGua.name).toBe(b.benGua.name);
    expect(a.shiYao).toBe(b.shiYao);
  });

  it("摇卦结果与时间起卦结果不同（证明确实用了摇卦参数）", () => {
    const shaken = calculateLiuYao({ ...base, method: "coin", coins: "6,6,6,6,6,6" });
    const byTime = calculateLiuYao({ ...base, method: "time" });
    expect(shaken.benGua.name).not.toBe(byTime.benGua.name);
  });

  it("数字起卦与卦名起卦同样生效", () => {
    const n1 = calculateLiuYao({ ...base, method: "number1", numberInput: "123" });
    const n2 = calculateLiuYao({ ...base, method: "number1", numberInput: "456" });
    expect(n1.benGua.name).not.toBe(n2.benGua.name);

    const g = calculateLiuYao({
      ...base,
      method: "guaname",
      guaPick: { benUp: "乾", benDown: "坤", bianUp: "乾", bianDown: "坤" },
    });
    expect(g.benGua.name).toBeTruthy();
  });

  it("参数缺失时仍能出盘（兜底时间起卦，不抛错）", () => {
    const r = calculateLiuYao({ ...base, method: "coin" });
    expect(r.benGua.name).toBeTruthy();
    expect(r.yaos).toHaveLength(6);
  });
});
