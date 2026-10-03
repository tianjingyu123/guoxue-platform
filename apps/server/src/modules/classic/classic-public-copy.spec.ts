import { toPublicClassicIntro } from "./classic-public-copy";

describe("toPublicClassicIntro", () => {
  it.each([
    "《史记》本次候选以中文维基文库固定页面快照为数字来源，作者与版本由批次终审核验。",
    "《渊海子平》正文直接解析冻结 Markdown，仍由定期 Codex 复核。",
    "来源：内部批次记录",
  ])("不向公开入口返回内部生产说明：%s", (intro) => {
    expect(toPublicClassicIntro(intro, "史记")).toBe(
      "《史记》，中华传统典籍，点击阅读全文。",
    );
  });

  it("保留正常的读者简介", () => {
    const intro = "中国第一部纪传体通史，记载从黄帝到汉武帝时期的历史。";
    expect(toPublicClassicIntro(intro, "史记")).toBe(intro);
  });
});
