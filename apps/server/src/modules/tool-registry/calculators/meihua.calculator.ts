// ── 梅花易数计算引擎 ──
// 时间/数字起卦 + 体用生克 + 策轨计算

import type { MeiHuaResult } from "@guoxue/shared";

const BA_GUA = [
  { num:1, name:"乾", wuXing:"金", symbol:"☰" },
  { num:2, name:"兑", wuXing:"金", symbol:"☱" },
  { num:3, name:"离", wuXing:"火", symbol:"☲" },
  { num:4, name:"震", wuXing:"木", symbol:"☳" },
  { num:5, name:"巽", wuXing:"木", symbol:"☴" },
  { num:6, name:"坎", wuXing:"水", symbol:"☵" },
  { num:7, name:"艮", wuXing:"土", symbol:"☶" },
  { num:8, name:"坤", wuXing:"土", symbol:"☷" },
];

const GUA_64_MAP: Record<string, string> = {
  "11":"乾为天","12":"天泽履","13":"天火同人","14":"天雷无妄","15":"天风姤","16":"天水讼","17":"天山遁","18":"天地否",
  "21":"泽天夬","22":"兑为泽","23":"泽火革","24":"泽雷随","25":"泽风大过","26":"泽水困","27":"泽山咸","28":"泽地萃",
  "31":"火天大有","32":"火泽睽","33":"离为火","34":"火雷噬嗑","35":"火风鼎","36":"火水未济","37":"火山旅","38":"火地晋",
  "41":"雷天大壮","42":"雷泽归妹","43":"雷火丰","44":"震为雷","45":"雷风恒","46":"雷水解","47":"雷山小过","48":"雷地豫",
  "51":"风天小畜","52":"风泽中孚","53":"风火家人","54":"风雷益","55":"巽为风","56":"风水涣","57":"风山渐","58":"风地观",
  "61":"水天需","62":"水泽节","63":"水火既济","64":"水雷屯","65":"水风井","66":"坎为水","67":"水山蹇","68":"水地比",
  "71":"山天大畜","72":"山泽损","73":"山火贲","74":"山雷颐","75":"山风蛊","76":"山水蒙","77":"艮为山","78":"山地剥",
  "81":"地天泰","82":"地泽临","83":"地火明夷","84":"地雷复","85":"地风升","86":"地水师","87":"地山谦","88":"坤为地",
};

const GUA_SYMBOL_MAP: Record<string, string> = {
  "乾为天":"䷀","坤为地":"䷁","水雷屯":"䷂","山水蒙":"䷃","水天需":"䷄","天水讼":"䷅","地水师":"䷆","水地比":"䷇",
  "风天小畜":"䷈","天泽履":"䷉","地天泰":"䷊","天地否":"䷋","天火同人":"䷌","火天大有":"䷍","地山谦":"䷎","雷地豫":"䷏",
  "泽雷随":"䷐","山风蛊":"䷑","地泽临":"䷒","风地观":"䷓","火雷噬嗑":"䷔","山火贲":"䷕","山地剥":"䷖","地雷复":"䷗",
  "天雷无妄":"䷘","山天大畜":"䷙","山雷颐":"䷚","泽风大过":"䷛","坎为水":"䷜","离为火":"䷝","泽山咸":"䷞","雷风恒":"䷟",
  "天山遁":"䷠","雷天大壮":"䷡","火地晋":"䷢","地火明夷":"䷣","风火家人":"䷤","火泽睽":"䷥","水山蹇":"䷦","雷水解":"䷧",
  "山泽损":"䷨","风雷益":"䷩","泽天夬":"䷪","天风姤":"䷫","泽地萃":"䷬","地风升":"䷭","水风井":"䷯","泽火革":"䷰",
  "火风鼎":"䷱","震为雷":"䷲","艮为山":"䷳","风山渐":"䷴","雷泽归妹":"䷵","雷火丰":"䷶","火山旅":"䷷","巽为风":"䷸",
  "兑为泽":"䷹","风水涣":"䷺","水泽节":"䷻","风泽中孚":"䷼","雷山小过":"䷽","水火既济":"䷾","火水未济":"䷿",
};

// 卦数 ↔ 三爻卦象互转（上→下：1=阳0=阴）
const NUM_YAO_MAP: Record<number, number[]> = {
  1:[1,1,1], 2:[0,1,1], 3:[1,0,1], 4:[0,0,1],
  5:[1,1,0], 6:[0,1,0], 7:[1,0,0], 8:[0,0,0],
};
const YAO_NUM_MAP: Record<string, number> = {
  "111":1, "011":2, "101":3, "001":4, "110":5, "010":6, "100":7, "000":8,
};

function getGua(num: number) { return BA_GUA.find(g => g.num === num) ?? BA_GUA[0]; }
function getGuaName(up: number, low: number): string { return GUA_64_MAP[`${up}${low}`] ?? `${getGua(up).name}${getGua(low).name}`; }
function getGuaSymbol(name: string): string { return GUA_SYMBOL_MAP[name] ?? "?"; }

function numToGua(n: number): number {
  const r = n % 8;
  return r === 0 ? 8 : r;
}

function dongYaoCalc(n: number): number {
  const r = n % 6;
  return r === 0 ? 6 : r;
}

/** 卦数→三爻数组（上→下） */
function guaNumToYao(num: number): number[] {
  return [...(NUM_YAO_MAP[num] ?? [1,1,1])];
}

/** 三爻数组→卦数 */
function yaoToGuaNum(yao: number[]): number {
  return YAO_NUM_MAP[yao.join("")] ?? 1;
}

/** 爻变：翻转三爻卦中的指定爻位(0=上,1=中,2=下)，返回新卦数 */
function flipYao(guaNum: number, yaoIdx: number): number {
  const yao = guaNumToYao(guaNum);
  yao[yaoIdx] = 1 - yao[yaoIdx];
  return yaoToGuaNum(yao);
}

function tiYongRelation(tiWuXing: string, yongWuXing: string): string {
  const order = ["金","水","木","火","土"];
  const tiIdx = order.indexOf(tiWuXing);
  const yongIdx = order.indexOf(yongWuXing);
  if (tiIdx === yongIdx) return "ti-yong-bihe";
  if ((yongIdx + 1) % 5 === tiIdx) return "yong-sheng-ti";
  if ((tiIdx + 1) % 5 === yongIdx) return "ti-sheng-yong";
  if ((tiIdx + 2) % 5 === yongIdx || (tiIdx + 3) % 5 === yongIdx) return "ti-ke-yong";
  return "yong-ke-ti";
}

function getSeason(month: number): string {
  if (month <= 3) return "春"; if (month <= 6) return "夏"; if (month <= 9) return "秋"; return "冬";
}

function guaQi(wuXing: string, season: string): string {
  const map: Record<string, Record<string, string>> = {
    "春":{木:"旺",火:"相",水:"休",金:"囚",土:"死"},
    "夏":{火:"旺",土:"相",木:"休",水:"囚",金:"死"},
    "秋":{金:"旺",水:"相",土:"休",火:"囚",木:"死"},
    "冬":{水:"旺",木:"相",金:"休",土:"囚",火:"死"},
  };
  return map[season]?.[wuXing] ?? "休";
}

/** 主计算函数 */
export function calculateMeiHua(input: Record<string, unknown>): MeiHuaResult {
  const method = (input.method as string) ?? "time";
  const datetime = input.datetime as string ?? new Date().toISOString();

  const d = new Date(datetime);
  let upperNum: number, lowerNum: number, dongYaoNum: number;

  if (method === "time") {
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    upperNum = numToGua(year + month + day);
    lowerNum = numToGua(month + day + hour);
    dongYaoNum = dongYaoCalc(year + month + day + hour);
  } else if (method === "number" && input.numbers) {
    const nums = input.numbers as number[];
    upperNum = numToGua(nums[0] ?? 1);
    lowerNum = numToGua(nums[1] ?? 1);
    dongYaoNum = dongYaoCalc(nums[2] ?? 1);
  } else {
    upperNum = numToGua((input.upperGua as number) ?? 1);
    lowerNum = numToGua((input.lowerGua as number) ?? 1);
    dongYaoNum = dongYaoCalc((input.dongYao as number) ?? 1);
  }

  const benGuaName = getGuaName(upperNum, lowerNum);
  const upperGua = getGua(upperNum);
  const lowerGua = getGua(lowerNum);

  // ── 变卦：翻转动爻所在位置的阴阳 ──
  // 动爻1-3在下卦，4-6在上卦；爻序自下而上(1=下,2=中,3=上)
  // 三爻数组索引：0=上,1=中,2=下 → 动爻1→idx2, 动爻2→idx1, 动爻3→idx0
  const yaoIdxInTrigam = dongYaoNum <= 3 ? (3 - dongYaoNum) : (6 - dongYaoNum);
  let bianUpper = upperNum, bianLower = lowerNum;
  if (dongYaoNum <= 3) {
    bianLower = flipYao(lowerNum, yaoIdxInTrigam);
  } else {
    bianUpper = flipYao(upperNum, yaoIdxInTrigam);
  }
  const bianGuaName = getGuaName(bianUpper, bianLower);

  // ── 互卦：取本卦中间四爻（2,3,4爻为下卦，3,4,5爻为上卦）──
  // fullYao = [上卦上爻,上卦中爻,上卦下爻, 下卦上爻,下卦中爻,下卦下爻]
  //          = [pos6,     pos5,     pos4,     pos3,     pos2,     pos1]
  const upperYao = guaNumToYao(upperNum);
  const lowerYao = guaNumToYao(lowerNum);
  const fullYao = [...upperYao, ...lowerYao];
  // 互卦下卦 = 本卦第2,3,4爻，[上=pos4, 中=pos3, 下=pos2]
  // 互卦上卦 = 本卦第3,4,5爻，[上=pos5, 中=pos4, 下=pos3]
  const huUpper = yaoToGuaNum([fullYao[1], fullYao[2], fullYao[3]]);
  const huLower = yaoToGuaNum([fullYao[2], fullYao[3], fullYao[4]]);
  const huGuaName = getGuaName(huUpper, huLower);

  // 体用
  const tiNum = dongYaoNum <= 3 ? upperNum : lowerNum;
  const yongNum = dongYaoNum <= 3 ? lowerNum : upperNum;
  const tiGua = getGua(tiNum);
  const yongGua = getGua(yongNum);
  const tiYongRel = tiYongRelation(tiGua.wuXing, yongGua.wuXing);

  // 卦气
  const season = getSeason(d.getMonth() + 1);
  const guaQiResult: Record<string, string> = {};
  for (const g of BA_GUA) {
    guaQiResult[g.name] = guaQi(g.wuXing, season);
  }

  // 策轨
  const ceGui = {
    yuanCe: upperNum * 100 + lowerNum * 10 + dongYaoNum,
    yuanGui: upperNum * 10 + lowerNum * 100 + dongYaoNum * 50,
    yanCe: { yuan: upperNum * 12, hui: lowerNum * 12, yun: dongYaoNum * 12, shi: (upperNum + lowerNum) * 6 },
  };

  const tiYongName: Record<string, string> = {
    "yong-sheng-ti":"用生体（大吉）","ti-yong-bihe":"体用比和（吉）","ti-ke-yong":"体克用（小吉）","ti-sheng-yong":"体生用（凶）","yong-ke-ti":"用克体（大凶）",
  };

  const duanYu = `${benGuaName}之${bianGuaName}，${tiYongName[tiYongRel] ?? "体用关系"}。体卦${tiGua.name}${tiGua.wuXing}，用卦${yongGua.name}${yongGua.wuXing}。`;

  return {
    input: { method: method as any, datetime },
    benGua: {
      name: benGuaName, symbol: getGuaSymbol(benGuaName),
      upper: { number: upperNum, name: upperGua.name, wuXing: upperGua.wuXing },
      lower: { number: lowerNum, name: lowerGua.name, wuXing: lowerGua.wuXing },
      binary: `${upperNum}${lowerNum}`,
    },
    dongYao: dongYaoNum,
    bianGua: {
      name: bianGuaName, symbol: getGuaSymbol(bianGuaName),
      upper: { number: bianUpper, name: getGua(bianUpper).name, wuXing: getGua(bianUpper).wuXing },
      lower: { number: bianLower, name: getGua(bianLower).name, wuXing: getGua(bianLower).wuXing },
    },
    huGua: {
      name: huGuaName, symbol: getGuaSymbol(huGuaName),
      upper: { number: huUpper, name: getGua(huUpper).name, wuXing: getGua(huUpper).wuXing },
      lower: { number: huLower, name: getGua(huLower).name, wuXing: getGua(huLower).wuXing },
    },
    tiGua: { number: tiNum, name: tiGua.name, wuXing: tiGua.wuXing },
    yongGua: { number: yongNum, name: yongGua.name, wuXing: yongGua.wuXing },
    tiYongRelation: tiYongRel as any,
    guaQi: guaQiResult as any,
    ceGui: ceGui as any,
    jieQi: "",
    shenSha: [],
    kongWang: "",
    duanYu,
  };
}
