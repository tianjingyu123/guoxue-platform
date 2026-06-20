import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ThrottleGuard } from "../../common/throttle.guard";
import { BaziClassicQueryService } from "./classic-bazi-query.service";
import { BaziClassicQueryDto, BaziClassicSearchDto } from "./classic-bazi-query.dto";

@ApiTags("命理古籍")
@Controller("classic/bazi")
export class BaziClassicController {
  constructor(private readonly queryService: BaziClassicQueryService) {}

  @Post("query")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "八字排盘联动查询——根据八字概念查找古籍相关章节" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  queryByTags(@Body() dto: BaziClassicQueryDto) {
    return this.queryService.queryByTags({
      tags: dto.tags,
      dayMaster: dto.dayMaster,
      monthBranch: dto.monthBranch,
      keyword: dto.keyword,
      maxPerBook: dto.maxPerBook,
    });
  }

  @Get("search")
  @ApiOperation({ summary: "全文搜索命理古籍" })
  @ApiResponse({ status: 200, description: "成功" })
  search(@Query() dto: BaziClassicSearchDto) {
    return this.queryService.searchBaziClassics(dto.keyword, dto.page, dto.pageSize);
  }

  @Get("books")
  @ApiOperation({ summary: "获取所有命理古籍列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listBooks() {
    return this.queryService.listBaziBooks();
  }

  @Get("tags")
  @ApiOperation({ summary: "获取可用的八字概念标签列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listTags() {
    return this.queryService.listAvailableTags();
  }
}
