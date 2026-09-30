import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Req, ParseIntPipe,
  Header,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { FeatureFlagService } from "./feature-flag.service";
import { CreateFeatureFlagDto, UpsertFeatureFlagDto, FeaturePreviewContextDto } from "./feature-flag.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { SystemService } from "../system/system.service";
import { serverConfig } from "../../config/server-config";
import { createHash } from "crypto";
import { RedLineGate, RedLine } from "../../common/red-lines";

// ═══════════════════ 管理后台接口 ═══════════════════

@ApiTags("功能开关")
@Controller("admin/feature-flags")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class FeatureFlagController {
  constructor(private readonly service: FeatureFlagService) {}
  @Post(":key/draft")
  @Auditable({ action: "保存运营配置草稿", targetType: "FEATURE_FLAG" })
  saveDraft(@Param("key") key: string, @Body() dto: UpsertFeatureFlagDto, @Req() req: Request) {
    return this.service.saveDraft(key, dto, this.operator(req));
  }
  @Post(":key/preview")
  async preview(@Param("key") key: string, @Body() dto: UpsertFeatureFlagDto, @Req() req: Request, @Query() context: FeaturePreviewContextDto = {}) {
    return this.service.preview(
      key,
      dto,
      context.userId || req.user?.id,
      await this.service.requestScope(context.clientKey ? { headers: { "x-app-client": context.clientKey } } : req),
      context.nativeBuild || String(req.headers?.["x-native-build"] || ""),
    );
  }
  @Post("draft/:id/publish")
  @Roles("SUPER_ADMIN")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "发布运营配置草稿", targetType: "FEATURE_FLAG" })
  publishDraft(@Param("id") id: string, @Req() req: Request) {
    return this.service.publishDraft(id, this.operator(req));
  }

  @Get()
  @ApiOperation({ summary: "列出所有功能开关" })
  @ApiResponse({ status: 200, description: "成功" })
  async list() {
    return this.service.list();
  }

  @Get(":key")
  @ApiOperation({ summary: "获取单个功能开关" })
  @ApiResponse({ status: 200, description: "成功" })
  async get(@Param("key") key: string) {
    return this.service.getByKey(key);
  }

  @Post()
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "创建功能开关", targetType: "FEATURE_FLAG" })
  @ApiOperation({ summary: "创建功能开关" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async create(@Body() dto: CreateFeatureFlagDto, @Req() req: Request) {
    return this.service.upsert(dto.key, dto, this.operator(req));
  }

  @Put(":key")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Auditable({ action: "更新功能开关", targetType: "FEATURE_FLAG" })
  @ApiOperation({ summary: "创建或更新功能开关" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async upsert(
    @Param("key") key: string,
    @Body() dto: UpsertFeatureFlagDto,
    @Req() req: Request) {
    return this.service.upsert(key, dto, this.operator(req));
  }

  @Get(":key/history")
  @ApiOperation({ summary: "查询功能开关历史版本" })
  async history(@Param("key") key: string) {
    return this.service.getHistory(key);
  }

  @Post(":key/rollback/:version")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "回滚功能开关", targetType: "FEATURE_FLAG" })
  @ApiOperation({ summary: "回滚功能开关到指定版本" })
  async rollback(
    @Param("key") key: string,
    @Param("version", ParseIntPipe) version: number,
    @Req() req: Request,
  ) {
    return this.service.rollback(key, version, this.operator(req));
  }

  @Delete(":key")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @Roles("SUPER_ADMIN")
  @Auditable({ action: "删除功能开关", targetType: "FEATURE_FLAG" })
  @ApiOperation({ summary: "删除功能开关" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async delete(@Param("key") key: string) {
    await this.service.delete(key);
    return { success: true };
  }

  private operator(req: Request): string | undefined {
    const user = req.user as { nickname?: string; id?: string } | undefined;
    return user?.id;
  }
}

// ═══════════════════ 公开接口（前端检测功能开关） ═══════════════════

@ApiTags("公开配置")
@Controller("config")
export class FeatureFlagPublicController {
  constructor(
    private readonly service: FeatureFlagService,
    private readonly systemService: SystemService,
  ) {}

  @Get("features")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取当前启用的功能列表（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getEnabledFeatures(@Req() req: Request) {
    const userId = req.user?.id;
    const scope = await this.service.requestScope(req);
    return { features: await this.service.getClientFeatures(userId,
        scope,
        String(req.headers?.["x-native-build"] || ""),
      ),
    };
  }

  @Get("client")
  @Header("Cache-Control", "private, no-store")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "获取客户端远程配置 V1（公开、安全白名单、可缓存）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getClientConfig(@Req() req: Request) {
    const userId = req.user?.id;
    const scope = await this.service.requestScope(req);
    const nativeBuild = String(req.headers?.["x-native-build"] || "");
    const [features, ui, maintenanceEnabled, operations] = await Promise.all([
      this.service.getClientFeatures(userId, scope, nativeBuild),
      this.systemService.getUiConfig(),
      this.systemService.isMaintenanceMode(),
      this.service.getClientOperations(userId, scope, nativeBuild),
    ]);
    const payload = {
      features,
      ui,
      maintenance: { enabled: maintenanceEnabled },
      operations,
      scope,
    };
    const revision = createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex")
      .slice(0, 16);
    const publicDomain = serverConfig.publicDomain.toLowerCase();
    const environment = publicDomain.startsWith("pre-")
      ? "staging"
      : serverConfig.isProduction
        ? "production"
        : "development";
    return {
      schemaVersion: 1,
      revision,
      generatedAt: new Date().toISOString(),
      cacheTtlSeconds: 60,
      environment,
      ...payload,
    };
  }
}
