import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
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

  constructor(private prisma: PrismaService) {
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
        } catch (err: any) {
          // 当前密钥验证失败，尝试历史密钥
          if (err.name === "TokenExpiredError") {
            return done(err); // 过期直接拒绝，不尝试其他密钥
          }

          for (const secret of previousSecrets) {
            try {
              jwt.verify(rawJwtToken, secret);
              return done(null, secret);
            } catch (err) {
              console.warn(`JWT 历史密钥验证失败: ${(err as Error).message}`);
              // 继续尝试下一个
            }
          }

          return done(err);
        }
      },
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: true },
    });
    if (!user || user.status === "DISABLED") throw new UnauthorizedException();
    return { id: user.id, roles: user.roles.map((r) => r.roleType) };
  }
}
