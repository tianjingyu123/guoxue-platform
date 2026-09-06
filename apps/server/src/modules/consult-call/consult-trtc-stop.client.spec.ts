import { ConsultTrtcStopClient, ConsultTrtcStopTarget } from "./consult-trtc-stop.client";
import { resolveTencentCloudCredentials } from "../../common/tencent-instance-role-credentials";

jest.mock("../../common/tencent-instance-role-credentials", () => ({ resolveTencentCloudCredentials: jest.fn() }));
describe("咨询移出供应商适配器（本地替身，绝不发送真实请求）", () => {
  const originalFetch = global.fetch, client = new ConsultTrtcStopClient();
  const requestId = "a76ae9ed-1098-4410-8968-d9c803abf237";
  const target = (): ConsultTrtcStopTarget => ({ sdkAppId: 1400000001, rtcRoomId: "consult_0123456789abcdef",
    region: "ap-beijing", userIds: [`c_${"a".repeat(30)}`, `c_${"b".repeat(30)}`] });
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveTencentCloudCredentials as jest.Mock).mockResolvedValue({ secretId: "SYNTHETIC_ID", secretKey: "SYNTHETIC_KEY" });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ Response: { RequestId: requestId } }) });
  });
  afterEach(() => { global.fetch = originalFetch; });
  it("一次调用绑定官方动作、地域、原房间与两个映射身份，仅返回ACK", async () => {
    const input = target(), result = await client.removeOnce(input);
    expect(result).toEqual({ state: "ACKNOWLEDGED", requestId, receivedAt: expect.any(String) });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("https://trtc.tencentcloudapi.com");
    expect(options.headers).toMatchObject({ "X-TC-Action": "RemoveUserByStrRoomId", "X-TC-Version": "2019-07-22", "X-TC-Region": "ap-beijing" });
    expect(JSON.parse(options.body)).toEqual({ SdkAppId: input.sdkAppId, RoomId: input.rtcRoomId, UserIds: input.userIds });
    expect(options.redirect).toBe("error"); expect(JSON.stringify(result)).not.toContain("SYNTHETIC");
  });
  it("凭据等待期间传入对象变化不改变请求范围", async () => {
    let release!: (v: object) => void;
    (resolveTencentCloudCredentials as jest.Mock).mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const input = target(), old = JSON.parse(JSON.stringify(input)), pending = client.removeOnce(input);
    input.sdkAppId = 2; input.rtcRoomId = "consult_aaaaaaaaaaaaaaaa"; input.userIds[0] = `c_${"c".repeat(30)}`; input.region = "ap-guangzhou";
    release({ secretId: "SYNTHETIC_ID", secretKey: "SYNTHETIC_KEY" }); await pending;
    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(options.body)).toEqual({ SdkAppId: old.sdkAppId, RoomId: old.rtcRoomId, UserIds: old.userIds });
    expect(options.headers["X-TC-Region"]).toBe("ap-beijing");
  });
  it.each([
    { sdkAppId: 0 }, { sdkAppId: 1.5 }, { sdkAppId: 4294967296 }, { region: "ap-shanghai" },
    { rtcRoomId: "other_room" }, { userIds: [] }, { userIds: ["raw-user", "raw-user2"] },
    { userIds: [`c_${"a".repeat(30)}`, `c_${"a".repeat(30)}`] },
  ])("错误目标在取凭据/网络请求之前拒绝 %#", async patch => {
    await expect(client.removeOnce({ ...target(), ...patch } as ConsultTrtcStopTarget)).rejects.toThrow("CONSULT_TRTC_STOP_TARGET_INVALID");
    expect(resolveTencentCloudCredentials).not.toHaveBeenCalled(); expect(global.fetch).not.toHaveBeenCalled();
  });
  it.each([
    {}, null, { Response: [] }, { Response: { RequestId: "bad" } },
    { Response: { RequestId: requestId, Error: { Code: "FailedOperation.RoomNotExist", Message: "SYNTHETIC_SECRET" } } },
  ])("非可信响应只记UNKNOWN而不是完成 %#", async body => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => body });
    expect(await client.removeOnce(target())).toEqual({ state: "UNKNOWN" }); expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it("网络异常不重试且不外传原始错误", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("SYNTHETIC_SECRET"));
    expect(await client.removeOnce(target())).toEqual({ state: "UNKNOWN" }); expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it("HTTP失败和JSON解析失败不重试", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => { throw new Error("SYNTHETIC_SECRET"); } });
    expect(await client.removeOnce(target())).toEqual({ state: "UNKNOWN" });
    expect(await client.removeOnce(target())).toEqual({ state: "UNKNOWN" }); expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
