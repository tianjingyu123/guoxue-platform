import { Test } from "@nestjs/testing";
import { LiveController } from "./live.controller";
import { LiveService } from "./live.service";
import { LiveQualityService } from "./live-quality.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";

const mockLiveSvc = {
  createRoom: jest.fn().mockResolvedValue({ id: "r1", title: "国学直播" }),
  listRooms: jest.fn().mockResolvedValue([{ id: "r1", title: "国学直播" }]),
  listCourseRooms: jest.fn().mockResolvedValue([{ id: "r1", courseId: "c1" }]),
  getRoom: jest.fn().mockResolvedValue({ id: "r1", title: "国学直播", status: "LIVE" }),
  updateRoom: jest.fn().mockResolvedValue({ id: "r1", title: "更新标题" }),
  updateRoomProducts: jest.fn().mockResolvedValue({ success: true, count: 2, productIds: ["p2", "p1"] }),
  startLive: jest.fn().mockResolvedValue({ pushUrl: "rtmp://...", playUrl: "https://..." }),
  getStreamUrls: jest.fn().mockResolvedValue({ pushUrl: "rtmp://...", playUrl: "https://..." }),
  getPlayUrl: jest.fn().mockResolvedValue({ playUrl: "https://...flv" }),
  endRoom: jest.fn().mockResolvedValue({ id: "r1", status: "ENDED" }),
  updateStatus: jest.fn().mockResolvedValue({ id: "r1", status: "REPLAY" }),
  deleteRoom: jest.fn().mockResolvedValue({ success: true }),
  joinMic: jest.fn().mockResolvedValue({ position: 1, userId: "u1" }),
  leaveMic: jest.fn().mockResolvedValue({ success: true }),
  manageMic: jest.fn().mockResolvedValue({ success: true }),
  listMics: jest.fn().mockResolvedValue([{ position: 1, userId: "u1" }]),
  listScheduled: jest.fn().mockResolvedValue([{ id: "r1", startTime: new Date() }]),
  bookRoom: jest.fn().mockResolvedValue({ booked: true }),
  unbookRoom: jest.fn().mockResolvedValue({ booked: false }),
  getBookingCount: jest.fn().mockResolvedValue({ count: 50 }),
  addSlide: jest.fn().mockResolvedValue({ id: "s1", url: "https://..." }),
  removeSlide: jest.fn().mockResolvedValue({ success: true }),
  listSlides: jest.fn().mockResolvedValue([{ id: "s1", url: "https://..." }]),
  muteUser: jest.fn().mockResolvedValue({ muted: true }),
  unmuteUser: jest.fn().mockResolvedValue({ muted: false }),
  listMutedUsers: jest.fn().mockResolvedValue([]),
  createFlashSale: jest.fn().mockResolvedValue({ id: "fs1", productId: "p1" }),
  startFlashSale: jest.fn().mockResolvedValue({ id: "fs1", status: "ACTIVE" }),
  flashSaleOrder: jest.fn().mockResolvedValue({ orderId: "o1" }),
  endFlashSale: jest.fn().mockResolvedValue({ id: "fs1", status: "ENDED" }),
  listFlashSales: jest.fn().mockResolvedValue([{ id: "fs1" }]),
  handleLiveEvent: jest.fn(),
  handleAuditCallback: jest.fn().mockResolvedValue({ success: true }),
  listAuditLogs: jest.fn().mockResolvedValue([{ id: "log1", result: "PASS" }]),
  giftRanking: jest.fn().mockResolvedValue([]),
};

const mockQualitySvc = {
  listPackages: jest.fn().mockResolvedValue([{ id: "p1", quality: "hd" }]),
  getQuota: jest.fn().mockResolvedValue({ hdMinutes: 600, uhdMinutes: 0 }),
  listRecords: jest.fn().mockResolvedValue({ records: [], total: 0 }),
  purchasePackage: jest.fn().mockResolvedValue({ hdMinutes: 1200, uhdMinutes: 0 }),
};

describe("LiveController", () => {
  let ctrl: LiveController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [LiveController],
      providers: [
        { provide: LiveService, useValue: mockLiveSvc },
        { provide: LiveQualityService, useValue: mockQualitySvc },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .overrideGuard(TencentCallbackGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(LiveController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /live/rooms — 创建直播间", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "国学直播" };
    const result: any = await ctrl.createRoom(req, dto);
    expect(result.title).toBe("国学直播");
    expect(mockLiveSvc.createRoom).toHaveBeenCalledWith("u1", dto, false);
  });

  it("GET /live/rooms — 直播列表", async () => {
    const result: any = await ctrl.listRooms("LIVE", undefined, undefined, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    // 末位 undefined = scope（非管理员不生效·公共池过滤在 service 层）
    expect(mockLiveSvc.listRooms).toHaveBeenCalledWith("LIVE", 1, 20, undefined, undefined, undefined);
  });

  it("GET /live/rooms — 按课程过滤", async () => {
    const result: any = await ctrl.listRooms(undefined, "c1", undefined, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockLiveSvc.listCourseRooms).toHaveBeenCalledWith("c1", 1, 20, undefined);
  });

  it("GET /live/rooms/:id — 直播间详情", async () => {
    const result: any = await ctrl.getRoom("r1", { user: undefined } as any);
    expect(result.status).toBe("LIVE");
  });

  it("PUT /live/rooms/:id — 更新直播间", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "更新标题" };
    const result: any = await ctrl.updateRoom(req, "r1", dto);
    expect(result.title).toBe("更新标题");
  });

  it("PUT /live/rooms/:id/products — 房主保存商品顺序", async () => {
    const req: any = { user: { id: "u1", roles: [] } };
    const result: any = await ctrl.updateRoomProducts(req, "r1", { productIds: ["p2", "p1"] });
    expect(result.count).toBe(2);
    expect(mockLiveSvc.updateRoomProducts).toHaveBeenCalledWith("u1", "r1", ["p2", "p1"], false);
  });

  it("PUT /live/rooms/:id/products — 管理员权限标记透传 service", async () => {
    const req: any = { user: { id: "admin1", roles: ["OPERATION_ADMIN"] } };
    await ctrl.updateRoomProducts(req, "r1", { productIds: [] });
    expect(mockLiveSvc.updateRoomProducts).toHaveBeenCalledWith("admin1", "r1", [], true);
  });

  it("PUT /live/rooms/:id/start — 房主开播（登录即可·房主/管理员校验下沉 service）", async () => {
    const req: any = { user: { id: "u1", roles: [] } };
    const result: any = await ctrl.startRoom("r1", req);
    expect(result.pushUrl).toBeTruthy();
    expect(mockLiveSvc.startLive).toHaveBeenCalledWith("r1", "u1", false);
  });

  it("PUT /live/rooms/:id/start — 管理员开播（isAdmin=true 透传）", async () => {
    const req: any = { user: { id: "admin1", roles: ["SUPER_ADMIN"] } };
    await ctrl.startRoom("r1", req);
    expect(mockLiveSvc.startLive).toHaveBeenCalledWith("r1", "admin1", true);
  });

  it("GET /live/rooms/:id/stream-urls — 推拉流地址", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getStreamUrls("r1", req);
    expect(result.pushUrl).toBeTruthy();
  });

  it("GET /live/rooms/:id/play-url — 观众拉流", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.playUrl("r1", req);
    expect(result.playUrl).toBeTruthy();
  });

  it("PUT /live/rooms/:id/end — 房主结束直播（校验下沉 service）", async () => {
    const req: any = { user: { id: "u1", roles: [] } };
    const result: any = await ctrl.endRoom("r1", req);
    expect(result.status).toBe("ENDED");
    expect(mockLiveSvc.endRoom).toHaveBeenCalledWith("r1", "u1", false);
  });

  it("PUT /live/rooms/:id/replay — 设置回放", async () => {
    const result: any = await ctrl.setReplay("r1", "https://...replay.mp4");
    expect(result.status).toBe("REPLAY");
  });

  it("DELETE /live/rooms/:id — 删除直播间", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.deleteRoom(req, "r1");
    expect(result.success).toBe(true);
  });

  it("POST /live/rooms/:id/mics — 上麦", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { position: 1 };
    const result: any = await ctrl.joinMic("r1", req, dto);
    expect(result.position).toBe(1);
  });

  it("DELETE /live/rooms/:id/mics/:userId — 下麦", async () => {
    const req: any = { user: { id: "admin1" } };
    const result: any = await ctrl.leaveMic("r1", "u1", req);
    expect(result.success).toBe(true);
  });

  it("PUT /live/rooms/:id/mics/manage — 麦位管理", async () => {
    const req: any = { user: { id: "admin1" } };
    const dto: any = { action: "MUTE", position: 1 };
    const result: any = await ctrl.manageMic("r1", req, dto);
    expect(result.success).toBe(true);
  });

  it("GET /live/rooms/:id/mics — 麦位列表", async () => {
    const result: any = await ctrl.listMics("r1");
    expect(result).toHaveLength(1);
  });

  it("GET /live/scheduled — 直播预告", async () => {
    const result: any = await ctrl.listScheduled(1 as any, 10 as any);
    expect(result).toHaveLength(1);
  });

  it("POST /live/rooms/:id/book — 预约直播", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.bookRoom("r1", req);
    expect(result.booked).toBe(true);
  });

  it("DELETE /live/rooms/:id/book — 取消预约", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.unbookRoom("r1", req);
    expect(result.booked).toBe(false);
  });

  it("GET /live/rooms/:id/bookings — 预约人数", async () => {
    const result: any = await ctrl.getBookingCount("r1");
    expect(result.count).toBe(50);
  });

  it("POST /live/callback — 腾讯云回调", async () => {
    const body = { event_type: 1, stream_param: "r1" };
    const result: any = await ctrl.handleCallback(body);
    expect(result.code).toBe(0);
    expect(mockLiveSvc.handleLiveEvent).toHaveBeenCalled();
  });

  it("POST /live/audit/callback — 审核回调", async () => {
    const body = { room_id: "r1", screenshot_url: "https://...", suggestion: "pass" };
    const result: any = await ctrl.handleAuditCallback(body);
    expect(result.success).toBe(true);
  });
});
