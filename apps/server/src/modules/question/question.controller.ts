import { Controller, Get, Post, Body, Param, Query, Req, UseGuards, UsePipes } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { QuestionService } from "./question.service";
import { AskQuestionDto, AnswerQuestionDto, QuestionQueryDto, RejectQuestionDto } from "./question.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
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
  ask(@Req() req: Request, @Body() dto: AskQuestionDto) {
    return this.svc.ask(req.user.id, dto);
  }

  @Post(":id/answer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "回答提问", description: "被提问者回答问题（仅限回答者本人）" })
  answer(@Req() req: Request, @Param("id") id: string, @Body() dto: AnswerQuestionDto) {
    return this.svc.answer(req.user.id, id, dto);
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "拒绝提问", description: "被提问者拒绝回答，自动退还虚拟币" })
  reject(@Req() req: Request, @Param("id") id: string, @Body() dto?: RejectQuestionDto) {
    return this.svc.reject(req.user.id, id, dto?.reason);
  }

  @Post(":id/peek")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "围观答案", description: "消耗围观币查看已回答的问题内容" })
  peek(@Req() req: Request, @Param("id") id: string) {
    return this.svc.peek(req.user.id, id);
  }

  @Get()
  @ApiOperation({ summary: "问答列表", description: "分页查询圈子维度的付费问答列表，支持公开/私密筛选" })
  listQuestions(@Query() q: QuestionQueryDto) {
    return this.svc.listQuestions(q);
  }

  @Get(":id")
  @ApiOperation({ summary: "问答详情", description: "查看单条付费问答的完整信息" })
  getQuestion(@Param("id") id: string) {
    return this.svc.getQuestion(id);
  }

  @Post("admin/refund-expired")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "超时退款", description: "对超时未回答的提问执行自动退款（按各自超时配置）" })
  refundExpired() {
    return this.svc.refundExpiredQuestions();
  }
}
