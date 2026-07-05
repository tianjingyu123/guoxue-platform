import { Test } from "@nestjs/testing";
import { WebVitalsService } from "./web-vitals.service";
import { PrismaService } from "../../prisma/prisma.service";

/** RUM 聚合单测（T3）：按日按指标组装 + 天数钳制 + bigint 归一。 */

const mockPrisma = { $queryRaw: jest.fn() };

describe("WebVitalsService", () => {
  let svc: WebVitalsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [WebVitalsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    svc = mod.get(WebVitalsService);
  });

  it("按日组装多指标·bigint samples 归一为 number·CLS 小数保留", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { date: "2026-07-04", metric: "LCP", p75: 1834.5, samples: BigInt(120) },
      { date: "2026-07-04", metric: "CLS", p75: 0.0812, samples: BigInt(120) },
      { date: "2026-07-05", metric: "LCP", p75: 1500, samples: BigInt(80) },
    ]);
    const r = await svc.daily(7);
    expect(r.days).toBe(7);
    expect(r.series).toHaveLength(2);
    const d1 = r.series[0] as Record<string, { p75: number; samples: number }> & { date: string };
    expect(d1.date).toBe("2026-07-04");
    expect(d1.LCP).toEqual({ p75: 1834.5, samples: 120 });
    expect(d1.CLS.p75).toBeCloseTo(0.081, 3);
  });

  it("天数钳制 1-30", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    expect((await svc.daily(999)).days).toBe(30);
    expect((await svc.daily(0)).days).toBe(1);
  });

  it("空数据返回空序列", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    const r = await svc.daily();
    expect(r.series).toEqual([]);
  });
});
