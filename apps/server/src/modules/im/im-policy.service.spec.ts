import { Test } from "@nestjs/testing";
import { ImPolicyService } from "./im-policy.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ImPolicyService", () => {
  let service: ImPolicyService;
  let prisma: {
    imPolicyConfig: { findUnique: jest.Mock };
    blacklist: { count: jest.Mock };
    circleMember: { findMany: jest.Mock; count: jest.Mock };
    circle: { findMany: jest.Mock };
    course: { findMany: jest.Mock };
    order: { count: jest.Mock };
    paidQuestion: { count: jest.Mock };
    consultCall: { count: jest.Mock };
    follow: { findUnique: jest.Mock };
    imC2CCounter: { findUnique: jest.Mock; upsert: jest.Mock; updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      imPolicyConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      blacklist: { count: jest.fn().mockResolvedValue(0) },
      circleMember: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      circle: { findMany: jest.fn().mockResolvedValue([]) },
      course: { findMany: jest.fn().mockResolvedValue([]) },
      order: { count: jest.fn().mockResolvedValue(0) },
      paidQuestion: { count: jest.fn().mockResolvedValue(0) },
      consultCall: { count: jest.fn().mockResolvedValue(0) },
      follow: { findUnique: jest.fn().mockResolvedValue(null) },
      imC2CCounter: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn(), updateMany: jest.fn() },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [ImPolicyService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ImPolicyService);
  });

  it("给自己发消息：禁止", async () => {
    const r = await service.evaluateC2C("u1", "u1");
    expect(r.relation).toBe("self");
    expect(r.canSend).toBe(false);
  });

  it("黑名单：禁止发送", async () => {
    prisma.blacklist.count.mockResolvedValue(1);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("blocked");
    expect(r.canSend).toBe(false);
  });

  it("圈友（同圈）：不受限", async () => {
    prisma.circleMember.findMany.mockResolvedValue([{ circleId: "c1" }]);
    prisma.circleMember.count.mockResolvedValue(1);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("circle");
    expect(r.canSend).toBe(true);
    expect(r.remaining).toBe(-1);
  });

  it("付费关系（加入对方圈子）：不受限", async () => {
    prisma.circleMember.findMany.mockResolvedValue([]);
    prisma.circle.findMany.mockResolvedValue([{ id: "c1" }]);
    prisma.circleMember.count.mockResolvedValue(1);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("paid");
    expect(r.canSend).toBe(true);
  });

  it("付费关系（购买对方课程）：不受限", async () => {
    prisma.circle.findMany.mockResolvedValue([]);
    prisma.course.findMany.mockResolvedValue([{ id: "course1" }]);
    prisma.order.count.mockResolvedValue(1);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("paid");
    expect(r.canSend).toBe(true);
  });

  it("付费关系（向对方付费提问）：不受限", async () => {
    prisma.circle.findMany.mockResolvedValue([]);
    prisma.course.findMany.mockResolvedValue([]);
    prisma.paidQuestion.count.mockResolvedValue(1);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("paid");
    expect(r.canSend).toBe(true);
  });

  it("付费关系（与对方付费通话）：不受限", async () => {
    prisma.circle.findMany.mockResolvedValue([]);
    prisma.course.findMany.mockResolvedValue([]);
    prisma.paidQuestion.count.mockResolvedValue(0);
    prisma.consultCall.count.mockResolvedValue(1);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("paid");
    expect(r.canSend).toBe(true);
  });

  it("互相关注：不受限", async () => {
    prisma.follow.findUnique.mockResolvedValue({ id: "f" });
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("mutual");
    expect(r.canSend).toBe(true);
    expect(r.remaining).toBe(-1);
  });

  it("单向关注：默认可发1条", async () => {
    prisma.follow.findUnique
      .mockResolvedValueOnce({ id: "f" })
      .mockResolvedValueOnce(null);
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("following");
    expect(r.canSend).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it("单向关注：配额用尽则禁发", async () => {
    prisma.follow.findUnique.mockResolvedValueOnce({ id: "f" }).mockResolvedValueOnce(null);
    prisma.imC2CCounter.findUnique.mockResolvedValue({ sentCount: 1 });
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("following");
    expect(r.canSend).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.reason).toBe("waiting_reply");
  });

  it("陌生人：默认禁发", async () => {
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("stranger");
    expect(r.canSend).toBe(false);
  });

  it("陌生人：开启 allowStrangerDM 后可发配额内", async () => {
    prisma.imPolicyConfig.findUnique.mockResolvedValue({
      id: "default",
      allowStrangerDM: true,
      followerDMQuota: 1,
      allowImage: true,
      allowVoice: true,
      allowFile: false,
    });
    const r = await service.evaluateC2C("u1", "u2");
    expect(r.relation).toBe("stranger");
    expect(r.canSend).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it("incrementSent：upsert 计数", async () => {
    await service.incrementSent("u1", "u2");
    expect(prisma.imC2CCounter.upsert).toHaveBeenCalled();
  });
});
