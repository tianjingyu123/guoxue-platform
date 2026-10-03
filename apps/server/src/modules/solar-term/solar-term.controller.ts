import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { CurrentUserId } from "../../common/current-user.decorator";
import { SolarTermService } from "./solar-term.service";
import { JieqiAiService, type JieqiAiMode } from "./jieqi-ai.service";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("节气仪式")
@Controller("solar-term")
export class SolarTermController {
  constructor(
    private readonly svc: SolarTermService,
    private readonly ai: JieqiAiService,
  ) {}

  /** 节气 AI（诗词深度赏析 / 养生问答）——需登录 + 限流，一次调用有成本 */
  @Post("ai")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "节气 AI：mode=poem 诗词赏析 / mode=health 养生问答" })
  @ApiResponse({ status: 201, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  jieqiAi(@Body() body: { mode: JieqiAiMode; jieqi: string; constitution?: string; question?: string }) {
    return this.ai.ask(body);
  }

  @Get("today")
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "今日节气（是否节气日/当期内容/下一节气/我是否已参与）" })
  @ApiResponse({ status: 200, description: "成功" })
  today(@CurrentUserId() userId?: string) {
    return this.svc.today(userId);
  }

  @Post("participate")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "参与今日节气仪式（仅节气日当天·颁发限定成就）" })
  @ApiResponse({ status: 201, description: "参与成功" })
  participate(@CurrentUserId() userId: string) {
    return this.svc.participate(userId);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我参与过的节气 + 集齐进度 x/24" })
  @ApiResponse({ status: 200, description: "成功" })
  my(@CurrentUserId() userId: string) {
    return this.svc.my(userId);
  }
}
