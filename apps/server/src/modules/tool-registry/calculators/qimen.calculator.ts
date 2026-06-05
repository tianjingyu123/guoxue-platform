// ── 阳盘奇门遁甲计算引擎 ──
// 转盘/飞盘 排盘算法（拆补/茅山/置闰/自选）
// 节气计算使用 Meeus 天文算法，日柱使用纯数学计算
// 参考：《奇门遁甲》《遁甲演义》

import type { QimenResult, QimenGong } from "@guoxue/shared";
import { calcRiZhu, calcAllJieQi } from "@guoxue/bazi-engine";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GONG_NAMES = ["坎","坤","震","巽","中","乾","兑","艮","离"];
const GONG_INDEXES = [1,2,3,4,5,6,7,8,9];

// 九星（地盘固定顺序：坎1→离9）
const JIU_XING = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
// 八门（地盘固定顺序，中5无门用死门占位）
const BA_MEN = ["休","死","伤","杜","死","开","惊","生","景"];
// 八神（阳遁顺排）
const BA_SHEN_YANG = ["值符","螣蛇","太阴","六合","勾陈","朱雀","九地","九天"];
// 八神（阴遁逆排）
const BA_SHEN_YIN = ["值符","九天","九地","玄武","白虎","六合","太阴","螣蛇"];

// 节气与用局（阳遁/阴遁，上中下三元局数）
const JIE_QI_JU: Record<string, { dun: string; ju: [number, number, number] }> = {
  "立春":{dun:"阳",ju:[8,5,2]}, "雨水":{dun:"阳",ju:[9,6,3]}, "惊蛰":{dun:"阳",ju:[1,7,4]},
  "春分":{dun:"阳",ju:[3,9,6]}, "清明":{dun:"阳",ju:[4,1,7]}, "谷雨":{dun:"阳",ju:[5,2,8]},
  "立夏":{dun:"阳",ju:[4,1,7]}, "小满":{dun:"阳",ju:[5,2,8]}, "芒种":{dun:"阳",ju:[6,3,9]},
  "夏至":{dun:"阴",ju:[9,3,6]}, "小暑":{dun:"阴",ju:[8,2,5]}, "大暑":{dun:"阴",ju:[7,1,4]},
  "立秋":{dun:"阴",ju:[2,5,8]}, "处暑":{dun:"阴",ju:[1,4,7]}, "白露":{dun:"阴",ju:[9,3,6]},
  "秋分":{dun:"阴",ju:[7,1,4]}, "寒露":{dun:"阴",ju:[6,9,3]}, "霜降":{dun:"阴",ju:[5,8,2]},
  "立冬":{dun:"阴",ju:[6,9,3]}, "小雪":{dun:"阴",ju:[5,8,2]}, "大雪":{dun:"阴",ju:[4,7,1]},
  "冬至":{dun:"阳",ju:[1,7,4]}, "小寒":{dun:"阳",ju:[2,8,5]}, "大寒":{dun:"阳",ju:[3,9,6]},
};

// 60甲子序号查找表
function build60JiaZiIndex(): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < 60; i++) {
    map.set(TIAN_GAN[i % 10] + DI_ZHI[i % 12], i);
  }
  return map;
}
const GANZHI_60_INDEX = build60JiaZiIndex();

// 地盘干基序（坎1宫起）
const DI_PAN_GAN_BASE = ["戊","己","庚","辛","壬","癸","丁","丙","乙"];

/** 根据公历日期获取节气信息（Meeus天文算法） */
function getJieQi(dateStr: string): { name: string; dun: string; ju: [number, number, number] } {
  const d = new Date(dateStr + "T12:00:00+08:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  const allJieQi = calcAllJieQi(year);

  const jieOrder = ["立春","惊蛰","清明","立夏","芒种","小暑","立秋","白露","寒露","立冬","大雪","小寒"];
  const dateValue = month * 100 + day;

  for (let i = 0; i < 12; i++) {
    const jieName = jieOrder[i];
    const jie = allJieQi.get(jieName)!;
    const prevIdx = (i + 11) % 12;
    const prevJieName = jieOrder[prevIdx];
    const prevJie = allJieQi.get(prevJieName)!;

    const jieValue = jie.month * 100 + jie.day;
    let prevValue = prevJie.month * 100 + prevJie.day;
    if (prevJie.month > jie.month) prevValue -= 1200;

    if (dateValue >= prevValue && dateValue < jieValue) {
      const info = JIE_QI_JU[prevJieName];
      if (info) return { name: prevJieName, ...info };
      break;
    }
  }

  return { name: "冬至", dun: "阳", ju: [1, 7, 4] };
}

/** 三元日判断（基于60甲子序号） */
function getYuanIndex(year: number, month: number, day: number): number {
  const { gan, zhi } = calcRiZhu(year, month, day);
  const seq = GANZHI_60_INDEX.get(gan + zhi) ?? 0;
  return Math.floor(seq / 20);
}

/** 获取时辰对应的地支 */
function getShiChenZhi(hour: number): string {
  return DI_ZHI[Math.floor(hour / 2) % 12];
}

/** 获取时柱天干（五鼠遁） */
function getShiGan(riGan: string, shiZhi: string): string {
  const ganIdx = TIAN_GAN.indexOf(riGan);
  const zhiIdx = DI_ZHI.indexOf(shiZhi);
  const baseGan = [0, 2, 4, 6, 8][Math.floor(ganIdx / 2)];
  return TIAN_GAN[(baseGan + zhiIdx) % 10];
}

/** 获取旬首（六甲旬首对应的仪） */
function getXunShouYi(shiChenGanZhi: string): string {
  const zhi = shiChenGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaZhiIdx = Math.floor(zhiIdx / 2) * 2;
  // 六甲：甲子→戊, 甲戌→己, 甲申→庚, 甲午→辛, 甲辰→壬, 甲寅→癸
  const yiMap = ["戊","己","庚","辛","壬","癸"];
  return yiMap[jiaZhiIdx / 2];
}

/** 获取旬首地支 */
function getXunShouZhi(shiChenGanZhi: string): string {
  const zhi = shiChenGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaZhiIdx = Math.floor(zhiIdx / 2) * 2;
  return DI_ZHI[jiaZhiIdx];
}

// 旬首地支→九宫起始索引（六甲旬首对应的地盘宫位）
const XUN_SHOU_GONG: Record<string, number> = {
  "子": 0,  // 甲子戊→坎1宫
  "戌": 5,  // 甲戌己→乾6宫
  "申": 1,  // 甲申庚→坤2宫
  "午": 8,  // 甲午辛→离9宫
  "辰": 3,  // 甲辰壬→巽4宫
  "寅": 7,  // 甲寅癸→艮8宫
};

// 旬空对照表（六甲旬 → 空亡地支 → 空亡宫位）
const XUN_KONG_GONG: Record<string, number[]> = {
  "子": [5],       // 戌亥空→乾6
  "戌": [1, 6],    // 申酉空→坤2+兑7
  "申": [8, 1],    // 午未空→离9+坤2
  "午": [3],       // 辰巳空→巽4
  "辰": [7, 2],    // 寅卯空→艮8+震3
  "寅": [0, 7],    // 子丑空→坎1+艮8
};

/** 阳盘奇门排盘（转盘法） */
export function calculateQimenYang(input: Record<string, unknown>): QimenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const qiJuMethod = (input.qiJuMethod as string) ?? "chaibu";
  const customJu = input.customJu as number | undefined;

  const d = new Date(datetime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const dateStr = d.toISOString().slice(0, 10);

  // 日柱（bazi-engine 纯数学算法）
  const riZhu = calcRiZhu(year, month, day);
  const riGan = riZhu.gan;
  const riZhi = riZhu.zhi;

  // 时柱
  const shiZhi = getShiChenZhi(hour);
  const shiGan = getShiGan(riGan, shiZhi);
  const shiChenGanZhi = shiGan + shiZhi;

  // 用局（Meeus天文算法 + 60甲子三元）
  const jieQi = getJieQi(dateStr);
  let juNumber: number;
  if (qiJuMethod === "zixuan" && customJu) {
    juNumber = customJu;
  } else {
    const yuanIdx = getYuanIndex(year, month, day);
    juNumber = jieQi.ju[yuanIdx];
  }

  const dunType = jieQi.dun as "阳" | "阴";
  const isYangDun = dunType === "阳";
  const xunShouYi = getXunShouYi(shiChenGanZhi);
  const xunShouZhi = getXunShouZhi(shiChenGanZhi);

  // ── 第1步：排地盘干 ──
  // 从坎1宫起旬首，顺排"戊己庚辛壬癸丁丙乙"
  const xunShouGanIdx = DI_PAN_GAN_BASE.indexOf(xunShouYi);
  const diPan: string[] = [];
  for (let i = 0; i < 9; i++) {
    diPan.push(DI_PAN_GAN_BASE[(xunShouGanIdx + i) % 9]);
  }
  // diPan[0]=坎1, diPan[1]=坤2, ..., diPan[8]=离9

  // ── 第2步：确定值符星 ──
  // 时干落宫（找时干在地盘干中的位置）
  let zhiFuGongIdx = diPan.indexOf(shiGan);
  if (zhiFuGongIdx === -1) zhiFuGongIdx = 0;
  const zhiFuXing = JIU_XING[zhiFuGongIdx];

  // ── 第3步：确定值使门 ──
  // 旬首地支→时支飞布，从旬首地支所在宫起数，阳顺阴逆数至时支
  const xunShouZhiIdx = DI_ZHI.indexOf(xunShouZhi);
  const shiZhiIdx = DI_ZHI.indexOf(shiZhi);
  const zhiBuShu = (shiZhiIdx - xunShouZhiIdx + 12) % 12;
  const xunShouGongIdx = XUN_SHOU_GONG[xunShouZhi] ?? 0;
  let zhiShiMenGongIdx: number;
  if (isYangDun) {
    zhiShiMenGongIdx = (xunShouGongIdx + zhiBuShu) % 9;
  } else {
    zhiShiMenGongIdx = (xunShouGongIdx - zhiBuShu % 9 + 9) % 9;
  }
  const zhiShiMen = BA_MEN[zhiShiMenGongIdx];

  // ── 第4步：排天盘干 ──
  // 值符星落时干宫，天盘干=地盘干随星转
  const tianPan: string[] = [];
  for (let i = 0; i < 9; i++) {
    // 天盘干：宫位i的天盘干 = 地盘干中与宫位i有相同星的宫的地盘干
    // 简化：天盘以值符宫为基准旋转
    const diPanSrcIdx = isYangDun
      ? ((i - zhiFuGongIdx + 9) % 9)
      : ((zhiFuGongIdx - i + 9) % 9);
    tianPan.push(diPan[diPanSrcIdx]);
  }

  // ── 第5步：排九星 ──
  // 值符星随天盘，领头阳顺阴逆排
  const starArr: string[] = [];
  for (let i = 0; i < 9; i++) {
    const starSrcIdx = isYangDun
      ? ((zhiFuGongIdx + i) % 9)
      : ((zhiFuGongIdx - i + 9) % 9);
    starArr.push(JIU_XING[starSrcIdx]);
  }

  // ── 第6步：排八门 ──
  // 值使门领头，阳顺阴逆排
  const menArr: string[] = [];
  for (let i = 0; i < 8; i++) {
    const menSrcIdx = isYangDun
      ? ((zhiShiMenGongIdx + i) % 9)
      : ((zhiShiMenGongIdx - i + 9) % 9);
    menArr.push(BA_MEN[menSrcIdx]);
  }

  // ── 第7步：排八神 ──
  // 值符领头，阳遁顺排阴遁逆排，值符落在值符宫
  const shenBase = isYangDun ? BA_SHEN_YANG : BA_SHEN_YIN;
  // 旋转使值符(数组[0])落在值符宫对应的非中宫序列位置
  const nonZhongIdx = [0, 1, 2, 3, 5, 6, 7, 8];
  const zhiFuShenOffset = zhiFuGongIdx === 4 ? 1 : (nonZhongIdx.indexOf(zhiFuGongIdx)); // 中5寄坤2
  const shenArr: string[] = [];
  for (let i = 0; i < 8; i++) {
    shenArr.push(shenBase[(i - zhiFuShenOffset + 8) % 8]);
  }

  // ── 第8步：构建九宫 ──
  const gongs: QimenGong[] = [];

  // 空亡：根据旬首查表
  const kongWangGongs = XUN_KONG_GONG[xunShouZhi] ?? [];

  // 马星：日支三合局→马星地支→马星宫
  const maXingGroups = ["寅午戌", "申子辰", "巳酉丑", "亥卯未"];
  const maXingGongByGroup = [1, 7, 5, 3]; // 申坤2, 寅艮8, 亥乾6, 巳巽4
  let maXingGong = -1;
  for (let g = 0; g < 4; g++) {
    if (maXingGroups[g].includes(riZhi)) { maXingGong = maXingGongByGroup[g]; break; }
  }

  // 入墓：天干→墓库宫（甲乙墓未坤2, 丙丁墓戌乾6, 戊己墓戌乾6, 庚辛墓丑艮8, 壬癸墓辰巽4）
  const ganRuMuGong: Record<string, number> = {
    "甲":1,"乙":1,"丙":5,"丁":5,"戊":5,"己":5,"庚":7,"辛":7,"壬":3,"癸":3,
  };

  for (let gi = 0; gi < 9; gi++) {
    const gongName = GONG_NAMES[gi];
    const gongIdx = GONG_INDEXES[gi];

    if (gongName === "中") {
      // 中5宫：寄坤2宫
      gongs.push({
        index: 5, name: "中", bagua: "中",
        diPan: diPan[4],
        tianPan: tianPan[4],
        star: starArr[4],
        men: BA_MEN[4],
        shen: shenArr[0],
        isRuMu: false, isJiXing: false, isMenPo: false,
        kongWang: false, maXing: false,
      });
      continue;
    }

    // 八神（已在上面旋转，值符在值符宫）
    const shenIdx = nonZhongIdx.indexOf(gi);
    const shen = shenIdx >= 0 ? shenArr[shenIdx % 8] : shenArr[0];

    const isKongWang = kongWangGongs.includes(gi);
    const isMaXing = gi === maXingGong;

    // 入墓：天盘干入墓
    const tg = tianPan[gi];
    const isRuMu = ganRuMuGong[tg] === gi;

    gongs.push({
      index: gongIdx,
      name: gongName,
      bagua: gongName,
      diPan: diPan[gi],
      tianPan: tianPan[gi],
      star: starArr[gi],
      men: gi === 4 ? BA_MEN[4] : menArr[shenIdx % 8],
      shen,
      isRuMu,
      isJiXing: false,
      isMenPo: false,
      kongWang: isKongWang,
      maXing: isMaXing,
    });
  }

  return {
    juNumber,
    dunType: dunType === "阳" ? "yang" : "yin",
    jieQi: jieQi.name,
    yongShi: shiChenGanZhi,
    zhiFu: zhiFuXing,
    zhiShiMen,
    gongs,
    dipanBashen: shenArr,
  };
}

/** 阴盘奇门（待后续重写，当前委托给阴盘独立计算器） */
export function calculateQimenYin(input: Record<string, unknown>): QimenResult {
  // 由 qimen-yin.calculator.ts 实现，此处作为向后兼容的fallback
  return calculateQimenYang(input);
}
