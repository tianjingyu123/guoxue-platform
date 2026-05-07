import { validate } from "class-validator";
import { PhoneRegisterDto, PhoneLoginDto, ChangePasswordDto } from "../src/modules/auth/auth.dto";

describe("Auth DTO 校验", () => {
  describe("PhoneRegisterDto", () => {
    it("完整且合法的输入校验通过", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), {
        nickname: "张三",
        phone: "13800138000",
        password: "123456",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("昵称不足2字报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), {
        nickname: "张",
        phone: "13800138000",
        password: "123456",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("nickname");
    });

    it("密码不足6位报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), {
        nickname: "张三",
        phone: "13800138000",
        password: "12345",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("password");
    });

    it("缺昵称报错", async () => {
      const dto = Object.assign(new PhoneRegisterDto(), {
        phone: "13800138000",
        password: "123456",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("PhoneLoginDto", () => {
    it("合法输入校验通过", async () => {
      const dto = Object.assign(new PhoneLoginDto(), {
        phone: "13800138000",
        password: "123456",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("缺手机号报错", async () => {
      const dto = Object.assign(new PhoneLoginDto(), { password: "123456" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("缺密码报错", async () => {
      const dto = Object.assign(new PhoneLoginDto(), { phone: "13800138000" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("ChangePasswordDto", () => {
    it("合法输入校验通过", async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        oldPassword: "abcdef",
        newPassword: "123456",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("新密码不足6位报错", async () => {
      const dto = Object.assign(new ChangePasswordDto(), {
        oldPassword: "abcdef",
        newPassword: "12345",
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("newPassword");
    });
  });
});
