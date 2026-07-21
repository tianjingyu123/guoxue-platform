import { Test } from "@nestjs/testing";
import { SettlementRuleAdminService } from "./settlement-rule-admin.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { FundApprovalService } from "../fund-approval/fund-approval.service";

const mockPrisma = {
  settlementRule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockApprovals = {
  create: jest.fn(),
};

const VALID_SPLITS = [
  { role: "PROVIDER", rate: 0.8, basis: "GROSS", category: "SERVICE" },
  { role: "PLATFORM", rate: 0.2, basis: "GROSS", category: "PLATFORM" },
];

function createDto(overrides: Record<string, unknown> = {}) {
  return {
    scene: "TEST_SCENE",
    splits: VALID_SPLITS,
    bufferDays: 7,
    requireApproval: true,
    approvalThreshold: 2000,
    remark: "单测规则",
    ...overrides,
  } as any;
}

describe("SettlementRuleAdminService", () => {
  let svc: SettlementRuleAdminService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        SettlementRuleAdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FundApprovalService, useValue: mockApprovals },
      ],
    }).compile();
    svc = mod.get(SettlementRuleAdminService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listRules", () => {
    it("按 scene 排序返回 { items } 全量列表", async () => {
      mockPrisma.settlementRule.findMany.mockResolvedValue([{ id: "r1", scene: "QUESTION" }]);
      const result = await svc.listRules();
      expect(result.items).toHaveLength(1);
      expect(mockPrisma.settlementRule.findMany).toHaveBeenCalledWith({ orderBy: { scene: "asc" } });
    });
  });

  describe("fund approval requests", () => {
    it("创建申请只提交审批，审批前不写真实结算规则", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null);
      mockApprovals.create.mockResolvedValue({ submitted: true, approvalId: "a1", status: "PENDING" });

      const result = await svc.requestCreateRule(createDto(), "admin-1");

      expect(result.submitted).toBe(true);
      expect(mockApprovals.create).toHaveBeenCalledWith(expect.objectContaining({
        type: "COMMISSION_CONFIG",
        requestedBy: "admin-1",
        payload: expect.objectContaining({ method: "createSettlementRule", scene: "TEST_SCENE" }),
      }));
      expect(mockPrisma.settlementRule.create).not.toHaveBeenCalled();
    });

    it("修改/启停申请只提交审批，并把真实场景带给审批中心", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({ id: "r1", scene: "QUESTION" });
      mockApprovals.create.mockResolvedValue({ submitted: true, approvalId: "a2", status: "PENDING" });

      await svc.requestUpdateRule("r1", { enabled: false } as any, "admin-2");

      expect(mockApprovals.create).toHaveBeenCalledWith(expect.objectContaining({
        requestedBy: "admin-2",
        payload: { method: "updateSettlementRule", id: "r1", scene: "QUESTION", dto: { enabled: false } },
      }));
      expect(mockPrisma.settlementRule.update).not.toHaveBeenCalled();
    });

    it("非法分账比例在进入审批队列前即拒绝", async () => {
      const dto = createDto({
        splits: [
          { role: "PROVIDER", rate: 0.8, basis: "GROSS", category: "SERVICE" },
          { role: "PLATFORM", rate: 0.3, basis: "GROSS", category: "PLATFORM" },
        ],
      });
      await expect(svc.requestCreateRule(dto, "admin-1")).rejects.toThrow(/超过 1/);
      expect(mockApprovals.create).not.toHaveBeenCalled();
    });
  });

  describe("createRule", () => {
    it("创建成功：updatedBy 写入管理员 userId（种子据此不覆盖人工配置）", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null);
      mockPrisma.settlementRule.create.mockResolvedValue({ id: "r1", scene: "TEST_SCENE" });
      const result = await svc.createRule(createDto(), "admin-1");
      expect(result.id).toBe("r1");
      const data = mockPrisma.settlementRule.create.mock.calls[0][0].data;
      expect(data.updatedBy).toBe("admin-1");
      expect(data.scene).toBe("TEST_SCENE");
      expect(data.splits).toEqual(VALID_SPLITS);
      expect(data.approvalThreshold).toBe(2000);
    });

    it("scene 冲突抛业务异常，不落库", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({ id: "exists", scene: "TEST_SCENE" });
      await expect(svc.createRule(createDto(), "admin-1")).rejects.toThrow(/已存在结算规则/);
      expect(mockPrisma.settlementRule.create).not.toHaveBeenCalled();
    });

    it("splits 比例合计超 1 拒绝（超发保护）", async () => {
      const dto = createDto({
        splits: [
          { role: "PROVIDER", rate: 0.8, basis: "GROSS", category: "SERVICE" },
          { role: "PLATFORM", rate: 0.3, basis: "GROSS", category: "PLATFORM" },
        ],
      });
      await expect(svc.createRule(dto, "admin-1")).rejects.toThrow(/超过 1/);
      expect(mockPrisma.settlementRule.create).not.toHaveBeenCalled();
    });

    it("splits 单条 rate 越界 (0,1] 拒绝；空数组拒绝；role 非空校验", async () => {
      await expect(
        svc.createRule(createDto({ splits: [{ role: "PROVIDER", rate: 0, basis: "GROSS", category: "SERVICE" }] }), "admin-1"),
      ).rejects.toThrow(BusinessException);
      await expect(
        svc.createRule(createDto({ splits: [{ role: "PROVIDER", rate: 1.2, basis: "GROSS", category: "SERVICE" }] }), "admin-1"),
      ).rejects.toThrow(/\(0, 1\]/);
      await expect(svc.createRule(createDto({ splits: [] }), "admin-1")).rejects.toThrow(/非空数组/);
      await expect(
        svc.createRule(createDto({ splits: [{ role: "", rate: 0.5, basis: "GROSS", category: "SERVICE" }] }), "admin-1"),
      ).rejects.toThrow(/role/);
      expect(mockPrisma.settlementRule.create).not.toHaveBeenCalled();
    });

    it("PARENT_SPLIT 的 parentRole 必须引用先于本条出现的 role", async () => {
      const dto = createDto({
        splits: [
          { role: "OPERATOR", rate: 0.1, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
          { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION" },
        ],
      });
      await expect(svc.createRule(dto, "admin-1")).rejects.toThrow(/parentRole/);
      // 顺序正确则通过
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null);
      mockPrisma.settlementRule.create.mockResolvedValue({ id: "r2" });
      const ok = createDto({
        splits: [
          { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION" },
          { role: "OPERATOR", rate: 0.1, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
        ],
      });
      await expect(svc.createRule(ok, "admin-1")).resolves.toEqual({ id: "r2" });
    });

    it("COMMISSION 条目超过两级拒绝（计酬合规红线，配置时即拒）", async () => {
      const dto = createDto({
        splits: [
          { role: "STATION", rate: 0.2, basis: "GROSS", category: "COMMISSION" },
          { role: "OPERATOR", rate: 0.1, basis: "PARENT_SPLIT", parentRole: "STATION", category: "COMMISSION" },
          { role: "CIRCLE_OWNER", rate: 0.05, basis: "GROSS", category: "COMMISSION" },
        ],
      });
      await expect(svc.createRule(dto, "admin-1")).rejects.toThrow(/两级上限/);
      expect(mockPrisma.settlementRule.create).not.toHaveBeenCalled();
    });
  });

  describe("updateRule", () => {
    it("禁止修改 scene（引擎查找键）", async () => {
      await expect(
        svc.updateRule("r1", { scene: "OTHER_SCENE", enabled: false } as any, "admin-1"),
      ).rejects.toThrow(/禁止修改/);
      expect(mockPrisma.settlementRule.update).not.toHaveBeenCalled();
    });

    it("更新成功：仅更新传入字段且 updatedBy 写管理员 userId", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({ id: "r1", scene: "QUESTION" });
      mockPrisma.settlementRule.update.mockResolvedValue({ id: "r1", enabled: false });
      const result = await svc.updateRule("r1", { enabled: false, bufferDays: 3 } as any, "admin-2");
      expect(result.enabled).toBe(false);
      const arg = mockPrisma.settlementRule.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: "r1" });
      expect(arg.data).toEqual({ updatedBy: "admin-2", enabled: false, bufferDays: 3 });
    });

    it("规则不存在抛业务异常", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue(null);
      await expect(svc.updateRule("no-such", { enabled: false } as any, "admin-1")).rejects.toThrow(
        BusinessException,
      );
    });

    it("更新 splits 同样走强校验（比例超 1 拒绝）", async () => {
      mockPrisma.settlementRule.findUnique.mockResolvedValue({ id: "r1", scene: "QUESTION" });
      await expect(
        svc.updateRule(
          "r1",
          {
            splits: [
              { role: "PROVIDER", rate: 0.9, basis: "GROSS", category: "SERVICE" },
              { role: "PLATFORM", rate: 0.5, basis: "GROSS", category: "PLATFORM" },
            ],
          } as any,
          "admin-1",
        ),
      ).rejects.toThrow(/超过 1/);
      expect(mockPrisma.settlementRule.update).not.toHaveBeenCalled();
    });
  });
});
