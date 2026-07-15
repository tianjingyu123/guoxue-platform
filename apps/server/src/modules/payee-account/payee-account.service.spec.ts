import { PayeeAccountService } from "./payee-account.service";
import { BusinessException } from "../../common/business.exception";
import { encrypt } from "../../common/crypto.util";

describe("PayeeAccountService（收款主体进件）", () => {
  let svc: PayeeAccountService;
  let prisma: any;
  let huifu: any;

  const baseAcct = {
    id: "pa1",
    subjectType: "CIRCLE",
    subjectId: "c1",
    userId: "u1",
    settlementMode: "PLATFORM_COLLECT",
    platformRate: 0.5,
    subjectName: "某某文化工作室",
    licenseNo: "91310000MA1FL0XXXX",
    legalName: "张三",
    legalIdCard: encrypt("310101199001011234"),
    bankAccount: encrypt("6222021234567890123"),
    bankHolder: "某某文化工作室",
    bankName: "建设银行",
    status: "DRAFT",
    huifuId: null,
    channelApplyId: null,
    submittedAt: null,
  };

  beforeEach(() => {
    prisma = {
      payeeAccount: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      circle: { findUnique: jest.fn().mockResolvedValue({ ownerId: "u1" }) },
      merchant: { findUnique: jest.fn() },
      stationOffline: { findUnique: jest.fn() },
      institute: { findUnique: jest.fn() },
    };
    huifu = { applyEntMerchant: jest.fn(), queryMerchantApply: jest.fn() };
    svc = new PayeeAccountService(prisma, huifu);
  });

  describe("resolveSettlement —— 分账时解析「谁收款」，错了就把钱分错人", () => {
    it("未进件 → 平台收款 + 平台收款档费率（圈子 50%）", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(null);
      const r = await svc.resolveSettlement("CIRCLE", "c1");
      expect(r.settlementMode).toBe("PLATFORM_COLLECT");
      expect(r.platformRate).toBe(0.5);
      expect(r.payeeHuifuId).toBeNull();
    });

    // 最关键的一条：状态说能自收款，但渠道那边根本没这个账户 —— 钱会无处可去。
    it("SELF_COLLECT 但没有 huifuId → 仍按平台收款兜底（钱不能分给一个不存在的账户）", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({
        ...baseAcct, settlementMode: "SELF_COLLECT", status: "ACTIVE", huifuId: null, platformRate: 0.2,
      });
      const r = await svc.resolveSettlement("CIRCLE", "c1");
      expect(r.settlementMode).toBe("PLATFORM_COLLECT");
      expect(r.payeeHuifuId).toBeNull();
    });

    it("SELF_COLLECT 但尚未 ACTIVE（审核中）→ 仍按平台收款兜底", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({
        ...baseAcct, settlementMode: "SELF_COLLECT", status: "APPROVING", huifuId: "H001", platformRate: 0.2,
      });
      const r = await svc.resolveSettlement("CIRCLE", "c1");
      expect(r.settlementMode).toBe("PLATFORM_COLLECT");
    });

    it("ACTIVE + huifuId → 主体自收款，平台按 20% 分账", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({
        ...baseAcct, settlementMode: "SELF_COLLECT", status: "ACTIVE", huifuId: "H001", platformRate: 0.2,
      });
      const r = await svc.resolveSettlement("CIRCLE", "c1");
      expect(r.settlementMode).toBe("SELF_COLLECT");
      expect(r.payeeHuifuId).toBe("H001");
      expect(r.platformRate).toBe(0.2);
    });

    it("驿站未进件 → 平台收款档 30%", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(null);
      const r = await svc.resolveSettlement("OFFLINE_STATION", "s1");
      expect(r.platformRate).toBe(0.3);
    });

    // 费率必须跟着「谁收款」走，不能跟着历史状态走。
    // 圈主进件通过时费率降到 20%；一旦被停用，钱重新由平台代收 —— 平台重新承担
    // 100% 的经营者责任，费率就必须回到 50%。否则平台担全责却只抽 20%。
    it("已激活的圈主被停用 → 费率从 20% 回到 50%（不能担全责却只抽两成）", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({
        ...baseAcct,
        settlementMode: "SELF_COLLECT",
        status: "DISABLED", // 曾经激活过，platformRate 还留着 0.2
        huifuId: "H001",
        platformRate: 0.2,
      });
      const r = await svc.resolveSettlement("CIRCLE", "c1");
      expect(r.settlementMode).toBe("PLATFORM_COLLECT");
      expect(r.platformRate).toBe(0.5);
      expect(r.payeeHuifuId).toBeNull();
    });
  });

  describe("assertSubjectViewable —— 越权修复(后端审计P2)", () => {
    it("管理员角色放行，不校验归属", async () => {
      await expect(svc.assertSubjectViewable("anyone", ["FINANCE_ADMIN"], "CIRCLE", "c1")).resolves.toBeUndefined();
    });

    it("主体负责人本人放行", async () => {
      // mock circle.findUnique → ownerId:"u1"
      await expect(svc.assertSubjectViewable("u1", [], "CIRCLE", "c1")).resolves.toBeUndefined();
    });

    it("非负责人非管理员 → 403", async () => {
      await expect(svc.assertSubjectViewable("u2", ["USER"], "CIRCLE", "c1")).rejects.toThrow(BusinessException);
    });
  });

  describe("activate —— 进件通过后责任外移，费率随之降档", () => {
    it("圈子进件通过：PLATFORM_COLLECT 50% → SELF_COLLECT 20%", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(baseAcct);
      prisma.payeeAccount.update.mockImplementation(({ data }: any) => Promise.resolve({ ...baseAcct, ...data }));

      const r = await svc.activate("pa1", "H12345");

      expect(prisma.payeeAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "ACTIVE",
            huifuId: "H12345",
            settlementMode: "SELF_COLLECT",
            platformRate: 0.2, // ← 费率差就是驱动圈主办执照的治理工具
          }),
        }),
      );
      expect(r.status).toBe("ACTIVE");
    });

    it("驿站进件通过：费率保持 30%（自收款前后不变，责任外移即目的）", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({ ...baseAcct, subjectType: "OFFLINE_STATION", platformRate: 0.3 });
      prisma.payeeAccount.update.mockImplementation(({ data }: any) => Promise.resolve({ ...baseAcct, ...data }));

      await svc.activate("pa1", "H999");

      expect(prisma.payeeAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ platformRate: 0.3, settlementMode: "SELF_COLLECT" }) }),
      );
    });
  });

  describe("submitToChannel", () => {
    it("资料不完整（无营业执照）拒绝提交 —— 无执照无法进件，只能平台代收 = 二清", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({ ...baseAcct, licenseNo: null });
      await expect(svc.submitToChannel("pa1", "admin1")).rejects.toThrow(BusinessException);
      expect(huifu.applyEntMerchant).not.toHaveBeenCalled();
    });

    it("非 DRAFT/REJECTED 状态拒绝重复提交", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({ ...baseAcct, status: "ACTIVE" });
      await expect(svc.submitToChannel("pa1", "admin1")).rejects.toThrow(BusinessException);
    });

    // CAS：两个管理员同时点提交 → 渠道重复开户 → 同一主体两个 huifuId → 分账分给谁？
    it("CAS 抢锁失败（并发提交）直接拒绝，不会重复调渠道开户", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(baseAcct);
      prisma.payeeAccount.updateMany.mockResolvedValue({ count: 0 }); // 另一路已抢走
      await expect(svc.submitToChannel("pa1", "admin1")).rejects.toThrow(BusinessException);
      expect(huifu.applyEntMerchant).not.toHaveBeenCalled();
    });

    it("渠道同步返回 huifu_id → 直接激活为 SELF_COLLECT", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(baseAcct);
      prisma.payeeAccount.updateMany.mockResolvedValue({ count: 1 });
      prisma.payeeAccount.update.mockImplementation(({ data }: any) => Promise.resolve({ ...baseAcct, ...data }));
      huifu.applyEntMerchant.mockResolvedValue({ ok: true, huifuId: "H777", applyId: "A1" });

      const r = await svc.submitToChannel("pa1", "admin1");
      expect(r.status).toBe("ACTIVE");
      expect(r.huifuId).toBe("H777");
    });

    it("渠道异步审核 → APPROVING，记下申请单号待轮询", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(baseAcct);
      prisma.payeeAccount.updateMany.mockResolvedValue({ count: 1 });
      prisma.payeeAccount.update.mockImplementation(({ data }: any) => Promise.resolve({ ...baseAcct, ...data }));
      huifu.applyEntMerchant.mockResolvedValue({ ok: true, huifuId: null, applyId: "APPLY-123" });

      const r = await svc.submitToChannel("pa1", "admin1");
      expect(r.status).toBe("APPROVING");
      expect(r.channelApplyId).toBe("APPLY-123");
    });

    // 不放回状态的话，主体会永久卡在 SUBMITTED：既不能改资料、也不能重新提交。
    it("渠道调用异常 → 状态放回 DRAFT，不会永久卡在 SUBMITTED", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(baseAcct);
      prisma.payeeAccount.updateMany.mockResolvedValue({ count: 1 });
      huifu.applyEntMerchant.mockRejectedValue(new Error("网络超时"));

      await expect(svc.submitToChannel("pa1", "admin1")).rejects.toThrow("网络超时");
      expect(prisma.payeeAccount.updateMany).toHaveBeenLastCalledWith({
        where: { id: "pa1", status: "SUBMITTED" },
        data: { status: "DRAFT", rejectReason: "渠道调用异常，请重试" },
      });
    });
  });

  describe("敏感字段脱敏", () => {
    it("接口返回的法人身份证/结算账号只回尾号，明文与密文都不外泄", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(baseAcct);
      const r: any = await svc.getAccount("CIRCLE", "c1");
      expect(r.legalIdCard).toBe("****1234");
      expect(r.bankAccount).toBe("****0123");
      expect(JSON.stringify(r)).not.toContain("310101199001011234");
      expect(JSON.stringify(r)).not.toContain(baseAcct.legalIdCard); // 密文也不外泄
    });
  });

  describe("归属校验", () => {
    it("不能给别人的圈子提交收款资质", async () => {
      prisma.circle.findUnique.mockResolvedValue({ ownerId: "另一个人" });
      await expect(
        svc.saveQualification("u1", {
          subjectType: "CIRCLE", subjectId: "c1", subjectName: "x", licenseNo: "L1",
          legalName: "张三", legalIdCard: "310101199001011234", bankAccount: "6222021234567890123", bankHolder: "x",
        }),
      ).rejects.toThrow(BusinessException);
      expect(prisma.payeeAccount.upsert).not.toHaveBeenCalled();
    });

    it("已提交渠道后不允许再改资料（否则与渠道档案不一致，无从对账）", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue({ ...baseAcct, status: "APPROVING" });
      await expect(
        svc.saveQualification("u1", {
          subjectType: "CIRCLE", subjectId: "c1", subjectName: "改名了", licenseNo: "L1",
          legalName: "张三", legalIdCard: "310101199001011234", bankAccount: "6222021234567890123", bankHolder: "x",
        }),
      ).rejects.toThrow(BusinessException);
      expect(prisma.payeeAccount.upsert).not.toHaveBeenCalled();
    });

    it("身份证与银行账号加密落库（不是明文）", async () => {
      prisma.payeeAccount.findUnique.mockResolvedValue(null);
      prisma.payeeAccount.upsert.mockImplementation(({ create }: any) => Promise.resolve({ ...baseAcct, ...create }));

      await svc.saveQualification("u1", {
        subjectType: "CIRCLE", subjectId: "c1", subjectName: "工作室", licenseNo: "L1",
        legalName: "张三", legalIdCard: "310101199001011234", bankAccount: "6222021234567890123", bankHolder: "工作室",
      });

      const created = prisma.payeeAccount.upsert.mock.calls[0][0].create;
      expect(created.legalIdCard).not.toBe("310101199001011234");
      expect(created.bankAccount).not.toBe("6222021234567890123");
      expect(created.settlementMode).toBe("PLATFORM_COLLECT"); // 未进件前一律平台收款
      expect(Number(created.platformRate)).toBe(0.5);
    });
  });
});
