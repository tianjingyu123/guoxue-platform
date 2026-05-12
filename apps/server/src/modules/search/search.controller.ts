import { Controller, Get, Delete, Query, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request, Response } from "express";
import { SearchService } from "./search.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
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
  saveHistory(@Req() req: Request, @Query("keyword") keyword: string) {
    return this.svc.saveHistory(req.user.id, keyword);
  }

  /** 我的搜索历史 */
  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的搜索历史" })
  @ApiBearerAuth()
  getHistory(@Req() req: Request) {
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
  clearHistory(@Req() req: Request) {
    return this.svc.clearHistory(req.user.id);
  }

  /** 搜索统计（管理后台用） */
  @Get("stats")
  @ApiOperation({ summary: "获取搜索统计" })
  getStats() {
    return this.svc.getStats();
  }

  /** SSE 流式搜索 */
  @Get("stream")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "SSE 流式搜索（逐类型推送结果）" })
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
