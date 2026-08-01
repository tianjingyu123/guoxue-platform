import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CompetitionService } from "./competition.service";

describe("CompetitionService 公开赛事边界", () => {
  const prisma: any = {
    competition: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    competitionRound: { findUnique: jest.fn() },
    competitionRanking: { findUnique: jest.fn() },
  };
  const grading: any = { grade: jest.fn() };
  let service: CompetitionService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.competition.findMany.mockResolvedValue([]);
    prisma.competition.count.mockResolvedValue(0);
    service = new CompetitionService(prisma, grading);
  });

  it("公开列表只查三种可见状态并排除 comp-demo 前缀", async () => {
    await service.listPublicCompetitions({ page: 1, pageSize: 20 });
    const where = prisma.competition.findMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] });
    expect(where.NOT).toEqual({ id: { startsWith: "comp-demo-" } });
    expect(prisma.competition.count).toHaveBeenCalledWith({ where });
  });

  it("公开列表请求草稿状态直接返回空，不访问数据库", async () => {
    await expect(service.listPublicCompetitions({ status: "DRAFT", page: 2, pageSize: 10 })).resolves.toEqual({
      data: [], total: 0, page: 2, pageSize: 10,
    });
    expect(prisma.competition.findMany).not.toHaveBeenCalled();
  });

  it("演示赛事详情精确返回不存在，后台通用查询不受影响", async () => {
    await expect(service.getPublicCompetition("comp-demo-bazi")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.competition.findFirst).not.toHaveBeenCalled();
  });

  it("普通公开赛事须命中可见状态", async () => {
    prisma.competition.findFirst.mockResolvedValue({ id: "real-1", status: "PUBLISHED" });
    await expect(service.assertPublicCompetition("real-1")).resolves.toMatchObject({ id: "real-1" });
    expect(prisma.competition.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "real-1", status: { in: ["PUBLISHED", "IN_PROGRESS", "FINISHED"] } },
    }));
  });

  it("赛程子资源必须归属于可见真实赛事", async () => {
    prisma.competitionRound.findUnique.mockResolvedValue({ id: "round-1", competitionId: "real-1" });
    prisma.competition.findFirst.mockResolvedValue(null);
    await expect(service.assertPublicRound("round-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("付费赛事未接正式收银台前禁止免费报名", async () => {
    prisma.competition.findUnique.mockResolvedValue({ id: "paid-1", status: "PUBLISHED", entryFee: 9900 });
    await expect(service.register("paid-1", "u1")).rejects.toThrow(BadRequestException);
  });
});
