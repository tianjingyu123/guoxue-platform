/**
 * 圈子成长体系常量（等级曲线 + 徽章定义）
 * 规则见任务规格：等级=签到经验+发帖×10+获赞×2；徽章 5 个。
 */

/** 等级阈值：索引 i（0-based）对应 Lv(i+1) 的累计总经验下限。≥最后一档封顶 Lv10 */
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2300, 3300, 4500, 6000];

/** 等级名称（国风，与等级一一对应 Lv1..Lv10） */
export const LEVEL_NAMES = [
  "初入门径",
  "略窥门庭",
  "登堂入室",
  "渐有所成",
  "融会贯通",
  "博学多识",
  "出类拔萃",
  "学富五车",
  "通儒达士",
  "一代宗师",
];

export interface LevelInfo {
  level: number;            // 当前等级 1..10
  levelName: string;        // 等级名称
  totalExp: number;         // 当前总经验
  currentLevelMinExp: number; // 当前等级下限
  nextLevelMinExp: number | null; // 下一级下限（已封顶为 null）
  expIntoLevel: number;     // 本级已获得经验
  expForNextLevel: number | null; // 升下一级所需总跨度（已封顶 null）
  progressPercent: number;  // 距下一级进度 0-100（封顶=100）
  isMax: boolean;
}

/** 根据总经验计算等级信息 */
export function computeLevel(totalExp: number): LevelInfo {
  const exp = Math.max(0, Math.floor(totalExp));
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (exp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const isMax = level >= LEVEL_THRESHOLDS.length;
  const currentLevelMinExp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelMinExp = isMax ? null : LEVEL_THRESHOLDS[level];
  const expIntoLevel = exp - currentLevelMinExp;
  const expForNextLevel = nextLevelMinExp === null ? null : nextLevelMinExp - currentLevelMinExp;
  const progressPercent = expForNextLevel === null
    ? 100
    : Math.min(100, Math.round((expIntoLevel / expForNextLevel) * 100));
  return {
    level,
    levelName: LEVEL_NAMES[level - 1],
    totalExp: exp,
    currentLevelMinExp,
    nextLevelMinExp,
    expIntoLevel,
    expForNextLevel,
    progressPercent,
    isMax,
  };
}

export interface BadgeDef {
  code: string;
  name: string;
  desc: string;
  icon: string;     // 与前端 app-icon 名一致
  rarity: "common" | "rare" | "epic" | "legendary";
}

/** 徽章定义（5 个，达成条件在 service 中按真实统计判断） */
export const BADGE_DEFS: BadgeDef[] = [
  { code: "newcomer",   name: "初来乍到", desc: "加入圈子即可获得",   icon: "user-plus",       rarity: "common" },
  { code: "persistent", name: "坚持不懈", desc: "连续签到满 7 天",     icon: "flame",           rarity: "rare" },
  { code: "prolific",   name: "笔耕不辍", desc: "在圈内发帖满 10 篇",  icon: "edit-3",          rarity: "rare" },
  { code: "popular",    name: "人气之星", desc: "圈内帖子累计获赞 100", icon: "heart",          rarity: "epic" },
  { code: "veteran",    name: "圈子元老", desc: "加入圈子满 30 天",     icon: "crown",           rarity: "legendary" },
];

/** 签到基础经验 + 连续奖励规则 */
export const CHECKIN_BASE_EXP = 10;
export const CHECKIN_STREAK_BONUS: Record<number, number> = {
  7: 20,   // 连续第 7 天当日额外 +20
  30: 50,  // 连续第 30 天当日额外 +50
};

/** 排行榜默认取 Top N */
export const LEADERBOARD_TOP_N = 20;
