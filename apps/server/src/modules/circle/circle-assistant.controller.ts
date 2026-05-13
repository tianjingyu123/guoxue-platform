import { Controller, Post, Body, Param, Req, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { CircleAssistantService } from "./circle-assistant.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("圈主助理")
@Controller("circles")
export class CircleAssistantController {
  constructor(private readonly assistant: CircleAssistantService) {}

  /** 简化提问（无需 /ask 后缀） */
  @Post(":circleId/assistant")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "向圈主助理提问（简化路径）" })
  @ApiBearerAuth()
  async askSimple(
    @Param("circleId") circleId: string,
    @Body() body: { question: string },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.assistant.ask(body.question, circleId, userId);
  }

  /** 非流式提问 */
  @Post(":circleId/assistant/ask")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "向圈主助理提问（非流式）" })
  @ApiBearerAuth()
  async ask(
    @Param("circleId") circleId: string,
    @Body() body: { question: string; history?: Array<{ role: "system" | "user" | "assistant"; content: string }> },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    return this.assistant.ask(body.question, circleId, userId, body.history);
  }

  /** 流式提问 (SSE) */
  @Post(":circleId/assistant/stream")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "向圈主助理提问（SSE流式）" })
  @ApiBearerAuth()
  async askStream(
    @Param("circleId") circleId: string,
    @Body() body: { question: string; history?: Array<{ role: "system" | "user" | "assistant"; content: string }> },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.assistant.askStream(body.question, circleId, userId, body.history)) {
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
