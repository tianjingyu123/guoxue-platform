import "reflect-metadata";
import { validate } from "class-validator";
import { BaziInputDto, ZiweiInputDto, BaziRecordQueryDto, AnalyzeDto, AnalysisQueryDto } from "./paipan.dto";

describe("Paipan DTO 校验", () => {
  describe("BaziInputDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "男", year: 2000, month: 1, day: 15, hour: 8 });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带可选字段通过", async () => {
      const dto = Object.assign(new BaziInputDto(), { name: "张三", gender: "女", year: 1990, month: 6, day: 15, hour: 14, minute: 30, city: "北京" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("性别非法报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "其他", year: 2000, month: 1, day: 15, hour: 8 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("年份超出范围报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "男", year: 1800, month: 1, day: 15, hour: 8 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("月份超出范围报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "男", year: 2000, month: 13, day: 15, hour: 8 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("小时超出范围报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "男", year: 2000, month: 1, day: 15, hour: 25 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("分钟超出范围报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "男", year: 2000, month: 1, day: 15, hour: 8, minute: 60 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 gender 报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { year: 2000, month: 1, day: 15, hour: 8 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("日超出范围报错", async () => {
      const dto = Object.assign(new BaziInputDto(), { gender: "男", year: 2000, month: 1, day: 32, hour: 8 });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("ZiweiInputDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new ZiweiInputDto(), {
        name: "张三", gender: "男", year: 2000, month: 1, day: 15, hour: 8,
        lunarMonth: 1, lunarDay: 1, lunarHour: "子", lunarYearGan: "甲", lunarYearZhi: "子",
      });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("非法 lunarHour 报错", async () => {
      const dto = Object.assign(new ZiweiInputDto(), {
        name: "张三", gender: "男", year: 2000, month: 1, day: 15, hour: 8,
        lunarMonth: 1, lunarDay: 1, lunarHour: "无效", lunarYearGan: "甲", lunarYearZhi: "子",
      });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("非法 lunarYearGan 报错", async () => {
      const dto = Object.assign(new ZiweiInputDto(), {
        name: "张三", gender: "男", year: 2000, month: 1, day: 15, hour: 8,
        lunarMonth: 1, lunarDay: 1, lunarHour: "子", lunarYearGan: "无效", lunarYearZhi: "子",
      });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("非法 lunarYearZhi 报错", async () => {
      const dto = Object.assign(new ZiweiInputDto(), {
        name: "张三", gender: "男", year: 2000, month: 1, day: 15, hour: 8,
        lunarMonth: 1, lunarDay: 1, lunarHour: "子", lunarYearGan: "甲", lunarYearZhi: "无效",
      });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 name 报错", async () => {
      const dto = Object.assign(new ZiweiInputDto(), {
        gender: "男", year: 2000, month: 1, day: 15, hour: 8,
        lunarMonth: 1, lunarDay: 1, lunarHour: "子", lunarYearGan: "甲", lunarYearZhi: "子",
      });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("性别非法报错", async () => {
      const dto = Object.assign(new ZiweiInputDto(), {
        name: "张三", gender: "其他", year: 2000, month: 1, day: 15, hour: 8,
        lunarMonth: 1, lunarDay: 1, lunarHour: "子", lunarYearGan: "甲", lunarYearZhi: "子",
      });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("BaziRecordQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new BaziRecordQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
  describe("AnalyzeDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new AnalyzeDto(), { recordId: "rec-1" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 recordId 报错", async () => {
      const dto = Object.assign(new AnalyzeDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("AnalysisQueryDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new AnalysisQueryDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
  });
});
