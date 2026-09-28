import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { CheckAppVersionDto, CreateAppVersionDto, UpdateAppVersionDto } from "./dto/version.dto";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { isAppUpdateAvailable, isValidPlatformDownloadUrl } from "./version.util";
import { Auditable } from "../../common/audit.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

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
    const latest = await this.prisma.appVersion.findFirst({
      where: { platform: query.platform, status: "ACTIVE" },
      orderBy: { publishedAt: "desc" },
    });
    if (!latest) return { hasUpdate: false, latest: null };

    // 最低支持线会在发布新版本时显式继承，避免后续可选更新意外解除强更要求。
    const belowForceFloor = !!latest.minSupportedVersion && isAppUpdateAvailable(
      latest.minSupportedVersion,
      query.version,
      latest.minSupportedBuildNumber,
      query.buildNumber,
    );
    const hasUpdate = isAppUpdateAvailable(
      latest.version,
      query.version,
      latest.buildNumber,
      query.buildNumber,
    );
    return {
      hasUpdate,
      latest: hasUpdate ? {
        version: latest.version,
        buildNumber: latest.buildNumber,
        changelog: latest.changelog,
        forceUpdate: belowForceFloor,
        downloadUrl: latest.downloadUrl,
        policy: belowForceFloor ? "required" : "recommended",
      } : null,
    };
  }

  @Post()
  @Auditable({ action: "创建客户端版本草稿", targetType: "APP_VERSION" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建版本草稿（不会对客户端生效）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminCreate(@Body() dto: CreateAppVersionDto) {
    const duplicate = await this.prisma.appVersion.findFirst({
      where: {
        platform: dto.platform,
        version: dto.version,
        buildNumber: dto.buildNumber || null,
      },
    });
    if (duplicate) throw new BusinessException(ErrorCode.BAD_REQUEST, "相同平台、版本号和构建号的记录已存在");
    return this.prisma.appVersion.create({
      data: {
        ...dto,
        buildNumber: dto.buildNumber || null,
        downloadUrl: dto.downloadUrl?.trim() || null,
        checksumSha256: dto.checksumSha256?.toLowerCase() || null,
        status: "DRAFT",
        publishedAt: null,
      },
    });
  }

  @Put(":id")
  @Auditable({ action: "更新客户端版本草稿", targetType: "APP_VERSION" })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新版本草稿（已发布记录不可编辑）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  async adminUpdate(@Param("id") id: string, @Body() dto: UpdateAppVersionDto) {
    const existing = await this.prisma.appVersion.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "版本记录不存在");
    if (existing.status !== "DRAFT") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "已发布或已退役版本不可编辑，请新建草稿或执行回退");
    }
    return this.prisma.appVersion.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.buildNumber !== undefined ? { buildNumber: dto.buildNumber || null } : {}),
        ...(dto.downloadUrl !== undefined ? { downloadUrl: dto.downloadUrl.trim() || null } : {}),
        ...(dto.checksumSha256 !== undefined
          ? { checksumSha256: dto.checksumSha256.toLowerCase() || null }
          : {}),
      },
    });
  }

  @Post(":id/publish")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "发布客户端版本", targetType: "APP_VERSION" })
  @ApiBearerAuth()
  @ApiOperation({ summary: "发布草稿并切换为平台当前版本" })
  publish(@Param("id") id: string, @Req() req: Request) {
    return this.activate(id, req.user.id, false);
  }

  @Post(":id/rollback")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "回退客户端版本", targetType: "APP_VERSION" })
  @ApiBearerAuth()
  @ApiOperation({ summary: "将已退役版本重新激活为当前版本" })
  rollback(@Param("id") id: string, @Req() req: Request) {
    return this.activate(id, req.user.id, true);
  }

  @Post(":id/retire")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "紧急停用客户端版本", targetType: "APP_VERSION" })
  @ApiBearerAuth()
  @ApiOperation({ summary: "紧急停用当前版本（客户端将暂时不收到更新）" })
  async retire(@Param("id") id: string, @Req() req: Request) {
    const existing = await this.prisma.appVersion.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "版本记录不存在");
    if (existing.status !== "ACTIVE") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "只有当前生效版本可以停用");
    }
    return this.prisma.appVersion.update({
      where: { id },
      data: {
        status: "RETIRED",
        activePlatformKey: null,
        retiredAt: new Date(),
        retiredBy: req.user.id,
      },
    });
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
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
    if (existing.status !== "DRAFT") {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "已发布记录属于审计证据，不允许删除");
    }
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
    return this.prisma.appVersion.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { publishedAt: "desc" }],
    });
  }

  private activate(id: string, operatorId: string, rollback: boolean) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        `app-version:${id}`,
      );
      const target = await tx.appVersion.findUnique({ where: { id } });
      if (!target) throw new BusinessException(ErrorCode.NOT_FOUND, "版本记录不存在");
      const expectedStatus = rollback ? "RETIRED" : "DRAFT";
      if (target.status !== expectedStatus) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          rollback ? "只有已退役版本可以回退" : "只有草稿可以发布",
        );
      }
      if (!target.buildNumber) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "发布前必须填写构建号");
      }
      if (!target.changelog?.trim()) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "发布前必须填写更新日志");
      }
      if (!isValidPlatformDownloadUrl(target.platform, target.downloadUrl)) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          "发布地址必须是安全 HTTPS 链接或与平台匹配的官方应用市场地址",
        );
      }

      // 按平台串行切换，而不是按记录锁；确保多节点并发发布也只有一个 ACTIVE。
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        `app-version-platform:${target.platform}`,
      );
      const current = await tx.appVersion.findFirst({
        where: { platform: target.platform, status: "ACTIVE" },
        orderBy: { publishedAt: "desc" },
      });
      if (!rollback && current && !isAppUpdateAvailable(
        target.version,
        current.version,
        target.buildNumber,
        current.buildNumber,
      )) {
        throw new BusinessException(
          ErrorCode.BAD_REQUEST,
          `新版本必须高于当前已发布版本 ${current.version}${current.buildNumber ? ` (${current.buildNumber})` : ""}`,
        );
      }

      const duplicate = await tx.appVersion.findFirst({
        where: {
          id: { not: id },
          platform: target.platform,
          version: target.version,
          buildNumber: target.buildNumber,
        },
      });
      if (duplicate) {
        throw new BusinessException(ErrorCode.BAD_REQUEST, "相同平台、版本号和构建号的记录已存在");
      }

      const now = new Date();
      if (current && current.id !== id) {
        await tx.appVersion.update({
          where: { id: current.id },
          data: {
            status: "RETIRED",
            activePlatformKey: null,
            retiredAt: now,
            retiredBy: operatorId,
          },
        });
      }
      const inheritedFloor = rollback
        ? {
          minSupportedVersion: target.minSupportedVersion,
          minSupportedBuildNumber: target.minSupportedBuildNumber,
        }
        : target.forceUpdate
          ? { minSupportedVersion: target.version, minSupportedBuildNumber: target.buildNumber }
          : {
            minSupportedVersion: current?.minSupportedVersion || null,
            minSupportedBuildNumber: current?.minSupportedBuildNumber || null,
          };

      return tx.appVersion.update({
        where: { id },
        data: {
          status: "ACTIVE",
          activePlatformKey: target.platform,
          publishedAt: now,
          publishedBy: operatorId,
          retiredAt: null,
          retiredBy: null,
          ...inheritedFloor,
        },
      });
    });
  }
}
