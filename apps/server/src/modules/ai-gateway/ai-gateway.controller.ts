import { Controller, Post, Get, Body, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AiGatewayService } from "./ai-gateway.service";
import { ModelRouterService } from "./model-router.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { ChatDto } from "./dto/chat.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/**
 * AI 网关控制器
 *
 * ## 架构选型理由
 * - **为什么自建而非纯 Coze：** 平台需要多模型路由（DeepSeek/Claude/Qwen/本地），
 *   Coze 原生不支持自由切换底层模型，且高并发场景下 Coze 延迟不可控
 * - **为什么用适配器模式：** 每个 AI 厂商 API 格式不同，适配器模式隔离差异，
 *   新增模型只需新增一个 adapter，不影响已有逻辑
 * - **考虑过的方案：**
 *   1. 每个场景直连不同 AI API → 放弃，代码重复、难以统一监控
 *   2. 全部走 Coze → 放弃，模型选择受限、成本高、离线不可用
 *   3. 自建网关 + 适配器（当前方案）→ ✅ 最佳，模型无关、统一限流/监控/降级
 * - **未来演进：** 如果 Coze 开放模型路由 API，可将 Coze 作为一个 adapter 接入，
 *   保持架构不变
 */
@ApiTags("AI网关")
@Controller("ai")
export class AiGatewayController {
  private readonly logger = new Logger(AiGatewayController.name);

  constructor(
    private readonly gateway: AiGatewayService,
    private readonly router: ModelRouterService,
    private readonly sse: StreamUnifierService,
  ) {}

  /** 非流式对话 */
  @Post("chat")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI非流式对话" })
  @ApiBearerAuth()
  async chat(@Body() dto: ChatDto, @Req() req: Request) {
    const userId = req.user?.id;
    try {
      return await this.gateway.chat({
        scene: dto.scene,
        userId,
        messages: dto.messages,
        options: {
          temperature: dto.temperature,
          maxTokens: dto.maxTokens,
          topP: dto.topP,
        },
      });
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI对话服务异常");
      }
      throw err;
    }
  }

  /** 流式对话 (SSE) */
  @Post("chat/stream")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI流式对话 (SSE)" })
  @ApiBearerAuth()
  async chatStream(@Body() dto: ChatDto, @Req() req: Request, @Res() res: Response) {
    const userId = req.user?.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.gateway.chatStream({
        scene: dto.scene,
        userId,
        messages: dto.messages,
        options: {
          temperature: dto.temperature,
          maxTokens: dto.maxTokens,
          topP: dto.topP,
        },
      })) {
        res.write(this.sse.encode({ type: "chunk", content: chunk }));
      }
      res.write(this.sse.encode({ type: "done" }));
    } catch (err: any) {
      this.logger.error(`SSE流式错误 [${dto.scene}]`, err.message);
      res.write(this.sse.encode({ type: "error", message: err.message }));
    } finally {
      res.end();
    }
  }

  // ── 管理员接口：路由配置与预算查询 ──

  @Get("routing-config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取AI模型路由配置（管理员）" })
  @ApiBearerAuth()
  async getRoutingConfig() {
    return this.router.getRoutingConfig();
  }

  @Get("scene-budgets")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "获取所有场景的预算使用情况" })
  @ApiBearerAuth()
  async getSceneBudgets() {
    return this.router.getSceneBudgets();
  }
}
