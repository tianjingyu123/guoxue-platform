import { Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { SmartFeedService } from "./smart-feed.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("AI智能信息流")
@Controller("recommend")
export class SmartFeedController {
  constructor(private readonly feed: SmartFeedService) {}

  @Get("smart-feed")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取AI智能信息流" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async getSmartFeed(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.feed.getFeed((req as any).user.id, Number(page), Number(pageSize));
  }

  @Post("smart-feed/refresh")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "刷新AI智能信息流（重新生成排序）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async refreshFeed(@Req() req: Request) {
    return this.feed.getFeed((req as any).user.id, 1, 20);
  }
}
