import { Controller, Post, Get, Body, Param, Req, Res, UseGuards, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ClassicQaService } from "./classic-qa.service";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { ClassicQaDto } from "./dto/classic-qa.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("古籍问答")
@Controller("classic")
export class ClassicQaController {
  constructor(private readonly qa: ClassicQaService, private readonly sse: StreamUnifierService) {}

  @Post(":classicId/qa")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "古籍智能问答（非流式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async ask(@Param("classicId") classicId: string, @Body() body: ClassicQaDto, @Req() req: Request) {
    const userId = req.user?.id;
    try {
      return await this.qa.ask(body.question, userId, body.history, classicId);
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw err;
    }
  }

  @Get(":classicId/qa")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "古籍问答历史" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async getHistory(@Param("classicId") classicId: string, @Req() req: Request) {
    return this.qa.getHistory(classicId, req.user?.id);
  }

  @Post(":classicId/qa/stream")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "古籍智能问答（SSE流式）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async askStream(@Param("classicId") classicId: string, @Body() body: ClassicQaDto, @Req() req: Request, @Res() res: Response) {
    const userId = req.user?.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.qa.askStream(body.question, userId, body.history, classicId)) {
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
