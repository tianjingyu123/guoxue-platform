import { Controller, Post, Body, Req, Res, UseGuards, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IsString, IsArray, IsOptional, IsNumber } from "class-validator";
import { Request, Response } from "express";
import { AiGatewayService } from "./ai-gateway.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

class ChatDto {
  @IsString()
  scene!: string;

  @IsArray()
  messages!: Array<{ role: "system" | "user" | "assistant"; content: string }>;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  topP?: number;
}

@ApiTags("AI网关")
@Controller("ai")
export class AiGatewayController {
  private readonly logger = new Logger(AiGatewayController.name);

  constructor(private readonly gateway: AiGatewayService) {}

  /** 非流式对话 */
  @Post("chat")
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (err: any) {
      this.logger.error(`SSE流式错误 [${dto.scene}]`, err.message);
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
