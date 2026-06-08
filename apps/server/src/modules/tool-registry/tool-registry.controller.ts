import { Controller, Get, Post, Param, Query, Body, Req, Header, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { ToolRegistryService } from "./tool-registry.service";
import { ToolAiService } from "./tool-ai.service";
import { ToolCalculationService } from "./tool-calculation.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("工具注册中心")
@Controller("tools")
export class ToolRegistryController {
  constructor(
    private readonly registry: ToolRegistryService,
    private readonly toolAi: ToolAiService,
    private readonly calculator: ToolCalculationService,
  ) {}

  /** 首页工具目录 */
  @Get("directory")
  @Header("Cache-Control", "public, max-age=3600, s-maxage=86400")
  @ApiOperation({ summary: "首页工具目录（按分类分组，CDN缓存1天）" })
  getDirectory() {
    return this.registry.getDirectory();
  }

  /** 全部工具列表 */
  @Get()
  @ApiOperation({ summary: "获取全部工具列表" })
  getAll() {
    return this.registry.getAllTools();
  }

  /** 按分类获取 */
  @Get("category/:category")
  @ApiOperation({ summary: "按分类获取工具列表" })
  getByCategory(@Param("category") category: string) {
    return { tools: this.registry.getByCategory(category) };
  }

  /** 获取单个工具详情 */
  @Get(":id")
  @ApiOperation({ summary: "获取单个工具详情" })
  getById(@Param("id") id: string) {
    return this.registry.getToolById(id) ?? null;
  }

  /** 获取工具输入Schema */
  @Get(":id/input-schema")
  @ApiOperation({ summary: "获取工具输入Schema（前端动态表单）" })
  getInputSchema(@Param("id") id: string) {
    return this.registry.getInputSchema(id);
  }

  /** 工具计算/排盘 */
  @Post(":id/calculate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "执行工具计算/排盘" })
  async calculate(
    @Param("id") toolId: string,
    @Body() body: { input: Record<string, unknown> },
  ) {
    return this.calculator.calculate({ toolId, input: body.input ?? {} });
  }

  /** 获取工具Mock数据 */
  @Get(":id/mock")
  @ApiOperation({ summary: "获取工具Mock数据（前端预览用）" })
  getMockData(@Param("id") id: string) {
    return this.registry.getMockData(id);
  }

  /** 工具AI分析（需登录） */
  @Post(":id/analyze")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "对工具排盘/计算结果进行AI分析" })
  analyze(
    @Param("id") toolId: string,
    @Req() req: any,
    @Body() body: { input: Record<string, unknown>; result: Record<string, unknown>; paipanRecordId?: string },
  ) {
    return this.toolAi.analyze(req.user?.id ?? "anonymous", body.paipanRecordId, {
      toolId,
      input: body.input,
      result: body.result,
    });
  }

  /** 获取AI分析记录 */
  @Get("analysis/:analysisId")
  @ApiOperation({ summary: "获取AI分析记录详情" })
  getAnalysisRecord(@Param("analysisId") analysisId: string, @Req() req: any) {
    return this.toolAi.getAnalysisRecord(analysisId, req.user?.id ?? "anonymous");
  }

  /** 获取用户AI分析历史 */
  @Get("analysis/history/mine")
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取当前用户的AI分析历史" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getUserAnalysisHistory(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.toolAi.getUserHistory(
      req.user?.id ?? "anonymous",
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }
}
