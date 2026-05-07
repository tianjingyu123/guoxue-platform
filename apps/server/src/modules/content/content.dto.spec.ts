import { validate } from "class-validator";
import { CreateContentDto, UpdateContentDto, ContentType } from "./content.dto";

describe("Content DTO 校验", () => {
  describe("CreateContentDto", () => {
    it("完整合法输入通过", async () => {
      const dto = Object.assign(new CreateContentDto(), {
        title: "论语注疏", type: ContentType.CLASSIC, author: "孔子", dynasty: "春秋",
        excerpt: "学而时习之", body: "学而时习之，不亦说乎...",
        cover: "https://example.com/cover.jpg", tags: ["儒家", "经典"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("仅必填字段通过", async () => {
      const dto = Object.assign(new CreateContentDto(), { title: "静夜思", type: ContentType.POEM, body: "床前明月光..." });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateContentDto(), { type: ContentType.ARTICLE, body: "内容" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 type 报错", async () => {
      const dto = Object.assign(new CreateContentDto(), { title: "标题", body: "内容" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 body 报错", async () => {
      const dto = Object.assign(new CreateContentDto(), { title: "标题", type: ContentType.ARTICLE });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("title 超长报错", async () => {
      const dto = Object.assign(new CreateContentDto(), { title: "x".repeat(201), type: ContentType.ARTICLE, body: "内容" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
    it("非法 type 值报错", async () => {
      const dto = Object.assign(new CreateContentDto(), { title: "标题", type: "INVALID_TYPE" , body: "内容" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateContentDto", () => {
    it("空对象通过（所有字段可选）", async () => {
      const dto = Object.assign(new UpdateContentDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("部分更新字段通过", async () => {
      const dto = Object.assign(new UpdateContentDto(), { title: "新标题", excerpt: "新摘要" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
    it("非法 type 报错", async () => {
      const dto = Object.assign(new UpdateContentDto(), { type: "INVALID" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
