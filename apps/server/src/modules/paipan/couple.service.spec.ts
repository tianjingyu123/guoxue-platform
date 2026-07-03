import { Test } from "@nestjs/testing";
import { CoupleService } from "./couple.service";
import { PaipanService } from "./paipan.service";
import { PaipanAiService } from "./paipan-ai.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";

/** 内存态排盘记录（含生辰，测 R3 报告不泄露用） */
const baziRecord = (id: string, userId: string) => ({
  id,
  clientName: "某人",
  clientBirth: "1990-01-01 08:00",
  inputParams: { gender: "男" },
  resultData: { siZhu: { ri: { gan: "甲" } } },
  createdAt: new Date(),
});

describe("CoupleService（V4 双人合盘）", () => {
  let svc: CoupleService;

  const prisma = {
    paipanRecord: { findFirst: jest.fn() },
    coupleChart: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    aiAnalysisRecord: { findUnique: jest.fn() },
  };
  const paipan = { getBaziRecord: jest.fn() };
  const paipanAi = { analyzeHehun: jest.fn() };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CoupleService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaipanService, useValue: paipan },
        { provide: PaipanAiService, useValue: paipanAi },
      ],
    }).compile();
    svc = mod.get(CoupleService);
  });

  beforeEach(() => jest.clearAllMocks());

  // ────────── invite ──────────

  it("invite 成功：校验本人盘 → 建 CoupleChart 返回令牌与 shareUrl", async () => {
    prisma.paipanRecord.findFirst.mockResolvedValue({ id: "rec-A" });
    prisma.coupleChart.create.mockResolvedValue({ id: "chart-1", inviteToken: "tok-abc" });

    const res = await svc.invite("user-A", "rec-A");

    expect(res.id).toBe("chart-1");
    expect(res.inviteToken).toBe("tok-abc");
    expect(res.shareUrl).toContain("token=tok-abc");
    expect(res.shareUrl).toContain("pkg-paipan/couple/accept");
    // create 用了随机 32 位 hex 令牌 + 7 天过期
    const createArg = prisma.coupleChart.create.mock.calls[0][0].data;
    expect(createArg.inviteToken).toHaveLength(32);
    expect(createArg.status).toBe("PENDING_INVITE");
    expect(createArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("invite：myRecordId 非本人（或非 BAZI）→ 400 拒绝", async () => {
    prisma.paipanRecord.findFirst.mockResolvedValue(null);
    await expect(svc.invite("user-A", "rec-X")).rejects.toBeInstanceOf(BusinessException);
    expect(prisma.coupleChart.create).not.toHaveBeenCalled();
  });

  // ────────── accept ──────────

  it("accept 成功：填双方 → AUTHORIZED → 调 analyzeHehun 生成报告并存 analysisId", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      initiatorRecordId: "rec-A",
      status: "PENDING_INVITE",
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.paipanRecord.findFirst.mockResolvedValue({ id: "rec-B" });
    paipan.getBaziRecord
      .mockResolvedValueOnce(baziRecord("rec-A", "user-A"))
      .mockResolvedValueOnce(baziRecord("rec-B", "user-B"));
    paipanAi.analyzeHehun.mockResolvedValue({ id: "ana-1", analysisContent: "合婚报告文本" });
    prisma.coupleChart.update.mockResolvedValue({});

    const res = await svc.accept("user-B", "tok-abc", "rec-B");

    expect(res.chartId).toBe("chart-1");
    // 唯一同时读两盘处：读了发起方盘 + 被邀请方盘
    expect(paipan.getBaziRecord).toHaveBeenCalledWith("rec-A", "user-A");
    expect(paipan.getBaziRecord).toHaveBeenCalledWith("rec-B", "user-B");
    expect(paipanAi.analyzeHehun).toHaveBeenCalledTimes(1);
    const updateData = prisma.coupleChart.update.mock.calls[0][0].data;
    expect(updateData.status).toBe("AUTHORIZED");
    expect(updateData.partnerId).toBe("user-B");
    expect(updateData.partnerRecordId).toBe("rec-B");
    expect(updateData.analysisId).toBe("ana-1");
  });

  it("accept：自己接受自己发起的邀请 → 400 拒绝", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      initiatorRecordId: "rec-A",
      status: "PENDING_INVITE",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(svc.accept("user-A", "tok-abc", "rec-A2")).rejects.toBeInstanceOf(BusinessException);
    expect(paipanAi.analyzeHehun).not.toHaveBeenCalled();
  });

  it("accept：令牌已过期 → 400 拒绝", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      initiatorRecordId: "rec-A",
      status: "PENDING_INVITE",
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(svc.accept("user-B", "tok-abc", "rec-B")).rejects.toBeInstanceOf(BusinessException);
    expect(paipanAi.analyzeHehun).not.toHaveBeenCalled();
  });

  it("accept：重复接受（已非 PENDING_INVITE）→ 400 拒绝", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      initiatorRecordId: "rec-A",
      status: "AUTHORIZED",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(svc.accept("user-B", "tok-abc", "rec-B")).rejects.toBeInstanceOf(BusinessException);
    expect(paipanAi.analyzeHehun).not.toHaveBeenCalled();
  });

  it("accept：令牌不存在 → 404 拒绝", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue(null);
    await expect(svc.accept("user-B", "tok-nope", "rec-B")).rejects.toBeInstanceOf(BusinessException);
  });

  // ────────── getById ──────────

  it("getById：非双方 → 403", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      partnerId: "user-B",
      status: "AUTHORIZED",
      analysisId: "ana-1",
      initiatorDeleted: false,
      partnerDeleted: false,
      createdAt: new Date(),
    });
    await expect(svc.getById("user-C", "chart-1")).rejects.toBeInstanceOf(BusinessException);
  });

  it("getById：己方软删后视为不可见 → 404", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      partnerId: "user-B",
      status: "AUTHORIZED",
      analysisId: "ana-1",
      initiatorDeleted: true, // 发起方已软删
      partnerDeleted: false,
      createdAt: new Date(),
    });
    await expect(svc.getById("user-A", "chart-1")).rejects.toBeInstanceOf(BusinessException);
  });

  it("getById（R3）：只返报告文本+双方昵称，绝不含 recordId/生辰/四柱", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      partnerId: "user-B",
      initiatorRecordId: "rec-A",
      partnerRecordId: "rec-B",
      status: "AUTHORIZED",
      analysisId: "ana-1",
      initiatorDeleted: false,
      partnerDeleted: false,
      createdAt: new Date(),
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({ nickname: "甲" })
      .mockResolvedValueOnce({ nickname: "乙" });
    prisma.aiAnalysisRecord.findUnique.mockResolvedValue({ analysisContent: "合婚报告文本" });

    const res: any = await svc.getById("user-A", "chart-1");

    expect(res.analysisContent).toBe("合婚报告文本");
    expect(res.initiatorNickname).toBe("甲");
    expect(res.partnerNickname).toBe("乙");
    // R3：返回体只允许这些键，绝无生辰/四柱/记录 id
    expect(Object.keys(res).sort()).toEqual(
      ["analysisContent", "createdAt", "id", "initiatorNickname", "partnerNickname", "status"].sort(),
    );
    expect(res).not.toHaveProperty("initiatorRecordId");
    expect(res).not.toHaveProperty("partnerRecordId");
    expect(res).not.toHaveProperty("clientBirth");
    expect(res).not.toHaveProperty("siZhu");
    expect(JSON.stringify(res)).not.toContain("1990-01-01");
  });

  // ────────── mine / reject / remove ──────────

  it("getMine：返回我发起+我参与，标注 role 与对方昵称", async () => {
    prisma.coupleChart.findMany.mockResolvedValue([
      { id: "c1", initiatorId: "user-A", partnerId: "user-B", status: "AUTHORIZED", createdAt: new Date() },
      { id: "c2", initiatorId: "user-C", partnerId: "user-A", status: "AUTHORIZED", createdAt: new Date() },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: "user-B", nickname: "乙" },
      { id: "user-C", nickname: "丙" },
    ]);

    const res = await svc.getMine("user-A");
    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({ id: "c1", role: "initiator", otherNickname: "乙" });
    expect(res[1]).toMatchObject({ id: "c2", role: "partner", otherNickname: "丙" });
  });

  it("remove：任一方软删己方可见性", async () => {
    prisma.coupleChart.findUnique.mockResolvedValue({
      id: "chart-1",
      initiatorId: "user-A",
      partnerId: "user-B",
    });
    prisma.coupleChart.update.mockResolvedValue({});
    await svc.remove("user-B", "chart-1");
    expect(prisma.coupleChart.update.mock.calls[0][0].data).toEqual({ partnerDeleted: true });
  });
});
