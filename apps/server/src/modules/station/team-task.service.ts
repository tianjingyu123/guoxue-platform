import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, Min, IsDateString, IsArray, MaxLength } from "class-validator";
import { PrismaService } from "../../prisma/prisma.service";

// ─────────────────────────────────────────────────
// 商-P2 运营商团队任务下发（指挥室）
// 进度不手报：PROMOTE/RECRUIT/SALES 按归因数据自动结算（每日 cron 03:00），CUSTOM 站长手动标记
// 合规红线 R1：任务奖励仅限荣誉/资源位，禁止现金奖励字段；文案含现金类承诺直接拒绝
// ─────────────────────────────────────────────────

export const TEAM_TASK_TYPES = ["PROMOTE", "RECRUIT", "SALES", "CUSTOM"] as const;
export type TeamTaskTypeValue = (typeof TEAM_TASK_TYPES)[number];

/** R1 红线：任务文案不得出现现金类奖励承诺（奖励只能是荣誉/资源位） */
const CASH_REWARD_PATTERN = /现金|红包|返现|转账|打款|奖金/;

export class CreateTeamTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  desc?: string;

  @IsIn(TEAM_TASK_TYPES)
  type: TeamTaskTypeValue;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetValue?: number;

  @IsDateString()
  deadline: string;

  /** 指派的站长 userId 列表；缺省 = 全团队站长 */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stationMasterIds?: string[];
}

/** 订单归因 GMV 统计口径：已支付且未退款/取消 */
const GMV_ORDER_STATUSES = ["PAID", "SHIPPED", "COMPLETED"] as const;

@Injectable()
export class TeamTaskService {
  private readonly logger = new Logger(TeamTaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 解析当前用户的运营商身份（非运营商 403） */
  private async getOperator(userId: string) {
    const operator = await this.prisma.operator.findFirst({ where: { userId }, select: { id: true, brandName: true } });
    if (!operator) throw new ForbiddenException("当前用户不是运营商");
    return operator;
  }

  /** 运营商团队站长（Station.operatorId 归属）：userId → 分站信息 */
  private async getTeamMasters(operatorId: string) {
    const stations = await this.prisma.station.findMany({
      where: { operatorId },
      select: { id: true, name: true, userId: true, user: { select: { nickname: true } } },
    });
    return new Map(stations.map(s => [s.userId, { stationId: s.id, stationName: s.name, nickname: s.user?.nickname || "" }]));
  }

  // ───────── 运营商侧 ─────────

  /** 建任务：校验团队归属 + R1 文案红线；创建后立即结算一次初始进度 */
  async create(userId: string, dto: CreateTeamTaskDto) {
    const operator = await this.getOperator(userId);

    if (CASH_REWARD_PATTERN.test(dto.title) || CASH_REWARD_PATTERN.test(dto.desc || "")) {
      throw new BadRequestException("任务奖励仅限荣誉表彰/资源位，文案不得含现金类承诺（合规红线）");
    }

    const deadline = new Date(dto.deadline);
    if (!(deadline.getTime() > Date.now())) throw new BadRequestException("截止时间必须晚于当前时间");

    const team = await this.getTeamMasters(operator.id);
    if (team.size === 0) throw new BadRequestException("名下暂无站长，无法下发任务");

    let targetIds: string[];
    if (dto.stationMasterIds?.length) {
      const outsiders = dto.stationMasterIds.filter(id => !team.has(id));
      if (outsiders.length > 0) throw new BadRequestException("包含不属于本团队的站长，无法下发");
      targetIds = Array.from(new Set(dto.stationMasterIds));
    } else {
      targetIds = Array.from(team.keys());
    }

    const task = await this.prisma.teamTask.create({
      data: {
        operatorId: operator.id,
        title: dto.title.trim(),
        desc: dto.desc?.trim() || null,
        type: dto.type,
        targetValue: dto.targetValue ?? null,
        deadline,
        progresses: { createMany: { data: targetIds.map(id => ({ stationMasterId: id })) } },
      },
      include: { progresses: true },
    });

    // 立即结算一次，避免站长端首日空进度
    await this.recalcTask(task).catch(err => this.logger.warn(`初始进度结算失败 task=${task.id}: ${err?.message}`));
    return task;
  }

  /** 运营商视角任务列表（带各站长进度与完成度聚合） */
  async listForOperator(userId: string) {
    const operator = await this.getOperator(userId);
    const [tasks, team] = await Promise.all([
      this.prisma.teamTask.findMany({
        where: { operatorId: operator.id },
        orderBy: { createdAt: "desc" },
        include: { progresses: true },
      }),
      this.getTeamMasters(operator.id),
    ]);

    const items = tasks.map(t => {
      const total = t.progresses.length;
      const completedCount = t.progresses.filter(p => p.completedAt).length;
      return {
        id: t.id,
        title: t.title,
        desc: t.desc,
        type: t.type,
        targetValue: t.targetValue,
        deadline: t.deadline,
        status: t.status,
        createdAt: t.createdAt,
        total,
        completedCount,
        completionRate: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        progresses: t.progresses.map(p => ({
          stationMasterId: p.stationMasterId,
          stationName: team.get(p.stationMasterId)?.stationName || "",
          nickname: team.get(p.stationMasterId)?.nickname || "",
          currentValue: p.currentValue,
          completedAt: p.completedAt,
        })),
      };
    });
    return { items, total: items.length };
  }

  /** 关闭任务（仅任务归属运营商；关闭后 cron 不再更新进度） */
  async close(userId: string, taskId: string) {
    const operator = await this.getOperator(userId);
    const task = await this.prisma.teamTask.findFirst({ where: { id: taskId } });
    if (!task) throw new NotFoundException("任务不存在");
    if (task.operatorId !== operator.id) throw new ForbiddenException("只能关闭自己下发的任务");
    if (task.status === "CLOSED") return task;
    return this.prisma.teamTask.update({ where: { id: taskId }, data: { status: "CLOSED" } });
  }

  // ───────── 站长侧 ─────────

  /** 站长视角：只返回自己的任务进度（inTeam=false 时前端整卡隐藏） */
  async listMine(userId: string) {
    const station = await this.prisma.station.findFirst({ where: { userId }, select: { id: true, operatorId: true } });
    if (!station || !station.operatorId) return { inTeam: false, items: [] };

    const progresses = await this.prisma.teamTaskProgress.findMany({
      where: { stationMasterId: userId },
      include: { task: { include: { operator: { select: { brandName: true, user: { select: { nickname: true } } } } } } },
      orderBy: { task: { createdAt: "desc" } },
    });

    return {
      inTeam: true,
      items: progresses.map(p => ({
        taskId: p.taskId,
        title: p.task.title,
        desc: p.task.desc,
        type: p.task.type,
        targetValue: p.task.targetValue,
        deadline: p.task.deadline,
        status: p.task.status,
        currentValue: p.currentValue,
        completedAt: p.completedAt,
        operatorName: p.task.operator?.brandName || p.task.operator?.user?.nickname || "",
      })),
    };
  }

  /** CUSTOM 任务站长手动标记完成（自动结算类型不允许手报） */
  async markComplete(userId: string, taskId: string) {
    const progress = await this.prisma.teamTaskProgress.findFirst({
      where: { taskId, stationMasterId: userId },
      include: { task: true },
    });
    if (!progress) throw new NotFoundException("任务不存在或未指派给你");
    if (progress.task.status !== "OPEN") throw new BadRequestException("任务已关闭");
    if (progress.task.type !== "CUSTOM") throw new BadRequestException("该任务进度由系统自动结算，无需手动标记");
    if (progress.completedAt) return progress;
    return this.prisma.teamTaskProgress.update({
      where: { id: progress.id },
      data: { currentValue: 1, completedAt: new Date() },
    });
  }

  // ───────── 进度自动结算 ─────────

  /** 每日 03:00 结算全部 OPEN 任务进度（CLOSED 不再更新） */
  @Cron("0 3 * * *")
  async dailyRecalc() {
    const tasks = await this.prisma.teamTask.findMany({
      where: { status: "OPEN" },
      include: { progresses: true },
    });
    let updated = 0;
    for (const task of tasks) {
      try {
        updated += await this.recalcTask(task);
      } catch (err) {
        this.logger.warn(`团队任务进度结算失败 task=${task.id}: ${(err as Error)?.message}`);
      }
    }
    this.logger.log(`团队任务进度结算完成：${tasks.length} 个任务，更新 ${updated} 条进度`);
  }

  /**
   * 重算单个任务全部站长进度（任务期 = createdAt ~ deadline）：
   * PROMOTE = 站长 ref 新注册数；RECRUIT = 新增下级站长数；SALES = 归因订单 GMV（元）；CUSTOM 手动不参与
   */
  async recalcTask(task: {
    id: string;
    type: string;
    status?: string;
    targetValue: number | null;
    createdAt: Date;
    deadline: Date;
    progresses: { id: string; stationMasterId: string; currentValue: number; completedAt: Date | null }[];
  }): Promise<number> {
    if (task.type === "CUSTOM") return 0;
    if (task.status && task.status !== "OPEN") return 0; // 关闭后不再更新

    const period = { gte: task.createdAt, lte: task.deadline };
    let updated = 0;

    for (const progress of task.progresses) {
      const masterId = progress.stationMasterId;
      let currentValue = 0;

      if (task.type === "PROMOTE") {
        // 任务期内该站长推荐的新注册数
        currentValue = await this.prisma.referralRelation.count({
          where: { referrerId: masterId, createdAt: period },
        });
      } else if (task.type === "RECRUIT") {
        // 任务期内新增的下级站长数（其推荐用户在期内开通分站）
        currentValue = await this.prisma.station.count({
          where: { createdAt: period, user: { referralUsers: { some: { referrerId: masterId } } } },
        });
      } else if (task.type === "SALES") {
        // 任务期内归因该站长的订单 GMV（referrerId 永久归因·已支付口径·实付优先）
        const [withPay, withoutPay] = await Promise.all([
          this.prisma.order.aggregate({
            _sum: { payAmount: true },
            where: { referrerId: masterId, status: { in: [...GMV_ORDER_STATUSES] }, payAmount: { not: null }, paidAt: period },
          }),
          this.prisma.order.aggregate({
            _sum: { amount: true },
            where: { referrerId: masterId, status: { in: [...GMV_ORDER_STATUSES] }, payAmount: null, paidAt: period },
          }),
        ]);
        currentValue = Math.round(Number(withPay._sum.payAmount || 0) + Number(withoutPay._sum.amount || 0));
      }

      const reached = task.targetValue != null && currentValue >= task.targetValue;
      const completedAt = progress.completedAt || (reached ? new Date() : null);
      if (currentValue !== progress.currentValue || (reached && !progress.completedAt)) {
        await this.prisma.teamTaskProgress.update({
          where: { id: progress.id },
          data: { currentValue, completedAt },
        });
        updated++;
      }
    }
    return updated;
  }
}
