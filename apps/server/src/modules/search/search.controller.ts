import { Controller, Get, Delete, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("搜索")
@Controller("search")
export class SearchController {
  constructor(private svc: SearchService) {}

  /** 全局搜索 */
  @Get()
  @ApiOperation({ summary: "全局搜索" })
  @ApiQuery({ name: "q", required: true, type: String, description: "搜索关键词" })
  @ApiQuery({ name: "type", required: false, type: String, description: "搜索类型" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  search(
    @Query("q") q: string,
    @Query("type") type?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.svc.search({ q: q || "", type, page: +page, pageSize: +pageSize });
  }

  /** 热门搜索 */
  @Get("hot")
  @ApiOperation({ summary: "获取热门搜索" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量" })
  hotSearches(@Query("limit") limit = 10) {
    return this.svc.getHotSearches(+limit);
  }

  /** 保存搜索历史 */
  @Get("history/save")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "保存搜索历史" })
  @ApiBearerAuth()
  @ApiQuery({ name: "keyword", required: true, type: String, description: "搜索关键词" })
  saveHistory(@Req() req: any, @Query("keyword") keyword: string) {
    return this.svc.saveHistory(req.user.id, keyword);
  }

  /** 我的搜索历史 */
  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的搜索历史" })
  @ApiBearerAuth()
  getHistory(@Req() req: any) {
    return this.svc.getHistory(req.user.id);
  }

  /** 搜索建议 */
  @Get("suggest")
  @ApiOperation({ summary: "搜索建议" })
  @ApiQuery({ name: "keyword", required: true, type: String, description: "关键词" })
  suggest(@Query("keyword") keyword: string) {
    return this.svc.suggest(keyword);
  }

  /** 清除搜索历史 */
  @Delete("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "清除搜索历史" })
  @ApiBearerAuth()
  clearHistory(@Req() req: any) {
    return this.svc.clearHistory(req.user.id);
  }

  /** 搜索统计（管理后台用） */
  @Get("stats")
  @ApiOperation({ summary: "获取搜索统计" })
  getStats() {
    return this.svc.getStats();
  }
}
