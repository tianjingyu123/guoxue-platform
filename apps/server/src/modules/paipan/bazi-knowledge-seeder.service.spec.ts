import { Test } from "@nestjs/testing";
import { BaziKnowledgeSeeder } from "./bazi-knowledge-seeder.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BaziKnowledgeService } from "./bazi-knowledge.service";

const mockPrisma = {
  baziKnowledge: {
    findFirst: jest.fn(),
  },
};

const mockBaziSvc: Record<string, jest.Mock> = {
  create: jest.fn(),
};

describe("BaziKnowledgeSeeder", () => {
  let svc: BaziKnowledgeSeeder;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        BaziKnowledgeSeeder,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BaziKnowledgeService, useValue: mockBaziSvc },
      ],
    }).compile();
    svc = mod.get(BaziKnowledgeSeeder);
  });

  beforeEach(() => jest.clearAllMocks());

  it("应被定义", () => expect(svc).toBeDefined());

  it("填充种子数据——全部新增", async () => {
    mockPrisma.baziKnowledge.findFirst.mockResolvedValue(null);
    mockBaziSvc.create.mockResolvedValue({ id: "k1" });

    const result = await svc.seed();
    expect(result.created + result.skipped).toBeGreaterThan(0);
    expect(mockBaziSvc.create).toHaveBeenCalled();
  });

  it("填充种子数据——部分已存在", async () => {
    // 第一次查存在，后续都不存在
    mockPrisma.baziKnowledge.findFirst
      .mockResolvedValueOnce({ id: "k1" }) // 第一条已存在 → skip
      .mockResolvedValue(null);             // 其余的都不存在
    mockBaziSvc.create.mockResolvedValue({ id: "k2" });

    const result = await svc.seed();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("重复运行全部跳过", async () => {
    mockPrisma.baziKnowledge.findFirst.mockResolvedValue({ id: "k1" });
    const result = await svc.seed();
    expect(result.created).toBe(0);
    expect(result.skipped).toBeGreaterThan(0);
  });
});
