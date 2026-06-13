import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { DiscoverService } from "./discover.service";
import { DiscoverQueryDto } from "./discover-query.dto";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

@ApiTags("发现页")
@Controller("discover")
export class DiscoverController {
  constructor(private readonly svc: DiscoverService) {}

  /** 发现页主接口 — 分页 + 品类筛选 + 类型筛选 */
  @Get()
  @ApiOperation({ summary: "发现页聚合（分页+品类筛选+类型筛选）" })
  @ApiResponse({ status: 200, description: "成功" })
  getDiscover(@Query() q: DiscoverQueryDto) {
    return this.svc.getDiscover({
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 10,
      type: q.type,
      categoryLevel1: q.categoryLevel1,
      categoryLevel2: q.categoryLevel2,
    });
  }

  /** 品类导航树 */
  @Get("categories")
  @ApiOperation({ summary: "发现页品类导航树" })
  @ApiResponse({ status: 200, description: "成功" })
  getCategories() {
    return this.svc.getCategoryTree();
  }

  /** 热门内容（运营引擎标记热榜） */
  @Get("hot")
  @ApiOperation({ summary: "热门内容（运营引擎热榜池）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getHotContent(
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    return this.svc.getHotContent(page || 1, pageSize || 10);
  }

  /** 个性化推荐 — 可选鉴权 */
  @Get("recommendations")
  @ApiOperation({ summary: "个性化推荐（可选登录）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiBearerAuth()
  @UseGuards(OptionalAuthGuard)
  getRecommendations(
    @Req() req: any,
    @Query("page") page?: number,
    @Query("pageSize") pageSize?: number,
  ) {
    const userId = req.user?.id || undefined;
    return this.svc.getRecommendations(userId, page || 1, pageSize || 10);
  }
}
