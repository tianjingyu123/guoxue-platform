import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { randomInt } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateCompetitionDto, UpdateCompetitionDto, GeneratePaperDto,
  StageConfigItem, JudgePanelItem,
} from "./competition.dto";

/** 阶段合法赛制 */
const STAGE_FORMATS = ["QUIZ", "LIVE_PK"];
/** 阶段状态：未开始的阶段才允许被 stagesConfig 重新生成覆盖 */
const STAGE_MUTABLE_STATUS = ["PENDING"];

/**
 * 赛事创建系统（二期·赛-P1）管理端服务
 * 职责：创建/更新赛事（含 stagesConfig/judgePanel 深度校验）、
 *       按 stagesConfig 幂等生成 CompetitionStage、纯规则 AI 组卷
 */
@Injectable()
export class CompetitionAdminService {
  private readonly logger = new Logger(CompetitionAdminService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════ 创建 / 更新 ═══════════════════

  async createCompetition(dto: CreateCompetitionDto) {
    if (dto.stagesConfig) dto.stagesConfig = this.validateStagesConfig(dto.stagesConfig);
    if (dto.judgePanel) this.validateJudgePanel(dto.judgePanel);
    return this.prisma.competition.create({ data: dto as any });
  }

  /** 更新赛事：未开赛（DRAFT/PUBLISHED）可改；开赛后拒绝 */
  async updateCompetition(id: string, dto: UpdateCompetitionDto) {
    const c = await this.prisma.competition.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("赛事不存在");
    if (c.status !== "DRAFT" && c.status !== "PUBLISHED") {
      throw new BadRequestException("赛事已开赛/已结束，不可修改");
    }
    if (dto.stagesConfig) dto.stagesConfig = this.validateStagesConfig(dto.stagesConfig);
    if (dto.judgePanel) this.validateJudgePanel(dto.judgePanel);
    return this.prisma.competition.update({ where: { id }, data: dto as any });
  }

  // ═══════════════════ stagesConfig 校验 ═══════════════════

  /**
   * 校验阶段配置：
   * 1. 非空数组，每项 name/startAt/endAt 必填且时间合法（startAt < endAt）
   * 2. 阶段时间递增且不重叠（后一阶段 startAt >= 前一阶段 endAt）
   * 3. 晋级规则合法：type=count(value>=1 整数) / percent(1-100)；末阶段可无
   * 4. seq 缺省按数组顺序 1 起补齐；显式给出时必须 1 起严格递增
   * 返回规整后的配置（补齐 seq/format 默认值）
   */
  validateStagesConfig(stages: StageConfigItem[]): StageConfigItem[] {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new BadRequestException("stagesConfig 必须为非空数组");
    }

    const normalized: StageConfigItem[] = [];
    let prevEnd: number | null = null;

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const label = `阶段${i + 1}`;

      if (!s || typeof s.name !== "string" || !s.name.trim()) {
        throw new BadRequestException(`${label}：name 必填`);
      }

      const seq = s.seq ?? i + 1;
      if (seq !== i + 1) {
        throw new BadRequestException(`${label}：seq 必须从 1 起严格递增（收到 ${s.seq}）`);
      }

      const format = s.format ?? "QUIZ";
      if (!STAGE_FORMATS.includes(format)) {
        throw new BadRequestException(`${label}：format 仅支持 ${STAGE_FORMATS.join("/")}`);
      }

      const start = new Date(s.startAt).getTime();
      const end = new Date(s.endAt).getTime();
      if (!s.startAt || !s.endAt || Number.isNaN(start) || Number.isNaN(end)) {
        throw new BadRequestException(`${label}：startAt/endAt 必填且须为合法时间`);
      }
      if (start >= end) {
        throw new BadRequestException(`${label}：开始时间必须早于结束时间`);
      }
      if (prevEnd !== null && start < prevEnd) {
        throw new BadRequestException(`${label}：开始时间不得早于上一阶段结束时间（阶段时间须递增不重叠）`);
      }
      prevEnd = end;

      const isLast = i === stages.length - 1;
      const rule = s.advanceRule;
      if (rule != null) {
        if (rule.type !== "count" && rule.type !== "percent") {
          throw new BadRequestException(`${label}：晋级规则 type 仅支持 count/percent`);
        }
        if (typeof rule.value !== "number" || !Number.isFinite(rule.value)) {
          throw new BadRequestException(`${label}：晋级规则 value 必须为数字`);
        }
        if (rule.type === "count" && (!Number.isInteger(rule.value) || rule.value < 1)) {
          throw new BadRequestException(`${label}：count 型晋级人数必须为 >=1 的整数`);
        }
        if (rule.type === "percent" && (rule.value <= 0 || rule.value > 100)) {
          throw new BadRequestException(`${label}：percent 型晋级比例必须在 (0,100] 区间`);
        }
      } else if (!isLast) {
        throw new BadRequestException(`${label}：非末尾阶段必须配置晋级规则 advanceRule`);
      }

      normalized.push({
        seq,
        name: s.name.trim(),
        format,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        ...(rule != null ? { advanceRule: { type: rule.type, value: rule.value } } : {}),
      });
    }

    return normalized;
  }

  /** 评审团校验：userId 必填不重复，weight（如给）>=0 */
  validateJudgePanel(panel: JudgePanelItem[]) {
    if (!Array.isArray(panel)) throw new BadRequestException("judgePanel 必须为数组");
    const seen = new Set<string>();
    for (let i = 0; i < panel.length; i++) {
      const j = panel[i];
      if (!j || typeof j.userId !== "string" || !j.userId.trim()) {
        throw new BadRequestException(`评委${i + 1}：userId 必填`);
      }
      if (seen.has(j.userId)) throw new BadRequestException(`评委${i + 1}：userId 重复`);
      seen.add(j.userId);
      if (j.weight != null && (typeof j.weight !== "number" || j.weight < 0)) {
        throw new BadRequestException(`评委${i + 1}：weight 必须为 >=0 的数字`);
      }
    }
  }

  // ═══════════════════ 阶段生成（幂等） ═══════════════════

  async getStages(competitionId: string) {
    await this.getCompetitionOrThrow(competitionId);
    return this.prisma.competitionStage.findMany({
      where: { competitionId },
      orderBy: { seq: "asc" },
    });
  }

  /**
   * 按 stagesConfig 生成 CompetitionStage 行（幂等可重跑）：
   * - 以 (competitionId, seq) 为幂等键 upsert
   * - 已进入 RUNNING/JUDGING/DONE 的阶段不覆盖（保护运行中数据）
   * - 配置缩减时，多余的 PENDING 阶段删除
   */
  async generateStages(competitionId: string) {
    const c = await this.getCompetitionOrThrow(competitionId);
    const config = this.validateStagesConfig((c.stagesConfig as unknown as StageConfigItem[]) ?? []);

    const existing = await this.prisma.competitionStage.findMany({ where: { competitionId } });
    const bySeq = new Map(existing.map((s) => [s.seq, s]));

    let created = 0, updated = 0, skipped = 0;

    for (const item of config) {
      const seq = item.seq!;
      const old = bySeq.get(seq);
      if (old && !STAGE_MUTABLE_STATUS.includes(old.status)) {
        skipped++; // 运行中/已完成阶段不覆盖
        continue;
      }
      const data = {
        name: item.name,
        format: item.format ?? "QUIZ",
        startAt: new Date(item.startAt),
        endAt: new Date(item.endAt),
        advanceRule: (item.advanceRule ?? null) as any,
      };
      await this.prisma.competitionStage.upsert({
        where: { competitionId_seq: { competitionId, seq } },
        create: { competitionId, seq, ...data },
        update: data,
      });
      old ? updated++ : created++;
    }

    // 配置缩减：删除超出配置范围的 PENDING 阶段
    const removed = await this.prisma.competitionStage.deleteMany({
      where: { competitionId, seq: { gt: config.length }, status: { in: STAGE_MUTABLE_STATUS } },
    });

    this.logger.log(`赛事 ${competitionId} 阶段生成：新建${created} 更新${updated} 跳过${skipped} 删除${removed.count}`);

    const stages = await this.prisma.competitionStage.findMany({
      where: { competitionId },
      orderBy: { seq: "asc" },
    });
    return { created, updated, skipped, removed: removed.count, stages };
  }

  // ═══════════════════ AI 组卷（纯规则） ═══════════════════

  /**
   * 从赛事题库按难度/分类分布随机抽题组卷（不调 AI·纯规则）
   * - 难度桶：easy=1-2 / medium=3 / hard=4-5，默认权重 4:4:2
   * - categories 匹配题目 tags（任一命中即入池）
   * - 某桶题量不足时从其余题目随机补足；总量不足则如实返回
   * - 返回不含标准答案（组卷预览安全）
   */
  async generatePaper(competitionId: string, dto: GeneratePaperDto) {
    await this.getCompetitionOrThrow(competitionId);

    const where: any = { competitionId, isPublished: true };
    if (dto.categories && dto.categories.length > 0) {
      where.tags = { hasSome: dto.categories };
    }

    const pool = await this.prisma.competitionQuestion.findMany({ where });
    if (pool.length === 0) {
      throw new BadRequestException("题库中无符合条件的已发布题目，无法组卷");
    }

    const mix = dto.difficultyMix ?? {};
    const wEasy = mix.easy ?? 0.4;
    const wMedium = mix.medium ?? 0.4;
    const wHard = mix.hard ?? 0.2;
    const wSum = wEasy + wMedium + wHard;
    if (wSum <= 0) throw new BadRequestException("difficultyMix 权重之和必须大于 0");

    const buckets = {
      easy: pool.filter((q) => q.difficulty <= 2),
      medium: pool.filter((q) => q.difficulty === 3),
      hard: pool.filter((q) => q.difficulty >= 4),
    };
    const targets = {
      easy: Math.round((dto.count * wEasy) / wSum),
      medium: Math.round((dto.count * wMedium) / wSum),
      hard: Math.round((dto.count * wHard) / wSum),
    };

    const selected: typeof pool = [];
    const pickedIds = new Set<string>();
    for (const key of ["easy", "medium", "hard"] as const) {
      const picked = this.shuffle(buckets[key]).slice(0, targets[key]);
      for (const q of picked) {
        if (selected.length >= dto.count) break;
        selected.push(q);
        pickedIds.add(q.id);
      }
    }

    // 桶量不足 → 从剩余题目随机补足
    if (selected.length < dto.count) {
      const remaining = this.shuffle(pool.filter((q) => !pickedIds.has(q.id)));
      for (const q of remaining) {
        if (selected.length >= dto.count) break;
        selected.push(q);
        pickedIds.add(q.id);
      }
    }

    const questions = this.shuffle(selected).map((q) => ({
      id: q.id,
      type: q.type,
      score: q.score,
      difficulty: q.difficulty,
      stem: q.stem,
      options: q.options,
      tags: q.tags,
    }));

    const distribution = {
      easy: questions.filter((q) => q.difficulty <= 2).length,
      medium: questions.filter((q) => q.difficulty === 3).length,
      hard: questions.filter((q) => q.difficulty >= 4).length,
    };

    return {
      requested: dto.count,
      total: questions.length,
      poolSize: pool.length,
      distribution,
      totalScore: questions.reduce((sum, q) => sum + q.score, 0),
      questions,
    };
  }

  // ═══════════════════ 工具 ═══════════════════

  private async getCompetitionOrThrow(id: string) {
    const c = await this.prisma.competition.findUnique({ where: { id } });
    if (!c) throw new NotFoundException("赛事不存在");
    return c;
  }

  /** Fisher-Yates 洗牌（crypto 随机源） */
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
