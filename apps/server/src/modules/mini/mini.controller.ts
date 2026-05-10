import { Controller, Get, Param, Query, UseGuards, NotFoundException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ThrottleGuard } from "../../common/throttle.guard";
import { MiniService } from "./mini.service";
import { MiniHomeQueryDto, MiniContentQueryDto, MiniShareQueryDto } from "./mini.dto";

@ApiTags("小程序")
@Controller("mini")
@UseGuards(ThrottleGuard)
export class MiniController {
  constructor(private mini: MiniService) {}

  @Get("home")
  @ApiOperation({ summary: "小程序首页聚合", description: "返回轮播图、热门内容、最新文章、活跃圈子等首页数据" })
  getHome(@Query() query: MiniHomeQueryDto) {
    return this.mini.getHome(query);
  }

  @Get("contents")
  @ApiOperation({ summary: "小程序内容流", description: "精简版内容列表，支持分页和类型筛选" })
  getContents(@Query() query: MiniContentQueryDto) {
    return this.mini.getContents(query);
  }

  @Get("content/:id")
  @ApiOperation({ summary: "小程序内容详情", description: "精简版内容详情，含缓存" })
  async getContentDetail(@Param("id") id: string) {
    const result = await this.mini.getContentDetail(id);
    if (!result) throw new NotFoundException("内容不存在");
    return result;
  }

  @Get("share-config")
  @ApiOperation({ summary: "小程序分享配置", description: "获取微信分享卡片所需的标题、图片、路径" })
  getShareConfig(@Query() query: MiniShareQueryDto) {
    return this.mini.getShareConfig(query);
  }
}
