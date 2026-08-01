import { VectorService } from "./vector.service";

describe("VectorService 数据库向量兼容", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function createService(options?: {
    pgvector?: boolean;
    hunyuan?: boolean;
    vector?: number[];
    jsonRows?: Array<{ id: string; content: string; vectorJson: string | null }>;
  }) {
    const pgvector = options?.pgvector ?? true;
    const prisma = {
      $queryRawUnsafe: jest
        .fn()
        .mockResolvedValueOnce([{ exists: pgvector }])
        .mockResolvedValue([]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      circleKnowledge: {
        update: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue(options?.jsonRows ?? []),
      },
    };
    const hunyuan = {
      isEnabled: options?.hunyuan ?? true,
      dimension: 1024,
      embedBatch: jest
        .fn()
        .mockResolvedValue([options?.vector ?? new Array(1024).fill(0.25)]),
    };

    return {
      prisma,
      hunyuan,
      service: new VectorService(prisma as never, hunyuan as never),
    };
  }

  it("把混元 1024 维输出补齐为数据库要求的 1536 维", async () => {
    const { service } = createService();

    const [vector] = await service.embed(["学而时习之"]);

    expect(vector).toHaveLength(1536);
    expect(vector[0]).toBe(0.25);
    expect(vector[1023]).toBe(0.25);
    expect(vector[1024]).toBe(0);
    expect(vector[1535]).toBe(0);
  });

  it("使用 Prisma 实际表名写入 pgvector，并在写入前统一维度", async () => {
    const { service, prisma } = createService();

    await service.storeCircleKnowledge("knowledge-1", [1, 0, 0]);

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
    const [sql, vectorString, id] = prisma.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('UPDATE "CircleKnowledge"');
    expect(sql).toContain('SET "embedding" = $1::vector');
    expect(sql).not.toContain("circle_knowledge");
    expect(id).toBe("knowledge-1");
    expect((vectorString as string).slice(1, -1).split(",")).toHaveLength(1536);
  });

  it("按圈检索使用真实的 circleId 字段，并统一查询向量维度", async () => {
    const { service, prisma } = createService();

    await service.searchCircleKnowledge([1, 0, 0], "circle-1", 5);

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    const [sql, vectorString, circleId, topK] =
      prisma.$queryRawUnsafe.mock.calls[1];
    expect(sql).toContain('FROM "CircleKnowledge"');
    expect(sql).toContain('"circleId" = $2');
    expect(sql).not.toContain("circle_id");
    expect(circleId).toBe("circle-1");
    expect(topK).toBe(5);
    expect((vectorString as string).slice(1, -1).split(",")).toHaveLength(1536);
  });

  it("pgvector 不可用时仍能比较历史 1024 维 JSON 与当前 1536 维查询", async () => {
    const historical = new Array(1024).fill(0);
    historical[0] = 1;
    const { service } = createService({
      pgvector: false,
      hunyuan: false,
      jsonRows: [
        {
          id: "legacy-1",
          content: "历史知识",
          vectorJson: JSON.stringify(historical),
        },
      ],
    });
    const query = new Array(1536).fill(0);
    query[0] = 1;

    const results = await service.searchCircleKnowledge(
      query,
      "circle-1",
      5,
    );

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("legacy-1");
    expect(results[0].similarity).toBeCloseTo(1);
  });
});
