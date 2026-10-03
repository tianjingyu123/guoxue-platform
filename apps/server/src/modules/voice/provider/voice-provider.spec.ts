import { createVoiceProvider } from "./voice-provider.registry";
import { MockXiaozhiProvider, MOCK_SIGNATURE_HEADER } from "./mock-xiaozhi.provider";
import { UnavailableXiaozhiProvider, VOICE_NOT_OPEN_MESSAGE } from "./unavailable-xiaozhi.provider";
import { IssueSessionRequest, VoiceProviderError } from "./voice-provider.types";
import * as fs from "fs";
import * as path from "path";

const baseReq = (over: Partial<IssueSessionRequest> = {}): IssueSessionRequest => ({
  correlationId: "req-1",
  idempotencyKey: "issue:s1",
  agentRef: "xiaobu",
  userRef: "u_abc",
  scene: "report_dialogue",
  context: { scene: "report_dialogue", topic: "t", facts: {}, version: "v1", redactions: [] },
  maxSeconds: 180,
  tier: "lite",
  timeoutMs: 1000,
  ...over,
});

describe("供应商注册表", () => {
  it("默认（未配置）是暂未开放，不是模拟", () => {
    const p = createVoiceProvider({} as any);
    expect(p).toBeInstanceOf(UnavailableXiaozhiProvider);
    expect(p.isMock).toBe(false);
  });

  it("生产环境拒绝模拟供应商，回退为暂未开放", () => {
    const p = createVoiceProvider({ XIAOBU_VOICE_PROVIDER: "mock", NODE_ENV: "production" } as any);
    expect(p).toBeInstanceOf(UnavailableXiaozhiProvider);
  });

  it("非生产环境可启用模拟供应商", () => {
    const p = createVoiceProvider({ XIAOBU_VOICE_PROVIDER: "mock", NODE_ENV: "development" } as any);
    expect(p).toBeInstanceOf(MockXiaozhiProvider);
    expect(p.isMock).toBe(true);
  });

  it("配置 xiaozhi 时不假装已接通：真实适配器未实现，仍是暂未开放并在运营说明里写明", async () => {
    const p = createVoiceProvider({ XIAOBU_VOICE_PROVIDER: "xiaozhi" } as any);
    const probe = await p.probe();
    expect(probe.available).toBe(false);
    expect(probe.opsNote).toMatch(/尚未实现/);
  });

  it("未知配置值回退为暂未开放", () => {
    expect(createVoiceProvider({ XIAOBU_VOICE_PROVIDER: "coze" } as any)).toBeInstanceOf(UnavailableXiaozhiProvider);
  });
});

describe("UnavailableXiaozhiProvider", () => {
  const p = new UnavailableXiaozhiProvider();

  it("能力全部 unknown，不可开始，给用户能看懂的说明", async () => {
    const probe = await p.probe();
    expect(probe.available).toBe(false);
    expect(probe.userMessage).toBe(VOICE_NOT_OPEN_MESSAGE);
    expect(Object.values(probe.capabilities).every((v) => v === "unknown")).toBe(true);
    // 面向用户的说明不暴露供应商名
    expect(probe.userMessage).not.toMatch(/小智|xiaozhi|Coze/i);
  });

  it("签发抛 UNAVAILABLE 且不可重试", async () => {
    await expect(p.issueSession()).rejects.toMatchObject({ code: "UNAVAILABLE", retryable: false });
  });

  it("拒绝任何用量回调", () => {
    expect(() => p.parseUsageCallback()).toThrow(VoiceProviderError);
  });
});

describe("MockXiaozhiProvider", () => {
  it("所有签发结果标注 isMock，且不下发任何凭据", async () => {
    const p = new MockXiaozhiProvider();
    const r = await p.issueSession(baseReq());
    expect(r.isMock).toBe(true);
    expect(r.clientCredential).toBeNull();
    expect(r.providerSessionId).toMatch(/^mock-/);
  });

  it("同一幂等键重复签发返回同一模拟会话", async () => {
    const p = new MockXiaozhiProvider();
    const a = await p.issueSession(baseReq());
    const b = await p.issueSession(baseReq());
    expect(b.providerSessionId).toBe(a.providerSessionId);
    const c = await p.issueSession(baseReq({ idempotencyKey: "issue:s2" }));
    expect(c.providerSessionId).not.toBe(a.providerSessionId);
  });

  it("可模拟签发失败与超时（超时标记为可重试）", async () => {
    const p = new MockXiaozhiProvider();
    p.behave({ issueError: "REJECTED" });
    await expect(p.issueSession(baseReq())).rejects.toMatchObject({ code: "REJECTED", retryable: false });
    p.behave({ issueError: "TIMEOUT" });
    await expect(p.issueSession(baseReq())).rejects.toMatchObject({ code: "TIMEOUT", retryable: true });
  });

  it("结束未签发过的会话被拒绝", async () => {
    const p = new MockXiaozhiProvider();
    await expect(p.endSession({ providerSessionId: "mock-x", correlationId: "c", idempotencyKey: "k", reason: "r", timeoutMs: 1 })).rejects.toMatchObject({ code: "REJECTED" });
  });

  it("回调签名校验：自己签的能过；篡改正文或换签名都拒绝", () => {
    const p = new MockXiaozhiProvider();
    const cb = p.buildCallback({ eventId: "e1", providerSessionId: "mock-1", usedSeconds: 42 });
    const [ev] = p.parseUsageCallback(cb.headers, cb.rawBody);
    expect(ev).toMatchObject({ eventId: "e1", usedSeconds: 42, isMock: true, answerCompleteness: "unknown" });

    const tampered = Buffer.from(cb.rawBody.toString().replace("42", "4200"));
    expect(() => p.parseUsageCallback(cb.headers, tampered)).toThrow(/签名/);
    expect(() => p.parseUsageCallback({ [MOCK_SIGNATURE_HEADER]: "00" }, cb.rawBody)).toThrow(/签名/);
    // 另一个实例（另一次启动）的密钥不同：签名不能跨实例复用
    const other = new MockXiaozhiProvider();
    expect(() => other.parseUsageCallback(cb.headers, cb.rawBody)).toThrow(/签名/);
  });

  it("回调没给时长时 usedSeconds 为 null，不补 0", () => {
    const p = new MockXiaozhiProvider();
    const cb = p.buildCallback({ eventId: "e2", providerSessionId: "mock-1", usedSeconds: null });
    expect(p.parseUsageCallback(cb.headers, cb.rawBody)[0].usedSeconds).toBeNull();
  });

  it("模拟器不宣称支持真实商业才能回答的能力", async () => {
    const probe = await new MockXiaozhiProvider().probe();
    expect(probe.capabilities.userIdentityToMcp).toBe("unknown");
    expect(probe.capabilities.agentConfigPush).toBe("unknown");
    expect(probe.capabilities.deviceBinding).toBe("unknown");
    expect(probe.capabilities.audioRecording).toBe("unsupported");
  });
});

describe("代码里没有硬编码的测试令牌或虚构生产地址", () => {
  it("provider 目录源码不含 token 字面量与 http(s) 地址", () => {
    const dir = __dirname;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"));
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      expect(src).not.toMatch(/https?:\/\//);
      expect(src).not.toMatch(/test[-_]?token/i);
      expect(src).not.toMatch(/Bearer\s+[A-Za-z0-9]/);
    }
  });
});
