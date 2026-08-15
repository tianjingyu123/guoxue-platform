import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CheckAppVersionDto, CreateAppVersionDto, UpdateAppVersionDto } from "./dto/version.dto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isAppUpdateAvailable, isValidDownloadUrl } from "./version.util";
import { Auditable } from "../../common/audit.decorator";

@ApiTags("版本更新")
@Controller("system/version")
export class VersionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("check")
  @ApiOperation({ summary: "检查更新（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "platform", required: true, description: "ios/android/harmony" })
  @ApiQuery({ name: "version", required: true, description: "当前版本号 如 1.0.0" })
  @ApiQuery({ name: "buildNumber", required: false, description: "当前构建号" })
  async check(@Query() query: CheckAppVersionDto) {
    const [latest, forceFloor] = await Promise.all([
      this.prisma.appVersion.findFirst({
        where: { platform: query.platform },
        orderBy: { publishedAt: "desc" },
      }),
      this.prisma.appVersion.findFirst({
        where: { platform: query.platform, forceUpdate: true },
        orderBy: { publishedAt: "desc" },
      }),
    ]);
    if (!latest) return { hasUpdate: false, latest: null };

    // 强制更新是一条持续有效的最低版本线。后续发布可选更新时，不能意外解除
    // 旧版本的强制升级要求；已达到最低线的用户仍只收到最新可选版本。
    const belowForceFloor = !!forceFloor && isAppUpdateAvailable(
      forceFloor.version,
      query.version,
      forceFloor.buildNumber,
      query.buildNumber,
    );
    // 低于强制最低线的用户直接获得当前最新包，避免先装最低线版本、随后
    // 又升级一次。仅在数据异常（强制线反而比“最新”记录更新）时使用强制线包。
    const forceFloorNewerThanLatest = !!forceFloor && isAppUpdateAvailable(
      forceFloor.version,
      latest.version,
      forceFloor.buildNumber,
      latest.buildNumber,
    );
    const target = belowForceFloor && forceFloorNewerThanLatest ? forceFloor : latest;
    const hasUpdate = isAppUpdateAvailable(
      target.version,
      query.version,
      target.buildNumber,
      query.buildNumber,
    );
    return {
      hasUpdate,
      latest: hasUpdate ? {
        version: target.version,
        buildNumber: target.buildNumber,
        changelog: target.changelog,
        forceUpdate: belowForceFloor || target.forceUpdate,
        downloadUrl: target.downloadUrl,
        policy: belowForceFloor || target.forceUpdate ? "required" : "recommended",
      } : null,
    };
  }

  @Post()
  @Auditable({ action: "发布客户端版本", targetType: "APP_VERSION" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "发布新版本" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminCreate(@Body() dto: CreateAppVersionDto) {
    this.assertDownloadUrl(dto.forceUpdate, dto.downloadUrl);
    const latest = await this.prisma.appVersion.findFirst({
      where: { platform: dto.platform },
      orderBy: { publishedAt: "desc" },
    });
    if (
      latest &&
      !isAppUpdateAvailable(dto.version, latest.version, dto.buildNumber, latest.buildNumber)
    ) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        `新版本必须高于当前已发布版本 ${latest.version}${latest.buildNumber ? ` (${latest.buildNumber})` : ""}`,
      );
    }
    return this.prisma.appVersion.create({ data: dto });
  }

  @Put(":id")
  @Auditable({ action: "更新客户端版本策略", targetType: "APP_VERSION" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新版本信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminUpdate(@Param("id") id: string, @Body() dto: UpdateAppVersionDto) {
    const existing = await this.prisma.appVersion.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "版本记录不存在");
    this.assertDownloadUrl(
      dto.forceUpdate ?? existing.forceUpdate,
      dto.downloadUrl ?? existing.downloadUrl,
    );
    return this.prisma.appVersion.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "删除客户端版本记录", targetType: "APP_VERSION" })
  @ApiBearerAuth()
  @ApiOperation({ summary: "删除版本" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminDelete(@Param("id") id: string) {
    const existing = await this.prisma.appVersion.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "版本记录不存在");
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

  private assertDownloadUrl(forceUpdate?: boolean, downloadUrl?: string | null) {
    if (forceUpdate && !isValidDownloadUrl(downloadUrl)) {
      throw new BusinessException(
        ErrorCode.BAD_REQUEST,
        "强制更新必须配置有效下载地址（https、应用市场或 App Store）",
      );
    }
  }
}
