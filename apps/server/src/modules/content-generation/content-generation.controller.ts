import { Controller, Post, Get, Put, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ContentGenerationService } from "./content-generation.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("AI内容生成")
@ApiBearerAuth()
@Controller("content-generation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class ContentGenerationController {
  constructor(private readonly service: ContentGenerationService) {}

  @Post("generate")
  @ApiOperation({ summary: "手动触发生成品类种子内容" })
  async generate(
    @Body()
    body: {
      categoryLevel1: string;
      categoryLevel2?: string;
      types?: ("knowledge" | "classics" | "tutorial")[];
    },
  ) {
    return this.service.generateForCategory(
      body.categoryLevel1,
      body.categoryLevel2,
      body.types,
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "获取品类内容统计" })
  async getStats() {
    return this.service.getCategoryStats();
  }

  @Get("categories")
  @ApiOperation({ summary: "获取品类标签树" })
  async getCategories() {
    return this.service.getCategoryTree();
  }

  @Post("auto-fill")
  @ApiOperation({ summary: "手动触发自动填充空品类" })
  async autoFill() {
    await this.service.autoFillEmptyCategories();
    return { message: "自动填充已触发" };
  }

  // ───────── 新增功能 ─────────

  @Get("history")
  @ApiOperation({ summary: "获取生成历史记录" })
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
  getTaskStatus() {
    return this.service.getTaskStatus();
  }

  @Get("params")
  @ApiOperation({ summary: "获取生成参数配置" })
  getParams() {
    return this.service.getParams();
  }

  @Put("params")
  @ApiOperation({ summary: "更新生成参数配置" })
  updateParams(
    @Body() body: {
      temperature?: number;
      maxTokens?: number;
      delayMs?: number;
      knowledgeCountPerCat?: number;
      classicsCountPerCat?: number;
      tutorialCountPerCat?: number;
    },
  ) {
    return this.service.updateParams(body);
  }
}
