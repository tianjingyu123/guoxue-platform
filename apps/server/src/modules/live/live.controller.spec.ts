import { Test } from "@nestjs/testing";
import { LiveController } from "./live.controller";
import { LiveService } from "./live.service";
import { LiveQualityService } from "./live-quality.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";
import { TrtcCallbackGuard } from "../../common/trtc-callback.guard";
import { FeatureFlagGuard } from "../../common/feature-flag.guard";
import { ThrottleGuard } from "../../common/throttle.guard";

const mockLiveSvc = {
  createRoom: jest.fn().mockResolvedValue({ id: "r1", title: "国学直播" }),
  listRooms: jest.fn().mockResolvedValue([{ id: "r1", title: "国学直播" }]),
  listCourseRooms: jest.fn().mockResolvedValue([{ id: "r1", courseId: "c1" }]),
  getRoom: jest.fn().mockResolvedValue({ id: "r1", title: "国学直播", status: "LIVE" }),
  getWatchContext: jest.fn().mockResolvedValue({
    room: { id: "r1", status: "LIVING", allowGift: true },
    viewer: { canComment: true, canLike: true, canGift: true },
    interaction: { allowComment: true, allowLike: true, allowGift: true },
    online: { count: 1, avatars: [] },
  }),
  listComments: jest.fn().mockResolvedValue({ comments: [], total: 0, page: 1, pageSize: 20 }),
  touchPresence: jest.fn().mockResolvedValue({ onlineCount: 1, firstVisit: true }),
  leavePresence: jest.fn().mockResolvedValue({ onlineCount: 0 }),
  updateRoom: jest.fn().mockResolvedValue({ id: "r1", title: "更新标题" }),
  updateRoomProducts: jest.fn().mockResolvedValue({ success: true, count: 2, productIds: ["p2", "p1"] }),
  featureRoomProduct: jest.fn().mockResolvedValue({ featuredProductId: "p1" }),
  startLive: jest.fn().mockResolvedValue({ pushUrl: "rtmp://...", playUrl: "https://..." }),
  startObsLive: jest.fn().mockResolvedValue({ id: "r1", status: "LIVING" }),
  getStreamUrls: jest.fn().mockResolvedValue({ pushUrl: "rtmp://...", playUrl: "https://..." }),
  getStreamStatus: jest.fn().mockResolvedValue({ roomId: "r1", roomStatus: "WAITING", status: "online" }),
  getPlayUrl: jest.fn().mockResolvedValue({ playUrl: "https://...flv" }),
  endRoom: jest.fn().mockResolvedValue({ id: "r1", status: "ENDED" }),
  updateStatus: jest.fn().mockResolvedValue({ id: "r1", status: "REPLAY" }),
  publishReplay: jest.fn().mockResolvedValue({ id: "r1", status: "REPLAY", replayStatus: "PUBLISHED" }),
  unpublishReplay: jest.fn().mockResolvedValue({ id: "r1", status: "ENDED", replayStatus: "DRAFT" }),
  deleteRoom: jest.fn().mockResolvedValue({ success: true }),
  joinMic: jest.fn().mockResolvedValue({ position: 1, userId: "u1" }),
  leaveMic: jest.fn().mockResolvedValue({ success: true }),
  manageMic: jest.fn().mockResolvedValue({ success: true }),
  listMics: jest.fn().mockResolvedValue([{ position: 1, userId: "u1" }]),
  getRtcConfig: jest.fn().mockResolvedValue({ sdkAppId: 1600030106, strRoomId: "room_r1" }),
  markHostReady: jest.fn().mockResolvedValue({ active: true, streamMode: "MIXED" }),
  markHostNotReady: jest.fn().mockResolvedValue({ active: false, streamMode: "ORIGIN" }),
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
  flashSaleOrder: jest.fn().mockRejectedValue(new Error("直播专属秒杀即将开放")),
  endFlashSale: jest.fn().mockResolvedValue({ id: "fs1", status: "ENDED" }),
  listFlashSales: jest.fn().mockResolvedValue([{ id: "fs1" }]),
  handleLiveEvent: jest.fn(),
  handleTrtcEvent: jest.fn(),
  handleAuditCallback: jest.fn().mockResolvedValue({ success: true }),
  listAuditLogs: jest.fn().mockResolvedValue([{ id: "log1", result: "PASS" }]),
  getGiftSpendingPreference: jest.fn().mockResolvedValue({ configured: false, eligible: true }),
  updateGiftSpendingPreference: jest.fn().mockResolvedValue({ configured: true, eligible: true }),
  giftRanking: jest.fn().mockResolvedValue([]),
  getStreamerSettings: jest.fn().mockResolvedValue({ profile: { name: "直播间" } }),
  saveStreamerSettings: jest.fn().mockResolvedValue({ success: true }),
  getHosts: jest.fn().mockResolvedValue({ items: [] }),
  getPreview: jest.fn().mockResolvedValue({ id: "r1", isBooked: true }),
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
      .overrideGuard(TrtcCallbackGuard).useValue({ canActivate: () => true })
      .overrideGuard(FeatureFlagGuard).useValue({ canActivate: () => true })
      .overrideGuard(ThrottleGuard).useValue({ canActivate: () => true })
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
    expect(mockLiveSvc.listRooms).toHaveBeenCalledWith("LIVE", 1, 20, undefined, undefined, undefined, undefined);
  });

  it("GET /live/rooms — 按课程过滤", async () => {
    const result: any = await ctrl.listRooms(undefined, "c1", undefined, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockLiveSvc.listCourseRooms).toHaveBeenCalledWith("c1", 1, 20, undefined);
  });

  it("GET /live/rooms?followed=1 — 透传当前登录用户", async () => {
    const req: any = { user: { id: "viewer1", roles: [] } };
    await ctrl.listRooms(undefined, undefined, undefined, 1 as any, 20 as any, undefined, undefined, req, "1");
    expect(mockLiveSvc.listRooms).toHaveBeenCalledWith(
      undefined, 1, 20, undefined, undefined, undefined, "viewer1",
    );
  });

  it("PUT /live/settings — 保存主播设置", async () => {
    const req: any = { user: { id: "u1" } };
    const body = { profile: { name: "新直播间" }, notify: { reward: true } };
    const result: any = await ctrl.saveStreamerSettings(req, body);
    expect(result.success).toBe(true);
    expect(mockLiveSvc.saveStreamerSettings).toHaveBeenCalledWith("u1", body);
  });

  it("GET /live/hosts — 可选登录身份透传已关注筛选", async () => {
    const req: any = { user: { id: "viewer1" } };
    await ctrl.getHosts("followed", req);
    expect(mockLiveSvc.getHosts).toHaveBeenCalledWith("followed", "viewer1");
  });

  it("GET /live/preview/:id — 可选登录身份透传预约状态", async () => {
    const req: any = { user: { id: "viewer1" } };
    await ctrl.getPreview("r1", req);
    expect(mockLiveSvc.getPreview).toHaveBeenCalledWith("r1", "viewer1");
  });

  it("GET /live/rooms/:id — 直播间详情", async () => {
    const result: any = await ctrl.getRoom("r1", { user: undefined } as any);
    expect(result.status).toBe("LIVE");
  });

  it("GET /live/rooms/:id/comments — 可选登录身份透传直播公屏", async () => {
    const req: any = { user: { id: "viewer1" } };
    const result: any = await ctrl.listComments("r1", req, 1 as any, 100 as any);
    expect(result.total).toBe(0);
    expect(mockLiveSvc.listComments).toHaveBeenCalledWith("r1", "viewer1", 1, 100);
  });

  it("GET /live/rooms/:id/watch-context — 返回服务端互动能力契约", async () => {
    const result: any = await ctrl.getWatchContext("r1", { user: { id: "viewer1" } } as any);
    expect(result.viewer.canComment).toBe(true);
    expect(result.online.avatars).toEqual([]);
    expect(mockLiveSvc.getWatchContext).toHaveBeenCalledWith("r1", "viewer1");
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
    const req: any = { user: { id: "admin1", roles: ["OPERATION_ADMIN"] } };
    const result: any = await ctrl.setReplay("r1", { replayUrl: "https://example.com/replay.mp4" }, req);
    expect(result.status).toBe("REPLAY");
    expect(mockLiveSvc.publishReplay).toHaveBeenCalledWith("r1", "https://example.com/replay.mp4", "admin1");
  });

  it("PUT /live/rooms/:id/replay/unpublish — 下架回放但保留录像草稿", async () => {
    const req: any = { user: { id: "admin1", roles: ["OPERATION_ADMIN"] } };
    const result: any = await ctrl.unpublishReplay("r1", req);
    expect(result).toEqual(expect.objectContaining({ status: "ENDED", replayStatus: "DRAFT" }));
    expect(mockLiveSvc.unpublishReplay).toHaveBeenCalledWith("r1", "admin1");
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
    const req: any = { user: { id: "host1", roles: [] } };
    const dto: any = { action: "MUTE", position: 1 };
    const result: any = await ctrl.manageMic("r1", req, dto);
    expect(result.success).toBe(true);
    expect(mockLiveSvc.manageMic).toHaveBeenCalledWith("r1", "host1", dto, false);
  });

  it("PUT /live/rooms/:id/featured-product — 设置讲解商品", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    const result: any = await ctrl.featureRoomProduct(req, "r1", "p1");
    expect(result.featuredProductId).toBe("p1");
    expect(mockLiveSvc.featureRoomProduct).toHaveBeenCalledWith("host1", "r1", "p1", false);
  });

  it("PUT /live/rooms/:id/presence — 游客心跳透传会话", async () => {
    const req: any = {};
    const dto = { clientSessionId: "live-session-0001" };
    await expect(ctrl.touchPresence("r1", dto, req)).resolves.toEqual({ onlineCount: 1, firstVisit: true });
    expect(mockLiveSvc.touchPresence).toHaveBeenCalledWith("r1", dto.clientSessionId, undefined);
  });

  it("POST /live/rooms/:id/presence/leave — 登录用户离房透传身份", async () => {
    const req: any = { user: { id: "viewer1" } };
    const dto = { clientSessionId: "live-session-0001" };
    await expect(ctrl.leavePresence("r1", dto, req)).resolves.toEqual({ onlineCount: 0 });
    expect(mockLiveSvc.leavePresence).toHaveBeenCalledWith("r1", dto.clientSessionId, "viewer1");
  });

  it("GET /live/rooms/:id/mics — 麦位列表", async () => {
    const req: any = { user: { id: "u1", roles: [] } };
    const result: any = await ctrl.listMics("r1", req);
    expect(result).toHaveLength(1);
    expect(mockLiveSvc.listMics).toHaveBeenCalledWith("r1", "u1", false);
  });

  it("GET /live/rooms/:id/rtc-config — 获取临时连麦票据", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.getRtcConfig("r1", req);
    expect(result.sdkAppId).toBe(1600030106);
    expect(mockLiveSvc.getRtcConfig).toHaveBeenCalledWith("r1", "u1");
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
    const result: any = await ctrl.getBookingCount("r1", {} as any);
    expect(result.count).toBe(50);
    expect(mockLiveSvc.getBookingCount).toHaveBeenCalledWith("r1", undefined);
  });

  it("GET /live/rooms/:id/muted-users — 房主读取禁言名单", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    await ctrl.listMutedUsers("r1", req);
    expect(mockLiveSvc.listMutedUsers).toHaveBeenCalledWith("r1", "host1", false);
  });

  it("GET /live/rooms/:id/muted-users — 管理员权限透传到服务层", async () => {
    const req: any = { user: { id: "admin1", roles: ["OPERATION_ADMIN"] } };
    await ctrl.listMutedUsers("r1", req);
    expect(mockLiveSvc.listMutedUsers).toHaveBeenCalledWith("r1", "admin1", true);
  });

  it("GET /live/rooms/:id/gift-ranking — 仅向服务层透传主播或管理员身份", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    await ctrl.giftRanking("r1", req);
    expect(mockLiveSvc.giftRanking).toHaveBeenCalledWith("r1", "host1", false);

    const adminReq: any = { user: { id: "admin1", roles: ["OPERATION_ADMIN"] } };
    await ctrl.giftRanking("r1", adminReq);
    expect(mockLiveSvc.giftRanking).toHaveBeenCalledWith("r1", "admin1", true);
  });

  it("GET/PUT /live/gift-spending-preference — 只操作当前用户的消费保护设置", async () => {
    const req: any = { user: { id: "viewer1", roles: [] } };
    await ctrl.getGiftSpendingPreference(req);
    expect(mockLiveSvc.getGiftSpendingPreference).toHaveBeenCalledWith("viewer1");

    const dto = { singleLimitCoin: 100, dailyLimitCoin: 500, reminderEnabled: true };
    await ctrl.updateGiftSpendingPreference(req, dto);
    expect(mockLiveSvc.updateGiftSpendingPreference).toHaveBeenCalledWith("viewer1", dto);
  });

  it("DELETE /live/rooms/:id/mute/:userId — 解除禁言", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    await ctrl.unmuteUser("r1", "u1", req);
    expect(mockLiveSvc.unmuteUser).toHaveBeenCalledWith("r1", "u1", "host1", false);
  });

  it("POST /live/callback — 腾讯云回调", async () => {
    const body = {
      event_type: 1,
      stream_id: "room_r1",
      stream_param: "txSecret=secret&txTime=12345678",
    };
    const result: any = await ctrl.handleCallback(body);
    expect(result.code).toBe(0);
    expect(mockLiveSvc.handleLiveEvent).toHaveBeenCalledWith("room_r1", 1, body);
  });

  it("POST /live/callback — 兼容 StreamName，并且不让 stream_param 覆盖真实流名", async () => {
    const body = {
      event_type: 0,
      StreamName: "room_r2",
      stream_param: "txSecret=secret&txTime=12345678",
    };
    await ctrl.handleCallback(body);
    expect(mockLiveSvc.handleLiveEvent).toHaveBeenCalledWith("room_r2", 0, body);
  });

  it("POST /live/trtc/callback — TRTC 房间与媒体回调", async () => {
    const body = { EventGroupId: 2, EventType: 201, EventInfo: { RoomId: "room_r1", UserId: "u_1" } };
    const result: any = await ctrl.handleTrtcCallback(body);
    expect(result.code).toBe(0);
    expect(mockLiveSvc.handleTrtcEvent).toHaveBeenCalledWith(body);
  });

  it("PUT/DELETE /live/rooms/:id/host/ready — 主播统一输出租约", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    await expect(ctrl.markHostReady("r1", req)).resolves.toEqual({ active: true, streamMode: "MIXED" });
    await expect(ctrl.markHostNotReady("r1", req)).resolves.toEqual({ active: false, streamMode: "ORIGIN" });
    expect(mockLiveSvc.markHostReady).toHaveBeenCalledWith("r1", "host1");
    expect(mockLiveSvc.markHostNotReady).toHaveBeenCalledWith("r1", "host1");
  });

  it("GET /live/rooms/:id/stream-status — 主播读取真实推流态", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    const result: any = await ctrl.getStreamStatus("r1", req);
    expect(result.status).toBe("online");
    expect(mockLiveSvc.getStreamStatus).toHaveBeenCalledWith("r1", "host1", false);
  });

  it("PUT /live/rooms/:id/start-obs — OBS 验流后开播", async () => {
    const req: any = { user: { id: "host1", roles: [] } };
    const result: any = await ctrl.startObsRoom("r1", req);
    expect(result.status).toBe("LIVING");
    expect(mockLiveSvc.startObsLive).toHaveBeenCalledWith("r1", "host1", false);
  });

  it("POST /live/audit/callback — 审核回调", async () => {
    const body = { room_id: "r1", screenshot_url: "https://...", suggestion: "pass" };
    const result: any = await ctrl.handleAuditCallback(body);
    expect(result.success).toBe(true);
  });
});
