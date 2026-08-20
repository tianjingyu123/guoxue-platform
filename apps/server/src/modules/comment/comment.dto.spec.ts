import "reflect-metadata";
import { validate } from "class-validator";
import { CreateCommentDto, CommentQueryDto } from "./comment.dto";

describe("Comment DTO 校验", () => {
  describe("CreateCommentDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetType: "ARTICLE", targetId: "art-1", content: "好文章" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 parentId 通过", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetType: "ARTICLE", targetId: "art-1", content: "回复", parentId: "comment-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 targetType 报错", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetId: "art-1", content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 content 报错", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetType: "ARTICLE", targetId: "art-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CommentQueryDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CommentQueryDto(), { targetType: "ARTICLE", targetId: "art-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带分页参数通过", async () => {
      const dto = Object.assign(new CommentQueryDto(), { targetType: "ARTICLE", targetId: "art-1", page: 2, pageSize: 50 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("pageSize 超 100 报错", async () => {
      const dto = Object.assign(new CommentQueryDto(), { targetType: "ARTICLE", targetId: "art-1", pageSize: 200 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("page 小于 1 报错", async () => {
      const dto = Object.assign(new CommentQueryDto(), { targetType: "ARTICLE", targetId: "art-1", page: 0 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 targetType 报错，禁止无范围读取评论", async () => {
      const dto = Object.assign(new CommentQueryDto(), { targetId: "art-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
});
