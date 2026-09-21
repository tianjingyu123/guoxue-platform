import { checkCompanyName } from "@guoxue/shared/paipan";

/**
 * 企业名称核名预检（2026-09-19，接续文档 §2.100）
 *
 * ══ 决策人的担心是对的，但可以拆成两半 ══
 *
 * 「公司起名最好也加进来，不过这个公司起名更怕工商局核验通不过。」
 *
 * | | 能做 | 做不了 |
 * |---|---|---|
 * | 禁限用规则 | ✅ 条文明确，可编码 | |
 * | 同行业查重 | | ❌ 需国家企业信用信息公示系统数据 |
 *
 * 故定位是**「预检」不是「担保」**——把必然驳回的滤掉、通过率提上去，
 * 同时每次调用都带出免责声明。**不能让用户以为我们能担保。**
 *
 * 规则出处：《企业名称登记管理规定》（国务院令第734号）、《企业名称禁限用规则》。
 * 与本轮教训一致：**取有名有姓的源头，不拼来路不明的表**。
 */

const ok = { region: "杭州市", ziHao: "云栖", industry: "网络科技", form: "有限公司" };

describe("核名预检：合规名称放行", () => {
  it("结构完整的常规名称可自主申报", () => {
    const r = checkCompanyName(ok);
    expect(r.canSelfApply).toBe(true);
    expect(r.noRejection).toBe(true);
    expect(r.issues.some((i) => i.level === "驳回")).toBe(false);
  });

  it("每次调用都带免责声明，且写明不含查重", () => {
    const r = checkCompanyName(ok);
    expect(r.disclaimer).toContain("不含同行业重名");
    expect(r.disclaimer).toContain("以登记机关核定为准");
  });

  it("每条问题都附条文依据，可追溯", () => {
    const r = checkCompanyName({ ...ok, ziHao: "云" });
    for (const i of r.issues) expect(i.basis.length).toBeGreaterThan(5);
  });
});

describe("核名预检：字号规则", () => {
  it("单字字号驳回", () => {
    expect(checkCompanyName({ ...ok, ziHao: "云" }).canSelfApply).toBe(false);
  });

  /** 这一项只有我们做得了——手上有《通用规范汉字表》8105 字 */
  it("字号含非规范汉字驳回", () => {
    const r = checkCompanyName({ ...ok, ziHao: "云\u{20BB7}" });
    expect(r.issues.some((i) => i.rule === "非规范汉字")).toBe(true);
  });

  it("字号含字母或数字驳回", () => {
    expect(checkCompanyName({ ...ok, ziHao: "A1云栖" }).canSelfApply).toBe(false);
    expect(checkCompanyName({ ...ok, ziHao: "云栖2024" }).canSelfApply).toBe(false);
  });

  it("字号不得用行业用语、组织形式、行政区划", () => {
    for (const z of ["科技网络", "云栖有限公司", "杭州市云栖"]) {
      expect(`${z} 可申报=${checkCompanyName({ ...ok, ziHao: z }).canSelfApply}`).toBe(`${z} 可申报=false`);
    }
  });
});

describe("核名预检：禁用内容", () => {
  it.each([
    ["第一云栖", "绝对化用语"],
    ["美国云栖", "外国国名"],
    ["共产党云", "政党机关"],
    ["解放军云", "军事"],
    ["联合国云", "国际组织"],
  ])("%s 应被驳回（%s）", (ziHao, rule) => {
    const r = checkCompanyName({ ...ok, ziHao });
    expect(r.canSelfApply).toBe(false);
    expect(r.issues.some((i) => i.rule === rule)).toBe(true);
  });
});

describe("核名预检：冠用国字号须与驳回区分", () => {
  /**
   * 「需核准」单独排除是有意的：冠「中国」须国务院决定设立，
   * 普通企业**无法自主申报**。若只看有无驳回就标「通过」，
   * 用户会以为这名字能用——那比直接说不行更误导。
   */
  it("冠「中国」者不可自主申报，但不属驳回", () => {
    const r = checkCompanyName({ ziHao: "中国云栖", industry: "科技", form: "有限公司" });
    expect(r.canSelfApply).toBe(false);   // 报不了
    expect(r.noRejection).toBe(true);     // 但不是违规
    expect(r.issues.some((i) => i.level === "需核准")).toBe(true);
  });

  it("五个国字号字样都覆盖", () => {
    for (const w of ["中国", "中华", "全国", "国家", "国际"]) {
      const r = checkCompanyName({ ziHao: `${w}云栖`, industry: "科技", form: "有限公司" });
      expect(`${w} 需核准=${r.issues.some((i) => i.level === "需核准")}`).toBe(`${w} 需核准=true`);
    }
  });
});

describe("核名预检：结构与经验提示（不影响可否申报）", () => {
  it("缺行业或组织形式只给提示", () => {
    const r = checkCompanyName({ region: "成都市", ziHao: "云栖" });
    expect(r.canSelfApply).toBe(true);
    expect(r.issues.every((i) => i.level === "提示")).toBe(true);
  });

  it("两字字号给通过率提示，并标明是经验非法规", () => {
    const r = checkCompanyName(ok);
    const hint = r.issues.find((i) => i.rule === "两字字号");
    expect(hint).toBeDefined();
    expect(hint!.basis).toContain("非法规");
  });
});
