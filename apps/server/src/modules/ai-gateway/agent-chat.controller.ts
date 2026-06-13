import { Controller, Post, Get, Body, Param, Req, Res, UseGuards, Logger, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AgentChatService } from "./agent-chat.service";
import { AgentChatDto } from "./dto/agent-chat.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { StrictRedisThrottleGuard } from "../../common/redis-throttle.guard";

/**
 * Agent Chat 控制器
 *
 * 提供面向 C 端用户的智能体广场聊天接口
 * 后端 SSE 代理 Coze Bot API，统一鉴权、限流、日志
 */
@ApiTags("智能体聊天")
@Controller("ai/agent")
export class AgentChatController {
  private readonly logger = new Logger(AgentChatController.name);

  constructor(private readonly agentChat: AgentChatService) {}

  /** 获取可用的 Agent 列表 */
  @Get("list")
  @ApiOperation({ summary: "获取所有可用智能体列表" })
  @ApiResponse({ status: 200, description: "成功" })
  listAgents() {
    return {
      agents: this.agentChat.listAgents(),
      disclaimer: "以上智能体均由AI驱动，输出内容仅供传统文化学习参考，不构成任何决策建议。",
    };
  }

  /** 非流式对话 */
  @Post("chat/:agentId")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "Agent非流式对话" })
  @ApiParam({ name: "agentId", description: "Agent ID", example: "bazi-master" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async chat(
    @Param("agentId") agentId: string,
    @Body() dto: AgentChatDto,
    @Req() req: Request,
  ) {
    if (!req.user?.id) throw new UnauthorizedException("请先登录");
    return this.agentChat.chat(agentId, String(req.user.id), dto.messages);
  }

  /** SSE 流式对话 */
  @Post("chat/:agentId/stream")
  @UseGuards(JwtAuthGuard, StrictRedisThrottleGuard)
  @ApiOperation({ summary: "Agent流式对话 (SSE)" })
  @ApiParam({ name: "agentId", description: "Agent ID", example: "bazi-master" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiBearerAuth()
  async chatStream(
    @Param("agentId") agentId: string,
    @Body() dto: AgentChatDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!req.user?.id) throw new UnauthorizedException("请先登录");

    const config = this.agentChat.getAgentConfig(agentId);
    if (!config) {
      return res.status(404).json({ error: `Agent "${agentId}" 不存在` });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      for await (const chunk of this.agentChat.chatStream(
        agentId,
        String(req.user.id),
        dto.messages,
      )) {
        if (chunk.startsWith("Error:")) {
          res.write(`data: ${JSON.stringify({ type: "error", message: chunk.slice(7) })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    } catch (err: any) {
      this.logger.error(`Agent SSE error [${agentId}]`, err.message);
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
