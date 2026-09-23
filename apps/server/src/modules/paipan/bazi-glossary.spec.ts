import { BAZI_GLOSSARY, extractGlossary, findTerm } from "./bazi-glossary";

/** 术语注解：同一份专业报告，小白点开看得懂，专业用户略过 */
describe("八字术语表", () => {
  it("每条都有释义与归类，术语不重复", () => {
    const names = BAZI_GLOSSARY.map((t) => t.term);
    expect(new Set(names).size).toBe(names.length);
    for (const t of BAZI_GLOSSARY) {
      expect(t.brief.length).toBeGreaterThan(5);
      expect(["十神", "旺衰", "格局", "关系", "神煞", "基础", "运程"]).toContain(t.group);
    }
    expect(BAZI_GLOSSARY.length).toBeGreaterThanOrEqual(50);
  });

  it("只返回正文里真正出现的词，不下发整本词典", () => {
    const hits = extractGlossary(["日主身弱，喜印比帮身；月令偏财透干，取偏财格。"]);
    const names = hits.map((h) => h.term);
    expect(names).toContain("日主");
    expect(names).toContain("身弱");
    expect(names).toContain("月令");
    expect(names).toContain("偏财");
    expect(names).not.toContain("驿马"); // 正文没出现
    expect(hits.length).toBeLessThan(BAZI_GLOSSARY.length);
  });

  it("单字别名不参与正文匹配（「官」「才」「印」随处可见，按它匹配会大面积误伤）", () => {
    const hits = extractGlossary(["他在政府机关工作，印象不错，才刚上任。"]);
    const names = hits.map((h) => h.term);
    expect(names).not.toContain("正官");
    expect(names).not.toContain("偏财");
    expect(names).not.toContain("正印");
  });

  it("长词优先返回，便于前端按长词先切分", () => {
    const hits = extractGlossary(["地支三合与地支六冲同现"]);
    const idxSanHe = hits.findIndex((h) => h.term === "地支三合");
    expect(idxSanHe).toBeGreaterThanOrEqual(0);
    // 结果按词长降序，前端据此优先匹配长词
    const lens = hits.map((h) => h.term.length);
    expect([...lens].sort((a, b) => b - a)).toEqual(lens);
  });

  it("单字简写仍可精确查询（四柱卡上的十神标注走这条路）", () => {
    expect(findTerm("才")?.term).toBe("偏财");
    expect(findTerm("枭")?.term).toBe("偏印");
    expect(findTerm("日元")?.term).toBe("日主");
    expect(findTerm("不存在的词")).toBeNull();
  });

  it("神煞释义不下吉凶断语，注明仅作参考", () => {
    const tianyi = findTerm("天乙贵人")!;
    expect(`${tianyi.brief}${tianyi.detail}`).toContain("参考");
    const guchen = findTerm("孤辰")!;
    expect(guchen.detail).toContain("不作婚姻结论");
  });
});
