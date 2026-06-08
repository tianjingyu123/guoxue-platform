import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Req, HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CompetitionService } from "./competition.service";
import {
  CreateCompetitionDto, UpdateCompetitionDto, CreateRoundDto, CreateQuestionDto,
  BatchCreateQuestionDto, SubmitAnswerDto, GradeAnswerDto, SubmitScoreDto,
  QueryCompetitionDto, QueryRankingDto,
  UpdateRegistrationDto, RegisterCompetitionDto, BatchSubmitAnswerDto,
} from "./competition.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

// ═══════════════════ 管理后台接口 ═══════════════════

@ApiTags("赛事管理")
@Controller("admin/competitions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class CompetitionAdminController {
  constructor(private readonly service: CompetitionService) {}

  @Post()
  @ApiOperation({ summary: "创建赛事" })
  create(@Body() dto: CreateCompetitionDto) {
    return this.service.createCompetition(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新赛事" })
  update(@Param("id") id: string, @Body() dto: UpdateCompetitionDto) {
    return this.service.updateCompetition(id, dto);
  }

  @Post(":id/publish")
  @ApiOperation({ summary: "发布赛事" })
  publish(@Param("id") id: string) {
    return this.service.publishCompetition(id);
  }

  @Post(":id/start")
  @ApiOperation({ summary: "开始赛事" })
  start(@Param("id") id: string) {
    return this.service.startCompetition(id);
  }

  @Post(":id/finish")
  @ApiOperation({ summary: "结束赛事" })
  finish(@Param("id") id: string) {
    return this.service.finishCompetition(id);
  }

  @Get()
  @ApiOperation({ summary: "赛事列表" })
  list(@Query() query: QueryCompetitionDto) {
    return this.service.listCompetitions(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "赛事详情" })
  get(@Param("id") id: string) {
    return this.service.getCompetition(id);
  }

  // ── 赛程 ──

  @Post(":id/rounds")
  @ApiOperation({ summary: "创建赛程" })
  createRound(@Param("id") id: string, @Body() dto: CreateRoundDto) {
    dto.competitionId = id;
    return this.service.createRound(dto);
  }

  @Get(":id/rounds")
  @ApiOperation({ summary: "赛程列表" })
  getRounds(@Param("id") id: string) {
    return this.service.getRounds(id);
  }

  @Put(":id/rounds/:roundId")
  @ApiOperation({ summary: "更新赛程" })
  updateRound(@Param("roundId") roundId: string, @Body() dto: any) {
    return this.service.updateRound(roundId, dto);
  }

  // ── 题库 ──

  @Post(":id/questions")
  @ApiOperation({ summary: "创建题目" })
  createQuestion(@Param("id") id: string, @Body() dto: CreateQuestionDto) {
    dto.competitionId = id;
    return this.service.createQuestion(dto);
  }

  @Post(":id/questions/batch")
  @ApiOperation({ summary: "批量创建题目" })
  batchCreateQuestions(@Param("id") id: string, @Body() dto: BatchCreateQuestionDto) {
    const questions = dto.questions.map((q) => ({ ...q, competitionId: id }));
    return this.service.batchCreateQuestions(questions);
  }

  @Put(":id/questions/:questionId")
  @ApiOperation({ summary: "更新题目" })
  updateQuestion(@Param("questionId") questionId: string, @Body() dto: any) {
    return this.service.updateQuestion(questionId, dto);
  }

  @Get(":id/questions")
  @ApiOperation({ summary: "题目列表" })
  listQuestions(
    @Param("id") id: string,
    @Query("roundId") roundId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.service.listQuestions(id, roundId, Number(page) || 1, Number(pageSize) || 50);
  }

  // ── 报名 ──

  @Get(":id/registrations")
  @ApiOperation({ summary: "报名列表" })
  listRegistrations(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.service.listRegistrations(id, Number(page) || 1, Number(pageSize) || 50);
  }

  @Put(":id/registrations/:regId")
  @ApiOperation({ summary: "更新报名状态" })
  updateRegistration(
    @Param("id") id: string,
    @Param("regId") regId: string,
    @Body() body: UpdateRegistrationDto,
  ) {
    return this.service.updateRegistration(regId, body.status);
  }

  // ── 排名 ──

  @Get(":id/rankings")
  @ApiOperation({ summary: "排名列表" })
  getRankings(
    @Param("id") id: string,
    @Query("roundId") roundId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.service.getRankings({ competitionId: id, roundId, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  }

  @Post(":id/calculate-ranking")
  @ApiOperation({ summary: "计算排名" })
  calculateRanking(
    @Param("id") id: string,
    @Query("roundId") roundId?: string,
  ) {
    return this.service.calculateRanking(id, roundId);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "赛事数据统计" })
  getStats(@Param("id") id: string) {
    return this.service.getCompetitionStats(id);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "删除赛事（仅草稿状态）" })
  async remove(@Param("id") id: string) {
    await this.service.deleteCompetition(id);
  }

  @Delete(":id/rounds/:roundId")
  @HttpCode(204)
  @ApiOperation({ summary: "删除赛程" })
  async removeRound(@Param("id") id: string, @Param("roundId") roundId: string) {
    await this.service.deleteRound(roundId);
  }

  @Delete(":id/questions/:questionId")
  @HttpCode(204)
  @ApiOperation({ summary: "删除题目" })
  async removeQuestion(@Param("id") id: string, @Param("questionId") questionId: string) {
    await this.service.deleteQuestion(questionId);
  }
}

// ═══════════════════ 用户端接口（公开/登录） ═══════════════════

@ApiTags("赛事")
@Controller("competitions")
export class CompetitionPublicController {
  constructor(private readonly service: CompetitionService) {}

  @Get()
  @ApiOperation({ summary: "赛事列表（公开）" })
  list(@Query() query: QueryCompetitionDto) {
    // 公开只展示已发布及之后状态的赛事
    return this.service.listCompetitions({ ...query, status: query.status || undefined });
  }

  @Get(":id")
  @ApiOperation({ summary: "赛事详情（公开）" })
  get(@Param("id") id: string) {
    return this.service.getCompetition(id);
  }

  @Get(":id/rankings")
  @ApiOperation({ summary: "排名（公开）" })
  getRankings(
    @Param("id") id: string,
    @Query() query: QueryRankingDto,
  ) {
    return this.service.getRankings({ ...query, competitionId: id });
  }

  @Post(":id/register")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "报名参赛" })
  register(
    @Param("id") id: string,
    @Body() body: RegisterCompetitionDto,
    @Req() req: any,
  ) {
    return this.service.register(id, req.user.id, body.inviterId, body.inviteCode);
  }

  @Get(":id/my-registration")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的报名状态" })
  getMyRegistration(@Param("id") id: string, @Req() req: any) {
    return this.service.getRegistration(id, req.user.id);
  }

  @Get(":id/my-results")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的比赛成绩" })
  getMyResults(@Param("id") id: string, @Req() req: any) {
    return this.service.getMyResults(id, req.user.id);
  }

  @Post("rounds/:roundId/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "提交答题" })
  submitAnswer(@Param("roundId") roundId: string, @Body() dto: SubmitAnswerDto, @Req() req: any) {
    return this.service.submitAnswer(dto, req.user.id);
  }

  @Post("rounds/:roundId/batch-submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "批量提交答题（整卷）" })
  batchSubmit(
    @Param("roundId") roundId: string,
    @Body() dto: BatchSubmitAnswerDto,
    @Req() req: any,
  ) {
    return this.service.batchSubmitAnswers({ ...dto, roundId }, req.user.id);
  }

  @Get("rounds/:roundId/paper")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取试卷（题目乱序）" })
  getPaper(@Param("roundId") roundId: string, @Query("count") count?: string) {
    return this.service.generatePaper(roundId, Number(count) || 30);
  }

  @Get("certificates/:rankingId/view")
  @ApiOperation({ summary: "查看电子证书HTML" })
  async viewCertificate(@Param("rankingId") rankingId: string) {
    return this.service.getCertificateHtml(rankingId);
  }
}

// ═══════════════════ 评委评分接口 ═══════════════════

@ApiTags("赛事评委")
@Controller("competitions/judge")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class CompetitionJudgeController {
  constructor(private readonly service: CompetitionService) {}

  @Get("submissions")
  @ApiOperation({ summary: "获取待评审作品列表", description: "返回评委当前需要评分的作品" })
  async getJudgeSubmissions(@Req() req: any, @Query("competitionId") competitionId?: string) {
    return this.service.getJudgeSubmissions(req.user.id, competitionId);
  }

  @Post("submissions/:id/score")
  @ApiOperation({ summary: "提交评分", description: "对作品进行打分" })
  async submitScore(
    @Param("id") submissionId: string,
    @Body() dto: SubmitScoreDto,
    @Req() req: any,
  ) {
    return this.service.submitScore(submissionId, dto.score, req.user.id, dto.comment, dto.dimScores);
  }

  @Post("answers/:answerId/grade")
  @ApiOperation({ summary: "评委评分（按答案ID）" })
  async gradeAnswer(
    @Param("answerId") answerId: string,
    @Body() dto: GradeAnswerDto,
    @Req() req: any,
  ) {
    const answer = await this.service.getAnswerById(answerId);
    return this.service.manualGrade(answer.registrationId, answer.questionId, dto.score, req.user.id, dto.comment);
  }
}
