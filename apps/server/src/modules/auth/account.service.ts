import { Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { RedisService } from "../../redis/redis.service";
import { SmsService } from "../sms/sms.service";
import { DeleteAccountDto, ChangePhoneDto } from "./auth.dto";
import { buildPhoneFields, phoneHmac } from "../../common/crypto.util";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private sms: SmsService,
  ) {}

  /** 申请注销账号（7天冷静期） */
  async requestDelete(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");
    if (user.deleteRequestedAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "注销申请已提交，请等待处理");

    // 验证密码
    const auth = await this.prisma.auth.findFirst({ where: { userId } });
    if (!auth?.credential) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前账号无密码，无法验证");
    const valid = await bcrypt.compare(dto.password, auth.credential);
    if (!valid) throw new BusinessException(ErrorCode.AUTH_PASSWORD_WRONG, "密码错误");

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7天后

    await this.prisma.user.update({
      where: { id: userId },
      data: { deleteRequestedAt: now, deleteScheduledAt: scheduledAt },
    });

    this.logger.log(`用户 ${userId} 已申请注销，计划执行时间: ${scheduledAt}`);
    return { message: "注销申请已提交", deleteScheduledAt: scheduledAt, coolDownDays: 7 };
  }

  /** 查询注销状态 */
  async getDeleteStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deleteRequestedAt: true, deleteScheduledAt: true, status: true },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    return {
      hasRequested: !!user.deleteRequestedAt,
      deleteRequestedAt: user.deleteRequestedAt,
      deleteScheduledAt: user.deleteScheduledAt,
      isDeleted: user.status === "DISABLED",
    };
  }

  /** 撤销注销申请（冷静期内） */
  async cancelDelete(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.deleteRequestedAt) throw new BusinessException(ErrorCode.BAD_REQUEST, "没有进行中的注销申请");

    await this.prisma.user.update({
      where: { id: userId },
      data: { deleteRequestedAt: null, deleteScheduledAt: null },
    });

    this.logger.log(`用户 ${userId} 已撤销注销申请`);
    return { message: "注销申请已撤销" };
  }

  /** 更换绑定手机号 */
  async changePhone(userId: string, dto: ChangePhoneDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phone) throw new BusinessException(ErrorCode.BAD_REQUEST, "当前未绑定手机号");

    // 验证旧手机号验证码
    const ok1 = await this.sms.verifyCode(user.phone, dto.oldCode, "change-phone-old");
    if (!ok1) throw new BusinessException(ErrorCode.BAD_REQUEST, "旧手机验证码错误");

    // 验证新手机号验证码
    const ok2 = await this.sms.verifyCode(dto.newPhone, dto.newCode, "change-phone-new");
    if (!ok2) throw new BusinessException(ErrorCode.BAD_REQUEST, "新手机验证码错误");

    // 检查新手机号是否已被使用
    const exists = await this.prisma.user.findUnique({ where: { phoneHash: phoneHmac(dto.newPhone) } });
    if (exists) throw new BusinessException(ErrorCode.AUTH_PHONE_EXISTS, "新手机号已被注册");

    await this.prisma.user.update({
      where: { id: userId },
      data: buildPhoneFields(dto.newPhone), // M4 灰度双写：phone + phoneHash + phoneEnc
    });

    this.logger.log(`用户 ${userId} 更换手机号: ${user.phone} → ${dto.newPhone}`);
    return { message: "手机号更换成功", phone: dto.newPhone };
  }
}
