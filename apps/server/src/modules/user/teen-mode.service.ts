import { Injectable } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateTeenModeDto } from "./dto/teen-mode.dto";

@Injectable()
export class TeenModeService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { teenModeEnabled: true, teenModeSettings: true },
    });
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "用户不存在");

    const defaults = {
      dailyLimitMinutes: 40,
      blockStartHour: 22,
      blockEndHour: 6,
      contentFilter: "strict",
      guardianPassword: null,
    };

    return {
      enabled: user.teenModeEnabled,
      settings: user.teenModeSettings ? { ...defaults, ...(user.teenModeSettings as any) } : defaults,
    };
  }

  async updateSettings(userId: string, dto: UpdateTeenModeDto) {
    const settings = {
      dailyLimitMinutes: dto.dailyLimitMinutes ?? 40,
      blockStartHour: dto.blockStartHour ?? 22,
      blockEndHour: dto.blockEndHour ?? 6,
      contentFilter: dto.contentFilter ?? "strict",
      guardianPassword: dto.guardianPassword ?? undefined,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { teenModeEnabled: dto.enabled, teenModeSettings: settings as any },
    });

    return { enabled: dto.enabled, settings };
  }
}
