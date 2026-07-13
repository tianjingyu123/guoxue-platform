import { Controller, Post, Body, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { PaipanInterpretService } from "./paipan-interpret.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { PaipanInterpretDto } from "./dto/paipan-interpret.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SkipFormat } from "../../common/skip-format.decorator";
import { MemberBenefitService } from "../member/member-benefit.service";
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";

/**
 * 排盘 AI 解读控制器 —— 各排盘工具 result 页「AI 解读」区块的后端入口。
 *
 * 门控：照搬会员权益中枢 MemberBenefitService.consumeAiQuota
 * （会员不限量；免费用户 AI 每日限次，与伴读/白话对照/问答/智玄合并计数）。
 * 审计：AiGatewayService 内部统一写 AiAnalysisRecord（scene=paipan_interpret）。
 */
@ApiTags("排盘AI解读")
@Controller("ai/paipan")
export class PaipanInterpretController {
  private readonly logger = new Logger(PaipanInterpretController.name);

  constructor(
    private readonly interpret: PaipanInterpretService,
    private readonly sse: StreamUnifierService,
    private readonly memberBenefit: MemberBenefitService,
  ) {}

  /** 非流式解读（非 H5 端降级路径） */
  @Post("interpret")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "排盘 AI 解读（非流式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async interpretOnce(@Body() dto: PaipanInterpretDto, @Req() req: Request) {
    // AI 额度门控：会员不限量，免费用户每日限次（超限抛 RATE_LIMITED 引导开会员）
    await this.memberBenefit.consumeAiQuota(req.user.id);
    const res = await this.interpret.interpret(dto, req.user.id);
    return { ...res, disclaimer: RISK_DISCLAIMER };
  }

  /** 流式解读（SSE） */
  @Post("interpret/stream")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "排盘 AI 解读（SSE 流式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async interpretStream(@Body() dto: PaipanInterpretDto, @Req() req: Request, @Res() res: Response) {
    // 额度检查先于 SSE 头：耗尽时以普通 JSON 错误返回，前端走统一错误提示
    await this.memberBenefit.consumeAiQuota(req.user.id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // 生产 nginx 反代禁缓冲，保证逐块下发
    res.flushHeaders();

    try {
      for await (const chunk of this.interpret.prepareStream(dto, req.user.id)) {
        res.write(this.sse.encode({ type: "chunk", content: chunk }));
      }
      res.write(this.sse.encode({ type: "meta", disclaimer: RISK_DISCLAIMER }));
      res.write(this.sse.encode({ type: "done" }));
    } catch (err: any) {
      this.logger.error(`排盘解读SSE流式错误 [${dto.tool}]: ${err.message}`);
      res.write(this.sse.encode({ type: "error", message: err.message || "AI服务异常" }));
    } finally {
      res.end();
    }
  }
}
