import { Controller, Get, Param, Query, Post } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { MarketplaceService } from "./marketplace.service";

@ApiTags("智能体广场")
@Controller("ai/marketplace")
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get("agents")
  @ApiOperation({ summary: "智能体广场列表（聚合Coze机器人+圈子助手）" })
  @ApiQuery({ name: "keyword", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  list(
    @Query("keyword") keyword?: string,
    @Query("category") category?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.marketplace.list({
      keyword,
      category,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @Get("agents/:id")
  @ApiOperation({ summary: "智能体详情" })
  getDetail(@Param("id") id: string) {
    return this.marketplace.getDetail(id);
  }
}
