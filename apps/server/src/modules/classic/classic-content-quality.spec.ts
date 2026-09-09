import { assessClassicContent } from "./classic-content-quality";

describe("assessClassicContent", () => {
  it("将无章节、空章节和过短正文拦截为待审核", () => {
    expect(assessClassicContent([])).toMatchObject({
      publishable: false,
      flags: expect.arrayContaining(["P0_NO_CHAPTERS", "P0_TOO_SHORT_FOR_FULL_BOOK"]),
    });
    expect(assessClassicContent([{ title: "卷一", content: "" }])).toMatchObject({
      publishable: false,
      flags: expect.arrayContaining(["P0_EMPTY_CHAPTER"]),
    });
  });

  it("不改动长篇单章原文，只标记后续需要技术分段", () => {
    const result = assessClassicContent([{ title: "全文", content: "甲".repeat(4000) }]);
    expect(result).toEqual({ totalChars: 4000, flags: ["P1_NEEDS_TECHNICAL_CHUNKS"], publishable: true });
  });

  it("将会影响朗读的不可见字符列为 P1，不阻塞原文入库", () => {
    const result = assessClassicContent([{ title: "卷一", content: `甲\u200B${"乙".repeat(600)}` }]);
    expect(result.publishable).toBe(true);
    expect(result.flags).toContain("P1_SPEECH_RISK_CHARACTERS");
  });
});
