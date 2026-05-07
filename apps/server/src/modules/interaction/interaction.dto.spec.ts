import "reflect-metadata";
import { validate } from "class-validator";
import { LikeDto, CreateCommentDto, CollectDto, FollowDto, ReportDto, CommentListQueryDto, ReportListQueryDto } from "./interaction.dto";

describe("Interaction DTO 校验", () => {
  describe("LikeDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new LikeDto(), { targetType: "ARTICLE", targetId: "article-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 targetType 报错", async () => {
      const dto = Object.assign(new LikeDto(), { targetId: "article-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 targetId 报错", async () => {
      const dto = Object.assign(new LikeDto(), { targetType: "ARTICLE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CollectDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CollectDto(), { targetType: "ARTICLE", targetId: "art-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("FollowDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new FollowDto(), { followedUserId: "user-2" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 followedUserId 报错", async () => {
      const dto = Object.assign(new FollowDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("ReportDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new ReportDto(), { targetType: "ARTICLE", targetId: "art-1", reason: "违规内容" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 reason 报错", async () => {
      const dto = Object.assign(new ReportDto(), { targetType: "ARTICLE", targetId: "art-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CreateCommentDto (interaction)", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetType: "ARTICLE", targetId: "art-1", content: "好文" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 parentId 通过", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetType: "ARTICLE", targetId: "art-1", content: "回复", parentId: "comment-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 content 报错", async () => {
      const dto = Object.assign(new CreateCommentDto(), { targetType: "ARTICLE", targetId: "art-1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CommentListQueryDto", () => {
    it("空对象通过（所有字段可选）", async () => {
      const dto = Object.assign(new CommentListQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带分页参数通过", async () => {
      const dto = Object.assign(new CommentListQueryDto(), { page: 1, pageSize: 20, targetType: "ARTICLE" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("ReportListQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new ReportListQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
});
