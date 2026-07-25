import { Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { SmartFeedService } from "./smart-feed.service";
import { HomeChannelFeedService } from "./home-channel-feed.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";

@ApiTags("AI智能信息流")
@Controller("recommend")
export class SmartFeedController {
  constructor(
    private readonly feed: SmartFeedService,
    private readonly channels: HomeChannelFeedService,
  ) {}

  private normalizeChannel(channel?: string): "recommend" | "following" | "hot" {
    return channel === "following" || channel === "hot" ? channel : "recommend";
  }

  @Get("smart-feed")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取AI智能信息流" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "channel", required: false, enum: ["recommend", "following", "hot"] })
  async getSmartFeed(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("channel") channel = "recommend",
  ) {
    const normalized = this.normalizeChannel(channel);
    if (normalized === "following") {
      return this.channels.getFollowingFeed((req as any).user.id, Number(page), Number(pageSize));
    }
    if (normalized === "hot") {
      return this.channels.getHotFeed(Number(page), Number(pageSize));
    }
    return this.feed.getFeed((req as any).user.id, Number(page), Number(pageSize));
  }

  @Get("smart-feed/feed")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: "获取AI智能信息流（可选登录）",
    description: "登录用户返回个性化分层信息流；未登录返回空 items，由前端回退到热门 feed（诚实降级不白屏）",
  })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiQuery({ name: "channel", required: false, enum: ["recommend", "following", "hot"] })
  async getSmartFeedOptional(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("channel") channel = "recommend",
  ) {
    const userId = (req as any).user?.id;
    const normalized = this.normalizeChannel(channel);
    if (normalized === "following") {
      return this.channels.getFollowingFeed(userId, Number(page), Number(pageSize));
    }
    if (normalized === "hot") {
      return this.channels.getHotFeed(Number(page), Number(pageSize));
    }
    if (!userId) {
      // 未登录：返回匿名热门流（非个性化），支持游客预览首页（不再返回空白）
      return this.feed.getAnonymousFeed(Number(page), Number(pageSize));
    }
    return this.feed.getFeed(userId, Number(page), Number(pageSize));
  }

  @Get("smart-feed/category")
  @ApiOperation({ summary: "按类别取内容流（发现页分区·公开）", description: "type∈course/classic/video/live/article/post/product·统一信封·分页" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: true, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "size", required: false, type: Number })
  async getCategoryFeed(
    @Query("type") type: string,
    @Query("page") page = 1,
    @Query("size") size = 6,
  ) {
    return { items: await this.feed.getCategoryFeed(String(type), Number(page), Number(size)) };
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
