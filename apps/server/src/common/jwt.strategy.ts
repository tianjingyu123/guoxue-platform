import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { BusinessException } from "./business.exception";
import { ErrorCode } from "./error-codes";

/**
 * JWT 多密钥策略 — 支持密钥轮换。
 *
 * 轮换步骤：
 *   1. 生成新密钥 → 设为 JWT_SECRET
 *   2. 旧密钥追加到 JWT_PREVIOUS_SECRETS（逗号分隔）
 *   3. 新签发的 token 使用当前密钥（JwtModule 自动处理）
 *   4. 旧 token 由历史密钥验证，自然过期后移除
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    const currentSecret = process.env.JWT_SECRET;
    if (!currentSecret)
      throw new BusinessException(ErrorCode.INTERNAL_ERROR, "JWT_SECRET 环境变量未设置");

    const previousSecrets = (process.env.JWT_PREVIOUS_SECRETS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: (
        _req: Request,
        rawJwtToken: string,
        done: (err: Error | null, secretOrKey?: string | Buffer) => void,
      ) => {
        // 先尝试当前密钥
        try {
          jwt.verify(rawJwtToken, currentSecret);
          return done(null, currentSecret);
        } catch (err: unknown) {
          const jwtErr = err as jwt.JsonWebTokenError | null;
          // 当前密钥验证失败，尝试历史密钥
          if (jwtErr?.name === "TokenExpiredError") {
            return done(jwtErr); // 过期直接拒绝，不尝试其他密钥
          }

          for (const secret of previousSecrets) {
            try {
              jwt.verify(rawJwtToken, secret);
              return done(null, secret);
            } catch (err) {
              this.logger.warn(`JWT 历史密钥验证失败: ${(err as Error).message}`);
              // 继续尝试下一个
            }
          }

          return done(jwtErr);
        }
      },
    });
  }

  async validate(payload: { sub: string; iat?: number; sessionIssuedAt?: number }) {
    // 改密/重置/封号会写入撤销时刻：撤销前签发的 accessToken 一律拒绝（M1 会话失效）
    const revokedAt = await this.redis.get(`revoked:user:${payload.sub}`);
    // 新令牌携带毫秒级签发时刻，避免改密后同一秒立即重登的新 token 被秒级 iat 误伤。
    // 历史令牌没有该字段时继续兼容 JWT 标准 iat。
    const issuedAt = payload.sessionIssuedAt ?? (payload.iat ? payload.iat * 1000 : undefined);
    if (revokedAt && issuedAt && issuedAt < Number(revokedAt)) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });
    // 安全修复(后端审计P1)：原先只拒 DISABLED，风控封禁写的是 BANNED(risk-control.service ban_user)
    // 且不撤 token → 被封用户 access/refresh 全程有效永不掉线。validate 每请求查库，此处补 BANNED 后
    // 现存 token 也会在下次请求即被拒。
    if (!user || user.status === "DISABLED" || user.status === "BANNED") throw new UnauthorizedException();
    return { id: user.id, roles: user.roles.map((r) => r.roleType) };
  }
}
