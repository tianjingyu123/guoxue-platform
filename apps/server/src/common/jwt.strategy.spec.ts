import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy 会话撤销边界", () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const redis = {
    get: jest.fn(),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "jwt-strategy-test-secret";
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", status: "ACTIVE", roles: [] });
    strategy = new JwtStrategy(prisma as any, redis as any);
  });

  it("兼容旧令牌并拒绝撤销时刻之前签发的会话", async () => {
    redis.get.mockResolvedValue(String(10_500));

    await expect(strategy.validate({ sub: "user-1", iat: 10 })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("毫秒级签发时间避免同一秒重新登录被误判为旧会话", async () => {
    redis.get.mockResolvedValue(String(10_500));

    await expect(strategy.validate({ sub: "user-1", iat: 10, sessionIssuedAt: 10_501 })).resolves.toEqual({
      id: "user-1",
      roles: [],
    });
  });

  it("仍拒绝毫秒级撤销时刻之前签发的新格式令牌", async () => {
    redis.get.mockResolvedValue(String(10_500));

    await expect(strategy.validate({ sub: "user-1", sessionIssuedAt: 10_499 })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
