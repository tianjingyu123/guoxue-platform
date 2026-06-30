import { Test } from "@nestjs/testing";
import { TrackService } from "./track.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TrackService", () => {
  let service: TrackService;
  let prisma: { trackEvent: { createMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { trackEvent: { createMany: jest.fn().mockResolvedValue({ count: 1 }) } };
    const moduleRef = await Test.createTestingModule({
      providers: [TrackService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TrackService);
  });

  it("空事件直接返回 count=0，不落库", async () => {
    const r = await service.recordBatch("u1", []);
    expect(r).toEqual({ ok: true, count: 0 });
    expect(prisma.trackEvent.createMany).not.toHaveBeenCalled();
  });

  it("批量落库并关联 userId、ts 转 occurredAt", async () => {
    const r = await service.recordBatch("u1", [{ action: "page_view", path: "/mall/home", ts: 1000 }]);
    expect(r.count).toBe(1);
    const arg = prisma.trackEvent.createMany.mock.calls[0][0];
    expect(arg.data[0]).toMatchObject({ userId: "u1", action: "page_view", path: "/mall/home" });
    expect(arg.data[0].occurredAt).toEqual(new Date(1000));
  });

  it("匿名上报 userId=null", async () => {
    await service.recordBatch(undefined, [{ action: "click" }]);
    const arg = prisma.trackEvent.createMany.mock.calls[0][0];
    expect(arg.data[0].userId).toBeNull();
  });

  it("超 50 条批量截断", async () => {
    const events = Array.from({ length: 60 }, (_, i) => ({ action: "click", ts: i }));
    const r = await service.recordBatch("u1", events);
    expect(r.count).toBe(50);
  });

  it("action 超长截断到 64 字符", async () => {
    await service.recordBatch("u1", [{ action: "x".repeat(200) }]);
    const arg = prisma.trackEvent.createMany.mock.calls[0][0];
    expect(arg.data[0].action.length).toBe(64);
  });

  it("落库异常静默返回 count=0（埋点永不阻塞主流程）", async () => {
    prisma.trackEvent.createMany.mockRejectedValueOnce(new Error("db down"));
    const r = await service.recordBatch("u1", [{ action: "click" }]);
    expect(r).toEqual({ ok: true, count: 0 });
  });
});
