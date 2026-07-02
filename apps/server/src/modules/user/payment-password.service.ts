import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SmsService } from "../sms/sms.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class PaymentPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
  ) {}

  private readonly SALT_ROUNDS = 10;
  private readonly MAX_FAIL_COUNT = 5;
  private readonly LOCK_SECONDS = 1800; // 30分钟

  /** 设置支付密码 */
  async setPassword(userId: string, password: string, _smsCode: string) {
    if (!/^\d{6}$/.test(password)) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码需为6位数字");
    const existing = await this.prisma.user.findUnique({ where: { id: userId }, select: { paymentPasswordHash: true } });
    if (existing?.paymentPasswordHash) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码已设置，请使用修改功能");

    const hash = await bcrypt.hash(password, this.SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { paymentPasswordHash: hash } });
    return { ok: true };
  }

  /** 修改支付密码 */
  async updatePassword(userId: string, oldPassword: string, newPassword: string) {
    await this.verifyPassword(userId, oldPassword);
    if (!/^\d{6}$/.test(newPassword)) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码需为6位数字");
    const hash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { paymentPasswordHash: hash } });
    return { ok: true };
  }

  /** 验证支付密码（含爆破防护：5次失败后锁定30分钟） */
  async verifyPassword(userId: string, password: string) {
    const lockKey = `paypwd:lock:${userId}`;

    // 检查锁定状态
    const locked = await this.redis.get(lockKey);
    if (locked === "LOCKED") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码错误次数过多，请30分钟后再试");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { paymentPasswordHash: true } });
    if (!user?.paymentPasswordHash) throw new BusinessException(ErrorCode.BAD_REQUEST, "未设置支付密码");

    const valid = await bcrypt.compare(password, user.paymentPasswordHash);
    if (!valid) {
      // 递增失败计数
      const failKey = `paypwd:fail:${userId}`;
      const count = parseInt(await this.redis.get(failKey) || "0", 10) + 1;
      await this.redis.set(failKey, String(count), this.LOCK_SECONDS);
      if (count >= this.MAX_FAIL_COUNT) {
        await this.redis.set(lockKey, "LOCKED", this.LOCK_SECONDS);
        throw new BusinessException(ErrorCode.BAD_REQUEST, `支付密码连续错误${count}次，已锁定30分钟`);
      }
      throw new BusinessException(ErrorCode.BAD_REQUEST, `支付密码错误，还剩${this.MAX_FAIL_COUNT - count}次尝试机会`);
    }

    // 验证成功：清除失败计数
    await this.redis.del(`paypwd:fail:${userId}`);
    return { ok: true };
  }

  /** 重置支付密码（忘记旧密码时，凭注册手机号短信验证码重置） */
  async resetPassword(userId: string, newPassword: string, smsCode: string) {
    if (!/^\d{6}$/.test(newPassword)) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码需为6位数字");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前未绑定手机号，无法通过短信重置");
    // 真校验短信验证码(scene 与前端 sendPhoneCode 一致=RESET_PAY_PWD)，
    // 防止仅凭会话就绕过短信二次验证重置支付密码；verifyCode 失败会抛异常
    await this.sms.verifyCode(user.phone, smsCode, "RESET_PAY_PWD");
    const hash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { paymentPasswordHash: hash } });
    return { ok: true };
  }
}
