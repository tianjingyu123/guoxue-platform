import { BAZI_REPORT_TEMPLATE, getReportTemplate, modelSections, templateBrief } from "./report-template";

/** 平台定结构、模型只填内容：模板本身的约束 */
describe("报告模板（七段骨架）", () => {
  it("八字模板覆盖七段骨架，编号稳定且不重复", () => {
    const ids = BAZI_REPORT_TEMPLATE.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("s1");
    const kinds = BAZI_REPORT_TEMPLATE.sections.map((s) => s.kind);
    for (const k of ["chart", "provenance", "structure", "dimension", "timeline", "evidence", "limits"]) {
      expect(kinds).toContain(k);
    }
  });

  it("引擎数据生成的段不交给模型：盘面速览、起盘校验、典籍依据", () => {
    const deterministic = BAZI_REPORT_TEMPLATE.sections.filter((s) => s.deterministic).map((s) => s.title);
    expect(deterministic).toEqual(["盘面速览", "起盘校验", "典籍依据"]);
    expect(modelSections(BAZI_REPORT_TEMPLATE).some((s) => s.deterministic)).toBe(false);
  });

  it("每个交给模型的段都有明确写作要求", () => {
    for (const s of modelSections(BAZI_REPORT_TEMPLATE)) {
      expect(s.brief && s.brief.length > 10).toBe(true);
    }
  });

  it("健康一节要求以医生意见为准，财富一节禁止投资建议，婚姻一节禁止确定性结论", () => {
    const by = (id: string) => BAZI_REPORT_TEMPLATE.sections.find((s) => s.id === id)!;
    expect(by("s8").brief).toContain("医生");
    expect(by("s6").brief).toContain("不给投资建议");
    expect(by("s7").brief).toContain("不下");
  });

  it("提示词里的小节清单带 sectionId，供模型对号入座", () => {
    const brief = templateBrief(BAZI_REPORT_TEMPLATE);
    expect(brief).toContain("s3 【日主与格局】");
    expect(brief).toContain("s9 【大运节奏】");
    expect(brief).not.toContain("s1 【盘面速览】"); // 引擎生成，不下发给模型
  });

  it("未知工具回落到八字模板（不产生无模板的报告）", () => {
    // 样本换过两次了：紫微、阳盘命理先后接入，原来拿它们验回落的断言都跟着红。
    // 这里改用一个不会被实现的假类型，免得每接一个工具就来改一次测试。
    expect(getReportTemplate("__not-a-tool__").paipanType).toBe("bazi");
    expect(getReportTemplate("bazi")).toBe(BAZI_REPORT_TEMPLATE);
    expect(getReportTemplate("ziwei").paipanType).toBe("ziwei");
  });
});
