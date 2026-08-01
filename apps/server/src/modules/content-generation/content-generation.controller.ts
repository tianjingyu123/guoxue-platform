import { Controller, Post, Get, Put, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { ContentGenerationService } from "./content-generation.service";
import { OperationalSeedService } from "./operational-seed.service";
import { SeedForm } from "./operational-seed.registry";
import { GenerateContentDto, UpdateContentGenParamsDto } from "./content-generation.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Autonomy, AutonomyLevel } from "../../common/autonomy";
import { Req } from "@nestjs/common";
import { Request } from "express";

@ApiTags("AI内容生成")
@ApiBearerAuth()
@Controller("content-generation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class ContentGenerationController {
  constructor(
    private readonly service: ContentGenerationService,
    private readonly seed: OperationalSeedService,
  ) {}

  @Post("generate")
  @ApiOperation({ summary: "手动触发生成品类种子内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async generate(
    @Body() body: GenerateContentDto,
  ) {
    return this.service.generateForCategory(
      body.categoryLevel1,
      body.categoryLevel2,
      body.types,
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "获取品类内容统计" })
  @ApiResponse({ status: 200, description: "成功" })
  async getStats() {
    return this.service.getCategoryStats();
  }

  @Get("categories")
  @ApiOperation({ summary: "获取品类标签树" })
  @ApiResponse({ status: 200, description: "成功" })
  async getCategories() {
    return this.service.getCategoryTree();
  }

  @Post("auto-fill")
  @ApiOperation({ summary: "手动触发自动填充空品类" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async autoFill() {
    await this.service.autoFillEmptyCategories();
    return { message: "自动填充已触发" };
  }

  // ───────── 新增功能 ─────────

  @Get("history")
  @ApiOperation({ summary: "获取生成历史记录" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "categoryLevel1", required: false })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "limit", required: false })
  getHistory(
    @Query("categoryLevel1") categoryLevel1?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: number,
  ) {
    return this.service.getGenerationHistory({
      categoryLevel1,
      type,
      status,
      limit: limit ? +limit : 50,
    });
  }

  @Get("status")
  @ApiOperation({ summary: "获取生成任务运行状态" })
  @ApiResponse({ status: 200, description: "成功" })
  getTaskStatus() {
    return this.service.getTaskStatus();
  }

  @Get("params")
  @ApiOperation({ summary: "获取生成参数配置" })
  @ApiResponse({ status: 200, description: "成功" })
  getParams() {
    return this.service.getParams();
  }

  @Put("params")
  @ApiOperation({ summary: "更新生成参数配置" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  updateParams(
    @Body() body: UpdateContentGenParamsDto,
  ) {
    return this.service.updateParams(body);
  }

  // ── 运营种子内容（介绍平台玩法/招运营商/教操作·接真实平台知识·生成即草稿·发布走人工闸）──

  @Get("seed-topics")
  @ApiOperation({ summary: "运营种子选题库（真实平台知识·多形式·招运营商/教操作/讲愿景）" })
  @ApiResponse({ status: 200, description: "成功" })
  listSeedTopics() {
    return this.seed.listTopics();
  }

  @Post("seed-draft")
  @Autonomy(AutonomyLevel.L2_ONE_CLICK)
  @ApiOperation({ summary: "生成一条运营种子内容草稿（L2·落 DRAFT 待人工审核发布·发布是 EXTERNAL_PUBLISH 红线）" })
  @ApiResponse({ status: 201, description: "草稿生成成功" })
  @ApiResponse({ status: 404, description: "未知选题" })
  @ApiResponse({ status: 502, description: "AI 生成服务异常" })
  generateSeedDraft(@Body() body: { topic: string; form?: SeedForm }, @Req() req: Request) {
    const u = req.user as { nickname?: string; id?: string } | undefined;
    const operator = u?.nickname || u?.id || "ADMIN";
    return this.seed.generateDraft(body.topic, body.form, operator);
  }
}
