import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { QuestionService } from "./question.service";
import { AskQuestionDto, AnswerQuestionDto, QuestionQueryDto } from "./question.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("付费问答")
@ApiBearerAuth()
@Controller("question")
export class QuestionController {
  constructor(private svc: QuestionService) {}

  /** 发起付费提问 */
  @Post("ask")
  @UseGuards(JwtAuthGuard)
  ask(@Req() req: any, @Body() dto: AskQuestionDto) {
    return this.svc.ask(req.user.id, dto);
  }

  /** 回答提问 */
  @Post(":id/answer")
  @UseGuards(JwtAuthGuard)
  answer(@Req() req: any, @Param("id") id: string, @Body() dto: AnswerQuestionDto) {
    return this.svc.answer(req.user.id, id, dto);
  }

  /** 围观答案 */
  @Post(":id/peek")
  @UseGuards(JwtAuthGuard)
  peek(@Req() req: any, @Param("id") id: string) {
    return this.svc.peek(req.user.id, id);
  }

  /** 问答列表（圈子维度） */
  @Get()
  listQuestions(@Query() q: QuestionQueryDto) {
    return this.svc.listQuestions(q);
  }

  /** 问答详情 */
  @Get(":id")
  getQuestion(@Param("id") id: string) {
    return this.svc.getQuestion(id);
  }

  /** 管理员触发超时退款 */
  @Post("admin/refund-expired")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  refundExpired() {
    return this.svc.refundExpiredQuestions();
  }
}
