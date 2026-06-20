import { Controller, Post, Body, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { CustomerServiceService } from "./customer-service.service";
import { StreamUnifierService } from "./stream-unifier.service";
import { AskDto } from "./dto/customer-service.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { SkipFormat } from "../../common/skip-format.decorator";

@ApiTags("智能客服")
@Controller("ai")
export class CustomerServiceController {
  constructor(private readonly cs: CustomerServiceService, private readonly sse: StreamUnifierService) {}

  @Post("customer-service")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "智能客服对话（非流式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async ask(@Body() body: AskDto, @Req() req: Request) {
    const userId = req.user?.id;
    try {
      return await this.cs.ask(body.question, userId, body.history);
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new BusinessException(ErrorCode.THIRD_AI_FAILED, "AI客服服务异常");
      }
      throw err;
    }
  }

  @Post("customer-service/stream")
  @SkipFormat()
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "智能客服流式对话 (SSE)" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async askStream(@Body() body: AskDto, @Req() req: Request, @Res() res: Response) {
    const userId = req.user?.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.cs.askStream(body.question, userId, body.history)) {
        res.write(this.sse.encode({ type: "chunk", content: chunk }));
      }
      res.write(this.sse.encode({ type: "done" }));
    } catch (err: any) {
      res.write(this.sse.encode({ type: "error", message: err.message }));
    } finally {
      res.end();
    }
  }
}
