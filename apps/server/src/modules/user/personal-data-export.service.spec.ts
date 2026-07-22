import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { PersonalDataExportService } from "./personal-data-export.service";

const list = () => ({ findMany: jest.fn().mockResolvedValue([]) });
const mockPrisma = {
  user: { findUnique: jest.fn() },
  post: list(), article: list(),
  comment: list(), like: list(),
  courseReview: list(), productReview: list(), liveReview: list(), offlineCourseReview: list(), ebookReview: list(),
  collect: list(), toolFavorite: list(), classicFavorite: list(), ebookFavorite: list(),
  order: list(), memberPurchase: list(), ebookPurchase: list(), invoice: list(),
  courseProgress: list(), readingProgress: list(), ebookProgress: list(), ebookReadingSession: list(),
  bookmark: list(), classicReadingNote: list(), ebookBookmark: list(), ebookNote: list(),
  follow: list(), circleMember: list(),
  auditLog: { create: jest.fn().mockResolvedValue({}) },
};

describe("PersonalDataExportService", () => {
  let service: PersonalDataExportService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PersonalDataExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(PersonalDataExportService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const model of Object.values(mockPrisma)) {
      if ("findMany" in model) (model.findMany as jest.Mock).mockResolvedValue([]);
    }
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  it("只按当前用户导出所选类别，并从个人资料中排除敏感字段", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1", phone: "13812345678", phoneEnc: null, email: "u1@example.com",
      nickname: "测试用户", avatar: null, bio: null, gender: null, birthday: null,
      memberLevel: "NONE", memberExpire: null, memberAutoRenew: false,
      interestCategories: [], identityVerified: false, identityVerifiedAt: null,
      attributionSource: "PLATFORM", attributionStationId: null, status: "ACTIVE",
      timezone: "Asia/Shanghai", preferredCurrency: "CNY", notifySettings: null,
      creatorSettings: null, teenModeEnabled: false, teenModeSettings: null,
      deleteRequestedAt: null, deleteScheduledAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"), roles: [],
    });
    mockPrisma.order.findMany.mockResolvedValue([{ id: "o1" }]);

    const result = await service.create("u1", ["profile", "orders"]);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" } }));
    const profileSelect = mockPrisma.user.findUnique.mock.calls[0][0].select;
    expect(profileSelect.passwordHash).toBeUndefined();
    expect(profileSelect.paymentPasswordHash).toBeUndefined();
    expect(result.sections.profile).toMatchObject({ id: "u1", phone: "13812345678" });
    expect(result.sections.profile).not.toHaveProperty("phoneEnc");
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(result.summary).toEqual({ profile: 1, orders: 1 });
  });

  it("非法类别直接拒绝且不查询用户数据", async () => {
    await expect(service.create("u1", ["credentials"])).rejects.toThrow("请选择有效的导出数据类型");
    await expect(service.create("u1", undefined as any)).rejects.toThrow("请选择有效的导出数据类型");
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("审计写入失败时仍返回用户数据包", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", phone: null, phoneEnc: null, roles: [] });
    mockPrisma.auditLog.create.mockRejectedValue(new Error("audit unavailable"));

    const result = await service.create("u1", ["profile"]);

    expect(result.accountId).toBe("u1");
    expect(result.selectedTypes).toEqual(["profile"]);
  });
});
