import { Controller, Post, Body, Req, Res, UseGuards, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IsString, IsArray, IsOptional } from "class-validator";
import { Request, Response } from "express";
import { CustomerServiceService } from "./customer-service.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

class AskDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

@ApiTags("智能客服")
@Controller("ai")
export class CustomerServiceController {
  constructor(private readonly cs: CustomerServiceService) {}

  @Post("customer-service")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "智能客服对话（非流式）" })
  @ApiBearerAuth()
  async ask(@Body() body: AskDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    try {
      return await this.cs.ask(body.question, userId, body.history);
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw err;
    }
  }

  @Post("customer-service/stream")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "智能客服流式对话 (SSE)" })
  @ApiBearerAuth()
  async askStream(@Body() body: AskDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.cs.askStream(body.question, userId, body.history)) {
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
