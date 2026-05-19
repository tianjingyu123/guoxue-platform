import { Test } from "@nestjs/testing";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { TencentCallbackGuard } from "../../common/tencent-callback.guard";

const mockVideoSvc = {
  create: jest.fn().mockResolvedValue({ id: "v1", title: "国学讲座" }),
  list: jest.fn().mockResolvedValue([{ id: "v1", title: "国学讲座" }]),
  getDetail: jest.fn().mockResolvedValue({ id: "v1", title: "国学讲座", url: "https://..." }),
  update: jest.fn().mockResolvedValue({ id: "v1", title: "更新标题" }),
  delete: jest.fn().mockResolvedValue({ success: true }),
  toggleLike: jest.fn().mockResolvedValue({ liked: true }),
  getUploadSignature: jest.fn().mockResolvedValue({ signature: "sig123" }),
  getPlaySignature: jest.fn().mockResolvedValue({ psign: "psign123" }),
  pullUpload: jest.fn().mockResolvedValue({ taskId: "t1" }),
  processMedia: jest.fn().mockResolvedValue({ taskId: "t2" }),
  clipVideo: jest.fn().mockResolvedValue({ taskId: "t3" }),
  getMediaInfo: jest.fn().mockResolvedValue({ fileId: "f1", duration: 120 }),
  deleteMedia: jest.fn().mockResolvedValue({ success: true }),
  searchVodMedia: jest.fn().mockResolvedValue([{ fileId: "f1" }]),
  getPlaybackStats: jest.fn().mockResolvedValue({ views: 100 }),
  getPlaybackSummary: jest.fn().mockResolvedValue({ totalViews: 1000 }),
  handleVodCallback: jest.fn(),
  toggleCollect: jest.fn().mockResolvedValue({ collected: true }),
  listCollected: jest.fn().mockResolvedValue([{ id: "v1" }]),
  recordShare: jest.fn().mockResolvedValue({ shares: 5 }),
  addProduct: jest.fn().mockResolvedValue({ id: "vp1" }),
  removeProduct: jest.fn().mockResolvedValue({ success: true }),
};

describe("VideoController", () => {
  let ctrl: VideoController;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [{ provide: VideoService, useValue: mockVideoSvc }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(TencentCallbackGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(VideoController);
  });

  beforeEach(() => { jest.clearAllMocks(); });

  it("POST /videos — 创建视频", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "国学讲座", fileId: "f1" };
    const result: any = await ctrl.create(req, dto);
    expect(result.id).toBe("v1");
    expect(mockVideoSvc.create).toHaveBeenCalledWith("u1", dto);
  });

  it("GET /videos — 视频列表", async () => {
    const q: any = { page: 1, pageSize: 20 };
    const result: any = await ctrl.list(q);
    expect(result).toHaveLength(1);
    expect(mockVideoSvc.list).toHaveBeenCalled();
  });

  it("GET /videos/:id — 视频详情", async () => {
    const result: any = await ctrl.detail("v1");
    expect(result.title).toBe("国学讲座");
    expect(mockVideoSvc.getDetail).toHaveBeenCalledWith("v1");
  });

  it("PUT /videos/:id — 更新视频", async () => {
    const req: any = { user: { id: "u1" } };
    const dto: any = { title: "更新标题" };
    const result: any = await ctrl.update(req, "v1", dto);
    expect(result.title).toBe("更新标题");
    expect(mockVideoSvc.update).toHaveBeenCalledWith("u1", "v1", dto);
  });

  it("DELETE /videos/:id — 删除视频", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.delete(req, "v1");
    expect(result.success).toBe(true);
    expect(mockVideoSvc.delete).toHaveBeenCalledWith("u1", "v1");
  });

  it("POST /videos/:id/like — 点赞/取消点赞视频", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.like("v1", req);
    expect(result.liked).toBe(true);
    expect(mockVideoSvc.toggleLike).toHaveBeenCalledWith("u1", "v1");
  });

  it("POST /videos/vod/upload-signature — 上传签名", async () => {
    const result: any = await ctrl.getUploadSignature();
    expect(result.signature).toBe("sig123");
    expect(mockVideoSvc.getUploadSignature).toHaveBeenCalled();
  });

  it("GET /videos/vod/play-signature/:fileId — 播放签名", async () => {
    const result: any = await ctrl.getPlaySignature("f1", "7200");
    expect(result.psign).toBe("psign123");
    expect(mockVideoSvc.getPlaySignature).toHaveBeenCalledWith("f1", 7200);
  });

  it("POST /videos/vod/pull-upload — URL拉取上传", async () => {
    const dto: any = { urls: ["http://a.mp4"], mediaName: "test" };
    const result: any = await ctrl.pullUpload(dto);
    expect(result.taskId).toBe("t1");
    expect(mockVideoSvc.pullUpload).toHaveBeenCalled();
  });

  it("POST /videos/vod/process/:fileId — 处理媒资", async () => {
    const result: any = await ctrl.processMedia("f1");
    expect(result.taskId).toBe("t2");
    expect(mockVideoSvc.processMedia).toHaveBeenCalledWith("f1", undefined);
  });

  it("POST /videos/vod/clip — 视频剪辑", async () => {
    const dto: any = { fileId: "f1", startTime: 0, endTime: 30 };
    const result: any = await ctrl.clipVideo(dto);
    expect(result.taskId).toBe("t3");
    expect(mockVideoSvc.clipVideo).toHaveBeenCalledWith(dto);
  });

  it("GET /videos/vod/media/:fileId — 媒资信息", async () => {
    const result: any = await ctrl.getMediaInfo("f1");
    expect(result.duration).toBe(120);
    expect(mockVideoSvc.getMediaInfo).toHaveBeenCalledWith("f1");
  });

  it("DELETE /videos/vod/media/:fileId — 删除媒资", async () => {
    const result: any = await ctrl.deleteMedia("f1");
    expect(result.success).toBe(true);
    expect(mockVideoSvc.deleteMedia).toHaveBeenCalledWith("f1");
  });

  it("GET /videos/vod/search — 搜索媒资", async () => {
    const result: any = await ctrl.searchVodMedia("国学", 0, 10);
    expect(result).toHaveLength(1);
    expect(mockVideoSvc.searchVodMedia).toHaveBeenCalled();
  });

  it("GET /videos/vod/playback-stats/:fileId — 播放统计", async () => {
    const q: any = { startDate: "2025-01-01", endDate: "2025-01-31" };
    const result: any = await ctrl.getPlaybackStats("f1", q);
    expect(result.views).toBe(100);
    expect(mockVideoSvc.getPlaybackStats).toHaveBeenCalledWith("f1", q.startDate, q.endDate);
  });

  it("GET /videos/vod/playback-summary — 播放概览", async () => {
    const q: any = { startDate: "2025-01-01", endDate: "2025-01-31" };
    const result: any = await ctrl.getPlaybackSummary(q);
    expect(result.totalViews).toBe(1000);
  });

  it("POST /videos/vod/callback — VOD回调", async () => {
    const body = { eventType: "FileUploadComplete", fileId: "f1" };
    const result: any = await ctrl.vodCallback(body);
    expect(result.code).toBe(0);
    expect(mockVideoSvc.handleVodCallback).toHaveBeenCalledWith(body);
  });

  it("POST /videos/:id/collect — 收藏切换", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.toggleCollect("v1", req);
    expect(result.collected).toBe(true);
    expect(mockVideoSvc.toggleCollect).toHaveBeenCalledWith("u1", "v1");
  });

  it("GET /videos/collected/mine — 我的收藏", async () => {
    const req: any = { user: { id: "u1" } };
    const result: any = await ctrl.listCollected(req, 1 as any, 20 as any);
    expect(result).toHaveLength(1);
    expect(mockVideoSvc.listCollected).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("POST /videos/:id/share — 记录分享", async () => {
    const result: any = await ctrl.recordShare("v1");
    expect(result.shares).toBe(5);
    expect(mockVideoSvc.recordShare).toHaveBeenCalledWith("v1");
  });

  it("POST /videos/:id/products/:productId — 关联商品", async () => {
    const result: any = await ctrl.addProduct("v1", "p1");
    expect(result.id).toBe("vp1");
    expect(mockVideoSvc.addProduct).toHaveBeenCalledWith("v1", "p1");
  });

  it("DELETE /videos/:id/products/:productId — 移除关联", async () => {
    const result: any = await ctrl.removeProduct("v1", "p1");
    expect(result.success).toBe(true);
    expect(mockVideoSvc.removeProduct).toHaveBeenCalledWith("v1", "p1");
  });
});
