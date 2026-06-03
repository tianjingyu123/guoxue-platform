import { encrypt, decrypt, maskPhone } from "./crypto.util";

// 确保 serverConfig.encryptionKey 为 32 字节
process.env.ENCRYPTION_KEY = "abcdefghijklmnopqrstuvwxyz123456"; // 32 chars

describe("crypto.util", () => {
  describe("encrypt / decrypt", () => {
    it("加密后解密得到原文", () => {
      const original = "Hello 国学平台";
      const encrypted = encrypt(original);
      expect(encrypted).not.toBe(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it("每次加密结果不同（IV随机）", () => {
      const e1 = encrypt("test");
      const e2 = encrypt("test");
      expect(e1).not.toBe(e2);
      // 两者都能正确解密
      expect(decrypt(e1)).toBe("test");
      expect(decrypt(e2)).toBe("test");
    });

    it("加密中文内容", () => {
      const encrypted = encrypt("论语学而篇");
      expect(decrypt(encrypted)).toBe("论语学而篇");
    });

    it("解密损坏数据返回原文（降级兼容）", () => {
      const result = decrypt("not-valid-base64!!!");
      expect(result).toBe("not-valid-base64!!!");
    });

    it("解密空字符串", () => {
      expect(decrypt("")).toBe("");
    });
  });

  describe("maskPhone", () => {
    it("标准手机号脱敏", () => {
      expect(maskPhone("13812345678")).toBe("138****5678");
    });

    it("短号码不脱敏", () => {
      expect(maskPhone("12345")).toBe("12345");
    });

    it("null返回空字符串", () => {
      expect(maskPhone(null)).toBe("");
    });

    it("11位手机号正确处理", () => {
      expect(maskPhone("18888888888")).toBe("188****8888");
    });
  });
});
