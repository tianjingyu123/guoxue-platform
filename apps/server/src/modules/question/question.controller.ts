import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { QuestionService } from "./question.service";
import { AskQuestionDto, AnswerQuestionDto, QuestionQueryDto, RejectQuestionDto } from "./question.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { Auditable } from "../../common/audit.decorator";
import { SanitizePipe } from "../../common/sanitize.pipe";

@ApiTags("付费问答")
@ApiBearerAuth()
@Controller("question")
export class QuestionController {
  constructor(private svc: QuestionService) {}

  @Post("ask")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "发起付费提问", description: "消耗虚拟币向指定回答者发起付费提问" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  ask(@Req() req: Request, @Body() dto: AskQuestionDto) {
    return this.svc.ask(req.user.id, dto);
  }

  @Post(":id/answer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "回答提问", description: "被提问者回答问题（仅限回答者本人）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  answer(@Req() req: Request, @Param("id") id: string, @Body() dto: AnswerQuestionDto) {
    return this.svc.answer(req.user.id, id, dto);
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "拒绝提问", description: "被提问者拒绝回答，自动退还虚拟币" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  reject(@Req() req: Request, @Param("id") id: string, @Body() dto?: RejectQuestionDto) {
    return this.svc.reject(req.user.id, id, dto?.reason);
  }

  @Post(":id/peek")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "围观答案", description: "消耗围观币查看已回答的问题内容" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  peek(@Req() req: Request, @Param("id") id: string) {
    return this.svc.peek(req.user.id, id);
  }

  @Get()
  @ApiOperation({ summary: "问答列表", description: "分页查询圈子维度的付费问答列表，支持公开/私密筛选" })
  @ApiResponse({ status: 200, description: "成功" })
  listQuestions(@Query() q: QuestionQueryDto) {
    return this.svc.listQuestions(q);
  }

  @Get(":id")
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: "问答详情", description: "查看单条付费问答的完整信息；非当事人/未围观时 answer 受付费墙保护" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getQuestion(@Req() req: Request, @Param("id") id: string) {
    // 安全：付费墙判断需当前用户身份，OptionalAuthGuard 允许匿名访问（req.user 可能为 undefined）
    return this.svc.getQuestion(id, req.user?.id);
  }

  @Post(":id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @Auditable({ action: "问答退款", targetType: "QUESTION" })
  @ApiOperation({ summary: "单条问答退款", description: "管理员按 questionId 对未回答的付费提问退款：退还提问者灵石、状态流转 REFUNDED，防重复退款" })
  @ApiResponse({ status: 201, description: "退款成功" })
  @ApiResponse({ status: 400, description: "状态不允许退款" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  @ApiResponse({ status: 404, description: "问题不存在" })
  refund(@Req() req: Request, @Param("id") id: string, @Body() dto?: RejectQuestionDto) {
    return this.svc.refundQuestion(id, req.user.id, dto?.reason);
  }

  @Post("admin/refund-expired")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "超时退款", description: "对超时未回答的提问执行自动退款（按各自超时配置）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  @ApiResponse({ status: 403, description: "无权限" })
  refundExpired() {
    return this.svc.refundExpiredQuestions();
  }
}
