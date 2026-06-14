import { calculateXuanKongShuiFa } from "./xuankong-shuifa.calculator";

describe("XuanKongShuiFa Calculator", () => {
  it("子山午向2026年水法分析", () => {
    const r = calculateXuanKongShuiFa({ zuoShan: "子", chaoXiang: "午", year: 2026 });
    expect(r.zuoShan).toBe("子");
    expect(r.chaoXiang).toBe("午");
    expect(r.diYun).toBe(9);
    expect(r.lingShen).toBeTruthy();
    expect(r.zhengShen).toBeTruthy();
    expect(r.chengMenJue.zhengChengMen).toBeTruthy();
    expect(r.sanYangWuHui.sanYang.length).toBeGreaterThan(0);
    expect(r.shuiFaJiXiong.length).toBeGreaterThan(0);
    expect(r.analysis).toContain("子");
  });

  it("无效坐山时报错", () => {
    expect(() => calculateXuanKongShuiFa({ zuoShan: "伪", chaoXiang: "午" } as any)).toThrow();
  });
});
