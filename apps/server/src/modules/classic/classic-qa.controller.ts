import { Controller, Post, Body, Req, Res, UseGuards, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IsString, IsArray, IsOptional } from "class-validator";
import { Request, Response } from "express";
import { ClassicQaService } from "./classic-qa.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

class ClassicQaDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

@ApiTags("古籍问答")
@Controller("classic")
export class ClassicQaController {
  constructor(private readonly qa: ClassicQaService) {}

  @Post("qa")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "古籍智能问答（非流式）" })
  @ApiBearerAuth()
  async ask(@Body() body: ClassicQaDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    try {
      return await this.qa.ask(body.question, userId, body.history);
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw err;
    }
  }

  @Post("qa/stream")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "古籍智能问答（SSE流式）" })
  @ApiBearerAuth()
  async askStream(@Body() body: ClassicQaDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req as any).user?.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.qa.askStream(body.question, userId, body.history)) {
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
