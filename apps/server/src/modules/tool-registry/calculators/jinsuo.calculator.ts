// ── 金锁玉关（过路阴阳）计算引擎 ──
// 核心口诀：1234要砂，6789要水

type ShaShui = "砂" | "水" | "未知";

interface JinSuoInput {
  kan?: ShaShui;   // 坎1 北
  kun?: ShaShui;   // 坤2 西南
  zhen?: ShaShui;  // 震3 东
  xun?: ShaShui;   // 巽4 东南
  qian?: ShaShui;  // 乾6 西北
  dui?: ShaShui;   // 兑7 西
  gen?: ShaShui;   // 艮8 东北
  li?: ShaShui;    // 离9 南
}

interface DirectionAnalysis {
  position: string;
  number: number;
  direction: string;
  mountains: string;
  need: "砂" | "水";
  actual: ShaShui;
  isAuspicious: boolean;
  effect: string;
}

interface JinSuoResult {
  analysis: DirectionAnalysis[];
  score: number;
  maxScore: number;
  level: string;
  auspicious: string[];
  inauspicious: string[];
  fortune: {
    overall: string;
    career: string;
    wealth: string;
    health: string;
    family: string;
  };
  advice: string[];
  summary: string;
}

const DIRECTIONS: { key: keyof JinSuoInput; pos: string; num: number; dir: string; mts: string; need: "砂" | "水" }[] = [
  { key: "kan", pos: "坎", num: 1, dir: "北", mts: "壬子癸", need: "砂" },
  { key: "kun", pos: "坤", num: 2, dir: "西南", mts: "未坤申", need: "砂" },
  { key: "zhen", pos: "震", num: 3, dir: "东", mts: "甲卯乙", need: "砂" },
  { key: "xun", pos: "巽", num: 4, dir: "东南", mts: "辰巽巳", need: "砂" },
  { key: "qian", pos: "乾", num: 6, dir: "西北", mts: "戌乾亥", need: "水" },
  { key: "dui", pos: "兑", num: 7, dir: "西", mts: "庚酉辛", need: "水" },
  { key: "gen", pos: "艮", num: 8, dir: "东北", mts: "丑艮寅", need: "水" },
  { key: "li", pos: "离", num: 9, dir: "南", mts: "丙午丁", need: "水" },
];

const JI_EFFECTS: Record<string, string> = {
  "坎砂": "坎方有砂，主出聪明子弟，利中男，文才出众，仕途顺遂",
  "坤砂": "坤方有砂，主女主人能干，家中和睦，田产丰厚，老母健康",
  "震砂": "震方有砂，主长男有为，事业兴旺，雷厉风行，出贵人",
  "巽砂": "巽方有砂，主长女贤惠，文昌利考，财源广进，名声远播",
  "乾水": "乾方有水，主财运亨通，贵人相助，老父健康，功名利禄",
  "兑水": "兑方有水，主口才好，少女秀丽，人缘佳，偏财运旺",
  "艮水": "艮方有水，主少男聪慧，财运渐进，人丁兴旺，后代有出息",
  "离水": "离方有水，主中女美丽，文采风流，眼光独到，名利双收",
};

const XIONG_EFFECTS: Record<string, string> = {
  "坎水": "坎方见水，主肾脏泌尿疾患，中男不利，耳病，酒色之祸",
  "坤水": "坤方见水，主腹疾脾胃病，女主人体弱，婚姻不顺，孤寡",
  "震水": "震方见水，主肝胆病，长男不顺，是非口舌，手足损伤",
  "巽水": "巽方见水，主风邪入侵，长女不利，感情不顺，股肱之疾",
  "乾砂": "乾方有砂，主头部疾患，老父不安，事业受阻，官非破财",
  "兑砂": "兑方有砂，主口齿咽喉病，少女不利，破财口舌，血光之灾",
  "艮砂": "艮方有砂，主手指关节病，少男不利，阻滞不前，背脊之疾",
  "离砂": "离方有砂，主心眼之疾，中女不利，是非火灾，血光之灾",
};

export function calculateJinSuo(input: unknown): JinSuoResult {
  const p = input as JinSuoInput;

  const analysis: DirectionAnalysis[] = [];
  let score = 0;
  const auspicious: string[] = [];
  const inauspicious: string[] = [];
  const advice: string[] = [];

  for (const dir of DIRECTIONS) {
    const actual = p[dir.key] || "未知";
    let isAuspicious = false;
    let effect = "";

    if (actual === "未知") {
      effect = "未提供信息，无法判断";
    } else if (actual === dir.need) {
      isAuspicious = true;
      score += 1;
      const key = `${dir.pos}${actual}`;
      effect = JI_EFFECTS[key] || `${dir.pos}方${actual}得位，吉`;
      auspicious.push(`${dir.dir}(${dir.pos})${actual}得位`);
    } else {
      const key = `${dir.pos}${actual}`;
      effect = XIONG_EFFECTS[key] || `${dir.pos}方${actual}失位，凶`;
      inauspicious.push(`${dir.dir}(${dir.pos})${actual}失位`);
      advice.push(`${dir.dir}方(${dir.pos})需${dir.need}却见${actual}，建议调整：${dir.need === "砂" ? "增加高物/绿植/屏风" : "设置水景/低矮物/留空"}`);
    }

    analysis.push({
      position: dir.pos,
      number: dir.num,
      direction: dir.dir,
      mountains: dir.mts,
      need: dir.need,
      actual,
      isAuspicious,
      effect,
    });
  }

  const knownDirs = DIRECTIONS.filter(d => p[d.key] && p[d.key] !== "未知").length;
  const maxScore = knownDirs || 8;

  let level: string;
  const ratio = knownDirs > 0 ? score / knownDirs : 0;
  if (ratio >= 0.875) level = "上上格局";
  else if (ratio >= 0.75) level = "上吉格局";
  else if (ratio >= 0.625) level = "中上格局";
  else if (ratio >= 0.5) level = "中等格局";
  else if (ratio >= 0.375) level = "中下格局";
  else if (ratio >= 0.25) level = "下等格局";
  else level = "需调整格局";

  const fortune = analyzeFortune(analysis);

  if (advice.length === 0) {
    advice.push("整体格局良好，保持现状即可");
  }

  const summary = knownDirs > 0
    ? `金锁玉关分析：${knownDirs}方位中${score}个得位，${level}。${auspicious.length > 0 ? "吉：" + auspicious.slice(0, 3).join("、") : ""}${inauspicious.length > 0 ? "。凶：" + inauspicious.slice(0, 3).join("、") : ""}`
    : "请提供各方位砂水信息以进行分析";

  return {
    analysis,
    score,
    maxScore,
    level,
    auspicious,
    inauspicious,
    fortune,
    advice,
    summary,
  };
}

function analyzeFortune(analysis: DirectionAnalysis[]) {
  const kanOk = analysis.find(a => a.position === "坎")?.isAuspicious;
  const kunOk = analysis.find(a => a.position === "坤")?.isAuspicious;
  const zhenOk = analysis.find(a => a.position === "震")?.isAuspicious;
  const xunOk = analysis.find(a => a.position === "巽")?.isAuspicious;
  const qianOk = analysis.find(a => a.position === "乾")?.isAuspicious;
  const duiOk = analysis.find(a => a.position === "兑")?.isAuspicious;
  const genOk = analysis.find(a => a.position === "艮")?.isAuspicious;
  const liOk = analysis.find(a => a.position === "离")?.isAuspicious;

  const career = qianOk && zhenOk ? "事业运旺，有贵人助力，仕途顺遂"
    : qianOk ? "有贵人但需自身努力"
    : zhenOk ? "自身能力强但缺外援"
    : "事业运需提升，可调整乾、震方位";

  const wealth = qianOk && xunOk ? "财运极佳，正偏财俱旺"
    : qianOk ? "偏财运好，正财平平"
    : xunOk ? "正财稳定，可积累"
    : "财运待提升，可在乾方布水、巽方增砂";

  const health = kanOk && liOk ? "身体健康，精力旺盛"
    : kanOk ? "肾水充足但需注意心火"
    : liOk ? "心火明亮但肾气需补"
    : "健康需关注，坎方需砂、离方需水";

  const family = kunOk && genOk ? "家庭和睦，人丁兴旺"
    : kunOk ? "女主人安康，但少男需关注"
    : genOk ? "后代有望，但女主人需保养"
    : "家庭和谐度待提升";

  const okCount = [kanOk, kunOk, zhenOk, xunOk, qianOk, duiOk, genOk, liOk].filter(Boolean).length;
  const overall = okCount >= 7 ? "大吉格局，人财两旺"
    : okCount >= 5 ? "吉利格局，运势顺遂"
    : okCount >= 3 ? "中等格局，有利有弊"
    : okCount >= 1 ? "格局欠佳，需风水调整"
    : "信息不足，无法综合判断";

  return { overall, career, wealth, health, family };
}
