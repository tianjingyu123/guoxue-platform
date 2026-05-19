// ── 六爻纳甲排盘计算引擎 ──
// 装卦/纳甲/纳支/六兽/世应/六亲

import type { LiuYaoResult, Yao } from "@guoxue/shared";
import { calcRiZhu } from "@guoxue/bazi-engine";


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

/** 主计算函数 */
export function calculateLiuYao(input: Record<string, unknown>): LiuYaoResult {
  const method = (input.method as string) ?? "auto";
  const datetime = input.datetime as string ?? new Date().toISOString();

  // 根据起卦方式生成6个爻（0=阴, 1=阳）
  const yaoNums: number[] = [];
  if (method === "auto" || method === "shake") {
    const d = new Date(datetime);
    const seed = d.getTime();
    for (let i = 0; i < 6; i++) {
      yaoNums.push(((seed >> i) & 1));
    }
  } else if (method === "number-2" && input.numbers2) {
    const [a, b] = input.numbers2 as [number, number];
    for (let i = 0; i < 6; i++) {
      yaoNums.push(((a >> i) & 1) ^ ((b >> i) & 1) ? 1 : 0);
    }
  } else if (method === "number-3" && input.numbers3) {
    const [a, b, c] = input.numbers3 as [number, number, number];
    for (let i = 0; i < 6; i++) {
      const sum = ((a >> i) & 1) + ((b >> i) & 1) + ((c >> i) & 1);
      yaoNums.push(sum % 2);
    }
  } else {
    const d = new Date(datetime);
    const seed = d.getTime();
    for (let i = 0; i < 6; i++) {
      yaoNums.push(((seed >> (i * 7)) & 1));
    }
  }

  // 动爻判断：随机产生1-3个动爻
  const dongYaoPositions: number[] = [];
  const seed2 = new Date(datetime).getTime() + 42;
  for (let i = 0; i < 6; i++) {
    if (((seed2 >> (i * 5)) & 7) === 0) dongYaoPositions.push(i + 1);
  }
  if (dongYaoPositions.length === 0) dongYaoPositions.push(((seed2 & 5) % 6) + 1);

  // 本卦码
  const benGuaCode = yaoNums.join("");

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
  };
}
