import { Controller, Get, Delete, Query, Req, UseGuards } from "@nestjs/common";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("search")
export class SearchController {
  constructor(private svc: SearchService) {}

  /** 全局搜索 */
  @Get()
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
  hotSearches(@Query("limit") limit = 10) {
    return this.svc.getHotSearches(+limit);
  }

  /** 保存搜索历史 */
  @Get("history/save")
  @UseGuards(JwtAuthGuard)
  saveHistory(@Req() req: any, @Query("keyword") keyword: string) {
    return this.svc.saveHistory(req.user.id, keyword);
  }

  /** 我的搜索历史 */
  @Get("history")
  @UseGuards(JwtAuthGuard)
  getHistory(@Req() req: any) {
    return this.svc.getHistory(req.user.id);
  }

  /** 搜索建议 */
  @Get("suggest")
  suggest(@Query("keyword") keyword: string) {
    return this.svc.suggest(keyword);
  }

  /** 清除搜索历史 */
  @Delete("history")
  @UseGuards(JwtAuthGuard)
  clearHistory(@Req() req: any) {
    return this.svc.clearHistory(req.user.id);
  }

  /** 搜索统计（管理后台用） */
  @Get("stats")
  getStats() {
    return this.svc.getStats();
  }
}
