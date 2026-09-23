import { buildLiuyaoChartView, extractLiuyaoFacts, liuyaoSignals } from "./liuyao-report";
import { LIUYAO_REPORT_TEMPLATE, getReportTemplate, modelSections } from "./report-template";

/** 用真实引擎算出的卦来验证（六爻一事一断，卦错了后面全错） */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { computeLiuyao } = require("@guoxue/shared/paipan");

function cast(coins = "6,7,8,9,7,8") {
  return computeLiuyao({
    year: 2026,
    month: 6,
    day: 22,
    hour: 12,
    minute: 0,
    methodKey: "coin",
    coins,
  });
}

describe("六爻报告", () => {
  it("盘面事实全部来自引擎：本卦变卦、卦宫、世应、四柱旬空、动爻", () => {
    const data = cast();
    const f = extractLiuyaoFacts(data, "问今年能否换工作");

    expect(f.matter).toBe("问今年能否换工作");
    expect(f.benGua).toBe(data.chart.benName);
    expect(f.palace).toBe(data.chart.palace);
    expect(f.shiPos).toBe(data.chart.shiPos);
    expect(f.yingPos).toBe(data.chart.yingPos);
    expect(f.ganzhi).toContain("丁卯日");
    expect(f.dayKongWang).toBe(data.kongwang.day);
    expect(f.lines).toHaveLength(6);
    // 自上而下：第一行是上爻
    expect(f.lines[0]).toContain("上爻");
    expect(f.lines[5]).toContain("初爻");
    // 六亲六神用全称，便于阅读与检索
    expect(f.lines.join()).toMatch(/父母|兄弟|官鬼|妻财|子孙/);
    expect(f.lines.join()).toMatch(/青龙|朱雀|勾陈|螣蛇|白虎|玄武/);
  });

  it("动爻与静卦分别标注", () => {
    const moving = extractLiuyaoFacts(cast("6,9,8,7,8,7"));
    expect(moving.movingCount).toBeGreaterThan(0);
    expect(moving.isStatic).toBe(false);
    expect(moving.movingLines[0]).toMatch(/动，变/);

    const still = extractLiuyaoFacts(cast("7,8,7,8,7,8"));
    expect(still.movingCount).toBe(0);
    expect(still.isStatic).toBe(true);
  });

  it("检索信号按持世 > 本卦 > 卦宫加权，且带命中理由", () => {
    const f = extractLiuyaoFacts(cast());
    const sig = liuyaoSignals(f);
    expect(sig.length).toBeGreaterThan(0);
    const top = sig[0];
    expect(top.weight).toBe(10);
    expect(top.reason).toBe("持世");
    expect(top.value).toMatch(/持世$/);
    expect(sig.some((x) => x.reason === "卦宫")).toBe(true);
    expect(sig.every((x) => x.value.trim().length > 0)).toBe(true);
  });

  it("卦面图形：六爻自上而下，含六神六亲纳甲世应动变与起卦校验", () => {
    const data = cast();
    const v = buildLiuyaoChartView(data, { method: "coin", matter: "问事" });

    expect(v.lines).toHaveLength(6);
    expect(v.lines[0].position).toBe(6);
    expect(v.lines[5].position).toBe(1);
    expect(v.lines.some((l) => l.shiying === "世")).toBe(true);
    expect(v.lines.some((l) => l.shiying === "应")).toBe(true);
    for (const l of v.lines) {
      expect(l.najia.length).toBeGreaterThan(1);
      expect(typeof l.yang).toBe("boolean");
    }
    const labels = v.provenance.map((p) => p.label);
    expect(labels).toEqual(expect.arrayContaining(["所问何事", "起卦方式", "四柱", "日空", "卦宫", "世应"]));
    expect(v.provenance.find((p) => p.label === "起卦方式")?.value).toBe("三枚铜钱摇卦");
  });

  it("六爻模板是一事一断的体例，不是八字那套维度", () => {
    const tpl = getReportTemplate("liuyao");
    expect(tpl).toBe(LIUYAO_REPORT_TEMPLATE);
    const titles = tpl.sections.map((s) => s.title);
    expect(titles).toEqual(["卦面速览", "起卦校验", "用神与世应", "旺衰与生克", "动变与忌神", "应期", "断语", "典籍依据", "局限与建议"]);
    // 引擎直出的段不交给模型
    expect(tpl.sections.filter((s) => s.deterministic).map((s) => s.title)).toEqual(["卦面速览", "起卦校验", "典籍依据"]);
    // 断语段必须写明是倾向而非铁口直断
    expect(tpl.sections.find((s) => s.id === "s7")?.brief).toContain("不是铁口直断");
    // 应期段不给确定日期
    expect(tpl.sections.find((s) => s.id === "s6")?.brief).toContain("给区间不给确定日期");
    expect(modelSections(tpl).every((s) => !!s.brief)).toBe(true);
  });
});
