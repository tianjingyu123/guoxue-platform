import { Injectable } from "@nestjs/common";
import { serverConfig } from "../config/server-config";

/**
 * JWT 密钥服务 — 支持运行时密钥轮换。
 *
 * 轮换流程：
 *   1. 生成新密钥，设入环境变量 JWT_SECRET
 *   2. 旧密钥追加到 JWT_PREVIOUS_SECRETS（逗号分隔）
 *   3. 新 token 自动用当前密钥签发
 *   4. 旧 token 在有效期内仍可验证（过渡期 = token 过期时间）
 *   5. 过渡期后移除 JWT_PREVIOUS_SECRETS
 *
 * 使用方式：
 *   - 签发：调用 getSigningSecret() 获取当前密钥
 *   - 验证：调用 getVerificationSecrets() 获取所有有效密钥列表
 */
@Injectable()
export class JwtSecretService {
  /** 当前签发密钥 */
  getSigningSecret(): string {
    return serverConfig.jwtSecret;
  }

  /** 所有有效验证密钥（当前 + 历史），轮换期间旧 token 仍可验证 */
  getVerificationSecrets(): string[] {
    const current = serverConfig.jwtSecret;
    const previous = serverConfig.jwtPreviousSecrets;

    return [current, ...previous];
  }

  /** 执行密钥轮换：返回新密钥，调用方负责设入环境变量并备份旧值 */
  static generateSecret(length = 64): string {
    const crypto = require("crypto");
    return crypto.randomBytes(length).toString("base64url");
  }
}
