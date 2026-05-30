// ── 杨公风水计算引擎 ──
// 基于二十四山向、三元九运、零正神、城门诀等核心理论

interface YangGongInput {
  sitting: string;
  period?: number;
}

interface MountainInfo {
  name: string;
  degree: string;
  sector: string;
  element: string;
  dragon: string;
  isZhengShen: boolean;
  isLingShen: boolean;
}

interface YangGongResult {
  sitting: string;
  facing: string;
  period: number;
  periodDesc: string;
  sittingSector: string;
  facingSector: string;
  sittingDragon: string;
  facingDragon: string;
  mountains: MountainInfo[];
  zhengShen: { direction: string; sector: string; advice: string };
  lingShen: { direction: string; sector: string; advice: string };
  chengMen: string[];
  wangShan: string[];
  wangXiang: string[];
  shuaiShan: string[];
  fortune: {
    overall: string;
    wealth: string;
    health: string;
    career: string;
    advice: string;
  };
  summary: string;
}

const MOUNTAINS = [
  "壬", "子", "癸", "丑", "艮", "寅",
  "甲", "卯", "乙", "辰", "巽", "巳",
  "丙", "午", "丁", "未", "坤", "申",
  "庚", "酉", "辛", "戌", "乾", "亥",
];

const SECTORS: Record<string, string[]> = {
  "坎": ["壬", "子", "癸"],
  "艮": ["丑", "艮", "寅"],
  "震": ["甲", "卯", "乙"],
  "巽": ["辰", "巽", "巳"],
  "离": ["丙", "午", "丁"],
  "坤": ["未", "坤", "申"],
  "兑": ["庚", "酉", "辛"],
  "乾": ["戌", "乾", "亥"],
};

const SECTOR_ELEMENT: Record<string, string> = {
  "坎": "水", "艮": "土", "震": "木", "巽": "木",
  "离": "火", "坤": "土", "兑": "金", "乾": "金",
};

const TIAN_YUAN = ["子", "午", "卯", "酉", "乾", "坤", "艮", "巽"];
const DI_YUAN = ["丑", "未", "辰", "戌", "甲", "庚", "丙", "壬"];
const REN_YUAN = ["寅", "申", "巳", "亥", "乙", "辛", "丁", "癸"];

const SECTOR_ORDER = ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"];

const ZHENG_SHEN_MAP: Record<number, string> = {
  1: "坎", 2: "坤", 3: "震", 4: "巽",
  5: "中", 6: "乾", 7: "兑", 8: "艮", 9: "离",
};

const LING_SHEN_MAP: Record<number, string> = {
  1: "离", 2: "艮", 3: "兑", 4: "乾",
  5: "中", 6: "巽", 7: "震", 8: "坤", 9: "坎",
};

const WANG_QI_MAP: Record<number, string[]> = {
  1: ["坎"],
  2: ["坤"],
  3: ["震"],
  4: ["巽"],
  5: ["坤", "艮"],
  6: ["乾"],
  7: ["兑"],
  8: ["艮"],
  9: ["离"],
};

const SHENG_QI_MAP: Record<number, string[]> = {
  1: ["艮"], 2: ["兑"], 3: ["巽"], 4: ["离"],
  5: ["兑", "离"], 6: ["坎"], 7: ["坤"], 8: ["震"], 9: ["坤"],
};

function getSectorOf(mountain: string): string {
  for (const [sector, mountains] of Object.entries(SECTORS)) {
    if (mountains.includes(mountain)) return sector;
  }
  return "坎";
}

function getDragon(mountain: string): string {
  if (TIAN_YUAN.includes(mountain)) return "天元龙";
  if (DI_YUAN.includes(mountain)) return "地元龙";
  if (REN_YUAN.includes(mountain)) return "人元龙";
  return "未知";
}

function getOpposite(mountain: string): string {
  const idx = MOUNTAINS.indexOf(mountain);
  if (idx === -1) return MOUNTAINS[0];
  return MOUNTAINS[(idx + 12) % 24];
}

function getChengMen(facingSector: string): string[] {
  const idx = SECTOR_ORDER.indexOf(facingSector);
  if (idx === -1) return [];
  const left = SECTOR_ORDER[(idx + 1) % 8];
  const right = SECTOR_ORDER[(idx + 7) % 8];
  return [left, right];
}

function getDegree(idx: number): string {
  const start = (337.5 + idx * 15) % 360;
  const end = (start + 15) % 360;
  return `${start}°-${end}°`;
}

export function calculateYangGong(input: unknown): YangGongResult {
  const p = input as YangGongInput;
  const sitting = p.sitting || "子";
  const period = p.period || 9;
  const facing = getOpposite(sitting);

  const sittingSector = getSectorOf(sitting);
  const facingSector = getSectorOf(facing);
  const sittingDragon = getDragon(sitting);
  const facingDragon = getDragon(facing);

  const zhengShenSector = ZHENG_SHEN_MAP[period] || "离";
  const lingShenSector = LING_SHEN_MAP[period] || "坎";

  const wangSectors = WANG_QI_MAP[period] || [];
  const shengSectors = SHENG_QI_MAP[period] || [];

  const mountains: MountainInfo[] = MOUNTAINS.map((name, idx) => {
    const sector = getSectorOf(name);
    return {
      name,
      degree: getDegree(idx),
      sector,
      element: SECTOR_ELEMENT[sector] || "",
      dragon: getDragon(name),
      isZhengShen: sector === zhengShenSector,
      isLingShen: sector === lingShenSector,
    };
  });

  const chengMen = getChengMen(facingSector);
  const wangShan = wangSectors.flatMap(s => SECTORS[s] || []);
  const wangXiang = shengSectors.flatMap(s => SECTORS[s] || []);
  const shuaiSectors = SECTOR_ORDER.filter(s => !wangSectors.includes(s) && !shengSectors.includes(s) && s !== zhengShenSector);
  const shuaiShan = shuaiSectors.slice(0, 2).flatMap(s => SECTORS[s] || []);

  const isSittingWang = wangSectors.includes(sittingSector) || shengSectors.includes(sittingSector);
  const isFacingWang = wangSectors.includes(facingSector) || shengSectors.includes(facingSector);
  const isZhengShenMatch = sittingSector === zhengShenSector;
  const isLingShenMatch = facingSector === lingShenSector;

  let overallScore = 0;
  if (isSittingWang) overallScore += 2;
  if (isFacingWang) overallScore += 2;
  if (isZhengShenMatch) overallScore += 3;
  if (isLingShenMatch) overallScore += 3;

  let overall: string;
  if (overallScore >= 8) overall = "上吉宅运，坐山旺气兼正神位，大利人丁财运";
  else if (overallScore >= 5) overall = "吉宅，旺气得位，利于发展";
  else if (overallScore >= 3) overall = "中等宅运，部分得气，需配合布局调整";
  else if (overallScore >= 1) overall = "偏弱宅运，宜用风水布局化解";
  else overall = "宅运待提升，建议详细分析后调整坐向或布局";

  const wealthAdvice = isLingShenMatch
    ? "零神方见水大利财运，向方有水为上佳格局"
    : facingSector === zhengShenSector
      ? "向方为正神位，不宜见水，宜见高物"
      : "财运平稳，可在零神方位布水局催财";

  const healthAdvice = isZhengShenMatch
    ? "正神方坐山有靠，利健康长寿"
    : sittingSector === lingShenSector
      ? "坐方为零神位，宜有水但不利坐实，注意健康"
      : "健康运中等，注意坐方环境";

  const careerAdvice = isSittingWang
    ? "坐山旺气，事业有靠山扶持"
    : "事业平稳，可在旺方布局增运";

  const advice = buildAdvice(sitting, facing, period, zhengShenSector, lingShenSector, chengMen);

  const periodNames: Record<number, string> = {
    1: "一白运(1864-1883)", 2: "二黑运(1884-1903)",
    3: "三碧运(1904-1923)", 4: "四绿运(1924-1943)",
    5: "五黄运(1944-1963)", 6: "六白运(1964-1983)",
    7: "七赤运(1984-2003)", 8: "八白运(2004-2023)",
    9: "九紫运(2024-2043)",
  };

  const summary = `坐${sitting}向${facing}，${periodNames[period] || `${period}运`}。坐属${sittingSector}卦(${SECTOR_ELEMENT[sittingSector]})${sittingDragon}，向属${facingSector}卦(${SECTOR_ELEMENT[facingSector]})${facingDragon}。${overall}`;

  return {
    sitting,
    facing,
    period,
    periodDesc: periodNames[period] || `第${period}运`,
    sittingSector,
    facingSector,
    sittingDragon,
    facingDragon,
    mountains,
    zhengShen: {
      direction: zhengShenSector,
      sector: zhengShenSector,
      advice: `正神方(${zhengShenSector})宜见山、高楼、实地，不宜见水`,
    },
    lingShen: {
      direction: lingShenSector,
      sector: lingShenSector,
      advice: `零神方(${lingShenSector})宜见水、低洼、空旷，大利财运`,
    },
    chengMen,
    wangShan,
    wangXiang,
    shuaiShan,
    fortune: {
      overall,
      wealth: wealthAdvice,
      health: healthAdvice,
      career: careerAdvice,
      advice,
    },
    summary,
  };
}

function buildAdvice(sitting: string, facing: string, period: number, zhengShen: string, lingShen: string, chengMen: string[]): string {
  const parts: string[] = [];

  parts.push(`当运(${period}运)正神方为${zhengShen}，宜有山有靠`);
  parts.push(`零神方为${lingShen}，宜有水有路`);

  if (chengMen.length > 0) {
    parts.push(`城门方位为${chengMen.join("、")}，此方有水大利出入`);
  }

  const dragon = getDragon(sitting);
  if (dragon === "天元龙") {
    parts.push("坐天元龙，格局端正，宜配天元龙之向");
  } else if (dragon === "地元龙") {
    parts.push("坐地元龙，宜配地元龙之向，注意阴阳交媾");
  } else {
    parts.push("坐人元龙，灵活多变，宜配人元龙之向");
  }

  return parts.join("。");
}
