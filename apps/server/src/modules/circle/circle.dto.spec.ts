import "reflect-metadata";
import { validate } from "class-validator";
import {
  CreateCircleDto, UpdateCircleDto, CreatePostDto,
  JoinCircleDto, UpdateMemberRoleDto, ListPostQueryDto,
} from "./circle.dto";

describe("Circle DTO 校验", () => {
  describe("CreateCircleDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateCircleDto(), {
        name: "国学交流圈", intro: "欢迎加入国学交流圈，一起探讨经典文化", tags: ["国学", "经典"], type: "FREE",
      });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带付费信息通过", async () => {
      const dto = Object.assign(new CreateCircleDto(), {
        name: "VIP圈子", intro: "付费圈子，包含独家内容", tags: ["VIP"], type: "YEARLY", price: 99, depositAmount: 10,
      });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("name 太短报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "圈", intro: "x".repeat(10), tags: ["tag"], type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("name 超长报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "x".repeat(31), intro: "x".repeat(10), tags: ["tag"], type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("intro 太短报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "国学圈", intro: "短", tags: ["tag"], type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("intro 超长报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "国学圈", intro: "x".repeat(501), tags: ["tag"], type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 tags 报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "国学圈", intro: "简介内容至少十个字", type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 type 报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "国学圈", intro: "简介内容至少十个字", tags: ["tag"] });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 name 报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { intro: "简介内容至少十个字", tags: ["tag"], type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("tags 不是数组报错", async () => {
      const dto = Object.assign(new CreateCircleDto(), { name: "国学圈", intro: "简介内容至少十个字", tags: "not-array", type: "FREE" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateCircleDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateCircleDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("合法字段通过", async () => {
      const dto = Object.assign(new UpdateCircleDto(), { name: "新名称", price: 199 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("name 太短报错", async () => {
      const dto = Object.assign(new UpdateCircleDto(), { name: "1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CreatePostDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreatePostDto(), { type: "TEXT", content: "发帖内容" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("图文帖通过", async () => {
      const dto = Object.assign(new CreatePostDto(), { type: "IMAGE", content: "图片描述", images: ["url1", "url2"], title: "标题" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带全部可选字段通过", async () => {
      const dto = Object.assign(new CreatePostDto(), { type: "VIDEO", content: "视频描述", title: "标题", images: ["url"], videoUrl: "v-url", fileUrl: "f-url", linkUrl: "l-url" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 type 报错", async () => {
      const dto = Object.assign(new CreatePostDto(), { content: "内容" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 content 报错", async () => {
      const dto = Object.assign(new CreatePostDto(), { type: "TEXT" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("JoinCircleDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new JoinCircleDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带推荐人通过", async () => {
      const dto = Object.assign(new JoinCircleDto(), { referrerId: "user-2" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("UpdateMemberRoleDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new UpdateMemberRoleDto(), { role: "ADMIN" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 role 报错", async () => {
      const dto = Object.assign(new UpdateMemberRoleDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("ListPostQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new ListPostQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带筛选参数通过", async () => {
      const dto = Object.assign(new ListPostQueryDto(), { type: "TEXT", isEssence: "true", page: 1, pageSize: 20 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
});
