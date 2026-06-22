// ── 六爻纳甲排盘计算引擎 ──
// 装卦/纳甲/纳支/六兽/世应/六亲
// 算法参考：《卜筮正宗》《增删卜易》《易林补遗》《火珠林》
// 纳甲法源自京房易学体系

import type { LiuYaoResult, Yao } from "@guoxue/shared";
import { calcRiZhu, calcNianZhu } from "@guoxue/bazi-engine";


// 六十四卦数据（编码：上卦3爻+下卦3爻，1=阳0=阴，上→下）
const GUA_64: Record<string, { name:string; symbol:string; upper:string; lower:string; gong:string; wuXing:string; shiYao:number; yingYao:number }> = {
  // 乾宫（金）
  "111111":{name:"乾为天",symbol:"䷀",upper:"乾",lower:"乾",gong:"乾宫",wuXing:"金",shiYao:6,yingYao:3},
  "111110":{name:"天风姤",symbol:"䷫",upper:"乾",lower:"巽",gong:"乾宫",wuXing:"金",shiYao:1,yingYao:4},
  "111100":{name:"天山遁",symbol:"䷠",upper:"乾",lower:"艮",gong:"乾宫",wuXing:"金",shiYao:2,yingYao:5},
  "111000":{name:"天地否",symbol:"䷋",upper:"乾",lower:"坤",gong:"乾宫",wuXing:"金",shiYao:3,yingYao:6},
  "110000":{name:"风地观",symbol:"䷓",upper:"巽",lower:"坤",gong:"乾宫",wuXing:"金",shiYao:4,yingYao:1},
  "100000":{name:"山地剥",symbol:"䷖",upper:"艮",lower:"坤",gong:"乾宫",wuXing:"金",shiYao:5,yingYao:2},
  "101000":{name:"火地晋",symbol:"䷢",upper:"离",lower:"坤",gong:"乾宫",wuXing:"金",shiYao:4,yingYao:1},
  "101111":{name:"火天大有",symbol:"䷍",upper:"离",lower:"乾",gong:"乾宫",wuXing:"金",shiYao:3,yingYao:6},
  // 兑宫（金）
  "011011":{name:"兑为泽",symbol:"䷹",upper:"兑",lower:"兑",gong:"兑宫",wuXing:"金",shiYao:6,yingYao:3},
  "011010":{name:"泽水困",symbol:"䷮",upper:"兑",lower:"坎",gong:"兑宫",wuXing:"金",shiYao:1,yingYao:4},
  "011000":{name:"泽地萃",symbol:"䷬",upper:"兑",lower:"坤",gong:"兑宫",wuXing:"金",shiYao:2,yingYao:5},
  "011100":{name:"泽山咸",symbol:"䷞",upper:"兑",lower:"艮",gong:"兑宫",wuXing:"金",shiYao:3,yingYao:6},
  "010100":{name:"水山蹇",symbol:"䷦",upper:"坎",lower:"艮",gong:"兑宫",wuXing:"金",shiYao:4,yingYao:1},
  "000100":{name:"地山谦",symbol:"䷎",upper:"坤",lower:"艮",gong:"兑宫",wuXing:"金",shiYao:5,yingYao:2},
  "001100":{name:"雷山小过",symbol:"䷽",upper:"震",lower:"艮",gong:"兑宫",wuXing:"金",shiYao:4,yingYao:1},
  "001011":{name:"雷泽归妹",symbol:"䷵",upper:"震",lower:"兑",gong:"兑宫",wuXing:"金",shiYao:3,yingYao:6},
  // 离宫（火）
  "101101":{name:"离为火",symbol:"䷝",upper:"离",lower:"离",gong:"离宫",wuXing:"火",shiYao:6,yingYao:3},
  "101100":{name:"火山旅",symbol:"䷷",upper:"离",lower:"艮",gong:"离宫",wuXing:"火",shiYao:1,yingYao:4},
  "101110":{name:"火风鼎",symbol:"䷱",upper:"离",lower:"巽",gong:"离宫",wuXing:"火",shiYao:2,yingYao:5},
  "101010":{name:"火水未济",symbol:"䷿",upper:"离",lower:"坎",gong:"离宫",wuXing:"火",shiYao:3,yingYao:6},
  "100010":{name:"山水蒙",symbol:"䷃",upper:"艮",lower:"坎",gong:"离宫",wuXing:"火",shiYao:4,yingYao:1},
  "110010":{name:"风水涣",symbol:"䷺",upper:"巽",lower:"坎",gong:"离宫",wuXing:"火",shiYao:5,yingYao:2},
  "111010":{name:"天水讼",symbol:"䷅",upper:"乾",lower:"坎",gong:"离宫",wuXing:"火",shiYao:4,yingYao:1},
  "111101":{name:"天火同人",symbol:"䷌",upper:"乾",lower:"离",gong:"离宫",wuXing:"火",shiYao:3,yingYao:6},
  // 震宫（木）
  "001001":{name:"震为雷",symbol:"䷲",upper:"震",lower:"震",gong:"震宫",wuXing:"木",shiYao:6,yingYao:3},
  "001000":{name:"雷地豫",symbol:"䷏",upper:"震",lower:"坤",gong:"震宫",wuXing:"木",shiYao:1,yingYao:4},
  "001010":{name:"雷水解",symbol:"䷧",upper:"震",lower:"坎",gong:"震宫",wuXing:"木",shiYao:2,yingYao:5},
  "001110":{name:"雷风恒",symbol:"䷟",upper:"震",lower:"巽",gong:"震宫",wuXing:"木",shiYao:3,yingYao:6},
  "000110":{name:"地风升",symbol:"䷭",upper:"坤",lower:"巽",gong:"震宫",wuXing:"木",shiYao:4,yingYao:1},
  "010110":{name:"水风井",symbol:"䷯",upper:"坎",lower:"巽",gong:"震宫",wuXing:"木",shiYao:5,yingYao:2},
  "011110":{name:"泽风大过",symbol:"䷛",upper:"兑",lower:"巽",gong:"震宫",wuXing:"木",shiYao:4,yingYao:1},
  "011001":{name:"泽雷随",symbol:"䷐",upper:"兑",lower:"震",gong:"震宫",wuXing:"木",shiYao:3,yingYao:6},
  // 巽宫（木）
  "110110":{name:"巽为风",symbol:"䷸",upper:"巽",lower:"巽",gong:"巽宫",wuXing:"木",shiYao:6,yingYao:3},
  "110111":{name:"风天小畜",symbol:"䷈",upper:"巽",lower:"乾",gong:"巽宫",wuXing:"木",shiYao:1,yingYao:4},
  "110101":{name:"风火家人",symbol:"䷤",upper:"巽",lower:"离",gong:"巽宫",wuXing:"木",shiYao:2,yingYao:5},
  "110001":{name:"风雷益",symbol:"䷩",upper:"巽",lower:"震",gong:"巽宫",wuXing:"木",shiYao:3,yingYao:6},
  "111001":{name:"天雷无妄",symbol:"䷘",upper:"乾",lower:"震",gong:"巽宫",wuXing:"木",shiYao:4,yingYao:1},
  "101001":{name:"火雷噬嗑",symbol:"䷔",upper:"离",lower:"震",gong:"巽宫",wuXing:"木",shiYao:5,yingYao:2},
  "100001":{name:"山雷颐",symbol:"䷚",upper:"艮",lower:"震",gong:"巽宫",wuXing:"木",shiYao:4,yingYao:1},
  "100110":{name:"山风蛊",symbol:"䷑",upper:"艮",lower:"巽",gong:"巽宫",wuXing:"木",shiYao:3,yingYao:6},
  // 坎宫（水）
  "010010":{name:"坎为水",symbol:"䷜",upper:"坎",lower:"坎",gong:"坎宫",wuXing:"水",shiYao:6,yingYao:3},
  "010011":{name:"水泽节",symbol:"䷻",upper:"坎",lower:"兑",gong:"坎宫",wuXing:"水",shiYao:1,yingYao:4},
  "010001":{name:"水雷屯",symbol:"䷂",upper:"坎",lower:"震",gong:"坎宫",wuXing:"水",shiYao:2,yingYao:5},
  "010101":{name:"水火既济",symbol:"䷾",upper:"坎",lower:"离",gong:"坎宫",wuXing:"水",shiYao:3,yingYao:6},
  "011101":{name:"泽火革",symbol:"䷰",upper:"兑",lower:"离",gong:"坎宫",wuXing:"水",shiYao:4,yingYao:1},
  "001101":{name:"雷火丰",symbol:"䷶",upper:"震",lower:"离",gong:"坎宫",wuXing:"水",shiYao:5,yingYao:2},
  "000101":{name:"地火明夷",symbol:"䷣",upper:"坤",lower:"离",gong:"坎宫",wuXing:"水",shiYao:4,yingYao:1},
  "000010":{name:"地水师",symbol:"䷆",upper:"坤",lower:"坎",gong:"坎宫",wuXing:"水",shiYao:3,yingYao:6},
  // 艮宫（土）
  "100100":{name:"艮为山",symbol:"䷳",upper:"艮",lower:"艮",gong:"艮宫",wuXing:"土",shiYao:6,yingYao:3},
  "100101":{name:"山火贲",symbol:"䷕",upper:"艮",lower:"离",gong:"艮宫",wuXing:"土",shiYao:1,yingYao:4},
  "100111":{name:"山天大畜",symbol:"䷙",upper:"艮",lower:"乾",gong:"艮宫",wuXing:"土",shiYao:2,yingYao:5},
  "100011":{name:"山泽损",symbol:"䷨",upper:"艮",lower:"兑",gong:"艮宫",wuXing:"土",shiYao:3,yingYao:6},
  "101011":{name:"火泽睽",symbol:"䷥",upper:"离",lower:"兑",gong:"艮宫",wuXing:"土",shiYao:4,yingYao:1},
  "111011":{name:"天泽履",symbol:"䷉",upper:"乾",lower:"兑",gong:"艮宫",wuXing:"土",shiYao:5,yingYao:2},
  "110011":{name:"风泽中孚",symbol:"䷼",upper:"巽",lower:"兑",gong:"艮宫",wuXing:"土",shiYao:4,yingYao:1},
  "110100":{name:"风山渐",symbol:"䷴",upper:"巽",lower:"艮",gong:"艮宫",wuXing:"土",shiYao:3,yingYao:6},
  // 坤宫（土）
  "000000":{name:"坤为地",symbol:"䷁",upper:"坤",lower:"坤",gong:"坤宫",wuXing:"土",shiYao:6,yingYao:3},
  "000001":{name:"地雷复",symbol:"䷗",upper:"坤",lower:"震",gong:"坤宫",wuXing:"土",shiYao:1,yingYao:4},
  "000011":{name:"地泽临",symbol:"䷒",upper:"坤",lower:"兑",gong:"坤宫",wuXing:"土",shiYao:2,yingYao:5},
  "000111":{name:"地天泰",symbol:"䷊",upper:"坤",lower:"乾",gong:"坤宫",wuXing:"土",shiYao:3,yingYao:6},
  "001111":{name:"雷天大壮",symbol:"䷡",upper:"震",lower:"乾",gong:"坤宫",wuXing:"土",shiYao:4,yingYao:1},
  "011111":{name:"泽天夬",symbol:"䷪",upper:"兑",lower:"乾",gong:"坤宫",wuXing:"土",shiYao:5,yingYao:2},
  "010111":{name:"水天需",symbol:"䷄",upper:"坎",lower:"乾",gong:"坤宫",wuXing:"土",shiYao:4,yingYao:1},
  "010000":{name:"水地比",symbol:"䷇",upper:"坎",lower:"坤",gong:"坤宫",wuXing:"土",shiYao:3,yingYao:6},
};

// 八宫卦序（每宫八卦：本宫→一世→二世→三世→四世→五世→游魂→归魂）
const BA_GONG: Record<string, string[]> = {
  "乾宫": ["111111","111110","111100","111000","110000","100000","101000","101111"],
  "兑宫": ["011011","011010","011000","011100","010100","000100","001100","001011"],
  "离宫": ["101101","101100","101110","101010","100010","110010","111010","111101"],
  "震宫": ["001001","001000","001010","001110","000110","010110","011110","011001"],
  "巽宫": ["110110","110111","110101","110001","111001","101001","100001","100110"],
  "坎宫": ["010010","010011","010001","010101","011101","001101","000101","000010"],
  "艮宫": ["100100","100101","100111","100011","101011","111011","110011","110100"],
  "坤宫": ["000000","000001","000011","000111","001111","011111","010111","010000"],
};

// 纳甲（八纯卦纳甲，非纯卦同宫取纯卦纳甲——已知限制，后续完善）
const NA_JIA: Record<string, string[]> = {
  "111111":["甲子","甲寅","甲辰","壬午","壬申","壬戌"],  // 乾为天
  "000000":["乙未","乙巳","乙卯","癸丑","癸亥","癸酉"],  // 坤为地
  "001001":["庚子","庚寅","庚辰","庚午","庚申","庚戌"],  // 震为雷
  "110110":["辛丑","辛亥","辛酉","辛未","辛巳","辛卯"],  // 巽为风
  "010010":["戊寅","戊辰","戊午","戊申","戊戌","戊子"],  // 坎为水
  "101101":["己卯","己丑","己亥","己酉","己未","己巳"],  // 离为火
  "100100":["丙辰","丙午","丙申","丙戌","丙子","丙寅"],  // 艮为山
  "011011":["丁巳","丁卯","丁丑","丁亥","丁酉","丁未"],  // 兑为泽
};

// 六亲
const WU_XING_REL: Record<string, Record<string, string>> = {
  "金":{金:"兄弟",水:"子孙",木:"妻财",火:"官鬼",土:"父母"},
  "水":{水:"兄弟",木:"子孙",火:"妻财",土:"官鬼",金:"父母"},
  "木":{木:"兄弟",火:"子孙",土:"妻财",金:"官鬼",水:"父母"},
  "火":{火:"兄弟",土:"子孙",金:"妻财",水:"官鬼",木:"父母"},
  "土":{土:"兄弟",金:"子孙",水:"妻财",木:"官鬼",火:"父母"},
};

// 六兽（按日干顺排：甲乙起青龙）
const LIU_SHOU = ["青龙","朱雀","勾陈","螣蛇","白虎","玄武"];
const GAN_SHOU_START: Record<string, number> = {"甲":0,"乙":0,"丙":1,"丁":1,"戊":2,"己":2,"庚":3,"辛":3,"壬":4,"癸":4};

/** 精确查找卦码，不存在则回退乾为天 */
function getGuaByCode(code: string) {
  if (GUA_64[code]) return GUA_64[code];
  return GUA_64["111111"]!;
}

/** 获取纳甲：从所属宫取纯卦纳甲（同宫地支一致，天干可能不准确——后续完善） */
function getNaJia(yaoPos: number, guaCode: string): string {
  const gong = Object.values(BA_GONG).find(arr => arr.includes(guaCode));
  const chunGua = gong?.[0] ?? "111111";
  const naJia = NA_JIA[chunGua] ?? NA_JIA["111111"];
  return naJia[yaoPos - 1] ?? "甲子";
}

function getYaoWuXing(naJia: string): string {
  const zhi = naJia[1];
  const map: Record<string, string> = {"子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水"};
  return map[zhi] ?? "水";
}

function getLiuQin(guaWuXing: string, yaoWuXing: string): string {
  return WU_XING_REL[guaWuXing]?.[yaoWuXing] ?? "兄弟";
}

// ── 起卦法常量与工具 ──────────────────────────────────────────────
// 先天八卦数 → 三爻编码（上爻→中爻→下爻，1=阳0=阴），与 GUA_64 编码方向一致
// 乾1☰ 兑2☱ 离3☲ 震4☳ 巽5☴ 坎6☵ 艮7☶ 坤8☷
// 依据：《梅花易数》先天八卦数（乾一兑二离三震四巽五坎六艮七坤八）
const XIAN_TIAN_BAGUA: Record<number, { name: string; code: string }> = {
  1: { name: "乾", code: "111" },
  2: { name: "兑", code: "011" },
  3: { name: "离", code: "101" },
  4: { name: "震", code: "001" },
  5: { name: "巽", code: "110" },
  6: { name: "坎", code: "010" },
  7: { name: "艮", code: "100" },
  8: { name: "坤", code: "000" },
};

const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

/** 余数归一到 1..n（整除时取 n），用于"除尽得末卦/末爻"的传统规则 */
function modTo(value: number, n: number): number {
  const r = value % n;
  return r === 0 ? n : r;
}

/** 八卦数（1-8）→ 三爻编码 */
function baguaCode(num: number): string {
  return XIAN_TIAN_BAGUA[modTo(num, 8)].code;
}

/** 时辰地支序数：子时(23:00-01:00)=1 … 亥时=12 */
function getShiChenIndex(hour: number): number {
  // 子时跨日：23 点与 0 点同属子时
  return Math.floor(((hour + 1) % 24) / 2) + 1;
}

/** 起卦结果：上卦数、下卦数、动爻位（1-6）、说明片段、起卦方法名 */
interface QiGuaResult {
  upperNum: number;
  lowerNum: number;
  dongYao: number;
  methodLabel: string;
  basis: string;
}

/**
 * 数字（报数）起卦法 —— 《梅花易数》数字卦例
 * 两数法：第一数 ÷8 余定上卦，第二数 ÷8 余定下卦，两数之和 ÷6 余定动爻
 * 三数法：前两数同上，三数之和 ÷6 余定动爻
 */
function qiGuaByNumbers(nums: number[]): QiGuaResult {
  const sanitized = nums.map((n) => Math.abs(Math.trunc(n)));
  const upperSrc = sanitized[0] ?? 0;
  const lowerSrc = sanitized[1] ?? upperSrc;
  const upperNum = modTo(upperSrc, 8);
  const lowerNum = modTo(lowerSrc, 8);
  const total = sanitized.reduce((s, n) => s + n, 0);
  const dongYao = modTo(total, 6);
  const label = nums.length >= 3 ? "数字起卦·三数法" : "数字起卦·两数法";
  const basis =
    `报数 ${nums.join("、")}：` +
    `首数${upperSrc}÷8余${upperNum}得上卦${XIAN_TIAN_BAGUA[upperNum].name}，` +
    `次数${lowerSrc}÷8余${lowerNum}得下卦${XIAN_TIAN_BAGUA[lowerNum].name}，` +
    `总数${total}÷6余${dongYao}为动爻（《梅花易数》先天八卦数起卦法）`;
  return { upperNum, lowerNum, dongYao, methodLabel: label, basis };
}

/**
 * 时间起卦法 —— 《梅花易数》年月日时起卦（移植至六爻装卦）
 * 上卦 = (年支序数 + 月数 + 日数) ÷8 取余
 * 下卦 = (年支序数 + 月数 + 日数 + 时辰序数) ÷8 取余
 * 动爻 = (年支序数 + 月数 + 日数 + 时辰序数) ÷6 取余
 * 关键：同一时辰必得同一卦（确定性、可复现），绝不使用毫秒/随机
 */
function qiGuaByTime(date: Date): QiGuaResult {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();

  // 年支序数（子=1 … 亥=12），用立春分界的年柱地支，依据《梅花易数》以地支配数
  const nianZhi = calcNianZhu(year, month, day, hour).zhi;
  const nianZhiNum = DI_ZHI.indexOf(nianZhi) + 1;
  const shiChenNum = getShiChenIndex(hour);

  const upperSum = nianZhiNum + month + day;
  const lowerSum = nianZhiNum + month + day + shiChenNum;
  const upperNum = modTo(upperSum, 8);
  const lowerNum = modTo(lowerSum, 8);
  const dongYao = modTo(lowerSum, 6);

  const basis =
    `年支${nianZhi}(${nianZhiNum})、月${month}、日${day}、` +
    `${DI_ZHI[shiChenNum - 1]}时(${shiChenNum})：` +
    `(${nianZhiNum}+${month}+${day})÷8余${upperNum}得上卦${XIAN_TIAN_BAGUA[upperNum].name}，` +
    `(上+${shiChenNum})÷8余${lowerNum}得下卦${XIAN_TIAN_BAGUA[lowerNum].name}，` +
    `总和÷6余${dongYao}为动爻（《梅花易数》年月日时起卦法移植）`;
  return { upperNum, lowerNum, dongYao, methodLabel: "时间起卦", basis };
}

/** 主计算函数 */
export function calculateLiuYao(input: Record<string, unknown>): LiuYaoResult {
  const method = (input.method as string) ?? "auto";
  const datetime = input.datetime as string ?? new Date().toISOString();

  // ── 起卦：确定性传统起卦法（报数优先、时间兜底），杜绝毫秒/伪随机 ──
  // 1) 若提供报数（number-2/number-3 或裸 numbers2/numbers3），用《梅花易数》数字起卦法
  // 2) 否则用求卦时刻的年支/月/日/时（《梅花易数》时间起卦法移植）
  //    —— 同一时辰必得同一卦，确定性可复现
  let qi: QiGuaResult;
  const nums2 = input.numbers2 as [number, number] | undefined;
  const nums3 = input.numbers3 as [number, number, number] | undefined;

  if ((method === "number-3" || method === "number-2") && nums3 && nums3.length >= 3) {
    qi = qiGuaByNumbers(nums3);
  } else if ((method === "number-2" || method === "number-3") && nums2 && nums2.length >= 2) {
    qi = qiGuaByNumbers(nums2);
  } else if (nums3 && nums3.length >= 3) {
    // method 未声明但传了三数 → 报数起卦优先
    qi = qiGuaByNumbers(nums3);
  } else if (nums2 && nums2.length >= 2) {
    qi = qiGuaByNumbers(nums2);
  } else {
    // 时间起卦兜底（auto/shake/time 及缺报数的所有情形）
    qi = qiGuaByTime(new Date(datetime));
  }

  // 由上下卦数组装本卦六爻编码（上卦三爻在前，与 GUA_64 编码方向一致）
  const upperCode = baguaCode(qi.upperNum);
  const lowerCode = baguaCode(qi.lowerNum);
  const benGuaCode = upperCode + lowerCode;
  const yaoNums = benGuaCode.split("").map(Number);

  // 动爻：由起卦法确定的单一动爻位（《梅花易数》一卦一动爻）
  const dongYaoPositions: number[] = [qi.dongYao];

  // 查找本卦
  const benGuaEntry = getGuaByCode(benGuaCode);
  const shiYao = benGuaEntry.shiYao;
  const yingYao = benGuaEntry.yingYao;

  // 变卦
  const bianYaoNums = [...yaoNums];
  for (const pos of dongYaoPositions) {
    bianYaoNums[pos - 1] = 1 - bianYaoNums[pos - 1];
  }
  const bianGuaEntry = getGuaByCode(bianYaoNums.join(""));

  // 互卦（取2345爻：2,3,4为下卦，3,4,5为上卦）
  const huYaoNums = [yaoNums[1], yaoNums[2], yaoNums[3], yaoNums[2], yaoNums[3], yaoNums[4]];
  const huGuaEntry = getGuaByCode(huYaoNums.join(""));

  // 日干（用于六兽排序）——使用 bazi-engine 的纯数学日柱算法
  const d = new Date(datetime);
  const riZhu = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const riGan = riZhu.gan;
  const shouStart = GAN_SHOU_START[riGan] ?? 0;

  // 构建六爻
  const yaos: Yao[] = [];
  for (let i = 0; i < 6; i++) {
    const pos = i + 1;
    const isDong = dongYaoPositions.includes(pos);
    const naJiaStr = getNaJia(pos, benGuaCode);
    const yaoWuXing = getYaoWuXing(naJiaStr);
    const liuQin = getLiuQin(benGuaEntry.wuXing, yaoWuXing);
    const shouIdx = (shouStart + i) % 6;
    yaos.push({
      position: pos,
      type: yaoNums[i] ? (isDong ? "laoyang" : "shaoyang") : (isDong ? "laoyin" : "shaoyin"),
      naJia: naJiaStr,
      liuQin,
      liuShou: LIU_SHOU[shouIdx],
      shiYing: pos === shiYao ? "世" : pos === yingYao ? "应" : null,
      wuXing: yaoWuXing,
      isDongYao: isDong,
    });
  }

  // Box-drawing 结构化总结
  const dongCount = dongYaoPositions.length;
  const dongLines = dongYaoPositions.map(p => {
    const y = yaos[p - 1];
    return `第${p}爻${y.liuQin}(${y.naJia ?? ""})${y.liuShou}动`;
  }).join("、");
  const yaoList = yaos.map(y => {
    const se = y.shiYing ? (y.shiYing === "世" ? "世" : "应") : "  ";
    const dt = y.isDongYao ? "○" : "  ";
    return `${y.position} ${y.type === "shaoyang" || y.type === "laoyang" ? "—" : "- -"} ${y.liuQin.padEnd(2)} ${y.naJia?.padEnd(4) ?? "—".padEnd(4)} ${y.liuShou.padEnd(2)} ${se} ${dt}`;
  }).join("\n");

  const summary = [
    "┌──────────────────────────────────────┐",
    "│       六爻纳甲 · 装卦排盘             │",
    "├──────────────────────────────────────┤",
    "│ 本卦：" + benGuaEntry.name + " " + benGuaEntry.symbol + " " + benGuaEntry.gong + "(" + benGuaEntry.wuXing + ")" + " ".repeat(5) + "│",
    "│ 变卦：" + (bianGuaEntry?.name || "无") + " " + (bianGuaEntry?.symbol || "") + " ".repeat(24) + "│",
    "│ 互卦：" + (huGuaEntry?.name || "无") + " " + (huGuaEntry?.symbol || "") + " ".repeat(24) + "│",
    "│ 世爻：第" + shiYao + "爻  应爻：第" + yingYao + "爻" + " ".repeat(20) + "│",
    "│ 动爻：" + dongCount + "个 · " + (dongLines || "无").slice(0, 30) + " ".repeat(3) + "│",
    "├──────────────────────────────────────┤",
    "│ 爻位 卦象 六亲 纳甲    六兽 世应 动  │",
    yaoList.split("\n").map(l => "│ " + l.padEnd(37) + "│").join("\n"),
    "├──────────────────────────────────────┤",
    "│ 起卦：" + qi.methodLabel.padEnd(31) + "│",
    "│ 依据：" + qi.basis,
    "├──────────────────────────────────────┤",
    "│ 出处：《卜筮正宗》《增删卜易》        │",
    "│ 纳甲法源自京房易学，《火珠林》传世    │",
    "│ 六十四卦八宫卦序·王洪绪订正本         │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { method: method as any, datetime },
    benGua: { name: benGuaEntry.name, symbol: benGuaEntry.symbol, upper: benGuaEntry.upper, lower: benGuaEntry.lower },
    bianGua: bianGuaEntry ? { name: bianGuaEntry.name, symbol: bianGuaEntry.symbol, upper: bianGuaEntry.upper, lower: bianGuaEntry.lower } : undefined,
    huGua: huGuaEntry ? { name: huGuaEntry.name, symbol: huGuaEntry.symbol, upper: huGuaEntry.upper, lower: huGuaEntry.lower } : undefined,
    yaos,
    shiYao,
    yingYao,
    guaGong: benGuaEntry.gong,
    wuXing: benGuaEntry.wuXing,
    qiGua: { method: qi.methodLabel, basis: qi.basis },
    summary,
  } as LiuYaoResult & { summary: string; qiGua: { method: string; basis: string } };
}
