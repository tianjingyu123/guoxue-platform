import { calculateQimenYin } from "../tool-registry/calculators/qimen.calculator";
import { extractYinpanFacts, yinpanSignals, yinpanFactLines, buildYinpanChartView, guessMatterType } from "./yinpan-report";
import { YINPAN_QIMEN_SEEDS } from "./knowledge-seed/yinpan-qimen";
import { YINPAN_XIANGYI_SEEDS } from "./knowledge-seed/yinpan-xiangyi";
import { YINPAN_CASE_SEEDS } from "./knowledge-seed/yinpan-cases";
import { getReportTemplate } from "./report-template";

/**
 * 阴盘奇门课书的报告层（2026-09-19）。
 *
 * **一律拿 `calculateQimenYin` 的真盘喂进来，不自己拼 resultData。**
 * 本项目已经栽过五次 tag 对不上：六壬「涉害课」vs「涉害」、阳盘「坤2·西南」vs「坤2宫」、
 * 玄空「9运」vs「九运」、以及这一次——**引擎输出的是「腾蛇」，我的条目写的是「螣蛇」**。
 * 每次单测都是绿的，因为 mock 出来的 signal 是自己写的。真盘跑一遍才现形。
 */
describe("阴盘奇门课书", () => {
  const ALL_SEEDS = [...YINPAN_QIMEN_SEEDS, ...YINPAN_XIANGYI_SEEDS, ...YINPAN_CASE_SEEDS];

  /** 补 meta——service 里会拼，这里照做，否则取不到日干、「自己」这个用神会整个缺失 */
  const chartWithMeta = (dt: string) => {
    const r: any = calculateQimenYin({ datetime: dt });
    const { Solar } = require("lunar-javascript");
    const lunar = Solar.fromDate(new Date(dt)).getLunar();
    r.meta = {
      siZhu: {
        nian: { gan: String(lunar.getYearGanByLiChun?.() ?? lunar.getYearGan()), zhi: String(lunar.getYearZhiByLiChun?.() ?? lunar.getYearZhi()) },
        yue: { gan: String(lunar.getMonthGan()), zhi: String(lunar.getMonthZhi()) },
        ri: { gan: String(lunar.getDayGan()), zhi: String(lunar.getDayZhi()) },
        shi: { gan: String(lunar.getTimeGan()), zhi: String(lunar.getTimeZhi()) },
      },
      kongWang: { ri: String(lunar.getDayXunKong?.() ?? ""), shi: String(lunar.getTimeXunKong?.() ?? "") },
    };
    return r;
  };

  const facts = (dt: string, matter: string) => extractYinpanFacts(chartWithMeta(dt), { matter });

  const SAMPLES: [string, string][] = [
    ["2026-09-19T14:00:00", "今年生意能不能赚钱"],
    ["2026-09-19T14:00:00", "我和他这段婚姻还有没有救"],
    ["2025-03-08T09:00:00", "最近总觉得身体不舒服"],
    ["2024-11-11T20:00:00", "这个官司能打赢吗"],
    ["2024-06-15T10:00:00", ""],
  ];

  it("真盘产出的 signal 全部能命中知识条目（不留死信号）", () => {
    const tags = new Set(ALL_SEEDS.flatMap((s) => s.tags));
    for (const [dt, matter] of SAMPLES) {
      const miss = yinpanSignals(facts(dt, matter))
        .filter((s) => !tags.has(s.value))
        .map((s) => s.value);
      expect(`${matter || "(未填)"} 未命中: ${miss.join("、") || "无"}`).toBe(`${matter || "(未填)"} 未命中: 无`);
    }
  });

  it("反向：每一条知识条目都能被真盘检索到（按条目算，不按 tag 算）", () => {
    // 有些 tag 是别名（甲↔值符、螣蛇↔腾蛇），别名本身检索不到不要紧，
    // 只要条目至少有一个 tag 能被真盘命中即可。所以这里的不变量是**条目可达**。
    // 采样够覆盖即可：12 月 × 2 日 × 3 时辰 × 8 类问事 = 576 盘。
    // 原先取 1536 盘，单这一条就跑 17 秒——可达性不需要那么大的样本。
    const produced = new Set<string>();
    for (let mo = 1; mo <= 12; mo++)
      for (const d of [8, 23])
        for (const h of [3, 11, 19])
          for (const m of ["赚钱", "结婚", "生病", "官司", "考试", "合作", "出差", ""]) {
            const dt = `2025-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:00:00`;
            for (const s of yinpanSignals(facts(dt, m))) produced.add(s.value);
          }

    const unreachable = ALL_SEEDS.filter((s) => !s.tags.some((t) => produced.has(t))).map((s) => s.title);
    expect(`检索不到的条目: ${unreachable.join("｜") || "无"}`).toBe("检索不到的条目: 无");
  });

  it("「自己」这个用神永远要取到——日干是所有解读的立足点", () => {
    for (const [dt, matter] of SAMPLES) {
      const f = facts(dt, matter);
      const self = f.yongshen.find((y) => y.role === "自己");
      expect(`${matter || "(未填)"} 有自己用神: ${Boolean(self)}`).toBe(`${matter || "(未填)"} 有自己用神: true`);
      expect(self!.palace).toBeGreaterThan(0);
      expect(self!.symbols.length).toBeGreaterThan(0);
    }
  });

  it("问事类型判别：能认出常见问法，认不出时只取日干而不硬套", () => {
    expect(guessMatterType("今年生意能不能赚钱")).toBe("财");
    expect(guessMatterType("我和他这段婚姻还有没有救")).toBe("婚姻");
    expect(guessMatterType("最近总觉得身体不舒服")).toBe("疾病");
    expect(guessMatterType("这个官司能打赢吗")).toBe("官司");
    expect(guessMatterType("随便看看")).toBe("");

    // 认不出时只有「自己」一个用神，不会硬塞别的
    const f = facts("2024-06-15T10:00:00", "随便看看");
    expect(f.yongshen.map((y) => y.role)).toEqual(["自己"]);
  });

  it("用神宫的符号要取全：天盘干、地盘干、九星、八门、八神一个不少", () => {
    const f = facts("2026-09-19T14:00:00", "今年生意能不能赚钱");
    const cai = f.yongshen.find((y) => y.role === "财")!;
    expect(cai.palace).toBeGreaterThan(0);
    // 至少 5 个符号（双干或双星时更多）
    expect(cai.symbols.length).toBeGreaterThanOrEqual(5);
    // 八门必在其中，且带「门」字（与条目 tag 一致）
    expect(cai.symbols.some((x) => x.endsWith("门"))).toBe(true);
    // 九星必在其中，且以「天」开头
    expect(cai.symbols.some((x) => x.startsWith("天"))).toBe(true);
  });

  it("每个用神都要带「为什么取它」——取象法必须能自证", () => {
    const f = facts("2026-09-19T14:00:00", "我和他这段婚姻还有没有救");
    for (const y of f.yongshen) {
      expect(y.why.length).toBeGreaterThan(4);
      expect(y.palaceLabel).toBeTruthy();
    }
    expect(f.yongshen.map((y) => y.role)).toEqual(["自己", "妻", "夫"]);
  });

  it("事实行给出用神落宫与九宫全盘，四害逐宫标出", () => {
    const lines = yinpanFactLines(facts("2026-09-19T14:00:00", "今年生意能不能赚钱"));
    expect(lines.some((l) => l.includes("用神落宫"))).toBe(true);
    expect(lines.some((l) => l.includes("九宫全盘"))).toBe(true);
    // 四柱要有值（补了 meta 之后）
    expect(lines.some((l) => /四柱：\S+年/.test(l))).toBe(true);
  });

  it("九宫图标出用神宫与四害", () => {
    const f = facts("2026-09-19T14:00:00", "今年生意能不能赚钱");
    const view = buildYinpanChartView(f);
    expect(view.cells).toHaveLength(9);
    // 至少一格被标为用神宫
    expect(view.cells.some((c) => c.yongshenRoles.length > 0)).toBe(true);
    expect(view.provenance.map((p) => p.label)).toContain("起局法");
  });

  it("模板已注册，逐符取象与四害修正各占一节", () => {
    const tpl = getReportTemplate("qimen-yin");
    expect(tpl.paipanType).toBe("qimen-yin");
    const titles = tpl.sections.map((s) => s.title);
    expect(titles).toContain("逐符取象");
    expect(titles).toContain("四害与生克修正");
  });
});
