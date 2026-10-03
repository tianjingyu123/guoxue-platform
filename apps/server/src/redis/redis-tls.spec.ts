import { buildRedisTlsOptions } from "./redis-tls";

describe("buildRedisTlsOptions", () => {
  it("普通 redis URL 不添加 TLS 配置", () => {
    expect(buildRedisTlsOptions("redis://172.21.0.17:6379")).toBeUndefined();
  });

  it("rediss 保留证书链校验并兼容 CN 精确匹配目标 IP", () => {
    const tls = buildRedisTlsOptions("rediss://:secret@172.21.0.17:6379");
    expect(tls?.rejectUnauthorized).toBe(true);
    const result = tls?.checkServerIdentity?.("172.21.0.17", {
      subject: { CN: "172.21.0.17" },
    } as never);
    expect(result).toBeUndefined();
  });

  it("CN 不匹配时保留标准校验错误", () => {
    const tls = buildRedisTlsOptions("rediss://:secret@172.21.0.17:6379");
    const result = tls?.checkServerIdentity?.("172.21.0.17", {
      subject: { CN: "172.21.0.99" },
    } as never);
    expect(result).toBeTruthy();
    expect(result?.message).toMatch(/certificate|altnames|IP/i);
  });
});
