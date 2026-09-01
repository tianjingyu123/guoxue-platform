import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Req, HttpCode,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { CompetitionService } from "./competition.service";
import { CompetitionAdminService } from "./competition-admin.service";
import { StageFlowService } from "./stage-flow.service";
import { TalentService } from "./talent.service";
import {
  CreateCompetitionDto, UpdateCompetitionDto, CreateRoundDto, UpdateRoundDto,
  CreateQuestionDto, UpdateQuestionDto, BatchCreateQuestionDto,
  SubmitAnswerDto, GradeAnswerDto, SubmitScoreDto,
  QueryCompetitionDto, QueryRankingDto,
  UpdateRegistrationDto, RegisterCompetitionDto, BatchSubmitAnswerDto,
  GeneratePaperDto,
} from "./competition.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RedLineGate, RedLine } from "../../common/red-lines";

// ═══════════════════ 管理后台接口 ═══════════════════

@ApiTags("赛事管理")
@Controller("admin/competitions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("SUPER_ADMIN", "OPERATION_ADMIN")
@ApiBearerAuth()
export class CompetitionAdminController {
  constructor(
    private readonly service: CompetitionService,
    private readonly adminService: CompetitionAdminService,
    private readonly stageFlow: StageFlowService,
  ) {}

  @Post()
  @ApiOperation({ summary: "创建赛事（含 stagesConfig/judgePanel 校验）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  create(@Body() dto: CreateCompetitionDto) {
    return this.adminService.createCompetition(dto);
  }

  @Put(":id")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "更新赛事（未开赛可改）" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  update(@Param("id") id: string, @Body() dto: UpdateCompetitionDto) {
    return this.adminService.updateCompetition(id, dto);
  }

  // ── 阶段（二期·赛事创建系统） ──

  @Get(":id/stages")
  @ApiOperation({ summary: "阶段列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getStages(@Param("id") id: string) {
    return this.adminService.getStages(id);
  }

  @Post(":id/stages/generate")
  @ApiOperation({ summary: "按 stagesConfig 生成阶段（幂等可重跑）" })
  @ApiResponse({ status: 201, description: "生成成功" })
  @ApiResponse({ status: 400, description: "阶段配置不合法" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  generateStages(@Param("id") id: string) {
    return this.adminService.generateStages(id);
  }

  @Post(":id/stages/:seq/advance")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH, RedLine.IRREVERSIBLE)
  @ApiOperation({ summary: "人工强制推进阶段（兜底·状态机单步·审计留痕）" })
  @ApiResponse({ status: 201, description: "推进成功" })
  @ApiResponse({ status: 400, description: "阶段不可推进或推进失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  advanceStage(@Param("id") id: string, @Param("seq") seq: string, @Req() req: Request) {
    return this.stageFlow.forceAdvance(id, Number(seq), req.user.id, req.ip);
  }

  @Get(":id/flow-status")
  @ApiOperation({ summary: "赛程流转进程监控（各阶段状态/名单规模/晋级淘汰计数）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  flowStatus(@Param("id") id: string) {
    return this.stageFlow.getFlowStatus(id);
  }

  @Post(":id/generate-paper")
  @ApiOperation({ summary: "AI组卷（纯规则：按难度/分类分布从题库随机抽题）" })
  @ApiResponse({ status: 201, description: "组卷成功" })
  @ApiResponse({ status: 400, description: "参数校验失败或题库为空" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  generatePaper(@Param("id") id: string, @Body() dto: GeneratePaperDto) {
    return this.adminService.generatePaper(id, dto);
  }

  @Post(":id/publish")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "发布赛事" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  publish(@Param("id") id: string) {
    return this.service.publishCompetition(id);
  }

  @Post(":id/start")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "开始赛事" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  start(@Param("id") id: string) {
    return this.service.startCompetition(id);
  }

  @Post(":id/finish")
  @RedLineGate(RedLine.EXTERNAL_PUBLISH)
  @ApiOperation({ summary: "结束赛事" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  finish(@Param("id") id: string) {
    return this.service.finishCompetition(id);
  }

  @Get()
  @ApiOperation({ summary: "赛事列表" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Query() query: QueryCompetitionDto) {
    return this.service.listCompetitions(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "赛事详情" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  get(@Param("id") id: string) {
    return this.service.getCompetition(id);
  }

  // ── 赛程 ──

  @Post(":id/rounds")
  @ApiOperation({ summary: "创建赛程" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createRound(@Param("id") id: string, @Body() dto: CreateRoundDto) {
    dto.competitionId = id;
    return this.service.createRound(dto);
  }

  @Get(":id/rounds")
  @ApiOperation({ summary: "赛程列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRounds(@Param("id") id: string) {
    return this.service.getRounds(id);
  }

  @Put(":id/rounds/:roundId")
  @ApiOperation({ summary: "更新赛程" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateRound(@Param("roundId") roundId: string, @Body() dto: UpdateRoundDto) {
    return this.service.updateRound(roundId, dto);
  }

  // ── 题库 ──

  @Post(":id/questions")
  @ApiOperation({ summary: "创建题目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  createQuestion(@Param("id") id: string, @Body() dto: CreateQuestionDto) {
    dto.competitionId = id;
    return this.service.createQuestion(dto);
  }

  @Post(":id/questions/batch")
  @ApiOperation({ summary: "批量创建题目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  batchCreateQuestions(@Param("id") id: string, @Body() dto: BatchCreateQuestionDto) {
    const questions = dto.questions.map((q) => ({ ...q, competitionId: id }));
    return this.service.batchCreateQuestions(questions);
  }

  @Put(":id/questions/:questionId")
  @ApiOperation({ summary: "更新题目" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  updateQuestion(@Param("questionId") questionId: string, @Body() dto: UpdateQuestionDto) {
    return this.service.updateQuestion(questionId, dto);
  }

  @Get(":id/questions")
  @ApiOperation({ summary: "题目列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  listRegistrations(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.service.listRegistrations(id, Number(page) || 1, Number(pageSize) || 50);
  }

  @Put(":id/registrations/:regId")
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "更新报名状态" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
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
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getRankings(
    @Param("id") id: string,
    @Query("roundId") roundId?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.service.getRankings({ competitionId: id, roundId, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  }

  @Post(":id/calculate-ranking")
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "计算排名" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  calculateRanking(
    @Param("id") id: string,
    @Query("roundId") roundId?: string,
  ) {
    return this.service.calculateRanking(id, roundId);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "赛事数据统计" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  getStats(@Param("id") id: string) {
    return this.service.getCompetitionStats(id);
  }

  @Delete(":id")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @HttpCode(204)
  @ApiOperation({ summary: "删除赛事（仅草稿状态）" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async remove(@Param("id") id: string) {
    await this.service.deleteCompetition(id);
  }

  @Delete(":id/rounds/:roundId")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @HttpCode(204)
  @ApiOperation({ summary: "删除赛程" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async removeRound(@Param("id") id: string, @Param("roundId") roundId: string) {
    await this.service.deleteRound(roundId);
  }

  @Delete(":id/questions/:questionId")
  @RedLineGate(RedLine.IRREVERSIBLE)
  @HttpCode(204)
  @ApiOperation({ summary: "删除题目" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async removeQuestion(@Param("id") id: string, @Param("questionId") questionId: string) {
    await this.service.deleteQuestion(questionId);
  }
}

// ═══════════════════ 用户端接口（公开/登录） ═══════════════════

@ApiTags("赛事")
@Controller("competitions")
export class CompetitionPublicController {
  constructor(
    private readonly service: CompetitionService,
    private readonly talent: TalentService,
  ) {}

  @Get()
  @ApiOperation({ summary: "赛事列表（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  list(@Query() query: QueryCompetitionDto) {
    return this.service.listPublicCompetitions({ ...query, status: query.status || undefined });
  }

  // ── 人才库（二期·赛-P4）——静态路径须先于 :id 声明，否则被详情通配吞掉 ──

  @Get("talents")
  @ApiOperation({ summary: "赛事人才榜（公开·脱敏昵称头像+战绩·含讲师认证标）" })
  @ApiResponse({ status: 200, description: "成功" })
  listTalents(@Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.talent.listTalents(page, pageSize);
  }

  @Get("talents/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的赛事战绩档案（完整轨迹+榜上位次+认证状态）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  myTalentProfile(@Req() req: Request) {
    return this.talent.getMyProfile(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "赛事详情（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  get(@Param("id") id: string) {
    return this.service.getPublicCompetition(id);
  }

  @Get(":id/rankings")
  @ApiOperation({ summary: "排名（公开）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  async getRankings(
    @Param("id") id: string,
    @Query() query: QueryRankingDto,
  ) {
    await this.service.assertPublicCompetition(id);
    return this.service.getRankings({ ...query, competitionId: id });
  }

  @Get(":id/questions/disclosure")
  @ApiOperation({ summary: "赛后题目公示（公开·仅已结束赛事·含答案解析·A16 高透明）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 400, description: "赛事未结束，题目不公开" })
  @ApiResponse({ status: 404, description: "赛事不存在" })
  async disclosureQuestions(@Param("id") id: string) {
    await this.service.assertPublicCompetition(id);
    return this.service.disclosureQuestions(id);
  }

  @Post(":id/register")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "报名参赛" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  async register(
    @Param("id") id: string,
    @Body() body: RegisterCompetitionDto,
    @Req() req: Request,
  ) {
    await this.service.assertPublicCompetition(id);
    return this.service.register(id, req.user.id, body.inviterId, body.inviteCode);
  }

  @Get(":id/my-registration")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的报名状态" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getMyRegistration(@Param("id") id: string, @Req() req: Request) {
    await this.service.assertPublicCompetition(id);
    return this.service.getRegistration(id, req.user.id);
  }

  @Get(":id/my-results")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "我的比赛成绩" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 404, description: "资源不存在" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getMyResults(@Param("id") id: string, @Req() req: Request) {
    await this.service.assertPublicCompetition(id);
    return this.service.getMyResults(id, req.user.id);
  }

  @Post("rounds/:roundId/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "提交答题" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  async submitAnswer(@Param("roundId") roundId: string, @Body() dto: SubmitAnswerDto, @Req() req: Request) {
    await this.service.assertPublicRound(roundId);
    return this.service.submitAnswer(dto, req.user.id);
  }

  @Post("rounds/:roundId/batch-submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "批量提交答题（整卷）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  @ApiResponse({ status: 401, description: "未登录" })
  async batchSubmit(
    @Param("roundId") roundId: string,
    @Body() dto: BatchSubmitAnswerDto,
    @Req() req: Request,
  ) {
    await this.service.assertPublicRound(roundId);
    return this.service.batchSubmitAnswers({ ...dto, roundId }, req.user.id);
  }

  @Get("rounds/:roundId/paper")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取试卷（题目乱序）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiResponse({ status: 401, description: "未登录" })
  async getPaper(@Param("roundId") roundId: string, @Query("count") count?: string) {
    await this.service.assertPublicRound(roundId);
    return this.service.generatePaper(roundId, Number(count) || 30);
  }

  @Get("certificates/:rankingId/view")
  @ApiOperation({ summary: "查看电子证书HTML" })
  @ApiResponse({ status: 200, description: "成功" })
  async viewCertificate(@Param("rankingId") rankingId: string) {
    await this.service.assertPublicRanking(rankingId);
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
  @ApiResponse({ status: 200, description: "成功" })
  async getJudgeSubmissions(@Req() req: Request, @Query("competitionId") competitionId?: string) {
    return this.service.getJudgeSubmissions(req.user.id, competitionId);
  }

  @Post("submissions/:id/score")
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "提交评分", description: "对作品进行打分" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async submitScore(
    @Param("id") submissionId: string,
    @Body() dto: SubmitScoreDto,
    @Req() req: Request,
  ) {
    return this.service.submitScore(submissionId, dto.score, req.user.id, dto.comment, dto.dimScores);
  }

  @Post("answers/:answerId/grade")
  @RedLineGate(RedLine.USER_DATA)
  @ApiOperation({ summary: "评委评分（按答案ID）" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async gradeAnswer(
    @Param("answerId") answerId: string,
    @Body() dto: GradeAnswerDto,
    @Req() req: Request,
  ) {
    const answer = await this.service.getAnswerById(answerId);
    return this.service.manualGrade(answer.registrationId, answer.questionId, dto.score, req.user.id, dto.comment);
  }
}
