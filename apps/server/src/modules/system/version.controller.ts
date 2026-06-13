import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CreateAppVersionDto, UpdateAppVersionDto } from "./dto/version.dto";

@ApiTags("版本更新")
@Controller("system/version")
export class VersionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("check")
  @ApiOperation({ summary: "检查更新（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "platform", required: true, description: "ios/android" })
  @ApiQuery({ name: "version", required: true, description: "当前版本号 如 1.0.0" })
  async check(@Query("platform") platform: string, @Query("version") version: string) {
    const latest = await this.prisma.appVersion.findFirst({
      where: { platform },
      orderBy: { publishedAt: "desc" },
    });
    if (!latest) return { hasUpdate: false };

    const hasUpdate = latest.version !== version;
    return {
      hasUpdate,
      latest: hasUpdate ? {
        version: latest.version,
        buildNumber: latest.buildNumber,
        changelog: latest.changelog,
        forceUpdate: latest.forceUpdate,
        downloadUrl: latest.downloadUrl,
      } : null,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "发布新版本" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminCreate(@Body() dto: CreateAppVersionDto) {
    return this.prisma.appVersion.create({ data: dto });
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新版本信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminUpdate(@Param("id") id: string, @Body() dto: UpdateAppVersionDto) {
    return this.prisma.appVersion.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除版本" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminDelete(@Param("id") id: string) {
    return this.prisma.appVersion.delete({ where: { id } });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "版本列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  adminList(@Query("platform") platform?: string) {
    const where: any = {};
    if (platform) where.platform = platform;
    return this.prisma.appVersion.findMany({ where, orderBy: { publishedAt: "desc" } });
  }
}
