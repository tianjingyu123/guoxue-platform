import { Controller, Post, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { OperationEngineService } from "./operation-engine.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("自动化运营引擎")
@ApiBearerAuth()
@Controller("operation-engine")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
export class OperationEngineController {
  constructor(private readonly service: OperationEngineService) {}

  @Get("overview")
  @ApiOperation({ summary: "获取运营概览" })
  async getOverview() {
    return this.service.getOverview();
  }

  @Get("recommendations/related")
  @ApiOperation({ summary: "获取关联推荐" })
  @ApiQuery({ name: "categoryLevel1", required: true })
  @ApiQuery({ name: "categoryLevel2", required: false })
  async getRelatedRecommendations(
    @Query("categoryLevel1") categoryLevel1: string,
    @Query("categoryLevel2") categoryLevel2?: string,
  ) {
    return this.service.getRelatedRecommendations(categoryLevel1, categoryLevel2);
  }

  @Get("recommendations/personalized")
  @ApiOperation({ summary: "获取个性化推荐" })
  @ApiQuery({ name: "userId", required: true })
  async getPersonalizedRecommendations(@Query("userId") userId: string) {
    return this.service.getPersonalizedRecommendations(userId);
  }

  @Post("brief")
  @ApiOperation({ summary: "手动生成运营周报" })
  async generateBrief() {
    return this.service.generateWeeklyBrief();
  }

  @Post("detect-empty")
  @ApiOperation({ summary: "手动触发空板块检测" })
  async detectEmpty() {
    await this.service.detectEmptyCategories();
    return { message: "空板块检测已触发" };
  }

  @Post("rotate")
  @ApiOperation({ summary: "手动触发首页内容轮换" })
  async rotate() {
    await this.service.rotateHomepageContent();
    return { message: "首页内容轮换已触发" };
  }
}
