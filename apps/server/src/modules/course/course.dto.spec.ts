import "reflect-metadata";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import {
  CreateCourseDto, UpdateCourseDto, CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto, CourseListQueryDto, CourseType,
} from "./course.dto";

describe("Course DTO 校验", () => {
  describe("CreateCourseDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateCourseDto(), { title: "论语精讲" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带全部可选字段通过", async () => {
      const dto = Object.assign(new CreateCourseDto(), {
        circleId: "c1", title: "课程", cover: "https://example.com/cover.jpg",
        intro: "简介", type: CourseType.VIDEO, price: 99, originalPrice: 199,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateCourseDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("type 为非法枚举值报错", async () => {
      const dto = Object.assign(new CreateCourseDto(), { title: "课程", type: "INVALID" as any });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateCourseDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateCourseDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("合法 type 通过", async () => {
      const dto = Object.assign(new UpdateCourseDto(), { type: "AUDIO" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("非法 type 报错", async () => {
      const dto = Object.assign(new UpdateCourseDto(), { type: "INVALID" as any });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("CreateChapterDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateChapterDto(), { title: "第一章" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带全部可选字段通过", async () => {
      const dto = Object.assign(new CreateChapterDto(), {
        title: "第一章", content: "内容", mediaUrl: "https://example.com/video.mp4",
        duration: 3600, sortOrder: 1, freeTrial: true,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 title 报错", async () => {
      const dto = Object.assign(new CreateChapterDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateChapterDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateChapterDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("部分更新通过", async () => {
      const dto = Object.assign(new UpdateChapterDto(), { title: "新章节名", sortOrder: 2 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("UpdateProgressDto", () => {
    it("合法进度通过", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { progress: 50 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("进度为 0 通过", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { progress: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 progress 报错", async () => {
      const dto = Object.assign(new UpdateProgressDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("负进度报错", async () => {
      const dto = Object.assign(new UpdateProgressDto(), { progress: -1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("SubmitWorkDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new SubmitWorkDto(), { content: "作业内容" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺 content 报错", async () => {
      const dto = Object.assign(new SubmitWorkDto(), {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("CourseListQueryDto", () => {
    it("空对象通过", async () => {
      const dto = plainToInstance(CourseListQueryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("带分页参数通过", async () => {
      const dto = plainToInstance(CourseListQueryDto, { page: 1, pageSize: 20, circleId: "c1" });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
