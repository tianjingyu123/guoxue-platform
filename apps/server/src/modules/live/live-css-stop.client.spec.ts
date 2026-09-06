import { LiveCssStopClient, CssStopTarget } from "./live-css-stop.client";
import { resolveTencentCloudCredentials } from "../../common/tencent-instance-role-credentials";
jest.mock("../../common/tencent-instance-role-credentials", () => ({ resolveTencentCloudCredentials: jest.fn() }));

describe("CSS 停流供应商适配（网络完全替身）", () => {
  const client = new LiveCssStopClient();
  const originalFetch = global.fetch;
  let target: CssStopTarget;
  const fetchMock = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks(); global.fetch = fetchMock;
    (resolveTencentCloudCredentials as jest.Mock).mockResolvedValue({ secretId: "SYNTHETIC_ID", secretKey: "SYNTHETIC_SECRET", securityToken: "SYNTHETIC_TOKEN" });
    target = { roomId: "00000000-0000-4000-8000-000000000001", domain: "push.example.invalid", appName: "live",
      resumeAtMs: Date.now() + 25 * 3600000, exactScopeEnabled: true };
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Response: { RequestId: "synthetic-request-1" } }) });
  });
  afterEach(() => { global.fetch = originalFetch; });
  it("唯一精确目标发送一次，返回 ACK 而不是完成", async () => {
    expect(await client.forbidOnce(target)).toMatchObject({ state: "ACKNOWLEDGED", requestId: "synthetic-request-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://live.tencentcloudapi.com");
    expect(options.redirect).toBe("error");
    expect(options.headers["X-TC-Action"]).toBe("ForbidLiveStream");
    expect(JSON.parse(options.body)).toEqual({ DomainName: target.domain, AppName: "live", StreamName: `room_${target.roomId}`,
      ResumeTime: new Date(target.resumeAtMs).toISOString().replace(/\.\d{3}Z$/, "Z"), Reason: "平台已结束本次直播会话" });
  });
  it("精确范围未经核验不得发送", async () => {
    await expect(client.forbidOnce({ ...target, exactScopeEnabled: false })).rejects.toThrow("CSS_EXACT_SCOPE_NOT_VERIFIED");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([0, NaN, Infinity])("错误恢复时间拒绝发出 %s", async resumeAtMs => {
    await expect(client.forbidOnce({ ...target, resumeAtMs })).rejects.toThrow("RESUME_TIME_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("超出90天拒绝发送", async () => {
    await expect(client.forbidOnce({ ...target, resumeAtMs: Date.now() + 91 * 86400000 })).rejects.toThrow("RESUME_TIME_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ roomId: "room_other" }, { domain: "https://other.invalid/path" }, { appName: "live/other" }])("无效范围不签名不发送", async change => {
    await expect(client.forbidOnce({ ...target, ...change })).rejects.toThrow("TARGET_INVALID");
    expect(resolveTencentCloudCredentials).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("超时错误含敏感值也只返回 UNKNOWN，不重发", async () => {
    fetchMock.mockRejectedValue(new Error("SYNTHETIC_SECRET"));
    expect(await client.forbidOnce(target)).toEqual({ state: "UNKNOWN" }); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    {}, { Response: {} }, { Response: { RequestId: "synthetic-id", Error: { Message: "SYNTHETIC_SECRET" } } },
  ])("缺成功证据或API失败不冒充成功", async payload => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => payload });
    expect(await client.forbidOnce(target)).toEqual({ state: "UNKNOWN" }); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("HTTP失败即使带RequestId也不冒充成功", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ Response: { RequestId: "synthetic-id" } }) });
    expect(await client.forbidOnce(target)).toEqual({ state: "UNKNOWN" });
  });
  it.each(["active", "inactive", "forbid"])("查询保留真实 %s，不把非活跃升级成禁推", async state => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ Response: { RequestId: "synthetic-id", StreamState: state } }) });
    expect(await client.queryState(target)).toMatchObject({ state });
    expect(fetchMock.mock.calls[0][1].headers["X-TC-Action"]).toBe("DescribeLiveStreamState");
  });
  it("查询未知枚举不会当作 offline", async () => {
    expect(await client.queryState(target)).toEqual({ state: "UNKNOWN" });
  });
});
