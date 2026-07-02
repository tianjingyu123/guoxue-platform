import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 功名阶梯（T4 游戏化·董事长拍板）：level 从 1 开始，exp 为该级起点学分 */
export const GROWTH_LEVELS: Array<{ level: number; name: string; exp: number }> = [
  { level: 1, name: "书童", exp: 0 },
  { level: 2, name: "童生", exp: 50 },
  { level: 3, name: "秀才", exp: 150 },
  { level: 4, name: "廪生", exp: 350 },
  { level: 5, name: "贡生", exp: 700 },
  { level: 6, name: "举人", exp: 1200 },
  { level: 7, name: "进士", exp: 2000 },
  { level: 8, name: "翰林", exp: 3200 },
  { level: 9, name: "大学士", exp: 5000 },
  { level: 10, name: "宗师", exp: 8000 },
];

/** 成就定义（代码常量·沿用圈子徽章范式）；desc 用于成就墙与分享卡 */
export const ACHIEVEMENTS: Array<{ code: string; name: string; desc: string; icon: string }> = [
  { code: "first_checkin", name: "初入学堂", desc: "完成第一次学习打卡", icon: "door-open" },
  { code: "streak_7", name: "七日不辍", desc: "连续学习打卡 7 天", icon: "flame" },
  { code: "streak_30", name: "一月之功", desc: "连续学习打卡 30 天", icon: "calendar-check" },
  { code: "level_xiucai", name: "秀才及第", desc: "晋升「秀才」", icon: "award" },
  { code: "level_juren", name: "举人登科", desc: "晋升「举人」", icon: "trophy" },
  { code: "exp_1000", name: "千里之行", desc: "累计学分达 1000", icon: "footprints" },
];

const DAY_MS = 86_400_000;

/**
 * 平台级成长体系（学分/功名等级/连续学习/成就）
 * - 学分（totalExp）只增不减，与可消费的积分（UserPoints）严格分离
 * - 入口：checkin 打卡钩子（当前唯一学分来源=打卡+每日任务，后续接学习/购课行为）
 * - 成就在每次成长事件后惰性评估，幂等（@@unique(userId,code)）
 */
@Injectable()
export class UserGrowthService {
  private readonly logger = new Logger(UserGrowthService.name);

  constructor(private prisma: PrismaService) {}

  levelOf(totalExp: number): { level: number; name: string; nextExp: number | null; currentExp: number } {
    let current = GROWTH_LEVELS[0];
    for (const l of GROWTH_LEVELS) {
      if (totalExp >= l.exp) current = l;
      else break;
    }
    const next = GROWTH_LEVELS.find((l) => l.level === current.level + 1);
    return { level: current.level, name: current.name, nextExp: next?.exp ?? null, currentExp: current.exp };
  }

  /** 加学分 + 同步打卡连续天数 + 评估成就（打卡钩子调用；失败静默不影响主流程） */
  async onCheckin(userId: string, consecutiveDays: number, exp = 10) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const profile = await this.prisma.userGrowth.upsert({
        where: { userId },
        create: {
          userId,
          totalExp: exp,
          currentStreak: consecutiveDays,
          maxStreak: consecutiveDays,
          lastCheckinDate: today,
          level: 1,
        },
        update: {
          totalExp: { increment: exp },
          currentStreak: consecutiveDays,
          lastCheckinDate: today,
        },
      });
      // maxStreak 取历史最大（upsert 里做不了 max，补一步）
      if (consecutiveDays > profile.maxStreak) {
        await this.prisma.userGrowth.update({ where: { userId }, data: { maxStreak: consecutiveDays } });
      }
      // 等级重算（重查拿 increment 后的最新学分）
      const fresh = await this.prisma.userGrowth.findUnique({ where: { userId } });
      if (fresh) {
        const lv = this.levelOf(fresh.totalExp);
        if (lv.level !== fresh.level) {
          await this.prisma.userGrowth.update({ where: { userId }, data: { level: lv.level } });
        }
        await this.evaluateAchievements(userId, { totalExp: fresh.totalExp, level: lv.level, streak: consecutiveDays });
      }
    } catch (e) {
      this.logger.warn(`成长档案更新失败(user=${userId})`, e as Error);
    }
  }

  /** 通用加学分（每日任务完成等场景） */
  async addExp(userId: string, exp: number, _source: string) {
    if (exp <= 0) return;
    try {
      await this.prisma.userGrowth.upsert({
        where: { userId },
        create: { userId, totalExp: exp, level: 1 },
        update: { totalExp: { increment: exp } },
      });
      // 重查拿 increment 后的最新学分再算等级（upsert 返回值不含最新 increment 结果的保证）
      const fresh = await this.prisma.userGrowth.findUnique({ where: { userId } });
      const lv = this.levelOf(fresh?.totalExp ?? exp);
      if (fresh && lv.level !== fresh.level) {
        await this.prisma.userGrowth.update({ where: { userId }, data: { level: lv.level } });
      }
      await this.evaluateAchievements(userId, { totalExp: fresh?.totalExp ?? 0, level: lv.level, streak: fresh?.currentStreak ?? 0 });
    } catch (e) {
      this.logger.warn(`加学分失败(user=${userId})`, e as Error);
    }
  }

  /** 成就惰性评估（幂等：unique 冲突即已拥有） */
  private async evaluateAchievements(userId: string, s: { totalExp: number; level: number; streak: number }) {
    const eligible: string[] = ["first_checkin"];
    if (s.streak >= 7) eligible.push("streak_7");
    if (s.streak >= 30) eligible.push("streak_30");
    if (s.level >= 3) eligible.push("level_xiucai");
    if (s.level >= 6) eligible.push("level_juren");
    if (s.totalExp >= 1000) eligible.push("exp_1000");

    const owned = await this.prisma.userAchievement.findMany({
      where: { userId, code: { in: eligible } },
      select: { code: true },
    });
    const ownedSet = new Set(owned.map((o) => o.code));
    const toAward = eligible.filter((c) => !ownedSet.has(c));
    if (toAward.length === 0) return;
    await this.prisma.userAchievement
      .createMany({ data: toAward.map((code) => ({ userId, code })), skipDuplicates: true })
      .catch(() => undefined);
  }

  /** 我的成长档案（等级/称号/进度/连续天数/成就概览） */
  async getMyGrowth(userId: string) {
    const profile = await this.prisma.userGrowth.findUnique({ where: { userId } });
    const totalExp = profile?.totalExp ?? 0;
    const lv = this.levelOf(totalExp);
    // 连续天数以档案为准；若今天/昨天都没打卡则视为已断（档案值可能滞后）
    let streak = profile?.currentStreak ?? 0;
    if (profile?.lastCheckinDate) {
      const days = Math.floor((Date.now() - profile.lastCheckinDate.getTime()) / DAY_MS);
      if (days > 1) streak = 0;
    }
    const earned = await this.prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });
    const earnedMap = new Map(earned.map((e) => [e.code, e.earnedAt]));
    return {
      totalExp,
      level: lv.level,
      levelName: lv.name,
      levelStartExp: lv.currentExp,
      nextLevelExp: lv.nextExp, // null=已到顶
      currentStreak: streak,
      maxStreak: profile?.maxStreak ?? 0,
      achievements: ACHIEVEMENTS.map((a) => ({
        ...a,
        earned: earnedMap.has(a.code),
        earnedAt: earnedMap.get(a.code) ?? null,
      })),
      levels: GROWTH_LEVELS,
    };
  }
}
