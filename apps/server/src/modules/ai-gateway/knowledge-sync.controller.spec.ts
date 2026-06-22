import { Test } from "@nestjs/testing";
import { KnowledgeSyncController } from "./knowledge-sync.controller";
import { KnowledgeSyncService } from "./knowledge-sync.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

describe("KnowledgeSyncController", () => {
  let ctrl: KnowledgeSyncController;
  let svc: jest.Mocked<KnowledgeSyncService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [KnowledgeSyncController],
      providers: [
        {
          provide: KnowledgeSyncService,
          useValue: {
            assertCircleOwner: jest.fn(),
            syncCircleKnowledge: jest.fn(),
            autoSyncAll: jest.fn(),
            manuallyAddToKnowledge: jest.fn(),
            removeFromKnowledge: jest.fn(),
            getCandidates: jest.fn(),
            confirmCandidate: jest.fn(),
            rejectCandidate: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(StrictRedisThrottleGuard).useValue({ canActivate: () => true })
      .compile();
    ctrl = mod.get(KnowledgeSyncController);
    svc = mod.get(KnowledgeSyncService) as jest.Mocked<KnowledgeSyncService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 模拟带登录用户的 Express Request
  const req = (userId = "u1") => ({ user: { id: userId } }) as any;

  describe("syncCircle — 同步指定圈子知识库", () => {
    it("调用 service 并返回同步结果", async () => {
      svc.syncCircleKnowledge.mockResolvedValue(5);

      const result = await ctrl.syncCircle(req("u1"), "c1");

      expect(svc.assertCircleOwner).toHaveBeenCalledWith("c1", "u1");
      expect(svc.syncCircleKnowledge).toHaveBeenCalledWith("c1");
      expect(result).toEqual({ circleId: "c1", syncedCount: 5 });
    });

    it("同步结果为 0 时正确返回", async () => {
      svc.syncCircleKnowledge.mockResolvedValue(0);

      const result = await ctrl.syncCircle(req("u1"), "empty");

      expect(result).toEqual({ circleId: "empty", syncedCount: 0 });
    });
  });

  describe("syncAll — 全量同步", () => {
    it("触发全量同步并返回成功消息", async () => {
      svc.autoSyncAll.mockResolvedValue(undefined);

      const result = await ctrl.syncAll();

      expect(svc.autoSyncAll).toHaveBeenCalled();
      expect(result).toEqual({ message: "全量同步已触发" });
    });
  });

  describe("addToKnowledge — 手动添加", () => {
    it("调用 service 添加内容到知识库（操作人取自 req.user.id）", async () => {
      const body = {
        circleId: "c1",
        targetType: "post" as const,
        targetId: "p1",
      };
      svc.manuallyAddToKnowledge.mockResolvedValue({ added: true, message: "已添加到知识库" });

      const result = await ctrl.addToKnowledge(req("u1"), body);

      expect(svc.manuallyAddToKnowledge).toHaveBeenCalledWith(
        "c1",
        "u1",
        "post",
        "p1",
      );
      expect(result.added).toBe(true);
    });
  });

  describe("removeFromKnowledge — 从知识库移除", () => {
    it("调用 service 移除内容（操作人取自 req.user.id）", async () => {
      svc.removeFromKnowledge.mockResolvedValue({ removed: true, message: "已从知识库移除" });

      const result = await ctrl.removeFromKnowledge(req("u1"), "k1", {
        circleId: "c1",
      });

      expect(svc.removeFromKnowledge).toHaveBeenCalledWith("c1", "u1", "k1");
      expect(result.removed).toBe(true);
    });
  });

  describe("getCandidates — 获取候选列表", () => {
    it("不传 status 时传入 undefined", async () => {
      svc.getCandidates.mockResolvedValue([]);

      await ctrl.getCandidates(req("u1"), "c1");

      expect(svc.assertCircleOwner).toHaveBeenCalledWith("c1", "u1");
      expect(svc.getCandidates).toHaveBeenCalledWith("c1", undefined);
    });

    it("传 status 时透传给 service", async () => {
      const fullCandidate = {
        id: "cand1", circleId: "c1", sourceType: "post", sourceId: "p1",
        content: "内容", contentHash: "hash", similarityScore: 0.95,
        similarToId: null, status: "pending", createdAt: new Date(),
      };
      svc.getCandidates.mockResolvedValue([fullCandidate]);

      const result = await ctrl.getCandidates(req("u1"), "c1", "pending");

      expect(svc.getCandidates).toHaveBeenCalledWith("c1", "pending");
      expect(result).toEqual([fullCandidate]);
    });

    it("返回空列表", async () => {
      svc.getCandidates.mockResolvedValue([]);

      const result = await ctrl.getCandidates(req("u1"), "empty", "confirmed");

      expect(result).toEqual([]);
    });
  });

  describe("confirmCandidate — 确认候选内容", () => {
    it("调用 service 确认", async () => {
      svc.confirmCandidate.mockResolvedValue({ confirmed: true, message: "候选项已加入知识库" });

      const result = await ctrl.confirmCandidate("cand1");

      expect(svc.confirmCandidate).toHaveBeenCalledWith("cand1");
      expect(result.confirmed).toBe(true);
    });
  });

  describe("rejectCandidate — 拒绝候选内容", () => {
    it("调用 service 拒绝", async () => {
      svc.rejectCandidate.mockResolvedValue({ rejected: true });

      const result = await ctrl.rejectCandidate("cand1");

      expect(svc.rejectCandidate).toHaveBeenCalledWith("cand1");
      expect(result.rejected).toBe(true);
    });
  });
});
