import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { GradingEngineService } from "./grading-engine.service";

@Injectable()
export class CompetitionService {
  private readonly logger = new Logger(CompetitionService.name);

  constructor(
    private prisma: PrismaService,
    private gradingEngine: GradingEngineService,
  ) {}

  // ═══════════════════ 赛事管理 ═══════════════════

  async createCompetition(dto: any) {
    return this.prisma.competition.create({ data: dto });
  }

  async updateCompetition(id: string, dto: any) {
    await this.getCompetitionOrThrow(id);
    return this.prisma.competition.update({ where: { id }, data: dto });
  }

  async publishCompetition(id: string) {
    const c = await this.getCompetitionOrThrow(id);
    if (c.status !== "DRAFT") throw new BadRequestException("仅草稿状态可发布");
    return this.prisma.competition.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  async startCompetition(id: string) {
    const c = await this.getCompetitionOrThrow(id);
    if (c.status !== "PUBLISHED") throw new BadRequestException("仅已发布状态可开始");
    return this.prisma.competition.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
  }

  async finishCompetition(id: string) {
    return this.prisma.competition.update({
      where: { id },
      data: { status: "FINISHED", finishedAt: new Date() },
    });
  }

  async listCompetitions(query: { type?: string; status?: string; level?: string; organizerId?: string; page?: number; pageSize?: number }) {
    const { type, status, level, organizerId, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (level) where.level = level;
    if (organizerId) where.organizerId = organizerId;

    const [data, total] = await Promise.all([
      this.prisma.competition.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { rounds: { orderBy: { sortOrder: "asc" } }, _count: { select: { registrations: true } } },
      }),
      this.prisma.competition.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  async getCompetition(id: string) {
    return this.prisma.competition.findUnique({
      where: { id },
      include: {
        rounds: { orderBy: { sortOrder: "asc" } },
        _count: { select: { registrations: true, questions: true } },
      },
    });
  }

  // ═══════════════════ 赛程管理 ═══════════════════

  async createRound(dto: any) {
    await this.getCompetitionOrThrow(dto.competitionId);
    return this.prisma.competitionRound.create({
      data: {
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    });
  }

  async updateRound(id: string, dto: any) {
    return this.prisma.competitionRound.update({ where: { id }, data: dto });
  }

  async getRounds(competitionId: string) {
    return this.prisma.competitionRound.findMany({
      where: { competitionId },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ═══════════════════ 题库管理 ═══════════════════

  async createQuestion(dto: any) {
    return this.prisma.competitionQuestion.create({ data: dto });
  }

  async batchCreateQuestions(questions: any[]) {
    return this.prisma.competitionQuestion.createMany({ data: questions });
  }

  async listQuestions(competitionId: string, roundId?: string, page = 1, pageSize = 50) {
    const where: any = { competitionId };
    if (roundId) where.roundId = roundId;
    const [data, total] = await Promise.all([
      this.prisma.competitionQuestion.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.competitionQuestion.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  /** 生成试卷：按轮次随机抽题或按难度递进 */
  async generatePaper(roundId: string, questionCount = 30) {
    const round = await this.prisma.competitionRound.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException("赛程不存在");

    const questions = await this.prisma.competitionQuestion.findMany({
      where: {
        competitionId: round.competitionId,
        OR: [{ roundId }, { roundId: null }],
        isPublished: true,
      },
    });

    // 按难度分组
    const byDifficulty: Record<number, any[]> = {};
    for (const q of questions) {
      byDifficulty[q.difficulty] = byDifficulty[q.difficulty] || [];
      byDifficulty[q.difficulty].push(q);
    }

    // 难度递进策略：容易→困难 比例 40%→30%→20%→10%
    const distribution = [0.4, 0.3, 0.2, 0.1];
    const selected: any[] = [];
    for (let d = 1; d <= 4; d++) {
      const pool = byDifficulty[d] || [];
      const count = Math.floor(questionCount * distribution[d - 1]);
      const shuffled = this.shuffle(pool);
      selected.push(...shuffled.slice(0, count));
    }
    // 补足到目标数量
    const remaining = this.shuffle(questions.filter((q) => !selected.find((s) => s.id === q.id)));
    while (selected.length < questionCount && remaining.length > 0) {
      selected.push(remaining.shift()!);
    }

    // 打乱题目顺序
    return this.shuffle(selected).map((q) => ({
      id: q.id,
      type: q.type,
      score: q.score,
      stem: q.stem,
      options: q.options,
      difficulty: q.difficulty,
    }));
  }

  // ═══════════════════ 报名 ═══════════════════

  async register(competitionId: string, userId: string, inviterId?: string, inviteCode?: string) {
    const competition = await this.getCompetitionOrThrow(competitionId);
    if (competition.status !== "PUBLISHED") throw new BadRequestException("赛事未开放报名");

    // 检查邀请制赛事
    if ((competition as any).isInviteOnly) {
      const invited = await this.prisma.competitionInvitation.findUnique({
        where: { competitionId_inviteeId: { competitionId, inviteeId: userId } },
      });
      if (!invited) {
        if (!inviteCode) throw new BadRequestException("该赛事为邀请制，需要邀请码才能报名");
        const byCode = await this.prisma.competitionInvitation.findFirst({
          where: { competitionId, inviteCode, inviteeId: userId },
        });
        if (!byCode) throw new BadRequestException("邀请码无效或非本人邀请");
      }
    }

    // 检查是否已报名
    const existing = await this.prisma.competitionRegistration.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    });
    if (existing) throw new BadRequestException("已报名过此赛事");

    // 检查人数上限
    if (competition.maxParticipants > 0) {
      const count = await this.prisma.competitionRegistration.count({ where: { competitionId } });
      if (count >= competition.maxParticipants) throw new BadRequestException("报名人数已达上限");
    }

    return this.prisma.competitionRegistration.create({
      data: { competitionId, userId, inviterId, inviteCode, paidFee: competition.entryFee },
    });
  }

  async getRegistration(competitionId: string, userId: string) {
    return this.prisma.competitionRegistration.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    });
  }

  async listRegistrations(competitionId: string, page = 1, pageSize = 50) {
    const where = { competitionId };
    const [data, total] = await Promise.all([
      this.prisma.competitionRegistration.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
      }),
      this.prisma.competitionRegistration.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // ═══════════════════ 答题与评分 ═══════════════════

  async submitAnswer(dto: { registrationId: string; roundId: string; questionId: string; answer: Record<string, any>; duration?: number }, userId: string) {
    // 验证报名归属
    const registration = await this.prisma.competitionRegistration.findUnique({ where: { id: dto.registrationId } });
    if (!registration || registration.userId !== userId) {
      throw new BadRequestException("报名记录不存在或无权操作");
    }

    // 验证答题时间是否在赛程内
    const round = await this.prisma.competitionRound.findUnique({ where: { id: dto.roundId } });
    if (!round) throw new NotFoundException("赛程不存在");
    if (new Date() < round.startAt || new Date() > round.endAt) {
      throw new BadRequestException("不在答题时间窗口内");
    }

    const question = await this.prisma.competitionQuestion.findUnique({ where: { id: dto.questionId } });
    if (!question) throw new NotFoundException("题目不存在");

    // A类评分引擎自动判分
    const gradeResult = this.gradingEngine.grade(
      question.type,
      question.answer as Record<string, any>,
      dto.answer,
      question.score,
    );

    return this.prisma.competitionAnswer.upsert({
      where: { registrationId_questionId: { registrationId: dto.registrationId, questionId: dto.questionId } },
      create: {
        registrationId: dto.registrationId,
        roundId: dto.roundId,
        questionId: dto.questionId,
        answer: dto.answer,
        isCorrect: gradeResult.isCorrect,
        score: gradeResult.score,
        duration: dto.duration ?? 0,
        gradedAt: new Date(),
      },
      update: {
        answer: dto.answer,
        isCorrect: gradeResult.isCorrect,
        score: gradeResult.score,
        duration: dto.duration ?? 0,
        gradedAt: new Date(),
      },
    });
  }

  /** 评委/管理员手动评分（主观题） */
  async manualGrade(registrationId: string, questionId: string, score: number, graderId: string, comment?: string) {
    return this.prisma.competitionAnswer.upsert({
      where: { registrationId_questionId: { registrationId, questionId } },
      create: {
        registrationId,
        roundId: "",
        questionId,
        answer: {},
        score,
        graderId,
        comment,
        gradedAt: new Date(),
      },
      update: { score, graderId, comment, gradedAt: new Date() },
    });
  }

  // ═══════════════════ 排名计算 ═══════════════════

  async calculateRanking(competitionId: string, roundId?: string) {
    const scores = await this.prisma.competitionScore.findMany({
      where: { roundId },
      orderBy: { totalScore: "desc" },
      include: { registration: { select: { userId: true, competitionId: true } } },
    });

    const rankings: any[] = [];
    for (let i = 0; i < scores.length; i++) {
      const s = scores[i];
      const status = i === 0 ? "CHAMPION" : i === 1 ? "RUNNER_UP" : i === 2 ? "THIRD_PLACE" : "ELIMINATED";

      const ranking = await this.prisma.competitionRanking.upsert({
        where: {
          competitionId_userId_roundId: {
            competitionId,
            userId: s.registration.userId,
            roundId: roundId ?? "",
          },
        },
        create: { competitionId, userId: s.registration.userId, roundId, rank: i + 1, score: s.totalScore, status },
        update: { rank: i + 1, score: s.totalScore, status },
      });
      rankings.push(ranking);
    }

    return rankings;
  }

  /** 生成电子证书URL（占位） */
  async generateCertificate(rankingId: string) {
    // TODO: 接入证书生成服务
    const url = `/api/v1/competition/certificates/${rankingId}.pdf`;
    await this.prisma.competitionRanking.update({
      where: { id: rankingId },
      data: { certificateUrl: url },
    });
    return { certificateUrl: url };
  }

  // ═══════════════════ 排名查询（公开） ═══════════════════

  async getRankings(dto: { competitionId: string; roundId?: string; page?: number; pageSize?: number }) {
    const { competitionId, roundId, page = 1, pageSize = 50 } = dto;
    const where: any = { competitionId };
    if (roundId) where.roundId = roundId;

    const [data, total] = await Promise.all([
      this.prisma.competitionRanking.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { rank: "asc" },
        include: { user: { select: { id: true, nickname: true, avatar: true } } },
      }),
      this.prisma.competitionRanking.count({ where }),
    ]);
    return { data, total, page, pageSize };
  }

  // ═══════════════════ 工具方法 ═══════════════════

  private async getCompetitionOrThrow(id: string) {
    const c = await this.prisma.competition.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("赛事不存在");
    return c;
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
