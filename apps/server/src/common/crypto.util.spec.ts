import { encrypt, decrypt, maskPhone, phoneHmac, buildPhoneFields, setDecryptAlertHandler, cryptoSelfTest } from "./crypto.util";

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

  describe("phoneHmac（确定性哈希）", () => {
    it("同手机号恒得同哈希（可等值查询）", () => {
      expect(phoneHmac("13812345678")).toBe(phoneHmac("13812345678"));
    });

    it("不同手机号哈希不同", () => {
      expect(phoneHmac("13812345678")).not.toBe(phoneHmac("13812345679"));
    });

    it("输出为 64 位十六进制（SHA-256）", () => {
      expect(phoneHmac("13812345678")).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("buildPhoneFields（灰度三列同写）", () => {
    it("返回 phone + phoneHash + phoneEnc 三列", () => {
      const f = buildPhoneFields("13812345678");
      expect(f.phone).toBe("13812345678");
      expect(f.phoneHash).toBe(phoneHmac("13812345678"));
      expect(decrypt(f.phoneEnc)).toBe("13812345678");
    });
  });

  describe("decrypt 告警分流 / 加密自检（B2）", () => {
    afterEach(() => setDecryptAlertHandler(() => undefined));

    it("GCM 认证失败（密文被篡改）触发告警回调，仍降级返回原文", () => {
      const alerts: string[] = [];
      setDecryptAlertHandler((t) => alerts.push(t));
      const buf = Buffer.from(encrypt("sensitive-data"), "base64");
      buf[20] ^= 0xff; // 翻转密文体一个字节：长度仍合法但 GCM authTag 校验失败
      const tampered = buf.toString("base64");
      expect(decrypt(tampered)).toBe(tampered); // 兼容降级返回原文
      expect(alerts.length).toBeGreaterThan(0); // 已触发密钥错配告警
    });

    it("非密文格式（明文/短数据）走兼容，不告警", () => {
      let alerted = false;
      setDecryptAlertHandler(() => { alerted = true; });
      expect(decrypt("13812345678")).toBe("13812345678");
      expect(alerted).toBe(false);
    });

    it("cryptoSelfTest 正常往返通过不抛错", () => {
      expect(() => cryptoSelfTest()).not.toThrow();
    });
  });
});
