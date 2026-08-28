import "reflect-metadata";
import { validate } from "class-validator";
import {
  PhoneRegisterDto, PhoneLoginDto, SmsLoginDto,
  SendCodeDto, WechatLoginDto, AppleLoginDto, UpdateProfileDto, ChangePasswordDto,
} from "./auth.dto";

describe("Auth DTO 校验", () => {
  describe("PhoneRegisterDto", () => {
    it("合法输入通过", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", code: "123456", password: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("带 referrerCode 通过", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", code: "123456", password: "Abc12345", referrerCode: "ABC123" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 nickname 报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { phone: "13800138000", code: "123456", password: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("nickname 太短报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张", phone: "13800138000", code: "123456", password: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("nickname 超长报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "x".repeat(21), phone: "13800138000", code: "123456", password: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("password 不满足复杂度要求报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", code: "123456", password: "abc1234" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺 phone 报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), { nickname: "张三", code: "123456", password: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
    it("缺少或伪造注册验证码报错", async () => {
      const missing = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", password: "Abc12345" });
      const malformed = Object.assign(new PhoneRegisterDto(), { nickname: "张三", phone: "13800138000", code: "12345x", password: "Abc12345" });
      expect((await validate(missing)).length).toBeGreaterThan(0);
      expect((await validate(malformed)).length).toBeGreaterThan(0);
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
  describe("AppleLoginDto", () => {
    it("合法 identityToken 通过", async () => {
      const dto = Object.assign(new AppleLoginDto(), { identityToken: "x".repeat(100) });
      expect((await validate(dto)).length).toBe(0);
    });
    it("拒绝缺失或过短的 identityToken", async () => {
      const missing = Object.assign(new AppleLoginDto(), {});
      const short = Object.assign(new AppleLoginDto(), { identityToken: "short" });
      expect((await validate(missing)).length).toBeGreaterThan(0);
      expect((await validate(short)).length).toBeGreaterThan(0);
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
      const dto = Object.assign(new ChangePasswordDto(), { oldPassword: "123456", newPassword: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("缺 oldPassword 通过（首次设置密码可不传·验证码/微信登录用户）", async () => {
      const dto = Object.assign(new ChangePasswordDto(), { newPassword: "Abc12345" });
      const errors = await validate(dto); expect(errors.length).toBe(0);
    });
    it("newPassword 不满足复杂度要求报错", async () => {
      const dto = Object.assign(new ChangePasswordDto(), { oldPassword: "123456", newPassword: "abc1234" });
      const errors = await validate(dto); expect(errors.length).toBeGreaterThan(0);
    });
  });
});
