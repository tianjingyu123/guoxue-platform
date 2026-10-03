import { ClassicsBffService } from "./classics-bff.service";

describe("古籍馆公开简介", () => {
  const service = new ClassicsBffService({} as never, {} as never);
  const cleanIntro = (intro: string, title = "测试古籍") =>
    (service as unknown as { cleanIntro: (value: string, bookTitle: string) => string }).cleanIntro(intro, title);

  it.each([
    "《测试古籍》本次候选以殆知阁公开数据快照为数字来源，正文直接解析冻结 Markdown。",
    "《测试古籍》正文按开放许可使用，作者与版本细节由批次终审核验。",
    "《测试古籍》作者、年代与版本细节仍由定期 Codex 复核。",
  ])("不向读者展示内部生产与审核措辞：%s", (intro) => {
    expect(cleanIntro(intro)).toBe("《测试古籍》，中华传统典籍，点击阅读全文。");
  });

  it("保留正常的内容简介", () => {
    const intro = "先秦儒家经典，集中记录了孟子及其弟子的思想与言行。";
    expect(cleanIntro(intro, "孟子")).toBe(intro);
  });
});
