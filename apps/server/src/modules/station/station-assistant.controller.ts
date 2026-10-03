import { Body, Controller, Delete, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";
import { SkipFormat } from "../../common/skip-format.decorator";
import { StreamUnifierService } from "../ai-gateway/stream-unifier.service";
import { StationAssistantChatDto, StationAssistantSessionQueryDto } from "./station-assistant.dto";
import { StationAssistantService } from "./station-assistant.service";

@ApiTags("站长 AI 经营助理")
@ApiBearerAuth()
@Controller("station/assistant")
@UseGuards(JwtAuthGuard)
export class StationAssistantController {
  constructor(
    private readonly assistant: StationAssistantService,
    private readonly sse: StreamUnifierService,
  ) {}

  @Post("chat")
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "站长 AI 经营助理对话（非流式）" })
  @ApiResponse({ status: 201, description: "回答成功" })
  chat(@Req() req: Request, @Body() dto: StationAssistantChatDto) {
    return this.assistant.chat(req.user.id, dto);
  }

  @Post("chat/stream")
  @SkipFormat()
  @UseGuards(StrictRedisThrottleGuard)
  @ApiOperation({ summary: "站长 AI 经营助理对话（SSE 流式）" })
  @ApiResponse({ status: 201, description: "SSE 流式返回" })
  async chatStream(
    @Req() req: Request,
    @Body() dto: StationAssistantChatDto,
    @Res() res: Response,
  ): Promise<void> {
    const prepared = await this.assistant.chatStream(req.user.id, dto);
    await this.sse.writeSseStream(
      res,
      prepared.stream,
      undefined,
      {
        conversationId: prepared.conversationId,
        disclaimer: prepared.disclaimer,
      },
      "before",
    );
  }

  @Get("session")
  @ApiOperation({ summary: "恢复当前站长的经营助理会话" })
  getSession(@Req() req: Request, @Query() query: StationAssistantSessionQueryDto) {
    return this.assistant.getSession(req.user.id, query.conversationId);
  }

  @Delete("session")
  @ApiOperation({ summary: "清空当前站长的经营助理会话" })
  clearSession(@Req() req: Request, @Query() query: StationAssistantSessionQueryDto) {
    return this.assistant.clearSession(req.user.id, query.conversationId);
  }
}
