import { BusinessException } from "../../common/business.exception";
import { PaipanRuntimeService } from "../../common/paipan-runtime.service";
import { StationPaipanSyncService } from "./station-paipan-sync.service";

describe("StationPaipanSyncService", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    station: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn(), findFirst: jest.fn() },
  };
  const service = new StationPaipanSyncService(prisma as any, new PaipanRuntimeService());
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAIPAN_MODE = "legacy";
    process.env.PAIPAN_LEGACY_DISPLAY_VERSION = "1";
    process.env.PAIPAN_OPERATION_H5_BASE = "https://www.yrydai.cn/guoxueApp.php";
    process.env.PAIPAN_REFERRAL_BASE = "https://www.yrydai.com/p1.php";
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("普通入口由服务端生成且固定携带 tool 与 v=1", async () => {
    prisma.user.findUnique.mockResolvedValue({
      phone: "13000000000",
      phoneEnc: null,
      attributionStationId: null,
    });
    const result = await service.getUserEntry("user-1");
    const url = new URL(result.url!);
    expect(result.mode).toBe("legacy");
    expect(url.origin + url.pathname).toBe("https://www.yrydai.cn/guoxueApp.php");
    expect(url.searchParams.get("go")).toBe("tool");
    expect(url.searchParams.get("v")).toBe("1");
    expect(url.searchParams.get("key")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("个人中心使用 go=my 且不擅自追加 v", async () => {
    prisma.user.findUnique.mockResolvedValue({
      phone: "13000000000",
      phoneEnc: null,
      attributionStationId: null,
    });
    const url = new URL((await service.getUserAccountEntry("user-1")).url!);
    expect(url.searchParams.get("go")).toBe("my");
    expect(url.searchParams.has("v")).toBe(false);
  });

  it("未绑定手机号时只返回中文业务错误", async () => {
    prisma.user.findUnique.mockResolvedValue({
      phone: null,
      phoneEnc: null,
      attributionStationId: null,
    });
    await expect(service.getUserEntry("user-1")).rejects.toBeInstanceOf(BusinessException);
  });

  it("native 模式保留自研排盘且不查询用户", async () => {
    process.env.PAIPAN_MODE = "native";
    await expect(service.getUserEntry("user-1")).resolves.toEqual({
      mode: "native",
      url: null,
      attributionReady: true,
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("分站入口严格使用站长已保存的旧 userid", async () => {
    prisma.station.findFirst.mockResolvedValue({
      paipanUserId: "24680",
      paipanLink: "https://www.yrydai.com/p1.php?ruid=24680",
    });
    const result = await service.getStationEntry("station-1");
    expect(new URL(result.url!).searchParams.get("ruid")).toBe("24680");
  });

  it("已有旧用户的合伙人同步可重试并持久化映射", async () => {
    prisma.station.findFirst.mockResolvedValue({
      id: "station-1",
      userId: "owner-1",
      paipanLink: null,
      paipanUserId: null,
      user: { phone: "13000000000", phoneEnc: null },
    });
    const responses = [
      { status: "1", userid: "24680" },
      { status: "1" },
      { status: "1", userid: "24680" },
    ];
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(responses.shift()),
    })) as any;
    await expect(service.syncStationPaipanLink("station-1")).resolves.toContain("ruid=24680");
    expect(prisma.station.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paipanUserId: "24680" }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detail: JSON.stringify({ state: "SYNCED", code: "PARTNER_CONFIRMED" }),
        }),
      }),
    );
  });

  it("旧用户不存在时标记待授权，不伪造 userid 或推荐链接", async () => {
    prisma.station.findFirst.mockResolvedValue({
      id: "station-1",
      userId: "owner-1",
      paipanLink: null,
      paipanUserId: null,
      user: { phone: "13000000000", phoneEnc: null },
    });
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "0" }),
    })) as any;
    await expect(service.syncStationPaipanLink("station-1")).resolves.toBeNull();
    expect(prisma.station.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detail: JSON.stringify({ state: "PENDING_AUTHORIZATION", code: "REMOTE_USER_NOT_FOUND" }),
        }),
      }),
    );
  });
});
