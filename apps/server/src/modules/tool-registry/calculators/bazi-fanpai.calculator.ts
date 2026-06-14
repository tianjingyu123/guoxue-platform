// ── 八字反推出生时辰计算引擎 ──
// 算法参考：《渊海子平》《三命通会》《滴天髓》
// 基于人生重大事件反向推算最可能的出生时辰
// 《渊海子平》云：「时者，一日之终始也。时柱乃归宿之地，关乎晚运子息。」

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

const GAN: string[] = GAN_RAW as unknown as string[];
const ZHI: string[] = ZHI_RAW as unknown as string[];

// ── 本地类型 ──
interface LifeEventItem { year: number; event: string; category: string; }
interface ShiChenCandidate {
  shiChen: string; timeRange: string; hourPillar: string; fullBazi: string;
  score: number; reasoning: string; personality?: string; careerHint?: string;
}
interface BaziFanPaiResult {
  targetDate: string; candidates: ShiChenCandidate[]; bestMatch: ShiChenCandidate | null;
  summary: string; confidence: string;
}

// 时辰对照 + 性格特征
const SHICHEN_LIST = [
  { name: "子时", range: "23:00-01:00", zhi: "子", personality: "心思细腻，直觉敏锐。子时水旺，聪明善谋，但易多疑。", career: "研究员、策略师、夜班工作者" },
  { name: "丑时", range: "01:00-03:00", zhi: "丑", personality: "踏实稳重，坚韧不拔。丑时土厚，默默耕耘，厚积薄发。", career: "金融、地产、仓储管理、农业" },
  { name: "寅时", range: "03:00-05:00", zhi: "寅", personality: "朝气蓬勃，进取心强。寅时木旺，如日出东方，充满希望和行动力。", career: "创业者、销售、运动教练、军警" },
  { name: "卯时", range: "05:00-07:00", zhi: "卯", personality: "温文尔雅，亲和力强。卯时木秀，如春花绽放，人缘佳善交际。", career: "教育、公关、文艺、外交" },
  { name: "辰时", range: "07:00-09:00", zhi: "辰", personality: "胸怀宽广，包容力强。辰时土湿，如大地纳水，有容人雅量。", career: "管理、建筑、水利、环保" },
  { name: "巳时", range: "09:00-11:00", zhi: "巳", personality: "热情奔放，精力充沛。巳时火旺，如日中天，行动力执行力强。", career: "演艺、餐饮、市场、互联网" },
  { name: "午时", range: "11:00-13:00", zhi: "午", personality: "光明磊落，领导力强。午时火极，如正午太阳，天生领袖气质。", career: "高管、政治家、导演、企业家" },
  { name: "未时", range: "13:00-15:00", zhi: "未", personality: "温和善良，善解人意。未时土燥，如午后暖阳，随和而有耐心。", career: "医疗、社工、教育、心理咨询" },
  { name: "申时", range: "15:00-17:00", zhi: "申", personality: "机敏灵活，应变力强。申时金锐，如刀剑出鞘，思维锋利行动决断。", career: "法律、金融投资、外科医生、工程师" },
  { name: "酉时", range: "17:00-19:00", zhi: "酉", personality: "严谨精致，审美高雅。酉时金纯，如精金美玉，追求完美品位出众。", career: "设计师、珠宝鉴定、会计、律师" },
  { name: "戌时", range: "19:00-21:00", zhi: "戌", personality: "忠诚可靠，责任感强。戌时土燥，如晚霞厚重，信守承诺值得信赖。", career: "安全管理、审计、公务员、保安" },
  { name: "亥时", range: "21:00-23:00", zhi: "亥", personality: "博学多才，想象力丰富。亥时水静，如夜色深沉，内心世界丰富直觉强。", career: "作家、哲学家、心理学家、艺术家" },
];

// 日干算时柱天干（五鼠遁法）
// 《渊海子平》：「甲己还加甲，乙庚丙作初。丙辛从戊起，丁壬庚子居。戊癸何方发，壬子是真途。」
function getHourGan(dayGan: string, hourZhiIdx: number): string {
  const dayGanIdx = GAN.indexOf(dayGan);
  const startGan = [0, 2, 4, 6, 8][Math.floor(dayGanIdx / 2)];
  return GAN[(startGan + hourZhiIdx) % 10];
}

// 各十神特征对应人生事件（扩展版）
const SHISHEN_EVENTS: Record<string, {
  favorable: string[]; unfavorable: string[];
  personality: string; timing: string;
}> = {
  "正官": {
    favorable: ["升职", "得权", "结婚", "考学成功", "获奖", "评优", "转正"],
    unfavorable: ["官非", "降职", "处分", "考试失利", "诉讼"],
    personality: "正直守规，责任心强，有管理才能。",
    timing: "正官星旺之时，宜求职、面试、考公。",
  },
  "七杀": {
    favorable: ["创业成功", "突破困难", "竞争获胜", "升职迅速", "军警立功"],
    unfavorable: ["意外受伤", "官司纠纷", "被欺压", "车祸", "手术"],
    personality: "果断魄力，敢闯敢拼，有将帅之风。",
    timing: "七杀得制化为权，宜开拓进取。",
  },
  "正财": {
    favorable: ["发财", "购置房产", "稳定收入", "加薪", "继承", "储蓄增长"],
    unfavorable: ["破财", "收入减少", "工资拖欠", "投资亏损"],
    personality: "勤俭持家，精打细算，财运稳定。",
    timing: "正财运旺，宜储蓄置业。",
  },
  "偏财": {
    favorable: ["意外之财", "投资获利", "中奖", "副业收入", "遗产"],
    unfavorable: ["大额损失", "被骗", "赌博输钱", "投机失败"],
    personality: "财商高，善于投资，但须防投机心态。",
    timing: "偏财运旺，宜投资但不贪。",
  },
  "食神": {
    favorable: ["添丁", "技艺有成", "出书", "办展", "美食之乐", "健康改善"],
    unfavorable: ["健康问题", "过度享乐", "肥胖"],
    personality: "温和乐观，喜欢美食艺术，生活有情趣。",
    timing: "食神生财，宜创作和享受生活。",
  },
  "伤官": {
    favorable: ["才华展示", "创新突破", "比赛获奖", "发明创造", "跳槽高就"],
    unfavorable: ["口舌是非", "辞职", "得罪人", "名声受损"],
    personality: "聪明绝顶，才华横溢，但锋芒毕露易招是非。",
    timing: "伤官见官为祸百端，宜低调发挥才华。",
  },
  "正印": {
    favorable: ["学业有成", "升迁", "获贵人助", "考取证书", "论文发表"],
    unfavorable: ["学业受阻", "贵人远离", "文书有误"],
    personality: "温厚善良，好学不倦，有长者之风。",
    timing: "印星当旺，宜学习进修。",
  },
  "偏印": {
    favorable: ["特殊才能发挥", "偏门技艺", "灵修", "玄学天赋"],
    unfavorable: ["事业受阻", "怀才不遇", "孤独感"],
    personality: "独特思维，善于钻研，但性格孤僻不易合群。",
    timing: "偏印夺食须防，宜专精一门。",
  },
  "比肩": {
    favorable: ["合作顺利", "朋友相助", "人脉扩展", "联合创业"],
    unfavorable: ["竞争失利", "被兄弟朋友拖累", "合作破裂"],
    personality: "独立自主，重友情，但易与同辈竞争。",
    timing: "比肩帮扶，宜合作共赢。",
  },
  "劫财": {
    favorable: ["人脉扩展", "合作得利", "团队取胜", "众筹成功"],
    unfavorable: ["钱财被劫", "合作破裂", "被坑骗", "散财"],
    personality: "豪爽大方，善交际，但须防财物外流。",
    timing: "劫财见财须防破耗。",
  },
};

// 十神关系表
const SHISHEN_TABLE: Record<string, Record<string, string>> = {
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

// 地支六冲——时柱被冲减分
const ZHI_CHONG: Record<string, string> = {
  "子": "午", "午": "子", "丑": "未", "未": "丑",
  "寅": "申", "申": "寅", "卯": "酉", "酉": "卯",
  "辰": "戌", "戌": "辰", "巳": "亥", "亥": "巳",
};

// 地支六合——时柱与日柱六合加分
const ZHI_HE: Record<string, string> = {
  "子": "丑", "丑": "子", "寅": "亥", "亥": "寅",
  "卯": "戌", "戌": "卯", "辰": "酉", "酉": "辰",
  "巳": "申", "申": "巳", "午": "未", "未": "午",
};

// 十神大运对应（粗略）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getDaYun(yearGan: string, gender: "男" | "女"): number {
  const ygIdx = GAN.indexOf(yearGan);
  const yangGan = ygIdx % 2 === 0;
  const seq = yangGan === (gender === "男") ? 1 : -1;
  return seq;
}

// 粗略推算事件年份对应的大运天干
function getApproxDaYunGan(yearGan: string, birthYear: number, eventYear: number, gender: "男" | "女"): string {
  const age = eventYear - birthYear;
  if (age < 0) return "未知";
  const ygIdx = GAN.indexOf(yearGan);
  const yangGan = ygIdx % 2 === 0;
  const seq = yangGan === (gender === "男") ? 1 : -1;
  // 起运年龄大约为3-8岁，取5
  const yunStartAge = 5;
  if (age < yunStartAge) return "未起运";
  const yunStep = Math.floor((age - yunStartAge) / 10);
  const daYunIdx = ((ygIdx + seq * (yunStep + 1)) % 10 + 10) % 10;
  return GAN[daYunIdx];
}

export function calculateBaziFanPai(input: Record<string, unknown>): BaziFanPaiResult {
  const year = (input.year as number) || 1990;
  const month = (input.month as number) || 1;
  const day = (input.day as number) || 1;
  const lifeEvents = (input.lifeEvents as LifeEventItem[]) || [];
  const gender = (input.gender as "男" | "女") || "男";

  const yearGan = GAN[(year - 4) % 10];
  const yearZhi = ZHI[(year - 4) % 12];

  // 简化月柱计算
  const monthGan = GAN[(year - 4) * 2 % 10 + (month - 1)] || GAN[0];
  const monthZhi = ZHI[(month + 1) % 12];
  const monthPillar = monthGan + monthZhi;

  // 简化日柱计算
  const dayGan = GAN[(day + 9) % 10];
  const dayZhi = ZHI[(day + 5) % 12];
  const dayPillar = dayGan + dayZhi;

  const candidates: ShiChenCandidate[] = [];

  for (let i = 0; i < 12; i++) {
    const sc = SHICHEN_LIST[i];
    const hourGan = getHourGan(dayGan, i);
    const hourPillar = hourGan + sc.zhi;
    const fullBazi = `${yearGan}${yearZhi} ${monthPillar} ${dayPillar} ${hourPillar}`;

    let score = 50;
    const reasonings: string[] = [];

    // 时柱十神
    const shiShiShen = SHISHEN_TABLE[dayGan]?.[hourGan] || "比肩";
    const events = SHISHEN_EVENTS[shiShiShen] || { favorable: [], unfavorable: [], personality: "", timing: "" };

    // 与现实事件匹配
    for (const evt of lifeEvents) {
      for (const fav of events.favorable) {
        if (evt.event.includes(fav)) {
          score += 10;
          reasonings.push(`${evt.year}年「${evt.event}」与时柱${shiShiShen}吉应匹配（${fav}）`);
          // 检查大运对这个事件的加成
          const dyGan = getApproxDaYunGan(yearGan, year, evt.year, gender);
          if (dyGan !== "未知" && dyGan !== "未起运") {
            const dyShiShen = SHISHEN_TABLE[dayGan]?.[dyGan] || "未知";
            if (dyShiShen === shiShiShen) {
              score += 5;
              reasonings.push(`${evt.year}年大运走${dyShiShen}，与时柱十神相呼应，加分`);
            }
          }
          break;
        }
      }
      for (const unfav of events.unfavorable) {
        if (evt.event.includes(unfav)) {
          score -= 5;
          reasonings.push(`${evt.year}年「${evt.event}」与时柱${shiShiShen}凶应相关（${unfav}）`);
          break;
        }
      }
    }

    // 子午卯酉四正时辰加分（出生时辰明确度高）
    if (["子", "午", "卯", "酉"].includes(sc.zhi)) {
      score += 5;
      reasonings.push(`${sc.name}为四正时，气场纯正有力`);
    }

    // 时柱与日柱关系
    if (hourGan === dayGan) {
      score += 3;
      reasonings.push(`时干${hourGan}与日干${dayGan}比肩，帮身有力`);
    }

    // 时支与日支六合加分
    if (ZHI_HE[sc.zhi] === dayZhi) {
      score += 4;
      reasonings.push(`时支${sc.zhi}与日支${dayZhi}六合，晚运和谐`);
    }

    // 时支与日支六冲减分
    if (ZHI_CHONG[sc.zhi] === dayZhi) {
      score -= 6;
      reasonings.push(`时支${sc.zhi}与日支${dayZhi}六冲，晚运动荡，可能性较低`);
    }

    // 时干与日干合化
    const heGanMap: Record<string, string> = { "甲": "己", "己": "甲", "乙": "庚", "庚": "乙", "丙": "辛", "辛": "丙", "丁": "壬", "壬": "丁", "戊": "癸", "癸": "戊" };
    if (heGanMap[hourGan] === dayGan) {
      score += 4;
      reasonings.push(`时干${hourGan}与日干${dayGan}天干五合，晚运贵人缘佳`);
    }

    candidates.push({
      shiChen: sc.name,
      timeRange: sc.range,
      hourPillar,
      fullBazi,
      score,
      reasoning: reasonings.join("; ") || "无特殊匹配事件，基于基础评分",
      personality: sc.personality,
      careerHint: sc.career,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestMatch = candidates[0];

  // 计算置信度
  const scoreDiff = candidates[0].score - (candidates[1]?.score || 0);
  let confidence = "";
  if (lifeEvents.length >= 3 && scoreDiff >= 10) {
    confidence = "高置信度（事件充足，得分明显领先）";
  } else if (lifeEvents.length >= 2 && scoreDiff >= 5) {
    confidence = "中等置信度（事件较多，得分有一定区分度）";
  } else if (lifeEvents.length >= 1) {
    confidence = "较低置信度（事件偏少，建议补充更多人生大事）";
  } else {
    confidence = "低置信度（无已知事件，仅靠八字结构推断。强烈建议补充至少3条人生大事以提高准确度）";
  }

  // 构建详细摘要
  const summary = [
    `【八字反推时辰报告】${year}年${month}月${day}日 · ${gender}`,
    ``,
    `年柱：${yearGan}${yearZhi} 月柱：${monthPillar} 日柱：${dayPillar} 时柱：待推`,
    ``,
    `┌─ 综合结论 ─────────────────`,
    `│ 最可能出生时辰：${bestMatch.shiChen}（${bestMatch.timeRange}）`,
    `│ 时柱：${bestMatch.hourPillar}`,
    `│ 完整八字：${bestMatch.fullBazi}`,
    `│ 匹配评分：${bestMatch.score}/100`,
    `│ 置信度：${confidence}`,
    `│`,
    `├─ 推断依据 ─────────────────`,
    ...(lifeEvents.length > 0
      ? [
          `│ 共参考${lifeEvents.length}个已知事件：`,
          ...lifeEvents.map(e => `│  · ${e.year}年 [${e.category}] ${e.event}`),
        ]
      : [`│ 无已知事件——仅基于八字结构特征推断，准确性有限`]),
    `│`,
    `├─ 时柱特征 ─────────────────`,
    `│ 时柱十神：${SHISHEN_TABLE[dayGan]?.[bestMatch.hourPillar[0]] || "未知"}（日干${dayGan}→时干${bestMatch.hourPillar[0]}）`,
    `│ 性格特征：${bestMatch.personality || ""}`,
    `│ 职业倾向：${bestMatch.careerHint || ""}`,
    `│`,
    `├─ 次选时辰（供参考）────`,
    ...candidates.slice(1, 4).map((c, i) =>
      `│ ${i + 2}. ${c.shiChen}（${c.timeRange}）时柱${c.hourPillar} 评分${c.score}`
    ),
    `│`,
    `├─ 提高准确度建议 ────────`,
    `│ 1. 补充更多已知事件（特别是30-50岁期间的大事）`,
    `│ 2. 提供父母兄弟姐妹的简要信息`,
    `│ 3. 事件描述越具体（如「2015年升任部门经理」），匹配越准确`,
    `│ 4. 如果知道大致出生时段（上午/下午/夜晚），可大幅缩小范围`,
    `│`,
    `└─ 方法来源 ─────────────────`,
    `   《渊海子平·时柱论》：「时为归宿，看子息之宫，亦主晚运。」`,
    `   《三命通会·卷五》论五鼠遁法：「甲己还加甲，乙庚丙作初。」`,
    `   《滴天髓》：「时辰乃一日之结局，关乎全局之成败。」`,
    ``,
    `注：此推算基于十神匹配法，属于辅助推断手段，不可完全替代真实出生记录。结果仅供参考。`,
  ].filter(Boolean).join("\n");

  return { targetDate: `${year}-${month}-${day}`, candidates, bestMatch, summary, confidence };
}
