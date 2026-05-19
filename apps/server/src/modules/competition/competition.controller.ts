import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards, Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CompetitionService } from "./competition.service";
import {
  CreateCompetitionDto, UpdateCompetitionDto, CreateRoundDto, CreateQuestionDto,
  BatchCreateQuestionDto, SubmitAnswerDto, GradeAnswerDto,
  QueryCompetitionDto, QueryRankingDto,
} from "./competition.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { OptionalAuthGuard } from "../../common/optional-auth.guard";
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
    @Body() body: { inviterId?: string; inviteCode?: string },
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

  @Post("rounds/:roundId/submit")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "提交答题" })
  submitAnswer(@Param("roundId") roundId: string, @Body() dto: SubmitAnswerDto, @Req() req: any) {
    return this.service.submitAnswer(dto, req.user.id);
  }

  @Get("rounds/:roundId/paper")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取试卷（题目乱序）" })
  getPaper(@Param("roundId") roundId: string, @Query("count") count?: string) {
    return this.service.generatePaper(roundId, Number(count) || 30);
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

  @Post("answers/:answerId/grade")
  @ApiOperation({ summary: "评委评分" })
  gradeAnswer(
    @Param("answerId") answerId: string,
    @Body() dto: GradeAnswerDto,
    @Req() req: any,
  ) {
    return this.service.manualGrade(answerId, "", dto.score, req.user.id, dto.comment);
  }
}
