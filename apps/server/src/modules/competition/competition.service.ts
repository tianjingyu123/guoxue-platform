import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomInt } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { GradingEngineService } from "./grading-engine.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

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
    await this.getCompetitionOrThrow(id);
    return this.prisma.competition.update({
      where: { id },
      data: { status: "FINISHED", finishedAt: new Date() },
    });
  }

  async listCompetitions(query: { type?: string; status?: string; level?: string; organizerId?: string; keyword?: string; page?: number; pageSize?: number }) {
    const { type, status, level, organizerId, keyword, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (level) where.level = level;
    if (organizerId) where.organizerId = organizerId;
    if (keyword) where.title = { contains: keyword, mode: "insensitive" };

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
    const existing = await this.prisma.competitionRound.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "赛程不存在");
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

  async updateQuestion(id: string, dto: any) {
    const existing = await this.prisma.competitionQuestion.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "赛题不存在");
    return this.prisma.competitionQuestion.update({ where: { id }, data: dto });
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

    // 行锁串行化防超卖：锁定赛事行后，在锁内查重 + 计数 + 创建（消除 count-then-create 竞态）
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Competition" WHERE id = ${competitionId} FOR UPDATE`;

      const existing = await tx.competitionRegistration.findUnique({
        where: { competitionId_userId: { competitionId, userId } },
      });
      if (existing) throw new BadRequestException("已报名过此赛事");

      if (competition.maxParticipants > 0) {
        const count = await tx.competitionRegistration.count({ where: { competitionId } });
        if (count >= competition.maxParticipants) throw new BadRequestException("报名人数已达上限");
      }

      return tx.competitionRegistration.create({
        data: { competitionId, userId, inviterId, inviteCode, paidFee: competition.entryFee },
      });
    });
  }

  async getRegistration(competitionId: string, userId: string) {
    return this.prisma.competitionRegistration.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    });
  }

  async updateRegistration(id: string, status?: string) {
    const existing = await this.prisma.competitionRegistration.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "报名记录不存在");
    return this.prisma.competitionRegistration.update({
      where: { id },
      data: status ? { status: status as any } : {},
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

  /** 获取待评审作品列表（评委视角） */
  async getJudgeSubmissions(graderId: string, competitionId?: string) {
    const where: Record<string, unknown> = { score: null };
    if (competitionId) {
      where.registration = { competitionId };
    }

    const answers = await this.prisma.competitionAnswer.findMany({
      where,
      include: {
        registration: {
          include: {
            user: { select: { id: true, nickname: true } },
            competition: { select: { id: true, title: true, scoringModel: true } },
          },
        },
        question: { select: { id: true, stem: true, score: true } },
      },
      orderBy: { submittedAt: "asc" },
      take: 100,
    });

    const list = answers.map((a) => ({
      id: a.id,
      participantName: (a.registration as any).user?.nickname || "匿名",
      competitionTitle: (a.registration as any).competition?.title,
      questionStem: (a.question as any)?.stem?.slice(0, 200),
      content: typeof (a.answer as any)?.content === "string"
        ? (a.answer as any).content?.slice(0, 500)
        : JSON.stringify(a.answer).slice(0, 500),
      scoreValue: a.score || 0,
      comment: a.comment || "",
      graded: a.score != null,
      dimScores: ((a.answer as any)?.dimScores as number[]) || [],
      submittedAt: a.submittedAt,
    }));

    const graded = list.filter((s) => s.graded).length;
    const scores = list.filter((s) => s.graded).map((s) => s.scoreValue as number);
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "--";

    return {
      list,
      stats: { total: list.length, graded, avg },
      dimensions: [
        { name: "准确性", max: 40 },
        { name: "完整性", max: 30 },
        { name: "创新性", max: 20 },
        { name: "表达力", max: 10 },
      ],
    };
  }

  /** 评委提交评分（按作品/答案ID）。需调用方已通过 @Roles 守卫校验评委身份 */
  async submitScore(submissionId: string, score: number, graderId: string, comment?: string, dimScores?: number[]) {
    const answer = await this.prisma.competitionAnswer.findUnique({
      where: { id: submissionId },
      include: { registration: { select: { id: true, competitionId: true } } },
    });
    if (!answer) throw new NotFoundException("作品不存在");

    const answerData: any = { ...(answer.answer as object) };
    if (dimScores) answerData.dimScores = dimScores;
    if (comment) answerData.comment = comment;

    return this.prisma.competitionAnswer.update({
      where: { id: submissionId },
      data: {
        score,
        graderId,
        comment,
        answer: answerData,
        gradedAt: new Date(),
      },
    });
  }

  /** 根据答题记录ID获取详情（评委评分前需要查询registrationId+questionId） */
  async getAnswerById(answerId: string) {
    const answer = await this.prisma.competitionAnswer.findUnique({ where: { id: answerId } });
    if (!answer) throw new NotFoundException("答题记录不存在");
    return answer;
  }

  // ═══════════════════ 排名计算 ═══════════════════

  async calculateRanking(competitionId: string, roundId?: string) {
    const where: any = {};
    if (roundId) where.roundId = roundId;
    const scores = await this.prisma.competitionScore.findMany({
      where,
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

  /** 生成电子证书（HTML格式，浏览器可打印为PDF） */
  async generateCertificate(rankingId: string) {
    const ranking = await this.prisma.competitionRanking.findUnique({
      where: { id: rankingId },
      include: {
        user: { select: { id: true, nickname: true } },
        competition: { select: { id: true, title: true } },
      },
    });
    if (!ranking) throw new NotFoundException("排名记录不存在");

    const statusLabels: Record<string, string> = {
      CHAMPION: "冠军",
      RUNNER_UP: "亚军",
      THIRD_PLACE: "季军",
      ELIMINATED: "参赛纪念",
    };
    const statusLabel = statusLabels[ranking.status] || "参赛纪念";

    const certHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>获奖证书</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f0e8; font-family: "SimSun","KaiTi",serif; }
  .cert { width: 800px; padding: 60px; background: linear-gradient(135deg, #fdf6ed 0%, #fef9f3 100%); border: 6px double #8B0000; position: relative; }
  .cert::before { content: ""; position: absolute; top: 12px; left: 12px; right: 12px; bottom: 12px; border: 2px solid #C9A96E; pointer-events: none; }
  .cert-header { text-align: center; margin-bottom: 30px; }
  .cert-header h1 { font-size: 36px; color: #8B0000; letter-spacing: 8px; }
  .cert-header p { font-size: 16px; color: #666; margin-top: 8px; }
  .cert-body { text-align: center; margin: 40px 0; line-height: 2.5; }
  .cert-body .name { font-size: 28px; color: #8B0000; font-weight: bold; }
  .cert-body .info { font-size: 18px; color: #333; }
  .cert-footer { display: flex; justify-content: space-between; margin-top: 50px; font-size: 14px; color: #666; }
  .cert-stamp { position: absolute; right: 80px; bottom: 100px; width: 100px; height: 100px; border: 3px solid #C41E3A; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #C41E3A; font-size: 18px; transform: rotate(-15deg); opacity: 0.7; }
</style></head>
<body>
<div class="cert">
  <div class="cert-header">
    <h1>获 奖 证 书</h1>
    <p>热卜国学传统文化平台</p>
  </div>
  <div class="cert-body">
    <p class="info">兹证明</p>
    <p class="name">${ranking.user.nickname || "参赛者"}</p>
    <p class="info">在「${ranking.competition.title}」赛事中</p>
    <p class="info">荣获 <strong>${statusLabel}</strong></p>
    <p class="info" style="margin-top:20px;">特颁此证，以资鼓励</p>
  </div>
  <div class="cert-footer">
    <p>颁发日期：${new Date().toLocaleDateString("zh-CN")}</p>
    <p>证书编号：${ranking.id.slice(0, 8).toUpperCase()}</p>
  </div>
  <div class="cert-stamp">热卜国学</div>
</div>
</body></html>`;

    // 将证书 HTML 存储到 ranking 记录
    const certBase64 = Buffer.from(certHtml, "utf-8").toString("base64");
    const url = `/api/v1/competitions/certificates/${rankingId}/view`;

    await this.prisma.competitionRanking.update({
      where: { id: rankingId },
      data: { certificateUrl: url },
    });

    return { certificateUrl: url, certificateHtml: certBase64 };
  }

  /** 获取证书HTML内容（供前端渲染/打印） */
  async getCertificateHtml(rankingId: string) {
    const ranking = await this.prisma.competitionRanking.findUnique({
      where: { id: rankingId },
      include: {
        user: { select: { id: true, nickname: true } },
        competition: { select: { id: true, title: true } },
      },
    });
    if (!ranking) throw new NotFoundException("排名记录不存在");

    return this.generateCertificate(rankingId).then((r) => r.certificateHtml);
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

  // ═══════════════════ 删除 ═══════════════════

  async deleteCompetition(id: string) {
    const c = await this.getCompetitionOrThrow(id);
    if (c.status !== "DRAFT") throw new BadRequestException("仅草稿状态的赛事可删除");
    await this.prisma.competition.delete({ where: { id } });
  }

  async deleteRound(id: string) {
    const existing = await this.prisma.competitionRound.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "赛程不存在");
    await this.prisma.competitionRound.delete({ where: { id } });
  }

  async deleteQuestion(id: string) {
    const existing = await this.prisma.competitionQuestion.findUnique({ where: { id } });
    if (!existing) throw new BusinessException(ErrorCode.NOT_FOUND, "赛题不存在");
    await this.prisma.competitionQuestion.delete({ where: { id } });
  }

  // ═══════════════════ 批量提交 + 成绩查询 + 统计 ═══════════════════

  /** 批量提交赛轮答案（整卷一次性提交） */
  async batchSubmitAnswers(dto: { registrationId: string; roundId: string; answers: { questionId: string; answer: Record<string, any>; duration?: number }[] }, userId: string) {
    const registration = await this.prisma.competitionRegistration.findUnique({ where: { id: dto.registrationId } });
    if (!registration || registration.userId !== userId) throw new BadRequestException("报名记录不存在或无权操作");

    const round = await this.prisma.competitionRound.findUnique({ where: { id: dto.roundId } });
    if (!round) throw new NotFoundException("赛程不存在");
    if (new Date() < round.startAt || new Date() > round.endAt) throw new BadRequestException("不在答题时间窗口内");

    const results: any[] = [];
    let totalScore = 0;

    for (const item of dto.answers) {
      const question = await this.prisma.competitionQuestion.findUnique({ where: { id: item.questionId } });
      if (!question) continue;

      const gradeResult = this.gradingEngine.grade(
        question.type, question.answer as Record<string, any>, item.answer, question.score,
      );

      await this.prisma.competitionAnswer.upsert({
        where: { registrationId_questionId: { registrationId: dto.registrationId, questionId: item.questionId } },
        create: {
          registrationId: dto.registrationId, roundId: dto.roundId, questionId: item.questionId,
          answer: item.answer, isCorrect: gradeResult.isCorrect, score: gradeResult.score,
          duration: item.duration ?? 0, gradedAt: new Date(),
        },
        update: {
          answer: item.answer, isCorrect: gradeResult.isCorrect, score: gradeResult.score,
          duration: item.duration ?? 0, gradedAt: new Date(),
        },
      });

      totalScore += gradeResult.score;
      results.push({ questionId: item.questionId, score: gradeResult.score, isCorrect: gradeResult.isCorrect });
    }

    // 更新/创建总分记录
    await this.prisma.competitionScore.upsert({
      where: { registrationId_roundId: { registrationId: dto.registrationId, roundId: dto.roundId } },
      create: { registrationId: dto.registrationId, roundId: dto.roundId, totalScore, autoScore: totalScore, detail: { questionCount: dto.answers.length } },
      update: { totalScore, autoScore: totalScore, detail: { questionCount: dto.answers.length } },
    });

    return { totalScore, questionCount: dto.answers.length, results };
  }

  /** 查询当前用户在某个赛事中的答题成绩 */
  async getMyResults(competitionId: string, userId: string) {
    const registration = await this.prisma.competitionRegistration.findUnique({
      where: { competitionId_userId: { competitionId, userId } },
    });
    if (!registration) throw new NotFoundException("未找到报名记录");

    const answers = await this.prisma.competitionAnswer.findMany({
      where: { registrationId: registration.id },
      include: { question: { select: { id: true, stem: true, type: true, score: true, answer: true, analysis: true } } },
      orderBy: { submittedAt: "asc" },
    });

    const [scores, rankings] = await Promise.all([
      this.prisma.competitionScore.findMany({
        where: { registrationId: registration.id },
        orderBy: { roundId: "asc" },
      }),
      this.prisma.competitionRanking.findMany({
        where: { competitionId, userId },
        orderBy: { roundId: "asc" },
      }),
    ]);

    return {
      registration,
      answers: answers.map((a) => ({
        questionId: a.questionId,
        stem: a.question?.stem,
        type: a.question?.type,
        userAnswer: a.answer,
        correctAnswer: a.question?.answer,
        analysis: a.question?.analysis,
        score: a.score,
        isCorrect: a.isCorrect,
        duration: a.duration,
      })),
      totalScores: scores,
      rankings,
    };
  }

  /** 赛事数据统计看板 */
  async getCompetitionStats(competitionId: string) {
    const competition = await this.getCompetitionOrThrow(competitionId);

    const [totalRegistrations, totalParticipants, roundStats] = await Promise.all([
      this.prisma.competitionRegistration.count({ where: { competitionId } }),
      this.prisma.competitionRegistration.count({
        where: { competitionId, status: { in: ["QUALIFIED" as any, "COMPLETED" as any] } },
      }),
      (async () => {
        const rounds = await this.prisma.competitionRound.findMany({
          where: { competitionId },
          select: { id: true, title: true, _count: { select: { answers: true } } },
          orderBy: { sortOrder: "asc" },
        });
        return rounds.map((r) => ({ id: r.id, title: r.title, answerCount: r._count.answers }));
      })(),
    ]);

    const promotionRate = totalRegistrations > 0
      ? Math.round((totalParticipants / totalRegistrations) * 100)
      : 0;

    return {
      competitionId,
      title: competition.title,
      status: competition.status,
      totalRegistrations,
      totalParticipants,
      promotionRate,
      completionRate: 0, // 需要赛程定义"完赛"后再计算
      roundStats,
    };
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
      const j = randomInt(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
