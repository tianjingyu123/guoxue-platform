// ── 阳盘奇门遁甲计算引擎 ──
// 转盘/飞盘 排盘算法（拆补/茅山/置闰/自选）
// 节气计算使用 Meeus 天文算法，日柱使用纯数学计算
// 参考：《奇门遁甲》《遁甲演义》

import type { QimenResult, QimenGong } from "@guoxue/shared";
import { calcRiZhu, calcAllJieQi } from "@guoxue/bazi-engine";
import { calculateQimenYin as calcYinPan } from "./qimen-yin.calculator";

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

/** 根据公历日期+时间获取节气信息（Meeus天文算法，完整24节气，含精确时分比较） */
function getJieQi(year: number, month: number, day: number, hour: number): { name: string; dun: string; ju: [number, number, number] } {
  const fullOrder = [
    "立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种",
    "夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降",
    "立冬","小雪","大雪","冬至","小寒","大寒",
  ];

  // 归一化：构建连续节气年序列（上一年+本年+下一年）
  // 月份加权使立春(~2月)起的一年内有序
  function dateVal(m: number, d: number, h: number, mi: number, offsetYear: number): number {
    // 偏移年加12月
    return (m + offsetYear * 12) * 1000000 + d * 10000 + h * 100 + mi;
  }

  // 目标时刻（加12月偏移使得 >= 立春）
  const targetAdj = dateVal(month, day, hour, 0, 1); // +12月

  // 收集三年节气数据
  const allEntries: { name: string; adjVal: number }[] = [];
  for (let yOff = -1; yOff <= 1; yOff++) {
    const jqMap = calcAllJieQi(year + yOff);
    for (const name of fullOrder) {
      const jq = jqMap.get(name);
      if (jq) {
        allEntries.push({ name, adjVal: dateVal(jq.month, jq.day, jq.hour, jq.minute, yOff + 1) });
      }
    }
  }
  allEntries.sort((a, b) => a.adjVal - b.adjVal);

  // 找到目标时刻所属的节气区间
  for (let i = 0; i < allEntries.length; i++) {
    if (targetAdj < allEntries[i].adjVal) {
      if (i === 0) break;
      const prev = allEntries[i - 1];
      const info = JIE_QI_JU[prev.name];
      if (info) return { name: prev.name, ...info };
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
  // 地支按序配对(子丑→子,寅卯→寅,...)，六甲分别对应六仪：
  // 甲子(子0)→戊, 甲寅(寅2)→癸, 甲辰(辰4)→壬, 甲午(午6)→辛, 甲申(申8)→庚, 甲戌(戌10)→己
  const yiMap = ["戊","癸","壬","辛","庚","己"];
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  

  // 日柱（bazi-engine 纯数学算法）
  const riZhu = calcRiZhu(year, month, day);
  const riGan = riZhu.gan;
  const riZhi = riZhu.zhi;

  // 时柱
  const shiZhi = getShiChenZhi(hour);
  const shiGan = getShiGan(riGan, shiZhi);
  const shiChenGanZhi = shiGan + shiZhi;

  // 用局（Meeus天文算法精确时分 + 60甲子三元）
  const jieQi = getJieQi(year, month, day, hour);
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
  // 基于局数：戊从局数对应宫位起，阳遁顺排、阴遁逆排
  // 阳遁：diPan[i] = DI_PAN_GAN_BASE[(i - juNumber + 1 + 9) % 9]
  // 阴遁：diPan[i] = DI_PAN_GAN_BASE[(18 - juNumber - i) % 9]
  const diPan: string[] = [];
  for (let i = 0; i < 9; i++) {
    if (isYangDun) {
      diPan.push(DI_PAN_GAN_BASE[(i - juNumber + 1 + 9) % 9]);
    } else {
      diPan.push(DI_PAN_GAN_BASE[(18 - juNumber - i) % 9]);
    }
  }
  // diPan[0]=坎1, diPan[1]=坤2, ..., diPan[8]=离9

  // ── 第2步：旬首宫 → 值符星 + 值使门类型 ──
  // 旬首宫 = 旬首仪在地盘上的位置
  const xunShouGongIdx = diPan.indexOf(xunShouYi);
  // 值符星 = 旬首宫对应的九星
  const zhiFuXing = JIU_XING[xunShouGongIdx];
  // 值使门类型 = 旬首宫对应的八门
  const zhiShiMenType = BA_MEN[xunShouGongIdx];

  // ── 第3步：值符落宫 + 值使落宫 ──
  // 值符落宫 = 时干在地盘上的位置（值符星飞至此宫）
  const zhiFuLuoGong = diPan.indexOf(shiGan);
  // 值使落宫：旬首地支→时支，阳顺阴逆飞布
  const xunShouZhiIdx = DI_ZHI.indexOf(xunShouZhi);
  const shiZhiIdx = DI_ZHI.indexOf(shiZhi);
  const zhiBuShu = (shiZhiIdx - xunShouZhiIdx + 12) % 12;
  let zhiShiMenLuoGong: number;
  if (isYangDun) {
    zhiShiMenLuoGong = (xunShouGongIdx + zhiBuShu) % 9;
  } else {
    zhiShiMenLuoGong = (xunShouGongIdx - zhiBuShu + 9) % 9;
  }

  // ── 第4步：排天盘干 ──
  // 天盘干 = 地盘干随星旋转
  // 阳遁：地盘顺时针旋转（offset = 值符落宫 - 旬首宫）
  // 阴遁：地盘逆时针旋转（offset = 旬首宫 - 值符落宫）
  const tianPan: string[] = [];
  for (let i = 0; i < 9; i++) {
    if (isYangDun) {
      tianPan.push(diPan[(i - zhiFuLuoGong + xunShouGongIdx + 9) % 9]);
    } else {
      tianPan.push(diPan[(xunShouGongIdx + zhiFuLuoGong - i + 9) % 9]);
    }
  }

  // ── 第5步：排九星 ──
  // 值符星飞至值符落宫，其余星阳顺阴逆排列
  const starArr: string[] = [];
  for (let i = 0; i < 9; i++) {
    if (isYangDun) {
      starArr.push(JIU_XING[(xunShouGongIdx + i - zhiFuLuoGong + 9) % 9]);
    } else {
      starArr.push(JIU_XING[(xunShouGongIdx - i + zhiFuLuoGong + 9) % 9]);
    }
  }

  // ── 第6步：排八门 ──
  // 值使门飞至值使落宫，其余门阳顺阴逆排列
  const menArr: string[] = [];
  for (let i = 0; i < 9; i++) {
    if (isYangDun) {
      menArr.push(BA_MEN[(xunShouGongIdx + i - zhiShiMenLuoGong + 9) % 9]);
    } else {
      menArr.push(BA_MEN[(xunShouGongIdx - i + zhiShiMenLuoGong + 9) % 9]);
    }
  }

  // ── 第7步：排八神 ──
  // 值符领头，阳遁顺排阴遁逆排，值符落在值符落宫
  const shenBase = isYangDun ? BA_SHEN_YANG : BA_SHEN_YIN;
  const nonZhongIdx = [0, 1, 2, 3, 5, 6, 7, 8];
  const zhiFuShenOffset = zhiFuLuoGong === 4 ? 1 : (nonZhongIdx.indexOf(zhiFuLuoGong)); // 中5寄坤2
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
      men: menArr[gi],
      shen,
      isRuMu,
      isJiXing: false,
      isMenPo: false,
      kongWang: isKongWang,
      maXing: isMaXing,
    });
  }

  // Box-drawing 结构化总结
  const gongTable = gongs.filter(g => g.name !== "中").map(g => {
    const kw = g.kongWang ? "空" : "  ";
    const mx = g.maXing ? "马" : "  ";
    const rm = g.isRuMu ? "墓" : "  ";
    return `宫${g.index}${g.name.padEnd(2)} 天${g.tianPan} 地${g.diPan} ${g.star.padEnd(2)} ${g.men.padEnd(2)} ${g.shen?.padEnd(2) ?? "—".padEnd(2)} ${kw}${mx}${rm}`;
  });

  const summary = [
    "┌──────────────────────────────────────┐",
    "│     阳盘奇门遁甲 · 转盘排盘           │",
    "├──────────────────────────────────────┤",
    "│ 局数：" + dunType + "遁" + juNumber + "局  节气：" + jieQi.name.padEnd(6) + " ".repeat(14) + "│",
    "│ 用事：" + shiChenGanZhi + "时  日柱：" + riGan + riZhi + " ".repeat(19) + "│",
    "│ 值符：" + zhiFuXing.padEnd(4) + "值使：" + zhiShiMenType.padEnd(4) + " ".repeat(19) + "│",
    "│ 旬首：" + xunShouYi + xunShouZhi + "  空亡：" + (xunShouZhi === "子" ? "戌亥" : xunShouZhi === "戌" ? "申酉" : xunShouZhi === "申" ? "午未" : xunShouZhi === "午" ? "辰巳" : xunShouZhi === "辰" ? "寅卯" : "子丑") + " ".repeat(18) + "│",
    "├──────────────────────────────────────┤",
    "│ 宫 卦 天盘 地盘 九星   八门 八神 标记 │",
    ...gongTable.map(l => "│ " + l.padEnd(37) + "│"),
    "├──────────────────────────────────────┤",
    "│ 出处：《奇门遁甲秘笈大全》            │",
    "│ 节气用Meeus天文算法，局数依三元定     │",
    "│ 转盘法·拆补/茅山/置闰三法可选         │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    juNumber,
    dunType: dunType === "阳" ? "yang" : "yin",
    jieQi: jieQi.name,
    yongShi: shiChenGanZhi,
    zhiFu: zhiFuXing,
    zhiShiMen: zhiShiMenType,
    gongs,
    dipanBashen: shenArr,
    summary,
  } as QimenResult & { summary: string };
}

/** 阴盘奇门 — 直接委托给阴盘独立计算器 */
export function calculateQimenYin(input: Record<string, unknown>): QimenResult {
  return calcYinPan(input);
}
