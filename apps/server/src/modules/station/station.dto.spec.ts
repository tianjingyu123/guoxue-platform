import "reflect-metadata";
import { validate } from "class-validator";
import { CreateStationDto, UpdateStationDto, CreateOperatorDto } from "./station.dto";

describe("Station DTO 校验", () => {
  describe("CreateStationDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "国学分站", code: "guoxue001" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带可选字段通过", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "国学分站", code: "guoxue001", intro: "介绍", logo: "url", themeColor: "#ff6600" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("name 超长报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "x".repeat(51), code: "gx001" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("code 超长报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "站", code: "x".repeat(31) });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("themeColor 不是合法十六进制颜色报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "站", code: "gx001", themeColor: "not-a-color" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 name 报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { code: "gx001" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 code 报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "站" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("intro 超长报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "站", code: "gx001", intro: "x".repeat(501) });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("带小程序配置通过", async () => {
      const dto = Object.assign(new CreateStationDto(), {
        name: "分站", code: "wx001",
        miniAppId: "wxabc123", mpAppId: "wxmp456",
        miniPages: { home: "pages/index/index", course: "pages/course/list" },
      });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("miniAppId 超长报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "站", code: "gx001", miniAppId: "x".repeat(33) });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("miniPages 非对象报错", async () => {
      const dto = Object.assign(new CreateStationDto(), { name: "站", code: "gx001", miniPages: "not-json" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateStationDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateStationDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("合法字段通过", async () => {
      const dto = Object.assign(new UpdateStationDto(), { name: "新名称", intro: "新介绍", status: "ACTIVE" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("themeColor 非法报错", async () => {
      const dto = Object.assign(new UpdateStationDto(), { themeColor: "invalid" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("CreateOperatorDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new CreateOperatorDto(), { level: "GOLD" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带可选字段通过", async () => {
      const dto = Object.assign(new CreateOperatorDto(), { level: "PLATINUM", containQuota: 100, parentOperatorId: "op-1", expireAt: "2027-01-01" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 level 报错", async () => {
      const dto = Object.assign(new CreateOperatorDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
});
