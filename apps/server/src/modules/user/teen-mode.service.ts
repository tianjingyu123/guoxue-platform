import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateTeenModeDto } from "./dto/teen-mode.dto";

const UNAVAILABLE_NOTICE = "未成年人模式正在建设完整保护闭环，当前暂不可开启";

@Injectable()
export class TeenModeService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    // 旧版本只保存了一个布尔开关和包含明文监护密码的 JSON，未接入全局执行链。
    // 在时间、内容、消费、社交和退出防绕过全部生效前，不得把旧状态对外描述为已保护。
    return this.unavailableState();
  }

  async updateSettings(userId: string, dto: UpdateTeenModeDto) {
    if (dto.enabled) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, UNAVAILABLE_NOTICE);
    }

    // 只允许旧客户端/历史用户关闭空壳状态，同时清除可能含明文密码的遗留 JSON。
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        teenModeEnabled: false,
        teenModeSettings: Prisma.DbNull,
      },
    });

    return this.unavailableState();
  }

  private unavailableState() {
    return {
      available: false,
      enabled: false,
      settings: null,
      notice: UNAVAILABLE_NOTICE,
    };
  }
}
