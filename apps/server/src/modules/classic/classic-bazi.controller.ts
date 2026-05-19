import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { BaziClassicQueryService } from "./classic-bazi-query.service";
import { BaziClassicQueryDto, BaziClassicSearchDto } from "./classic-bazi-query.dto";

@ApiTags("命理古籍")
@Controller("classic/bazi")
export class BaziClassicController {
  constructor(private readonly queryService: BaziClassicQueryService) {}

  @Post("query")
  @ApiOperation({ summary: "八字排盘联动查询——根据八字概念查找古籍相关章节" })
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
  search(@Query() dto: BaziClassicSearchDto) {
    return this.queryService.searchBaziClassics(dto.keyword, dto.page, dto.pageSize);
  }

  @Get("books")
  @ApiOperation({ summary: "获取所有命理古籍列表" })
  listBooks() {
    return this.queryService.listBaziBooks();
  }

  @Get("tags")
  @ApiOperation({ summary: "获取可用的八字概念标签列表" })
  listTags() {
    return this.queryService.listAvailableTags();
  }
}
