import "reflect-metadata";
import { validate } from "class-validator";
import {
  PhoneRegisterDto, PhoneLoginDto, SmsLoginDto,
  SendCodeDto, WechatLoginDto, UpdateProfileDto, ChangePasswordDto,
} from "./auth.dto";

describe("Auth DTO 校验", () => {
  describe("PhoneRegisterDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 referrerCode 通过", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", password: "123456", referrerCode: "ABC123" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 nickname 报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { phone: "13800138000", password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("nickname 太短报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张", phone: "13800138000", password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("nickname 超长报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "x".repeat(21), phone: "13800138000", password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("password 太短报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", password: "12345" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 phone 报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("PhoneLoginDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new PhoneLoginDto(), { phone: "13800138000", password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 phone 报错", async () => {
      const dto = Object.assign(new PhoneLoginDto(), { password: "123456" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 password 报错", async () => {
      const dto = Object.assign(new PhoneLoginDto(), { phone: "13800138000" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("SmsLoginDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new SmsLoginDto(), { phone: "13800138000", code: "123456" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 referrerCode 通过", async () => {
      const dto = Object.assign(new SmsLoginDto(), { phone: "13800138000", code: "123456", referrerCode: "ABC" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 code 报错", async () => {
      const dto = Object.assign(new SmsLoginDto(), { phone: "13800138000" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("SendCodeDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new SendCodeDto(), { phone: "13800138000" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 phone 报错", async () => {
      const dto = Object.assign(new SendCodeDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("WechatLoginDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new WechatLoginDto(), { code: "wechat-code" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 referrerCode 通过", async () => {
      const dto = Object.assign(new WechatLoginDto(), { code: "wechat-code", referrerCode: "ABC" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 code 报错", async () => {
      const dto = Object.assign(new WechatLoginDto(), {});
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("UpdateProfileDto", () => {
    it("空对象通过", async () => {
      const dto = Object.assign(new UpdateProfileDto(), {});
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("完整字段通过", async () => {
      const dto = Object.assign(new UpdateProfileDto(), { nickname: "新昵称", avatar: "url", gender: 1, birthday: "1990-01-01" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("nickname 太短报错", async () => {
      const dto = Object.assign(new UpdateProfileDto(), { nickname: "1" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("nickname 超长报错", async () => {
      const dto = Object.assign(new UpdateProfileDto(), { nickname: "x".repeat(21) });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
  describe("ChangePasswordDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new ChangePasswordDto(), { oldPassword: "123456", newPassword: "654321" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 oldPassword 报错", async () => {
      const dto = Object.assign(new ChangePasswordDto(), { newPassword: "654321" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("newPassword 太短报错", async () => {
      const dto = Object.assign(new ChangePasswordDto(), { oldPassword: "123456", newPassword: "12345" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
});
