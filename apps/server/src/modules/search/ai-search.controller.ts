import { Controller, Post, Body, Req, Res, UseGuards, HttpException, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AiGatewayService } from "../ai-gateway/ai-gateway.service";
import { AiSearchDto, AiQueryDto } from "./dto/ai-search.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

@ApiTags("AI搜索")
@Controller("search")
export class AiSearchController {
  constructor(private readonly gateway: AiGatewayService) {}

  /** AI 智能搜索（简化入口，仅需 query） */
  @Post("ai")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI智能搜索 — 输入问题直接返回AI回答" })
  @ApiBearerAuth()
  async aiQuery(@Body() body: AiQueryDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    try {
      const result = await this.gateway.chat({
        scene: "smart_search",
        userId,
        messages: [
          {
            role: "system",
            content: "你是一个博学的国学搜索助手，请根据用户的问题给出简洁准确的回答（300字以内），使用中文。",
          },
          { role: "user", content: body.query },
        ],
        options: { temperature: 0.3, maxTokens: 768 },
      });
      return { answer: result.content, query: body.query };
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw err;
    }
  }

  /** AI 语义搜索总结 */
  @Post("ai/summary")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI搜索总结 — 对搜索结果生成智能总结" })
  @ApiBearerAuth()
  async searchSummary(@Body() body: AiSearchDto, @Req() req: Request) {
    const userId = (req as any).user?.id;
    const resultsText = body.results
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`)
      .join("\n");

    try {
      const result = await this.gateway.chat({
        scene: "smart_search",
        userId,
        messages: [
          {
            role: "system",
            content: "你是一个搜索助手。根据搜索结果，为用户的问题生成简洁的总结（200字以内），突出最相关的内容。使用中文。",
          },
          {
            role: "user",
            content: `用户搜索: ${body.query}\n\n搜索结果:\n${resultsText}\n\n请为这个搜索生成总结。`,
          },
        ],
        options: { temperature: 0.3, maxTokens: 512 },
      });

      return { summary: result.content, query: body.query };
    } catch (err: any) {
      if (err.message?.includes("未配置")) {
        throw new HttpException(err.message, HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw err;
    }
  }

  /** AI 总结流式输出 */
  @Post("ai/summary/stream")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "AI搜索总结流式 (SSE)" })
  @ApiBearerAuth()
  async searchSummaryStream(
    @Body() body: AiSearchDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    const resultsText = body.results
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`)
      .join("\n");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.gateway.chatStream({
        scene: "smart_search",
        userId,
        messages: [
          { role: "system", content: "你是一个搜索助手。根据搜索结果，为用户的问题生成简洁的总结（200字以内），突出最相关的内容。使用中文。" },
          { role: "user", content: `用户搜索: ${body.query}\n\n搜索结果:\n${resultsText}\n\n请为这个搜索生成总结。` },
        ],
        options: { temperature: 0.3, maxTokens: 512 },
      })) {
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
