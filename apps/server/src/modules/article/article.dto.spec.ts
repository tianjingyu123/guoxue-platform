import "reflect-metadata";
import { validate } from "class-validator";
import { CreateArticleDto, UpdateArticleDto, AddRecommendDto } from "./article.dto";

describe("Article DTO 校验", () => {
  describe("CreateArticleDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateArticleDto(), {
        title: "国学经典导读", content: "正文内容", tags: ["儒家", "经典"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带可选字段通过", async () => {
      const dto = Object.assign(new CreateArticleDto(), {
        title: "国学经典导读", content: "正文", tags: ["儒家"],
        cover: "https://example.com/cover.jpg", excerpt: "摘要", isPushHome: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateArticleDto(), { content: "正文", tags: ["儒家"] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 content 报错", async () => {
      const dto = Object.assign(new CreateArticleDto(), { title: "标题", tags: ["儒家"] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 tags 报错", async () => {
      const dto = Object.assign(new CreateArticleDto(), { title: "标题", content: "正文" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("title 小于 2 字符报错", async () => {
      const dto = Object.assign(new CreateArticleDto(), { title: "x", content: "正文", tags: ["儒家"] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("title 超过 100 字符报错", async () => {
      const dto = Object.assign(new CreateArticleDto(), {
        title: "x".repeat(101), content: "正文", tags: ["儒家"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("tags 元素非字符串报错", async () => {
      const dto = Object.assign(new CreateArticleDto(), {
        title: "标题", content: "正文", tags: [123] as any,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateArticleDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateArticleDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("部分更新通过", async () => {
      const dto = Object.assign(new UpdateArticleDto(), { title: "新标题" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("tags 为数组通过", async () => {
      const dto = Object.assign(new UpdateArticleDto(), { tags: ["儒家"] });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("AddRecommendDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new AddRecommendDto(), {
        recommendType: "CIRCLE", targetId: "circle-1",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带可选字段通过", async () => {
      const dto = Object.assign(new AddRecommendDto(), {
        recommendType: "COURSE", targetId: "course-1",
        title: "推荐标题", cover: "https://example.com/cover.jpg", sortOrder: 1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 recommendType 报错", async () => {
      const dto = Object.assign(new AddRecommendDto(), { targetId: "t-1" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺 targetId 报错", async () => {
      const dto = Object.assign(new AddRecommendDto(), { recommendType: "CIRCLE" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
