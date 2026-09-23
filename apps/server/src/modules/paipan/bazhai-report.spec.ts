import { calculateBaZhai } from "../tool-registry/calculators/bazhai.calculator";
import { extractBazhaiFacts, bazhaiSignals, bazhaiFactLines, buildBazhaiChartView } from "./bazhai-report";
import { BAZHAI_SEEDS } from "./knowledge-seed/bazhai";
import { getReportTemplate } from "./report-template";

/**
 * 八宅宅书的报告层（2026-09-19）。
 *
 * **这组用例一律拿 `calculateBaZhai` 的真盘喂进来，不自己拼 resultData。**
 * 缘由是本项目已经栽过四次：tag 与 signal 对不上，而单测里的 signals 是自己写的，
 * 写错也全绿（六壬「涉害课」vs「涉害」、阳盘「坤2·西南」vs「坤2宫」、玄空「9运」vs「九运」）。
 * 真盘跑出来的 signal 才是线上会出现的那一个。
 */
describe("八宅宅书", () => {
  const chart = (y: number, g: string, z: string) =>
    extractBazhaiFacts(calculateBaZhai({ birthYear: y, gender: g, zuoShan: z }) as any);

  const allTags = new Set(BAZHAI_SEEDS.flatMap((s) => s.tags));

  it("真盘产出的 signal 全部能命中知识条目的 tag（不留死信号）", () => {
    for (const [y, g, z] of [
      [1990, "男", "坎"], [1990, "女", "坎"], [1985, "男", "坤"], [1978, "女", "离"],
    ] as [number, string, string][]) {
      const f = chart(y, g, z);
      const miss = bazhaiSignals(f).filter((s) => !allTags.has(s.value)).map((s) => s.value);
      expect(`${y}${g}坐${z} 未命中: ${miss.join("、") || "无"}`).toBe(`${y}${g}坐${z} 未命中: 无`);
    }
  });

  it("反向：知识条目里没有永远检索不到的死 tag", () => {
    const produced = new Set<string>();
    for (let y = 1950; y <= 2010; y += 1)
      for (const g of ["男", "女"])
        for (const z of ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"])
          for (const s of bazhaiSignals(chart(y, g, z))) produced.add(s.value);

    const dead = [...allTags].filter((t) => !produced.has(t));
    expect(`死 tag: ${dead.join("、") || "无"}`).toBe("死 tag: 无");
  });

  it("宅命相配与否是最高权重信号，且随盘变化", () => {
    const yes = bazhaiSignals(chart(1990, "男", "坎")); // 坎命 + 坎宅
    const no = bazhaiSignals(chart(1990, "女", "坎")); // 艮命 + 坎宅
    expect(yes[0]).toMatchObject({ value: "宅命相配", weight: 10 });
    expect(no[0]).toMatchObject({ value: "宅命不配", weight: 10 });
  });

  it("事实行同时给出宅盘与命盘两套，并标出两盘皆吉之方", () => {
    // 坎命住坎宅：命卦与宅卦同为坎，两盘完全重合，宅盘的四吉方就该全是共同吉方。
    // 期望值从引擎自己的输出推导，不手写方位——手写期望值已经坑过两次（玄空格局）。
    const same = chart(1990, "男", "坎");
    const JI = ["伏位", "生气", "天医", "延年"];
    const zhaiGood = same.baFang.filter((g) => JI.includes(String(g.star))).map((g) => String(g.direction));
    expect(zhaiGood).toHaveLength(4);
    expect(same.bothGood.slice().sort()).toEqual(zhaiGood.slice().sort());

    const lines = bazhaiFactLines(same);
    expect(lines.some((l) => l.includes("宅盘（以坐山起游星"))).toBe(true);
    expect(lines.some((l) => l.includes("命盘（以命卦起游星"))).toBe(true);
    expect(lines.some((l) => l.includes("宅盘命盘皆吉之方"))).toBe(true);

    // 艮命住坎宅（东西四相反）：两盘吉方必然完全错开，一个共同吉方都没有
    const cross = chart(1990, "女", "坎");
    expect(cross.bothGood).toEqual([]);
    expect(bazhaiFactLines(cross).some((l) => l.includes("无共同吉方"))).toBe(true);
  });

  it("九宫图给出宅盘星与命盘星各一，八方齐全", () => {
    const view = buildBazhaiChartView(chart(1985, "男", "坤"));
    expect(view.cells).toHaveLength(8);
    for (const c of view.cells) {
      expect(c.direction).toBeTruthy();
      expect(c.zhaiStar).toBeTruthy();
      expect(c.mingStar).toBeTruthy();
    }
    expect(view.provenance.map((p) => p.label)).toContain("宅命配合");
  });

  it("模板已注册，段落里宅盘与命盘各占一节", () => {
    const tpl = getReportTemplate("bazhai");
    expect(tpl.paipanType).toBe("bazhai");
    const titles = tpl.sections.map((s) => s.title);
    expect(titles).toContain("宅盘：房子的方位分工");
    expect(titles).toContain("命盘：这个人的吉方");
  });
});
