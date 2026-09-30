import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { RegisterDistributionDto } from "./dto/distribution.dto";
import { APP_CHANNELS } from "@guoxue/shared";

@Controller("system/distributions")
export class DistributionController {
  constructor(private readonly prisma: PrismaService) {}
  @Get("catalog")
  catalog() {
    return APP_CHANNELS;
  }

  @Get("public/:clientKey")
  async publicRegistration(@Param("clientKey") clientKey: string) {
    return this.prisma.appDistribution.findFirst({
      where: { clientKey, enabled: true },
      select: {
        productId: true,
        applicationId: true,
        platform: true,
        channelId: true,
        clientKey: true,
        packageName: true,
      },
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  list() {
    return this.prisma.appDistribution.findMany({ orderBy: { clientKey: "asc" } });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "登记应用渠道", targetType: "APP_DISTRIBUTION" })
  create(@Body() dto: RegisterDistributionDto) {
    if (!APP_CHANNELS.some(channel => channel.id === dto.channelId && channel.platforms.some(platform => platform === dto.platform))) {
      throw new BadRequestException("渠道与平台组合未登记在目录中");
    }
    // 此入口不能开启 WGT；许可与原生恢复的实测证据必须另行审阅。
    return this.prisma.appDistribution.create({ data: { ...dto, wgtPolicy: "DENIED" } });
  }
}
