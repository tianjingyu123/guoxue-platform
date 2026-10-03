import { Controller, Get, Put, Post, Param, Body, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { ModelRouterService } from "./model-router.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { UpdateRoutingConfigDto, UpdateSceneRoutingDto } from "./dto/admin-model-routing.dto";
import { SystemService } from "../system/system.service";
import { RedLineGate, RedLine } from "../../common/red-lines";

@ApiTags("AI模型路由配置")
@Controller("admin/ai/routing")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminModelRoutingController {
  constructor(
    private readonly modelRouter: ModelRouterService,
    private readonly systemService: SystemService,
  ) {}

  @Get("config")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取完整路由配置（含场景列表和默认值）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getConfig() {
    return this.modelRouter.getRoutingConfig();
  }

  @Put("config")
  @RedLineGate(RedLine.COMPLIANCE)
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "更新完整路由配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async updateConfig(@Body() dto: UpdateRoutingConfigDto, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string };
    const updatedBy = u?.nickname || u?.id;
    await this.systemService.setConfig("ai_model_routing", JSON.stringify(dto), "AI模型路由配置", updatedBy);
    await this.modelRouter.clearCache();
    return { ok: true };
  }

  @Put("scenes/:scene")
  @RedLineGate(RedLine.COMPLIANCE)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "更新单个场景配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async updateScene(
    @Param("scene") scene: string,
    @Body() dto: UpdateSceneRoutingDto,
    @Req() req: Request,
  ) {
    const config = await this.modelRouter.getRoutingConfig();
    config.scenes[scene] = dto;
    const u = req.user as { nickname?: string; id?: string };
    await this.systemService.setConfig("ai_model_routing", JSON.stringify(config), `更新场景: ${scene}`, u?.nickname || u?.id);
    await this.modelRouter.clearCache();
    return { ok: true, scene };
  }

  @Post("config/validate")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "验证路由配置有效性" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async validateConfig(@Body() dto: UpdateRoutingConfigDto) {
    const warnings: string[] = [];
    const allModels = new Set<string>();
    allModels.add(dto.default.model);
    if (dto.default.fallbackModel) allModels.add(dto.default.fallbackModel);

    for (const [scene, cfg] of Object.entries(dto.scenes || {})) {
      if (!cfg.model) warnings.push(`场景 [${scene}] 缺少主模型`);
      if (cfg.grayRelease && (cfg.grayRelease.percentage < 0 || cfg.grayRelease.percentage > 100)) {
        warnings.push(`场景 [${scene}] 灰度比例超出范围`);
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
      modelCount: allModels.size,
    };
  }

  @Get("config/history")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "配置变更历史" })
  @ApiResponse({ status: 200, description: "成功" })
  async getHistory() {
    return this.systemService.getConfigVersions("ai_model_routing", 1, 20);
  }

  @Get("budgets")
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "各场景预算使用情况" })
  @ApiResponse({ status: 200, description: "成功" })
  async getBudgets() {
    return this.modelRouter.getSceneBudgets();
  }
}
