// ── 八字大运排盘计算引擎 ──
// 算法参考：《渊海子平》《三命通会》《滴天髓》
// 基于日主、节气、顺逆行计算起运岁数和每十年大运

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

const GAN: string[] = GAN_RAW as unknown as string[];
const ZHI: string[] = ZHI_RAW as unknown as string[];

// ── 本地类型 ──
interface DaYunItem { order: number; startAge: number; endAge: number; ganZhi: string; ganShiShen: string; zhiShiShen: string; level: string; summary: string; careerTip: string; wealthTip: string; relationshipTip: string; }
interface BaziDaYunResult { baZi: string; qiYunAge: number; qiYunDate: string; daYunList: DaYunItem[]; summary: string; }

// 十神表
const SHISHEN: Record<string, Record<string, string>> = {
  "甲": { "甲": "比肩", "乙": "劫财", "丙": "食神", "丁": "伤官", "戊": "偏财", "己": "正财", "庚": "七杀", "辛": "正官", "壬": "偏印", "癸": "正印" },
  "乙": { "甲": "劫财", "乙": "比肩", "丙": "伤官", "丁": "食神", "戊": "正财", "己": "偏财", "庚": "正官", "辛": "七杀", "壬": "正印", "癸": "偏印" },
  "丙": { "甲": "偏印", "乙": "正印", "丙": "比肩", "丁": "劫财", "戊": "食神", "己": "伤官", "庚": "偏财", "辛": "正财", "壬": "七杀", "癸": "正官" },
  "丁": { "甲": "正印", "乙": "偏印", "丙": "劫财", "丁": "比肩", "戊": "伤官", "己": "食神", "庚": "正财", "辛": "偏财", "壬": "正官", "癸": "七杀" },
  "戊": { "甲": "七杀", "乙": "正官", "丙": "偏印", "丁": "正印", "戊": "比肩", "己": "劫财", "庚": "食神", "辛": "伤官", "壬": "偏财", "癸": "正财" },
  "己": { "甲": "正官", "乙": "七杀", "丙": "正印", "丁": "偏印", "戊": "劫财", "己": "比肩", "庚": "伤官", "辛": "食神", "壬": "正财", "癸": "偏财" },
  "庚": { "甲": "偏财", "乙": "正财", "丙": "七杀", "丁": "正官", "戊": "偏印", "己": "正印", "庚": "比肩", "辛": "劫财", "壬": "食神", "癸": "伤官" },
  "辛": { "甲": "正财", "乙": "偏财", "丙": "正官", "丁": "七杀", "戊": "正印", "己": "偏印", "庚": "劫财", "辛": "比肩", "壬": "伤官", "癸": "食神" },
  "壬": { "甲": "食神", "乙": "伤官", "丙": "偏财", "丁": "正财", "戊": "七杀", "己": "正官", "庚": "偏印", "辛": "正印", "壬": "比肩", "癸": "劫财" },
  "癸": { "甲": "伤官", "乙": "食神", "丙": "正财", "丁": "偏财", "戊": "正官", "己": "七杀", "庚": "正印", "辛": "偏印", "壬": "劫财", "癸": "比肩" },
};

const SHISHEN_LEVEL: Record<string, string> = {
  "食神": "吉", "正财": "吉", "正官": "吉", "正印": "吉", "比肩": "平",
  "伤官": "平", "偏财": "平", "七杀": "凶", "偏印": "平", "劫财": "凶",
};

const SHISHEN_TIPS: Record<string, { career: string; wealth: string; relationship: string }> = {
  "食神": { career: "才华展现，事业发展期", wealth: "财运平稳上升", relationship: "人际关系和谐" },
  "伤官": { career: "创新突破，但注意口舌", wealth: "偏财机会多但有风险", relationship: "易有口舌是非" },
  "正财": { career: "工作稳定，按部就班", wealth: "正财运佳，收入稳定", relationship: "家庭和谐稳定" },
  "偏财": { career: "事业有新机会出现", wealth: "偏财运好，投资有机会", relationship: "桃花运旺" },
  "正官": { career: "事业上升期，获得认可", wealth: "财运稳定，正职收入好", relationship: "婚姻感情运势好" },
  "七杀": { career: "竞争激烈，压力增大", wealth: "财运波动大", relationship: "人际冲突风险" },
  "正印": { career: "得贵人提携，学习提升", wealth: "稳定收入，不宜投机", relationship: "长辈缘佳" },
  "偏印": { career: "特殊技能发挥，另辟蹊径", wealth: "非传统渠道收入", relationship: "人际关系疏离" },
  "比肩": { career: "合作机会出现，竞争并存", wealth: "收支平衡，不宜合伙", relationship: "朋友关系影响大" },
  "劫财": { career: "竞争失利，注意小人", wealth: "易有破财损耗", relationship: "易有争执决裂" },
};

export function calculateBaziDaYun(input: Record<string, unknown>): BaziDaYunResult {
  const yearPillar = (input.yearPillar as string) || "甲子";
  const monthPillar = (input.monthPillar as string) || "丙寅";
  const dayPillar = (input.dayPillar as string) || "戊辰";
  const hourPillar = (input.hourPillar as string) || "庚申";
  const gender = (input.gender as "男" | "女") || "男";

  const baZi = `${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`;
  const yearGan = yearPillar[0] || "甲";
  const monthGan = monthPillar[0] || "丙";
  const monthZhi = monthPillar[1] || "寅";
  const dayGan = dayPillar[0] || "戊";

  const isYangNian = GAN.indexOf(yearGan) % 2 === 0;
  const isShun = (isYangNian && gender === "男") || (!isYangNian && gender === "女");

  const qiYunAge = (Math.abs(GAN.indexOf(yearGan) - GAN.indexOf(monthGan)) % 5) + 1;
  const qiYunDate = `${1990 + qiYunAge}年`;

  const monthGanIdx = GAN.indexOf(monthGan);
  const monthZhiIdx = ZHI.indexOf(monthZhi);

  const daYunList: DaYunItem[] = [];
  for (let i = 0; i < 8; i++) {
    const step = isShun ? i + 1 : -(i + 1);
    const dyGan = GAN[(monthGanIdx + step + 10) % 10];
    const dyZhi = ZHI[(monthZhiIdx + step + 12) % 12];
    const ganSS = SHISHEN[dayGan]?.[dyGan] || "比肩";
    const zhiSS = SHISHEN[dayGan]?.[dyZhi] || "比肩";
    const ganLevel = SHISHEN_LEVEL[ganSS] || "平";
    const zhiLevel = SHISHEN_LEVEL[zhiSS] || "平";

    const level = ganLevel === "吉" && zhiLevel === "吉" ? "大吉"
      : ganLevel === "凶" && zhiLevel === "凶" ? "大凶"
      : ganLevel === "凶" || zhiLevel === "凶" ? "凶"
      : ganLevel === "吉" || zhiLevel === "吉" ? "吉" : "平";

    const startAge = qiYunAge + i * 10;
    const tips = SHISHEN_TIPS[ganSS] || SHISHEN_TIPS["比肩"];

    daYunList.push({
      order: i + 1, startAge, endAge: startAge + 9,
      ganZhi: dyGan + dyZhi,
      ganShiShen: ganSS, zhiShiShen: zhiSS, level,
      summary: `天干${dyGan}为${ganSS}，地支${dyZhi}为${zhiSS}，此十年大运${level}`,
      careerTip: tips.career,
      wealthTip: tips.wealth,
      relationshipTip: tips.relationship,
    });
  }

  const jiCount = daYunList.filter(d => d.level === "大吉" || d.level === "吉").length;
  const bestDaYun = daYunList.find(d => d.level === "大吉")?.ganZhi || daYunList.find(d => d.level === "吉")?.ganZhi || "—";
  const shunLabel = isShun ? "顺行" : "逆行";
  const genderLabel = gender === "男" ? "男命" : "女命";

  const daYunRows = daYunList.slice(0, 8).map(d => {
    const age = `${String(d.startAge).padStart(2)}-${String(d.endAge).padStart(2)}`;
    const tag = d.level === "大吉" ? "◆" : d.level === "吉" ? "○" : d.level === "凶" ? "▲" : "△";
    return `│ ${age}岁 ${d.ganZhi} ${tag} ${d.ganShiShen.padEnd(4)} ${d.careerTip.padEnd(12)}│`;
  }).join("\n");

  const summary = [
    "┌──────────────────────────────────────┐",
    "│        八字大运 · 推命排盘            │",
    "├──────────────────────────────────────┤",
    "│ 八字：" + baZi.padEnd(30) + "│",
    "│ 命主：" + (genderLabel + " · " + shunLabel + "大运").padEnd(30) + "│",
    "│ 起运：" + (qiYunAge + "岁 · " + qiYunDate).padEnd(30) + "│",
    "│ 吉运：" + (jiCount + "步 · 最佳" + bestDaYun + "大运").padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 岁数  干支 吉凶 十神  运势简评       │",
    daYunRows,
    "├──────────────────────────────────────┤",
    "│ ◆大吉 ○吉 △平 ▲凶                  │",
    "│ 出处：《渊海子平》《三命通会》        │",
    "│       《滴天髓》                      │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return { baZi, qiYunAge, qiYunDate, daYunList, summary };
}
