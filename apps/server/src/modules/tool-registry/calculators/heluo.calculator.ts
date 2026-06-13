// ── 河洛理数计算引擎 ──
// 算法参考：《河洛理数》《易学启蒙》《邵子神数》《皇极经世》
// 河图洛书配八卦纳甲数，天干地支卦爻配数取象
import { calcBazi } from "@guoxue/bazi-engine";

interface HeLuoInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: "男" | "女";
}

interface HeLuoResult {
  siZhu: { nian: string; yue: string; ri: string; shi: string };
  ganNumbers: { nian: number; yue: number; ri: number; shi: number; total: number };
  zhiNumbers: { nian: number; yue: number; ri: number; shi: number; total: number };
  upperTrigram: { number: number; name: string; element: string };
  lowerTrigram: { number: number; name: string; element: string };
  hexagram: { name: string; symbol: string; number: number };
  dongYao: number;
  bianGua: { name: string; symbol: string };
  xianTianShu: number;
  houTianShu: number;
  interpretation: {
    benGua: string;
    dongYaoText: string;
    bianGuaText: string;
  };
  fortune: {
    career: string;
    wealth: string;
    love: string;
    health: string;
    personality: string;
  };
  summary: string;
}

const GAN_HE_LUO: Record<string, number> = {
  "甲": 9, "己": 9, "乙": 8, "庚": 8,
  "丙": 7, "辛": 7, "丁": 6, "壬": 6, "戊": 5, "癸": 5,
};

const ZHI_HE_LUO: Record<string, number> = {
  "子": 9, "午": 9, "丑": 8, "未": 8,
  "寅": 7, "申": 7, "卯": 6, "酉": 6, "辰": 5, "戌": 5, "巳": 4, "亥": 4,
};

const TRIGRAMS = ["", "乾", "兑", "离", "震", "巽", "坎", "艮", "坤"];
const TRIGRAM_ELEMENT = ["", "金", "金", "火", "木", "木", "水", "土", "土"];
const TRIGRAM_SYMBOL = ["", "☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"];

const HEXAGRAM_NAMES: string[][] = [
  ["", "", "", "", "", "", "", "", ""],
  ["", "乾为天", "天泽履", "天火同人", "天雷无妄", "天风姤", "天水讼", "天山遁", "天地否"],
  ["", "泽天夬", "兑为泽", "泽火革", "泽雷随", "泽风大过", "泽水困", "泽山咸", "泽地萃"],
  ["", "火天大有", "火泽睽", "离为火", "火雷噬嗑", "火风鼎", "火水未济", "火山旅", "火地晋"],
  ["", "雷天大壮", "雷泽归妹", "雷火丰", "震为雷", "雷风恒", "雷水解", "雷山小过", "雷地豫"],
  ["", "风天小畜", "风泽中孚", "风火家人", "风雷益", "巽为风", "风水涣", "风山渐", "风地观"],
  ["", "水天需", "水泽节", "水火既济", "水雷屯", "水风井", "坎为水", "水山蹇", "水地比"],
  ["", "山天大畜", "山泽损", "山火贲", "山雷颐", "山风蛊", "山水蒙", "艮为山", "山地剥"],
  ["", "地天泰", "地泽临", "地火明夷", "地雷复", "地风升", "地水师", "地山谦", "坤为地"],
];

const GUA_INTERPRETATION: Record<string, string> = {
  "乾为天": "纯阳刚健，自强不息。命主性格刚毅果断，事业心强，适合领导岗位",
  "坤为地": "纯阴柔顺，厚德载物。命主性格温厚包容，适合辅助支持型工作",
  "水雷屯": "万事开头难，但有成长之象。命主早年艰辛，中年渐好",
  "山水蒙": "启蒙之象，求知若渴。命主聪慧好学，宜从事教育文化",
  "水天需": "等待时机，不可冒进。命主有耐心，善于把握机遇",
  "天水讼": "口舌是非之象。命主性格直率，易生争端，宜修口德",
  "地水师": "统领众人之象。命主有组织才能，适合管理",
  "水地比": "亲附和睦。命主人缘好，宜合作经营",
  "风天小畜": "小有积蓄。命主财运渐佳，宜稳健理财",
  "天泽履": "如履薄冰，谨慎行事。命主做事细心，步步为营",
  "地天泰": "通泰之象，上下交感。命主运势通达，中年大发",
  "天地否": "闭塞不通。命主早年不顺，需坚持等待转机",
  "天火同人": "志同道合。命主善交朋友，团队合作运佳",
  "火天大有": "大有所得。命主福禄兼得，事业财运俱佳",
  "地山谦": "谦逊之德。命主为人谦和，越谦越亨",
  "雷地豫": "安乐和豫。命主生活安逸，但需防安逸成惰",
  "泽雷随": "随顺而行。命主适应力强，随遇而安",
  "山风蛊": "整治腐败。命主善于改革，宜创新行业",
  "地泽临": "临近之象。命主有贵人运，晚年佳",
  "风地观": "观察之象。命主直觉敏锐，宜从事分析策划",
  "火雷噬嗑": "明断如嗑。命主决断力强，适合法律管理",
  "山火贲": "文饰之象。命主有艺术天赋，审美出众",
  "山地剥": "剥落之象。命主需防小人，宜低调行事",
  "地雷复": "阳气复生。命主否极泰来，晚年转运",
  "天雷无妄": "至诚无妄。命主为人正直，宜正道发展",
  "山天大畜": "大蓄之象。命主宜积累实力，厚积薄发",
  "山雷颐": "颐养之象。命主注重养生，宜餐饮健康行业",
  "泽风大过": "独立不惧。命主魄力大，敢于冒险",
  "坎为水": "重重险难。命主历经坎坷，需坚韧不拔",
  "离为火": "光明附丽。命主才华外显，宜从事文教艺术",
  "泽山咸": "感应之象。命主感情丰富，婚恋运佳",
  "雷风恒": "恒久之象。命主做事有恒心，宜长期坚持",
  "天山遁": "退隐之象。命主宜进宜退，善保全身",
  "雷天大壮": "阳壮之象。命主精力旺盛，宜开拓进取",
  "火地晋": "晋升之象。命主事业渐进，仕途有望",
  "地火明夷": "光明受伤。命主才华一时被埋没，终会发光",
  "风火家人": "家庭和睦。命主重视家庭，家庭运佳",
  "火泽睽": "乖违之象。命主性格独特，宜独立事业",
  "水山蹇": "行路困难。命主需贵人帮助，宜与人合作",
  "雷水解": "解除困难。命主困难终解，否极泰来",
  "山泽损": "减损之象。命主先苦后甜，宜付出积累",
  "风雷益": "增益之象。命主贵人多助，事业渐兴",
  "泽天夬": "决断之象。命主果断刚毅，宜决策岗位",
  "天风姤": "邂逅之象。命主人缘广，异性缘佳",
  "泽地萃": "聚集之象。命主有号召力，宜组织工作",
  "地风升": "上升之象。命主运势上扬，宜积极发展",
  "泽水困": "困顿之象。命主需忍耐，因难成长",
  "水风井": "井水不竭。命主学识渊博，取之不尽",
  "泽火革": "变革之象。命主适合创新变革，不安于现状",
  "火风鼎": "鼎新之象。命主宜开创新事业，推陈出新",
  "震为雷": "震动奋发。命主性格急躁但行动力强",
  "艮为山": "止住之象。命主性格沉稳，宜深耕专业",
  "风山渐": "循序渐进。命主做事稳重，步步高升",
  "雷泽归妹": "少女出嫁。命主婚姻运需注意时机",
  "雷火丰": "盛大丰收。命主事业巅峰期运势极佳",
  "火山旅": "旅行之象。命主宜流动发展，适合异地",
  "巽为风": "顺入之象。命主性格温和，善于沟通协调",
  "兑为泽": "喜悦之象。命主性格开朗，口才好，宜商贸",
  "风水涣": "涣散之象。命主宜聚不宜散，注意团结",
  "水泽节": "节制之象。命主自律性强，宜有度行事",
  "风泽中孚": "诚信之象。命主为人诚实，信用好",
  "雷山小过": "小过之象。命主小事上需注意细节",
  "水火既济": "已成之象。命主前半生顺利，后半需守成",
  "火水未济": "未成之象。命主大器晚成，后半生发达",
};

const YAO_TEXTS = [
  "初爻动：主根基变动，根基不稳需打好基础",
  "二爻动：主人际关系变化，宜广结善缘",
  "三爻动：主职位变动，事业有进退变化",
  "四爻动：主近臣之位，有贵人提携之象",
  "五爻动：主君位变化，大事有重大突破",
  "上爻动：主极变之象，物极必反，盛极而衰",
];

function mod8(n: number): number {
  const r = n % 8;
  return r === 0 ? 8 : r;
}

function mod6(n: number): number {
  const r = n % 6;
  return r === 0 ? 6 : r;
}

function bitsToTrigram(bits: number[]): number {
  const key = `${bits[0]}${bits[1]}${bits[2]}`;
  const map: Record<string, number> = {
    "111": 1, "110": 2, "101": 3, "100": 4,
    "011": 5, "010": 6, "001": 7, "000": 8,
  };
  return map[key] || 1;
}

const TRIGRAM_BITS: number[][] = [
  [0, 0, 0], [1, 1, 1], [1, 1, 0], [1, 0, 1],
  [1, 0, 0], [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0],
];

function getBianGua(upper: number, lower: number, dong: number): { upper: number; lower: number } {
  const yaoPos = dong;
  let newUpper = upper;
  let newLower = lower;

  if (yaoPos <= 3) {
    const bits = [...(TRIGRAM_BITS[lower] || [0, 0, 0])];
    bits[yaoPos - 1] = bits[yaoPos - 1] === 0 ? 1 : 0;
    newLower = bitsToTrigram(bits);
  } else {
    const bits = [...(TRIGRAM_BITS[upper] || [0, 0, 0])];
    bits[yaoPos - 4] = bits[yaoPos - 4] === 0 ? 1 : 0;
    newUpper = bitsToTrigram(bits);
  }

  return { upper: newUpper, lower: newLower };
}

function fortuneFromGua(guaName: string, element: string): HeLuoResult["fortune"] {
  const careerMap: Record<string, string> = {
    "金": "适合金融、法律、管理、军警行业",
    "木": "适合教育、文化、农林、设计行业",
    "水": "适合商贸、物流、旅游、传媒行业",
    "火": "适合科技、电子、文艺、餐饮行业",
    "土": "适合地产、建筑、矿业、农牧行业",
  };
  const wealthMap: Record<string, string> = {
    "金": "正财运佳，宜稳健投资",
    "木": "财来财去，宜长线投资",
    "水": "偏财运好，宜灵活理财",
    "火": "财运波动大，宜谨慎",
    "土": "财运厚实，宜不动产",
  };
  const loveMap: Record<string, string> = {
    "金": "重情义，感情专一持久",
    "木": "多情善感，桃花较旺",
    "水": "感情多变，宜迟婚",
    "火": "热情奔放，来去匆匆",
    "土": "感情稳重，婚姻持久",
  };
  const healthMap: Record<string, string> = {
    "金": "注意呼吸系统、皮肤",
    "木": "注意肝胆、筋骨",
    "水": "注意肾脏、泌尿",
    "火": "注意心血管、眼睛",
    "土": "注意脾胃、消化",
  };

  return {
    career: careerMap[element] || "综合运势平稳",
    wealth: wealthMap[element] || "财运平稳",
    love: loveMap[element] || "感情平稳",
    health: healthMap[element] || "身体无恙",
    personality: GUA_INTERPRETATION[guaName]?.split("。")[0] || "性格中正平和",
  };
}

export function calculateHeLuo(input: unknown): HeLuoResult {
  const p = input as HeLuoInput;

  const bazi = calcBazi({
    name: "", year: p.year, month: p.month, day: p.day,
    hour: p.hour, minute: 0, gender: p.gender,
  });

  const sz = bazi.siZhu;

  const ganNums = {
    nian: GAN_HE_LUO[sz.nian.gan] || 5,
    yue: GAN_HE_LUO[sz.yue.gan] || 5,
    ri: GAN_HE_LUO[sz.ri.gan] || 5,
    shi: GAN_HE_LUO[sz.shi.gan] || 5,
    total: 0,
  };
  ganNums.total = ganNums.nian + ganNums.yue + ganNums.ri + ganNums.shi;

  const zhiNums = {
    nian: ZHI_HE_LUO[sz.nian.zhi] || 5,
    yue: ZHI_HE_LUO[sz.yue.zhi] || 5,
    ri: ZHI_HE_LUO[sz.ri.zhi] || 5,
    shi: ZHI_HE_LUO[sz.shi.zhi] || 5,
    total: 0,
  };
  zhiNums.total = zhiNums.nian + zhiNums.yue + zhiNums.ri + zhiNums.shi;

  const upperNum = mod8(ganNums.total);
  const lowerNum = mod8(zhiNums.total);
  const dongYao = mod6(ganNums.total + zhiNums.total);

  const xianTianShu = ganNums.total;
  const houTianShu = zhiNums.total;

  const upperTrigram = {
    number: upperNum,
    name: TRIGRAMS[upperNum],
    element: TRIGRAM_ELEMENT[upperNum],
  };
  const lowerTrigram = {
    number: lowerNum,
    name: TRIGRAMS[lowerNum],
    element: TRIGRAM_ELEMENT[lowerNum],
  };

  const hexName = HEXAGRAM_NAMES[upperNum]?.[lowerNum] || "未知卦";
  const hexSymbol = TRIGRAM_SYMBOL[upperNum] + TRIGRAM_SYMBOL[lowerNum];
  const hexNumber = (upperNum - 1) * 8 + lowerNum;

  const bian = getBianGua(upperNum, lowerNum, dongYao);
  const bianGuaName = HEXAGRAM_NAMES[bian.upper]?.[bian.lower] || "未知卦";
  const bianGuaSymbol = TRIGRAM_SYMBOL[bian.upper] + TRIGRAM_SYMBOL[bian.lower];

  const interp = GUA_INTERPRETATION[hexName] || "此卦象平和，主平稳发展";
  const bianInterp = GUA_INTERPRETATION[bianGuaName] || "变卦平和，后运平稳";

  const fortune = fortuneFromGua(hexName, upperTrigram.element);

  const dongYaoLabel = dongYao === 1 ? "初" : dongYao === 2 ? "二" : dongYao === 3 ? "三" : dongYao === 4 ? "四" : dongYao === 5 ? "五" : "上";
  const siZhuStr = `${sz.nian.gan}${sz.nian.zhi} ${sz.yue.gan}${sz.yue.zhi} ${sz.ri.gan}${sz.ri.zhi} ${sz.shi.gan}${sz.shi.zhi}`;
  const ganNumStr = `${ganNums.nian}+${ganNums.yue}+${ganNums.ri}+${ganNums.shi}=${ganNums.total}`;
  const zhiNumStr = `${zhiNums.nian}+${zhiNums.yue}+${zhiNums.ri}+${zhiNums.shi}=${zhiNums.total}`;

  const summary = [
    "┌──────────────────────────────────────┐",
    "│        河洛理数 · 八卦推命            │",
    "├──────────────────────────────────────┤",
    "│ 四柱：" + siZhuStr.padEnd(30) + "│",
    "│ 天干数：" + ganNumStr.padEnd(30) + "│",
    "│ 地支数：" + zhiNumStr.padEnd(30) + "│",
    "│ 上卦：" + (upperTrigram.name + TRIGRAM_SYMBOL[upperNum] + "（" + upperTrigram.element + "）").padEnd(30) + "│",
    "│ 下卦：" + (lowerTrigram.name + TRIGRAM_SYMBOL[lowerNum] + "（" + lowerTrigram.element + "）").padEnd(30) + "│",
    "│ 本卦：" + (hexName + "（" + hexSymbol + "）").padEnd(30) + "│",
    "│ 动爻：" + (dongYaoLabel + "爻 · 变卦：" + bianGuaName + "（" + bianGuaSymbol + "）").padEnd(30) + "│",
    "│ 先天数：" + (String(xianTianShu) + " · 后天数：" + String(houTianShu)).padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 事业：" + fortune.career.padEnd(30) + "│",
    "│ 财运：" + fortune.wealth.padEnd(30) + "│",
    "│ 感情：" + fortune.love.padEnd(30) + "│",
    "│ 健康：" + fortune.health.padEnd(30) + "│",
    "│ 性格：" + fortune.personality.padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《河洛理数》《易学启蒙》        │",
    "│       《邵子神数》《皇极经世》        │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    siZhu: {
      nian: sz.nian.gan + sz.nian.zhi,
      yue: sz.yue.gan + sz.yue.zhi,
      ri: sz.ri.gan + sz.ri.zhi,
      shi: sz.shi.gan + sz.shi.zhi,
    },
    ganNumbers: ganNums,
    zhiNumbers: zhiNums,
    upperTrigram,
    lowerTrigram,
    hexagram: { name: hexName, symbol: hexSymbol, number: hexNumber },
    dongYao,
    bianGua: { name: bianGuaName, symbol: bianGuaSymbol },
    xianTianShu,
    houTianShu,
    interpretation: {
      benGua: interp,
      dongYaoText: YAO_TEXTS[dongYao - 1] || "",
      bianGuaText: bianInterp,
    },
    fortune,
    summary,
  };
}
