import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "@guoxue/shared";

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
  { code: "streak_100", name: "百日筑基", desc: "连续学习打卡 100 天", icon: "mountain" },
  { code: "level_xiucai", name: "秀才及第", desc: "晋升「秀才」", icon: "award" },
  { code: "level_juren", name: "举人登科", desc: "晋升「举人」", icon: "trophy" },
  { code: "level_jinshi", name: "进士出身", desc: "晋升「进士」", icon: "medal" },
  { code: "level_zongshi", name: "一代宗师", desc: "登顶「宗师」", icon: "crown" },
  { code: "exp_1000", name: "千里之行", desc: "累计学分达 1000", icon: "footprints" },
  { code: "exp_5000", name: "学富五车", desc: "累计学分达 5000", icon: "library" },
  { code: "mentor_graduate", name: "桃李成蹊", desc: "有徒弟学成出师", icon: "graduation-cap" },
  { code: "graduated_disciple", name: "学成出师", desc: "达成出师·感念师恩", icon: "scroll" },
  // 节气仪式（V8·solar-term.service 直建同名 code，此处入目录让成就墙可见）
  { code: "solar_term_ritual", name: "初沐节气", desc: "首次参与节气仪式", icon: "leaf" },
  { code: "solar_term_4", name: "四时有信", desc: "集齐 4 个节气", icon: "sun" },
  { code: "solar_term_12", name: "岁时过半", desc: "集齐 12 个节气", icon: "moon" },
  { code: "solar_term_24", name: "廿四全勤", desc: "集齐全部 24 节气", icon: "sparkles" },
  // 共读拼团（V3·shared-reading 结算时颁发）
  { code: "shared_reading_complete", name: "以文会友", desc: "完成一次组队共读", icon: "users" },
  // 创作激励（创-P1·content-exp.service 在内容质量评分 ≥80 时颁发）
  { code: "content_quality_star", name: "妙笔生花", desc: "首篇质量评分达 80 分的内容", icon: "feather" },
];

/**
 * 称号目录（B1 打磨·可收集可佩戴）：与 levelName（当前等级名）不同，称号是达成即永久收藏的荣誉，
 * 用户可选一枚佩戴对外展示。requires 声明颁发条件（等级/连续天数/学分/前置成就），惰性评估幂等颁发。
 */
export const TITLES: Array<{
  code: string;
  name: string;
  desc: string;
  requires: { level?: number; streak?: number; exp?: number; achievement?: string };
}> = [
  { code: "t_xiucai", name: "秀才", desc: "功名至「秀才」", requires: { level: 3 } },
  { code: "t_juren", name: "举人", desc: "功名至「举人」", requires: { level: 6 } },
  { code: "t_jinshi", name: "进士", desc: "功名至「进士」", requires: { level: 7 } },
  { code: "t_hanlin", name: "翰林", desc: "功名至「翰林」", requires: { level: 8 } },
  { code: "t_daxueshi", name: "大学士", desc: "功名至「大学士」", requires: { level: 9 } },
  { code: "t_zongshi", name: "一代宗师", desc: "登顶「宗师」", requires: { level: 10 } },
  { code: "t_qiri", name: "七日不辍", desc: "连续学习 7 天", requires: { streak: 7 } },
  { code: "t_bairi", name: "百日筑基", desc: "连续学习 100 天", requires: { streak: 100 } },
  { code: "t_xuefu", name: "学富五车", desc: "累计学分达 5000", requires: { exp: 5000 } },
  { code: "t_taoli", name: "桃李满门", desc: "有徒弟学成出师", requires: { achievement: "mentor_graduate" } },
  { code: "t_zhishi", name: "知时节", desc: "集齐 12 个节气", requires: { achievement: "solar_term_12" } },
  { code: "t_huiyou", name: "以文会友", desc: "完成组队共读", requires: { achievement: "shared_reading_complete" } },
  // 创作激励（创-P1）：以「妙笔生花」成就为前置——创作出 80+ 分优质内容即得
  { code: "t_wenhao", name: "文豪", desc: "创作出评分 80 分以上的优质内容", requires: { achievement: "content_quality_star" } },
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
        const leveledUp = lv.level > fresh.level;
        if (lv.level !== fresh.level) {
          await this.prisma.userGrowth.update({ where: { userId }, data: { level: lv.level } });
        }
        await this.evaluateAchievements(userId, { totalExp: fresh.totalExp, level: lv.level, streak: consecutiveDays });
        // 师徒传承钩子：徒弟打卡 → 师父 +2；徒弟晋升 → 师父 +20（自吞不阻断主流程）
        await this.awardMentorPoints(userId, 2);
        if (leveledUp) await this.awardMentorPoints(userId, 20);
      }
    } catch (e) {
      this.logger.warn(`成长档案更新失败(user=${userId})`, e as Error);
    }
  }

  /**
   * 师徒传承·传道值钩子（纯荣誉·R1 合规）：徒弟成长时给其 ACTIVE 师父双写传道值。
   * 直接查 Mentorship 表（不注入 MentorshipService）以规避模块循环依赖；
   * 自带 try/catch 自吞，绝不阻断成长主流程；传道值不可兑换任何财物。
   */
  private async awardMentorPoints(discipleId: string, points: number) {
    if (points <= 0) return;
    try {
      const m = await this.prisma.mentorship.findFirst({
        where: { discipleId, status: "ACTIVE" },
        select: { id: true, mentorId: true },
      });
      if (!m) return; // 无 ACTIVE 师父不加
      // 师父荣誉总和（UserGrowth）+ 该徒归属明细（Mentorship）双写
      await this.prisma.userGrowth.upsert({
        where: { userId: m.mentorId },
        create: { userId: m.mentorId, mentorshipPoints: points },
        update: { mentorshipPoints: { increment: points } },
      });
      await this.prisma.mentorship.update({
        where: { id: m.id },
        data: { mentorshipPoints: { increment: points } },
      });
    } catch (e) {
      this.logger.warn(`传道值钩子失败(disciple=${discipleId})`, e as Error);
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
      const newTotal = fresh?.totalExp ?? exp;
      const lv = this.levelOf(newTotal);
      const leveledUp = fresh ? lv.level > fresh.level : false;
      if (fresh && lv.level !== fresh.level) {
        await this.prisma.userGrowth.update({ where: { userId }, data: { level: lv.level } });
      }
      await this.evaluateAchievements(userId, { totalExp: fresh?.totalExp ?? 0, level: lv.level, streak: fresh?.currentStreak ?? 0 });
      // 师徒传承钩子：徒弟学分每满 100 → 师父 +5（检测跨百）；晋升 → 师父 +20
      const crossedHundreds = Math.floor(newTotal / 100) - Math.floor((newTotal - exp) / 100);
      if (crossedHundreds > 0) await this.awardMentorPoints(userId, 5 * crossedHundreds);
      if (leveledUp) await this.awardMentorPoints(userId, 20);
    } catch (e) {
      this.logger.warn(`加学分失败(user=${userId})`, e as Error);
    }
  }

  /** 成就惰性评估（幂等：unique 冲突即已拥有）；随后同口径评估称号 */
  private async evaluateAchievements(userId: string, s: { totalExp: number; level: number; streak: number }) {
    const eligible: string[] = ["first_checkin"];
    if (s.streak >= 7) eligible.push("streak_7");
    if (s.streak >= 30) eligible.push("streak_30");
    if (s.streak >= 100) eligible.push("streak_100");
    if (s.level >= 3) eligible.push("level_xiucai");
    if (s.level >= 6) eligible.push("level_juren");
    if (s.level >= 7) eligible.push("level_jinshi");
    if (s.level >= 10) eligible.push("level_zongshi");
    if (s.totalExp >= 1000) eligible.push("exp_1000");
    if (s.totalExp >= 5000) eligible.push("exp_5000");

    const owned = await this.prisma.userAchievement.findMany({
      where: { userId, code: { in: eligible } },
      select: { code: true },
    });
    const ownedSet = new Set(owned.map((o) => o.code));
    const toAward = eligible.filter((c) => !ownedSet.has(c));
    if (toAward.length > 0) {
      await this.prisma.userAchievement
        .createMany({ data: toAward.map((code) => ({ userId, code })), skipDuplicates: true })
        .catch(() => undefined);
    }
    await this.evaluateTitles(userId, s).catch(() => undefined);
  }

  /** 称号惰性评估（幂等）：按等级/连续/学分/前置成就颁发 */
  private async evaluateTitles(userId: string, s: { totalExp: number; level: number; streak: number }) {
    // 成就前置类称号需查全部已获成就（含 solar-term/共读等模块直建的）
    const achOwned = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { code: true },
    });
    const achSet = new Set(achOwned.map((a) => a.code));

    const eligible = TITLES.filter((t) => {
      const r = t.requires;
      if (r.level !== undefined && s.level < r.level) return false;
      if (r.streak !== undefined && s.streak < r.streak) return false;
      if (r.exp !== undefined && s.totalExp < r.exp) return false;
      if (r.achievement !== undefined && !achSet.has(r.achievement)) return false;
      return true;
    }).map((t) => t.code);
    if (eligible.length === 0) return;

    const owned = await this.prisma.userTitle.findMany({
      where: { userId, code: { in: eligible } },
      select: { code: true },
    });
    const ownedSet = new Set(owned.map((o) => o.code));
    const toAward = eligible.filter((c) => !ownedSet.has(c));
    if (toAward.length === 0) return;
    await this.prisma.userTitle
      .createMany({ data: toAward.map((code) => ({ userId, code })), skipDuplicates: true })
      .catch(() => undefined);
  }

  /** 我的称号：全目录 + 已获/佩戴状态（进页先惰性补评一次，防错过颁发时机） */
  async getMyTitles(userId: string) {
    const profile = await this.prisma.userGrowth.findUnique({ where: { userId } });
    if (profile) {
      const lv = this.levelOf(profile.totalExp);
      await this.evaluateTitles(userId, {
        totalExp: profile.totalExp,
        level: lv.level,
        streak: profile.currentStreak,
      }).catch(() => undefined);
    }
    const owned = await this.prisma.userTitle.findMany({ where: { userId } });
    const ownedMap = new Map(owned.map((t) => [t.code, t]));
    return TITLES.map((t) => ({
      code: t.code,
      name: t.name,
      desc: t.desc,
      earned: ownedMap.has(t.code),
      equipped: ownedMap.get(t.code)?.equipped ?? false,
      earnedAt: ownedMap.get(t.code)?.earnedAt ?? null,
    }));
  }

  /** 佩戴称号（每用户至多一枚；必须已拥有） */
  async equipTitle(userId: string, code: string) {
    if (!TITLES.some((t) => t.code === code)) {
      throw new BusinessException(ErrorCode.BAD_REQUEST, "称号不存在");
    }
    const owned = await this.prisma.userTitle.findUnique({
      where: { userId_code: { userId, code } },
    });
    if (!owned) throw new BusinessException(ErrorCode.BAD_REQUEST, "尚未获得该称号");
    await this.prisma.$transaction([
      this.prisma.userTitle.updateMany({ where: { userId, equipped: true }, data: { equipped: false } }),
      this.prisma.userTitle.update({ where: { userId_code: { userId, code } }, data: { equipped: true } }),
    ]);
    return { equipped: code };
  }

  /** 卸下称号 */
  async unequipTitle(userId: string) {
    await this.prisma.userTitle.updateMany({ where: { userId, equipped: true }, data: { equipped: false } });
    return { equipped: null };
  }

  /**
   * 公开成就卡（V1 学习成就卡裂变·分享落地页数据源）：
   * 仅当该用户真实获得过该成就/称号才返回；只暴露非敏感展示字段（昵称/头像本就公开于圈子等场景）。
   */
  async getPublicGrowthCard(userId: string, code: string, type: "achievement" | "title") {
    let name: string | undefined;
    let desc: string | undefined;
    let earnedAt: Date | null = null;

    if (type === "title") {
      const def = TITLES.find((t) => t.code === code);
      if (!def) throw new BusinessException(ErrorCode.NOT_FOUND, "成就卡不存在");
      const owned = await this.prisma.userTitle.findUnique({ where: { userId_code: { userId, code } } });
      if (!owned) throw new BusinessException(ErrorCode.NOT_FOUND, "成就卡不存在");
      name = def.name;
      desc = def.desc;
      earnedAt = owned.earnedAt;
    } else {
      const def = ACHIEVEMENTS.find((a) => a.code === code);
      if (!def) throw new BusinessException(ErrorCode.NOT_FOUND, "成就卡不存在");
      const owned = await this.prisma.userAchievement.findUnique({ where: { userId_code: { userId, code } } });
      if (!owned) throw new BusinessException(ErrorCode.NOT_FOUND, "成就卡不存在");
      name = def.name;
      desc = def.desc;
      earnedAt = owned.earnedAt;
    }

    const [user, profile] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true, avatar: true } }),
      this.prisma.userGrowth.findUnique({ where: { userId } }),
    ]);
    if (!user) throw new BusinessException(ErrorCode.NOT_FOUND, "成就卡不存在");
    const lv = this.levelOf(profile?.totalExp ?? 0);
    // 连续天数口径与 getMyGrowth 一致：断签超 1 天按 0 展示
    let streak = profile?.currentStreak ?? 0;
    if (profile?.lastCheckinDate) {
      const days = Math.floor((Date.now() - profile.lastCheckinDate.getTime()) / DAY_MS);
      if (days > 1) streak = 0;
    }
    return {
      nickname: user.nickname,
      avatar: user.avatar,
      type,
      code,
      name,
      desc,
      earnedAt,
      currentStreak: streak,
      maxStreak: profile?.maxStreak ?? 0,
      level: lv.level,
      levelName: lv.name,
      totalExp: profile?.totalExp ?? 0,
    };
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
    const [earned, equippedRow] = await Promise.all([
      this.prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
      }),
      this.prisma.userTitle.findFirst({ where: { userId, equipped: true }, select: { code: true } }),
    ]);
    const earnedMap = new Map(earned.map((e) => [e.code, e.earnedAt]));
    const equippedDef = equippedRow ? TITLES.find((t) => t.code === equippedRow.code) : null;
    return {
      totalExp,
      level: lv.level,
      levelName: lv.name,
      levelStartExp: lv.currentExp,
      nextLevelExp: lv.nextExp, // null=已到顶
      currentStreak: streak,
      maxStreak: profile?.maxStreak ?? 0,
      equippedTitle: equippedDef ? { code: equippedDef.code, name: equippedDef.name } : null,
      achievements: ACHIEVEMENTS.map((a) => ({
        ...a,
        earned: earnedMap.has(a.code),
        earnedAt: earnedMap.get(a.code) ?? null,
      })),
      levels: GROWTH_LEVELS,
    };
  }
}
