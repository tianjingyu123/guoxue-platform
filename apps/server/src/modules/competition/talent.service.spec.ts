import { Test } from "@nestjs/testing";
import { TalentService, TALENT_WEIGHTS } from "./talent.service";
import { PrismaService } from "../../prisma/prisma.service";

const mockPrisma: any = {
  competition: {
    findUnique: jest.fn(),
  },
  competitionRegistration: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  competitionRanking: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  competitionTalent: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  },
  teacherCertification: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const COMP = {
  id: "c1",
  title: "经学杯",
  status: "FINISHED",
  finishedAt: new Date("2026-07-04T12:00:00Z"),
};

/** 造终榜行（roundId=null）与阶段榜 PROMOTED 行 */
function mockRankings(rows: { userId: string; roundId: string | null; rank: number; status: string }[]) {
  mockPrisma.competitionRanking.findMany.mockResolvedValue(rows);
}

function mockParticipants(userIds: string[]) {
  mockPrisma.competitionRegistration.findMany.mockResolvedValue(userIds.map((userId) => ({ userId })));
}

describe("TalentService", () => {
  let service: TalentService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [TalentService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = mod.get(TalentService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.competition.findUnique.mockResolvedValue(COMP);
    mockPrisma.competitionRegistration.findMany.mockResolvedValue([]);
    mockPrisma.competitionRanking.findMany.mockResolvedValue([]);
    mockPrisma.competitionTalent.findMany.mockResolvedValue([]);
    mockPrisma.competitionTalent.findUnique.mockResolvedValue(null);
    mockPrisma.competitionTalent.upsert.mockResolvedValue({});
    mockPrisma.competitionTalent.count.mockResolvedValue(0);
    mockPrisma.teacherCertification.findMany.mockResolvedValue([]);
  });

  // ═══════ 收官重算：talentScore 公式 ═══════

  it("冠军积分 = 参与2 + 晋级10×2 + 冠军100 = 122·totalWins+1·bestRank=1·奖牌进badges", async () => {
    mockParticipants(["u1"]);
    mockRankings([
      { userId: "u1", roundId: "st1", rank: 1, status: "PROMOTED" },
      { userId: "u1", roundId: "st2", rank: 1, status: "PROMOTED" },
      { userId: "u1", roundId: null, rank: 1, status: "CHAMPION" },
    ]);

    const r = await service.recalcForCompetition("c1");
    expect(r).toEqual({ processed: 1, skipped: 0 });

    const call = mockPrisma.competitionTalent.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ userId: "u1" });
    expect(call.create.talentScore).toBe(
      TALENT_WEIGHTS.PARTICIPATION + TALENT_WEIGHTS.PROMOTED * 2 + TALENT_WEIGHTS.CHAMPION,
    ); // 122
    expect(call.create.totalCompetitions).toBe(1);
    expect(call.create.totalWins).toBe(1);
    expect(call.create.bestRank).toBe(1);
    expect(call.create.badges[0]).toMatchObject({ competitionId: "c1", title: "经学杯", status: "CHAMPION", rank: 1 });
  });

  it("亚军60/季军40·淘汰者按参与2计·徽章标 PARTICIPANT", async () => {
    mockParticipants(["u2", "u3", "u4"]);
    mockRankings([
      { userId: "u2", roundId: null, rank: 2, status: "RUNNER_UP" },
      { userId: "u3", roundId: null, rank: 3, status: "THIRD_PLACE" },
      { userId: "u4", roundId: null, rank: 4, status: "ELIMINATED" },
    ]);

    await service.recalcForCompetition("c1");

    const byUser = new Map(
      mockPrisma.competitionTalent.upsert.mock.calls.map((c: any[]) => [c[0].where.userId, c[0].create]),
    );
    expect((byUser.get("u2") as any).talentScore).toBe(2 + 60);
    expect((byUser.get("u3") as any).talentScore).toBe(2 + 40);
    expect((byUser.get("u4") as any).talentScore).toBe(2);
    expect((byUser.get("u4") as any).totalWins).toBe(0);
    expect((byUser.get("u4") as any).badges[0].status).toBe("PARTICIPANT");
  });

  it("已有档案走累计更新：bestRank 取历史最小·totalCompetitions/talentScore 累加", async () => {
    mockParticipants(["u1"]);
    mockRankings([{ userId: "u1", roundId: null, rank: 2, status: "RUNNER_UP" }]);
    mockPrisma.competitionTalent.findMany.mockResolvedValue([
      {
        id: "t1", userId: "u1", bestRank: 1, totalCompetitions: 3, totalWins: 1, talentScore: 130,
        badges: [{ competitionId: "old1", title: "旧赛", status: "CHAMPION", rank: 1, score: 102, finishedAt: "2026-01-01" }],
        updatedAt: new Date(),
      },
    ]);

    await service.recalcForCompetition("c1");

    const call = mockPrisma.competitionTalent.upsert.mock.calls[0][0];
    expect(call.update.bestRank).toBe(1); // 历史冠军名次保留
    expect(call.update.totalCompetitions).toBe(4);
    expect(call.update.totalWins).toBe(1);
    expect(call.update.talentScore).toBe(130 + 2 + 60);
    expect(call.update.badges).toHaveLength(2);
  });

  // ═══════ 收官重算：幂等（badges competitionId 判重） ═══════

  it("同赛事重算幂等：badges 已含 competitionId 则跳过不重复累计", async () => {
    mockParticipants(["u1"]);
    mockRankings([{ userId: "u1", roundId: null, rank: 1, status: "CHAMPION" }]);
    mockPrisma.competitionTalent.findMany.mockResolvedValue([
      {
        id: "t1", userId: "u1", bestRank: 1, totalCompetitions: 1, totalWins: 1, talentScore: 102,
        badges: [{ competitionId: "c1", title: "经学杯", status: "CHAMPION", rank: 1, score: 102, finishedAt: "2026-07-04" }],
        updatedAt: new Date(),
      },
    ]);

    const r = await service.recalcForCompetition("c1");
    expect(r).toEqual({ processed: 0, skipped: 1 });
    expect(mockPrisma.competitionTalent.upsert).not.toHaveBeenCalled();
  });

  it("未收官赛事拒绝沉淀（防御闸）", async () => {
    mockPrisma.competition.findUnique.mockResolvedValue({ ...COMP, status: "IN_PROGRESS" });
    const r = await service.recalcForCompetition("c1");
    expect(r.processed).toBe(0);
    expect(r.reason).toContain("未收官");
    expect(mockPrisma.competitionTalent.upsert).not.toHaveBeenCalled();
  });

  // ═══════ 人才榜：脱敏 + 认证联查 ═══════

  it("榜单脱敏：昵称掩码不出全名·只出奖牌徽章·带 position", async () => {
    mockPrisma.competitionTalent.findMany.mockResolvedValue([
      {
        id: "t1", userId: "u1", bestRank: 1, totalCompetitions: 2, totalWins: 1, talentScore: 162,
        badges: [
          { competitionId: "c1", title: "经学杯", status: "CHAMPION", rank: 1, score: 122, finishedAt: "2026-07-04" },
          { competitionId: "c0", title: "旧赛", status: "PARTICIPANT", rank: 8, score: 2, finishedAt: "2026-01-01" },
        ],
        updatedAt: new Date(),
        user: { id: "u1", nickname: "易学达人", avatar: "https://cdn/a.png" },
      },
    ]);
    mockPrisma.competitionTalent.count.mockResolvedValue(1);

    const r: any = await service.listTalents(1, 20);
    expect(r._paginated).toBe(true);
    expect(r.total).toBe(1);
    const item = r.rows[0];
    expect(item.position).toBe(1);
    expect(item.nickname).toBe("易***"); // maskName 脱敏
    expect(item.nickname).not.toContain("学达人");
    expect(item.avatar).toBe("https://cdn/a.png");
    expect(item.medals).toHaveLength(1); // PARTICIPANT 轨迹不出公开榜
    expect(item.medals[0].status).toBe("CHAMPION");
    expect(item).not.toHaveProperty("phone");
  });

  it("认证联查：APPROVED 讲师 isCertified=true 带 verifiedTitle·未认证 false（前端挂申请引导标）", async () => {
    mockPrisma.competitionTalent.findMany.mockResolvedValue([
      { id: "t1", userId: "u1", bestRank: 1, totalCompetitions: 1, totalWins: 1, talentScore: 102, badges: [], updatedAt: new Date(), user: { id: "u1", nickname: "甲", avatar: null } },
      { id: "t2", userId: "u2", bestRank: 2, totalCompetitions: 1, totalWins: 0, talentScore: 62, badges: [], updatedAt: new Date(), user: { id: "u2", nickname: "乙", avatar: null } },
    ]);
    mockPrisma.competitionTalent.count.mockResolvedValue(2);
    mockPrisma.teacherCertification.findMany.mockResolvedValue([{ userId: "u1", verifiedTitle: "认证讲师" }]);

    const r: any = await service.listTalents();
    expect(mockPrisma.teacherCertification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "APPROVED" }) }),
    );
    expect(r.rows[0].isCertified).toBe(true);
    expect(r.rows[0].verifiedTitle).toBe("认证讲师");
    expect(r.rows[1].isCertified).toBe(false);
    expect(r.rows[1].verifiedTitle).toBeNull();
  });

  // ═══════ 我的战绩档案 ═══════

  it("我的档案：完整 badges + 榜上位次（高分人数+1）+ 认证状态", async () => {
    mockPrisma.competitionTalent.findUnique.mockResolvedValue({
      id: "t1", userId: "u1", bestRank: 1, totalCompetitions: 2, totalWins: 1, talentScore: 124,
      badges: [{ competitionId: "c1", title: "经学杯", status: "CHAMPION", rank: 1, score: 122, finishedAt: "2026-07-04" }],
      updatedAt: new Date(),
    });
    mockPrisma.competitionTalent.count.mockResolvedValue(4); // 4 人比我高分
    mockPrisma.teacherCertification.findMany.mockResolvedValue([]);

    const r: any = await service.getMyProfile("u1");
    expect(r.position).toBe(5);
    expect(r.badges).toHaveLength(1);
    expect(r.isCertified).toBe(false);
    expect(mockPrisma.competitionTalent.count).toHaveBeenCalledWith({ where: { talentScore: { gt: 124 } } });
  });

  it("无档案用户返回零档案（不 404·前端空态友好）", async () => {
    mockPrisma.competitionTalent.findUnique.mockResolvedValue(null);
    const r: any = await service.getMyProfile("u9");
    expect(r).toMatchObject({ userId: "u9", talentScore: 0, totalCompetitions: 0, badges: [], position: null });
  });
});
