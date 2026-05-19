import { Test } from "@nestjs/testing";
import { AdminDedupController } from "./admin-dedup.controller";
import { AdminDedupService } from "./admin-dedup.service";
import {
  DedupCandidateQueryDto,
  DedupDecideDto,
  DedupBatchDto,
} from "./dto/admin-dedup.dto";

describe("AdminDedupController", () => {
  let ctrl: AdminDedupController;
  let svc: jest.Mocked<AdminDedupService>;

  const mockReq = { user: { id: "u1", nickname: "管理员" } } as any;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AdminDedupController],
      providers: [
        {
          provide: AdminDedupService,
          useValue: {
            listCandidates: jest.fn(),
            getCandidate: jest.fn(),
            decide: jest.fn(),
            batchDecide: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(AdminDedupController);
    svc = mod.get(AdminDedupService) as jest.Mocked<AdminDedupService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listCandidates — 全局候选列表", () => {
    it("调用 service.listCandidates 并返回分页结果", async () => {
      const query: DedupCandidateQueryDto = { page: 1, pageSize: 20 };
      svc.listCandidates.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      const result = await ctrl.listCandidates(query);

      expect(svc.listCandidates).toHaveBeenCalledWith(query);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("携带全部过滤条件", async () => {
      const query: DedupCandidateQueryDto = {
        page: 1,
        pageSize: 10,
        status: "pending",
        circleId: "c1",
        minSimilarity: 0.8,
      };
      svc.listCandidates.mockResolvedValue({
        items: [{
          id: "cand1", circleId: "c1", sourceType: "post", sourceId: "p1",
          content: "内容", contentHash: "hash", similarityScore: 0.85,
          similarToId: "target1", status: "pending", createdAt: new Date(),
          decisions: [],
        }],
        total: 1,
        page: 1,
        pageSize: 10,
      });

      const result = await ctrl.listCandidates(query);

      expect(svc.listCandidates).toHaveBeenCalledWith(query);
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe("cand1");
    });
  });

  describe("getCandidate — 候选详情", () => {
    it("返回包含疑似重复目标的详情", async () => {
      svc.getCandidate.mockResolvedValue({
        id: "cand1",
        similarTarget: { id: "target1", content: "重复内容", sourceType: "post" },
        decisions: [],
      } as any);

      const result = await ctrl.getCandidate("cand1");

      expect(svc.getCandidate).toHaveBeenCalledWith("cand1");
      expect(result.id).toBe("cand1");
      expect(result.similarTarget.id).toBe("target1");
    });
  });

  describe("decide — 去重决策", () => {
    it("调用 service.decide 并传入决策者和原因", async () => {
      svc.decide.mockResolvedValue({
        id: "record1",
        decidedAt: new Date(),
        candidateId: "cand1",
        decision: "keepBoth",
        decidedBy: "管理员",
        reason: "都保留",
      });

      const dto: DedupDecideDto = { decision: "keepBoth", reason: "都保留" };
      const result = await ctrl.decide("cand1", dto, mockReq);

      expect(svc.decide).toHaveBeenCalledWith("cand1", "keepBoth", "管理员", "都保留");
      expect(result.decision).toBe("keepBoth");
      expect(result.decidedBy).toBe("管理员");
    });

    it("nickname 不存在时 fallback 到 id", async () => {
      svc.decide.mockResolvedValue({
        id: "record2",
        decidedAt: new Date(),
        candidateId: "cand1",
        decision: "override",
        decidedBy: "u1",
        reason: null,
      });

      const reqNoNick = { user: { id: "u1" } } as any;
      const dto: DedupDecideDto = { decision: "override" };

      await ctrl.decide("cand1", dto, reqNoNick);

      expect(svc.decide).toHaveBeenCalledWith("cand1", "override", "u1", undefined);
    });
  });

  describe("batchDecide — 批量审核", () => {
    it("调用 service.batchDecide 并返回处理结果", async () => {
      svc.batchDecide.mockResolvedValue({
        processed: 2,
        results: [
          { candidateId: "c1", decision: "keepBoth", ok: true },
          { candidateId: "c2", decision: "override", ok: true },
        ],
      });

      const dto: DedupBatchDto = {
        items: [
          { candidateId: "c1", decision: "keepBoth" },
          { candidateId: "c2", decision: "override" },
        ],
      };

      const result = await ctrl.batchDecide(dto, mockReq);

      expect(svc.batchDecide).toHaveBeenCalledWith(dto, "管理员");
      expect(result.processed).toBe(2);
      expect(result.results[0].ok).toBe(true);
    });
  });

  describe("getStats — 去重统计", () => {
    it("调用 service.getStats", async () => {
      svc.getStats.mockResolvedValue({
        total: 100,
        pending: 30,
        confirmed: 70,
        rejected: 0,
        distribution: { high: 10, medium: 20, low: 40 },
      });

      const result = await ctrl.getStats();

      expect(svc.getStats).toHaveBeenCalled();
      expect(result.total).toBe(100);
      expect(result.distribution.high).toBe(10);
    });
  });
});
