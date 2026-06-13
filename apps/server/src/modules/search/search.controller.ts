import { Controller, Get, Delete, Query, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { ThrottleGuard } from "../../common/throttle.guard";
import { SearchWeightService } from "./search-weight.service";

@ApiTags("搜索")
@Controller("search")
export class SearchController {
  private readonly logger = new Logger(SearchController.name);
  constructor(private svc: SearchService, private weightSvc: SearchWeightService) {}

  /** 全局搜索 */
  @Get()
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "全局搜索" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "q", required: true, type: String, description: "搜索关键词" })
  @ApiQuery({ name: "type", required: false, type: String, description: "搜索类型" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  async search(
    @Query("q") q: string,
    @Query("type") type?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    const weightMap = await this.weightSvc.getWeightMap();
    return this.svc.search({ q: q || "", type, page: +page, pageSize: +pageSize, weightMap });
  }

  /** 热门搜索 */
  @Get("hot")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "获取热门搜索" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "返回数量" })
  hotSearches(@Query("limit") limit = 10) {
    return this.svc.getHotSearches(+limit);
  }

  /** 保存搜索历史 */
  @Get("history/save")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "保存搜索历史" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  @ApiQuery({ name: "keyword", required: true, type: String, description: "搜索关键词" })
  saveHistory(@Req() req: Request, @Query("keyword") keyword: string) {
    return this.svc.saveHistory(req.user.id, keyword);
  }

  /** 我的搜索历史 */
  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的搜索历史" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  getHistory(@Req() req: Request) {
    return this.svc.getHistory(req.user.id);
  }

  /** 搜索建议 */
  @Get("suggest")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "搜索建议" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "keyword", required: true, type: String, description: "关键词" })
  suggest(@Query("keyword") keyword: string) {
    return this.svc.suggest(keyword);
  }

  /** 清除搜索历史 */
  @Delete("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "清除搜索历史" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  clearHistory(@Req() req: Request) {
    return this.svc.clearHistory(req.user.id);
  }

  /** 搜索统计（管理后台用） */
  @Get("stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取搜索统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getStats() {
    return this.svc.getStats();
  }

  /** 零结果搜索词（管理后台用） */
  @Get("zero-results")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取零结果搜索关键词" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiBearerAuth()
  getZeroResults() {
    return this.svc.getZeroResults();
  }

  /** 语义搜索 */
  @Get("semantic")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "语义搜索 — 向量相似度匹配" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "q", required: true, type: String, description: "搜索关键词" })
  @ApiQuery({ name: "topK", required: false, type: Number, description: "返回数量" })
  async semanticSearch(@Query("q") q: string, @Query("topK") topK = 10) {
    return this.svc.semanticSearch(q || "", +topK);
  }

  /** 相似查询建议 */
  @Get("semantic/suggest")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "相似查询词建议" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "q", required: true, type: String, description: "当前查询词" })
  async suggestSimilar(@Query("q") q: string) {
    return this.svc.suggestSimilarQueries(q || "");
  }

  /** SSE 流式搜索 */
  @Get("stream")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "SSE 流式搜索（逐类型推送结果）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "q", required: true, type: String })
  async searchStream(@Query("q") q: string, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (!q?.trim()) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    const weightMap = await this.weightSvc.getWeightMap();
    const types = ["article", "course", "product", "circle", "video", "user", "classic", "content"];

    for (const type of types) {
      try {
        const result = await this.svc.search({ q, type, page: 1, pageSize: 10, weightMap });
        const key = type + "s"; // articles, courses, etc.
        const items = (result as any)[key] ?? [];
        res.write(`event: ${type}\ndata: ${JSON.stringify({ type, total: items.length, items })}\n\n`);
      } catch (err) {
        this.logger.warn(`SSE搜索 [${type}] 失败: ${(err as Error).message}`);
        res.write(`event: ${type}\ndata: ${JSON.stringify({ type, total: 0, items: [] })}\n\n`);
      }
    }

    res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
}
