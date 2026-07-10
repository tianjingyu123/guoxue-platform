import { Controller, Post, Body, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ZhixuanService } from "./zhixuan.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { ZhixuanChatDto } from "./dto/zhixuan-chat.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SkipFormat } from "../../common/skip-format.decorator";
import { MemberBenefitService } from "../member/member-benefit.service";
import { RISK_DISCLAIMER } from "../../common/ai-disclaimer";

/**
 * 智玄 AI 助手控制器 —— 平台自建主智能体（DeepSeek 链路，非 Coze）。
 *
 * 门控：照搬会员权益①中枢 MemberBenefitService.consumeAiQuota
 * （会员不限量；免费用户 AI 每日限次，与伴读/白话对照/问答合并计数）。
 * 审计：AiGatewayService 内部统一写 AiAnalysisRecord（scene=zhixuan_chat）。
 */
@ApiTags("智玄助手")
@Controller("ai/zhixuan")
export class ZhixuanController {
  private readonly logger = new Logger(ZhixuanController.name);

  constructor(
    private readonly zhixuan: ZhixuanService,
    private readonly sse: StreamUnifierService,
    private readonly memberBenefit: MemberBenefitService,
  ) {}

  /** 非流式对话（非 H5 端降级路径）：返回富消息数组 */
  @Post("chat")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "智玄助手对话（非流式·富消息）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async chat(@Body() dto: ZhixuanChatDto, @Req() req: Request) {
    // AI 额度门控：会员不限量，免费用户每日限次（超限抛 RATE_LIMITED 引导开会员）
    await this.memberBenefit.consumeAiQuota(req.user.id);
    const res = await this.zhixuan.chat(dto, req.user.id);
    return { ...res, disclaimer: RISK_DISCLAIMER };
  }

  /** 流式对话（SSE）：可能先推 bazi-card 卡片事件，再流式推分析文本 */
  @Post("chat/stream")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "智玄助手流式对话（SSE·富消息）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async chatStream(@Body() dto: ZhixuanChatDto, @Req() req: Request, @Res() res: Response) {
    // 额度检查先于 SSE 头：耗尽时以普通 JSON 错误返回，前端走统一错误提示
    await this.memberBenefit.consumeAiQuota(req.user.id);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // 生产 nginx 反代禁缓冲，保证逐块下发
    res.flushHeaders();

    try {
      const { card, stream } = this.zhixuan.prepareStream(dto, req.user.id);
      // 富消息：先推结构化卡片（如八字盘面），前端立即渲染，再流式推分析文本
      if (card) {
        res.write(this.sse.encode({ type: "card", cardType: "bazi-card", payload: card }));
      }
      for await (const chunk of stream) {
        res.write(this.sse.encode({ type: "chunk", content: chunk }));
      }
      res.write(this.sse.encode({ type: "meta", disclaimer: RISK_DISCLAIMER }));
      res.write(this.sse.encode({ type: "done" }));
    } catch (err: any) {
      this.logger.error(`智玄SSE流式错误: ${err.message}`);
      res.write(this.sse.encode({ type: "error", message: err.message || "AI服务异常" }));
    } finally {
      res.end();
    }
  }
}
