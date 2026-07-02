import { Injectable, Logger, Optional } from "@nestjs/common";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { PrismaService } from "../../prisma/prisma.service";
import { PointsService } from "../user/points.service";
import { UserGrowthService } from "../user-growth/user-growth.service";
import { CheckInCalendarQueryDto } from "./checkin.dto";

@Injectable()
export class CheckinService {
  private readonly logger = new Logger(CheckinService.name);

  constructor(
    private prisma: PrismaService,
    private pointsService: PointsService,
    @Optional() private userGrowth?: UserGrowthService,
  ) {}

  /** 每日签到 */
  async checkIn(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.checkIn.findUnique({
      where: { userId_checkInDate: { userId, checkInDate: today } },
    });
    if (existing) throw new BusinessException(ErrorCode.BAD_REQUEST, "今日已签到");

    // 查昨天的签到，确定连续天数
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCheckIn = await this.prisma.checkIn.findUnique({
      where: { userId_checkInDate: { userId, checkInDate: yesterday } },
    });

    const consecutiveDays = (yesterdayCheckIn?.consecutiveDays ?? 0) + 1;
    // 积分规则：基础5分 + 连续签到额外（每连续3天+3分）
    const rewardPoints = 5 + Math.floor((consecutiveDays - 1) / 3) * 3;

    // 事务内：创建签到记录 + 积分入账 + 每日任务，保证一致性
    await this.prisma.$transaction(async (tx) => {
      await tx.checkIn.create({
        data: { userId, checkInDate: today, consecutiveDays, rewardPoints },
      });

      await tx.dailyTask.upsert({
        where: { userId_taskType_taskDate: { userId, taskType: "checkin", taskDate: today } },
        create: {
          userId, taskType: "checkin", taskDate: today,
          title: "每日签到", rewardPoints,
          doneCount: 1, completed: true, completedAt: new Date(),
        },
        update: { doneCount: 1, completed: true, completedAt: new Date() },
      });
    });

    // 积分真正入账（PointsService 内部有独立的 upsert + 流水记录）
    await this.pointsService.earnPoints(userId, rewardPoints, "CHECKIN", `连续签到第${consecutiveDays}天`);

    // 成长体系：加学分 + 同步连续天数 + 成就评估（内部自吞错误，不影响签到主流程）
    await this.userGrowth?.onCheckin(userId, consecutiveDays);

    return { consecutiveDays, rewardPoints, date: today };
  }

  /** 签到状态（今天是否签到+连续天数+累计积分） */
  async getStatus(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayRecord, totalResult] = await Promise.all([
      this.prisma.checkIn.findUnique({
        where: { userId_checkInDate: { userId, checkInDate: today } },
      }),
      this.prisma.checkIn.aggregate({
        where: { userId },
        _sum: { rewardPoints: true },
      }),
    ]);

    return {
      todayChecked: !!todayRecord,
      continuousDays: todayRecord?.consecutiveDays ?? 0,
      totalPoints: totalResult._sum.rewardPoints ?? 0,
    };
  }

  /** 月度签到日历 */
  async getCalendar(userId: string, query: CheckInCalendarQueryDto) {
    const { year, month } = query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.checkIn.findMany({
      where: {
        userId,
        checkInDate: { gte: startDate, lte: endDate },
      },
      select: { checkInDate: true, rewardPoints: true },
      orderBy: { checkInDate: "asc" },
    });

    return {
      year,
      month,
      totalDays: records.length,
      days: records.map((r) => ({ date: r.checkInDate.toISOString().split("T")[0], points: r.rewardPoints })),
    };
  }

  /** 每日任务列表 */
  async getDailyTasks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 获取今天的任务列表，如果没有则初始化
    let tasks = await this.prisma.dailyTask.findMany({
      where: { userId, taskDate: today },
      orderBy: { createdAt: "asc" },
    });

    if (tasks.length === 0) {
      const taskTemplates = [
        { taskType: "checkin", title: "每日签到", rewardPoints: 5, targetCount: 1 },
        { taskType: "read", title: "阅读一篇内容", rewardPoints: 3, targetCount: 1 },
        { taskType: "comment", title: "发表一条评论", rewardPoints: 3, targetCount: 1 },
        { taskType: "share", title: "分享一篇内容", rewardPoints: 5, targetCount: 1 },
        { taskType: "watch", title: "观看一个视频", rewardPoints: 3, targetCount: 1 },
      ];

      tasks = await Promise.all(
        taskTemplates.map((t) =>
          this.prisma.dailyTask.upsert({
            where: { userId_taskType_taskDate: { userId, taskType: t.taskType, taskDate: today } },
            create: { userId, ...t, taskDate: today },
            update: {},
          }),
        ),
      );
    }

    return { date: today, tasks };
  }

  /** 手动记录任务进度 */
  async completeTask(userId: string, taskId: string) {
    const task = await this.prisma.dailyTask.findFirst({ where: { id: taskId, userId } });
    if (!task) throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
    if (task.completed) throw new BusinessException(ErrorCode.BAD_REQUEST, "任务已完成");

    const updated = await this.prisma.dailyTask.update({
      where: { id: taskId },
      data: { doneCount: task.doneCount + 1, completed: true, completedAt: new Date() },
    });

    // 成长体系：完成每日任务加学分（自吞错误不影响主流程）
    await this.userGrowth?.addExp(userId, 10, `TASK_${task.taskType}`);

    return { completed: true, rewardPoints: updated.rewardPoints };
  }
}
