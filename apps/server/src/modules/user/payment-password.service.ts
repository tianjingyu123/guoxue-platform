import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class PaymentPasswordService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly SALT_ROUNDS = 10;

  /** 设置支付密码 */
  async setPassword(userId: string, password: string, smsCode: string) {
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

  /** 验证支付密码 */
  async verifyPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { paymentPasswordHash: true } });
    if (!user?.paymentPasswordHash) throw new BusinessException(ErrorCode.BAD_REQUEST, "未设置支付密码");
    const valid = await bcrypt.compare(password, user.paymentPasswordHash);
    if (!valid) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码错误");
    return { ok: true };
  }

  /** 重置支付密码（短信验证码校验） */
  async resetPassword(userId: string, newPassword: string, smsCode: string) {
    if (!smsCode) throw new BusinessException(ErrorCode.BAD_REQUEST, "短信验证码不能为空");
    if (!/^\d{6}$/.test(newPassword)) throw new BusinessException(ErrorCode.BAD_REQUEST, "支付密码需为6位数字");
    const hash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { paymentPasswordHash: hash } });
    return { ok: true };
  }
}
