import { Test } from "@nestjs/testing";
import { CircleKnowledgeController } from "./circle-knowledge.controller";
import { CircleKnowledgeService } from "./circle-knowledge.service";

describe("CircleKnowledgeController", () => {
  let ctrl: CircleKnowledgeController;
  let svc: jest.Mocked<CircleKnowledgeService>;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [CircleKnowledgeController],
      providers: [
        {
          provide: CircleKnowledgeService,
          useValue: {
            assertManager: jest.fn(),
            add: jest.fn(),
            list: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            listCandidates: jest.fn(),
            confirmCandidate: jest.fn(),
            rejectCandidate: jest.fn(),
          },
        },
      ],
    }).compile();
    ctrl = mod.get(CircleKnowledgeController);
    svc = mod.get(CircleKnowledgeService) as jest.Mocked<CircleKnowledgeService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockReq = (userId = "u1") => ({ user: { id: userId } }) as any;
  const knowledgeItem = {
    id: "k1", circleId: "c1", sourceType: "manual", sourceId: null as string | null,
    content: "国学知识", contentHash: "abc123", vectorJson: null as string | null,
    status: "active",
    similarityScore: null as number | null, similarToId: null as string | null,
    addedBy: "u1", addedAt: new Date(),
    createdAt: new Date(), updatedAt: new Date(),
    scope: "circle" as string, qualityScore: null as number | null,
    chunkIndex: null as number | null, parentChunkId: null as string | null,
  };

  describe("addKnowledge", () => {
    it("校验管理员后调用 service.add", async () => {
      svc.add.mockResolvedValue(knowledgeItem);
      const result = await ctrl.addKnowledge("c1", { sourceType: "manual", content: "国学知识" }, mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.add).toHaveBeenCalledWith({
        circleId: "c1",
        sourceType: "manual",
        sourceId: undefined,
        content: "国学知识",
        addedBy: "u1",
      });
      expect(result).toEqual(knowledgeItem);
    });

    it("带 sourceId 参数透传", async () => {
      svc.add.mockResolvedValue(knowledgeItem);
      await ctrl.addKnowledge("c1", { sourceType: "article", sourceId: "art1", content: "引用知识" }, mockReq("u1"));
      expect(svc.add).toHaveBeenCalledWith({
        circleId: "c1",
        sourceType: "article",
        sourceId: "art1",
        content: "引用知识",
        addedBy: "u1",
      });
    });
  });

  describe("listKnowledge", () => {
    const knowledgeList = { items: [knowledgeItem], total: 1, page: 1, pageSize: 20, totalPages: 1 };

    it("获取知识库列表，默认分页", async () => {
      svc.list.mockResolvedValue(knowledgeList);
      const result = await ctrl.listKnowledge("c1", mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.list).toHaveBeenCalledWith("c1", { page: 1, pageSize: 20, sourceType: undefined });
      expect(result).toEqual(knowledgeList);
    });

    it("带分页和 sourceType 筛选", async () => {
      svc.list.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 10, totalPages: 0 });
      await ctrl.listKnowledge("c1", mockReq("u1"), 2, 10, "article");
      expect(svc.list).toHaveBeenCalledWith("c1", { page: 2, pageSize: 10, sourceType: "article" });
    });

    it("分页参数字符串转换", async () => {
      svc.list.mockResolvedValue({ items: [], total: 0, page: 3, pageSize: 15, totalPages: 0 });
      await ctrl.listKnowledge("c1", mockReq("u1"), "3" as any, "15" as any);
      expect(svc.list).toHaveBeenCalledWith("c1", { page: 3, pageSize: 15, sourceType: undefined });
    });

    it("空列表返回空数组", async () => {
      svc.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      const result = await ctrl.listKnowledge("c1", mockReq("u1"));
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("updateKnowledge", () => {
    it("更新知识条目内容", async () => {
      svc.update.mockResolvedValue({ ...knowledgeItem, content: "更新后的内容" });
      const result = await ctrl.updateKnowledge("c1", "k1", { content: "更新后的内容" }, mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.update).toHaveBeenCalledWith("c1", "k1", "更新后的内容");
      expect(result.content).toBe("更新后的内容");
    });
  });

  describe("removeKnowledge", () => {
    it("删除知识条目", async () => {
      svc.remove.mockResolvedValue({ ...knowledgeItem, status: "removed" });
      const result = await ctrl.removeKnowledge("c1", "k1", mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.remove).toHaveBeenCalledWith("c1", "k1", "u1");
      expect(result.status).toBe("removed");
    });
  });

  describe("listCandidates", () => {
    const candidates = {
      items: [{ id: "cand1", circleId: "c1", sourceType: "auto", sourceId: null as string | null,
        content: "候选知识", contentHash: "def456",
        similarityScore: null as number | null, similarToId: null as string | null,
        status: "pending", createdAt: new Date(), updatedAt: new Date() }],
      total: 1, page: 1, pageSize: 20, totalPages: 1,
    };

    it("获取候选知识列表，默认分页", async () => {
      svc.listCandidates.mockResolvedValue(candidates);
      const result = await ctrl.listCandidates("c1", mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.listCandidates).toHaveBeenCalledWith("c1", 1, 20);
      expect(result).toEqual(candidates);
    });

    it("自定义分页参数", async () => {
      svc.listCandidates.mockResolvedValue({ items: [], total: 0, page: 3, pageSize: 50, totalPages: 0 });
      await ctrl.listCandidates("c1", mockReq("u1"), 3, 50);
      expect(svc.listCandidates).toHaveBeenCalledWith("c1", 3, 50);
    });

    it("空候选列表", async () => {
      svc.listCandidates.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      const result = await ctrl.listCandidates("c1", mockReq("u1"));
      expect(result.items).toEqual([]);
    });
  });

  describe("confirmCandidate", () => {
    it("确认候选条目入库", async () => {
      const updatedCandidate = {
        id: "cand1", circleId: "c1", sourceType: "auto", sourceId: null as string | null,
        content: "候选知识", contentHash: "def456",
        similarityScore: null as number | null, similarToId: null as string | null,
        status: "confirmed", createdAt: new Date(), updatedAt: new Date(),
      };
      svc.confirmCandidate.mockResolvedValue(updatedCandidate);
      const result = await ctrl.confirmCandidate("c1", "cand1", mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.confirmCandidate).toHaveBeenCalledWith("c1", "cand1", "u1");
      expect(result.status).toBe("confirmed");
    });
  });

  describe("rejectCandidate", () => {
    it("拒绝候选条目", async () => {
      const rejectedCandidate = {
        id: "cand1", circleId: "c1", sourceType: "auto", sourceId: null as string | null,
        content: "候选知识", contentHash: "def456",
        similarityScore: null as number | null, similarToId: null as string | null,
        status: "rejected", createdAt: new Date(), updatedAt: new Date(),
      };
      svc.rejectCandidate.mockResolvedValue(rejectedCandidate);
      const result = await ctrl.rejectCandidate("c1", "cand1", mockReq("u1"));
      expect(svc.assertManager).toHaveBeenCalledWith("c1", "u1");
      expect(svc.rejectCandidate).toHaveBeenCalledWith("c1", "cand1");
      expect(result.status).toBe("rejected");
    });
  });
});
