import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ZidianService } from "./zidian.service";
import { ZidianAiService } from "./zidian-ai.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

/**
 * 汉字字典（新华字典 14809 字）
 *
 * 只暴露「必须下沉后端」的数据：繁体 + 拼音 + 释义（原始 JSON 5.2MB，小程序分包 2MB 上限塞不下）。
 * 康熙笔画 / 字形五行 / 81 数理吉凶 / 生肖宜忌 / 汉字结构 / 五音 / 三才 等 24 个字段
 * 全部由前端 pkg-paipan2/lib/zidian-engine.ts 本地计算（所需数据已在分包内），零网络往返。
 *
 * 公开只读接口，不挂鉴权。
 */
@ApiTags("国学字典")
@Controller("zidian")
export class ZidianController {
  constructor(
    private readonly svc: ZidianService,
    private readonly ai: ZidianAiService,
  ) {}

  /** 汉字 AI 解读（需登录 + 限流：一次 DeepSeek 调用有成本） */
  @Post("ai")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "汉字 AI 解读（说文/典籍/起名用例/原创诗句/关联字）" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async interpret(@Body() body: { char: string; birth?: string }) {
    return { ai: await this.ai.interpret(body?.char ?? "", body?.birth) };
  }

  @Get("stats")
  @ApiOperation({ summary: "词典收录量" })
  @ApiResponse({ status: 200, description: "成功" })
  stats() {
    return this.svc.stats();
  }

  @Get("lookup")
  @ApiOperation({ summary: "批量查字（最多 8 字，返回繁体+拼音+释义）" })
  @ApiQuery({ name: "q", required: true, description: "汉字或姓名，最多取前 8 个汉字" })
  @ApiResponse({ status: 200, description: "成功" })
  lookup(@Query("q") q: string) {
    return this.svc.lookup(q ?? "");
  }

  @Get("search")
  @ApiOperation({ summary: "按拼音检索（去声调前缀匹配，最多 50 字）" })
  @ApiQuery({ name: "pinyin", required: true })
  @ApiResponse({ status: 200, description: "成功" })
  searchByPinyin(@Query("pinyin") pinyin: string) {
    return this.svc.searchByPinyin(pinyin ?? "");
  }

  @Get(":char/strokes")
  @ApiOperation({ summary: "单字笔顺（无数据返回 null，前端降级为静态大字）" })
  @ApiResponse({ status: 200, description: "成功" })
  strokes(@Param("char") char: string) {
    return this.svc.strokes(char);
  }

  @Get(":char")
  @ApiOperation({ summary: "单字详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "未收录该字" })
  detail(@Param("char") char: string) {
    return this.svc.detail(char);
  }
}
