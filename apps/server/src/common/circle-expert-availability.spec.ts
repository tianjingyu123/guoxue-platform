import { Prisma } from "@prisma/client";
import { circleExpertWhere, lockCircleExpertRows } from "./circle-expert-availability";

describe("圈内咨询基础准入", () => {
  const now = new Date("2026-09-05T00:00:00Z");

  it.each(["QUESTION", "CALL", "ANY", "CONFIG"] as const)("%s 使用相同角色/状态/到期门禁", kind => {
    const where = circleExpertWhere(kind, now);
    expect(where.role).toEqual({ in: ["OWNER", "PARTNER", "GUEST"] });
    expect(where.circle).toEqual({ status: "ACTIVE", deletedAt: null });
    expect(where.user).toEqual({ status: "ACTIVE", deletedAt: null });
    expect(where.AND).toEqual([{ OR: [{ expireAt: null }, { expireAt: { gt: now } }] }]);
  });

  it("提问与连麦各自要求正价，配置读取不把零价格当成开通", () => {
    expect(circleExpertWhere("QUESTION", now).questionPriceCoin).toEqual({ gt: 0 });
    expect(circleExpertWhere("QUESTION", now).callPricePerMinuteCoin).toBeUndefined();
    expect(circleExpertWhere("CALL", now).callPricePerMinuteCoin).toEqual({ gt: 0 });
    expect(circleExpertWhere("ANY", now).OR).toEqual([
      { questionPriceCoin: { gt: 0 } }, { callPricePerMinuteCoin: { gt: 0 } },
    ]);
    expect(circleExpertWhere("CONFIG", now).OR).toBeUndefined();
  });

  it("按圈子、用户、成员固定顺序加锁，标识只作为SQL参数", async () => {
    const query = jest.fn().mockResolvedValue([]);
    await lockCircleExpertRows({ $queryRaw: query } as unknown as Prisma.TransactionClient, "c'--", "u1");
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls.map(call => call[0].join("?"))).toEqual([
      'SELECT "id" FROM "Circle" WHERE "id" = ? FOR SHARE',
      'SELECT "id" FROM "User" WHERE "id" = ? FOR SHARE',
      'SELECT "id" FROM "CircleMember" WHERE "circleId" = ? AND "userId" = ? FOR SHARE',
    ]);
    expect(query.mock.calls[0].slice(1)).toEqual(["c'--"]);
    expect(query.mock.calls[2].slice(1)).toEqual(["c'--", "u1"]);
  });

  it("锁异常立即上抛，不静默放行后续业务", async () => {
    const query = jest.fn().mockRejectedValue(new Error("lock-failed"));
    await expect(lockCircleExpertRows({ $queryRaw: query } as unknown as Prisma.TransactionClient, "c1", "u1"))
      .rejects.toThrow("lock-failed");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("锁定快照返回实际命中 ID，空行不假设受到锁保护", async () => {
    const query = jest.fn().mockResolvedValueOnce([{ id: "c1" }]).mockResolvedValueOnce([{ id: "u1" }]).mockResolvedValueOnce([]);
    expect(await lockCircleExpertRows({ $queryRaw: query } as unknown as Prisma.TransactionClient, "c1", "u1"))
      .toEqual({ circleIds: ["c1"], userIds: ["u1"], memberIds: [] });
  });
});
