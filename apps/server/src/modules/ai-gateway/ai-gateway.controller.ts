import { Controller, Post, Get, Body, Req, Res, UseGuards, Logger, HttpException, HttpStatus } from "@nestjs/common";
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
    const userId = (req as any).user?.id as string | undefined;
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
        throw new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
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
    const userId = (req as any).user?.id as string | undefined;

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
