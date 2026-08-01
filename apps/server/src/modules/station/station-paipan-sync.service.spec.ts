import { BusinessException } from "../../common/business.exception";
import { StationPaipanSyncService } from "./station-paipan-sync.service";

describe("StationPaipanSyncService", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    station: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const service = new StationPaipanSyncService(prisma as any);
  const originalMode = process.env.PAIPAN_LEGACY_MODE;
  const originalBase = process.env.PAIPAN_H5_BASE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAIPAN_LEGACY_MODE = "true";
    process.env.PAIPAN_H5_BASE = "https://www.yrydai.com/guoxueApp.php";
  });

  afterAll(() => {
    if (originalMode === undefined) delete process.env.PAIPAN_LEGACY_MODE;
    else process.env.PAIPAN_LEGACY_MODE = originalMode;
    if (originalBase === undefined) delete process.env.PAIPAN_H5_BASE;
    else process.env.PAIPAN_H5_BASE = originalBase;
  });

  it("按已确认协议生成手机号签名入口", async () => {
    prisma.user.findUnique.mockResolvedValue({
      phone: "13800138000",
      phoneEnc: null,
      attributionStationId: null,
    });

    const result = await service.getUserEntry("user-1");
    const url = new URL(result.url!);

    expect(result.mode).toBe("legacy");
    expect(url.origin + url.pathname).toBe("https://www.yrydai.com/guoxueApp.php");
    expect(url.searchParams.get("mobile")).toBe("13800138000");
    expect(url.searchParams.get("key")).toBe("f4177cf092b81c645b7752e590a9e90a");
    expect(url.searchParams.get("go")).toBe("tool");
  });

  it("未绑定手机号时拒绝进入，避免给第三方创建错误账号", async () => {
    prisma.user.findUnique.mockResolvedValue({
      phone: null,
      phoneEnc: null,
      attributionStationId: null,
    });

    await expect(service.getUserEntry("user-1")).rejects.toBeInstanceOf(BusinessException);
  });

  it("兼容模式关闭时返回自研排盘，不查询用户", async () => {
    process.env.PAIPAN_LEGACY_MODE = "false";
    await expect(service.getUserEntry("user-1")).resolves.toEqual({
      mode: "native",
      url: null,
      attributionReady: true,
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("没有真实分站推广链接时不生成虚假链接", async () => {
    prisma.station.findUnique.mockResolvedValue({
      id: "station-1",
      name: "测试分站",
      paipanLink: null,
    });
    await expect(service.syncStationPaipanLink("station-1")).resolves.toBeNull();
  });
});
