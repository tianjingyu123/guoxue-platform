// ── 飞宫小奇门计算引擎 ──
// 金口诀奇门/飞宫掌：以时辰干支入中宫飞布九星八门
// 参考：《金口诀》《飞宫小奇门》主流算法

import type { FeiGongQiMenResult, FeiGongGong } from "@guoxue/shared";
import { calcRiZhu, calcAllJieQi } from "@guoxue/bazi-engine";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STARS = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"] as const;
const MEN = ["休门","死门","伤门","杜门","中门","开门","惊门","生门","景门"] as const;
const DIRECTIONS = ["正北","西南","正东","东南","中央","西北","正西","东北","正南"];
const DI_GAN = ["戊","己","庚","辛","壬","癸","丁","丙","乙"];

// 节气名顺序
const JIE_QI_NAMES = ["立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至","小寒","大寒"];

/** 根据月日确定当前节气区间（Meeus天文算法） */
function getJieQi(year: number, month: number, day: number): string {
  const allJieQi = calcAllJieQi(year);
  const dateValue = month * 100 + day;

  for (let i = 0; i < 24; i++) {
    const jieName = JIE_QI_NAMES[i];
    const jie = allJieQi.get(jieName);
    if (!jie) continue;
    const jieValue = jie.month * 100 + jie.day;

    const prevName = JIE_QI_NAMES[(i + 23) % 24];
    const prevJie = allJieQi.get(prevName);
    if (!prevJie) continue;
    let prevValue = prevJie.month * 100 + prevJie.day;
    // 跨年处理
    if (prevJie.month > jie.month) prevValue -= 1200;

    if (dateValue >= prevValue && dateValue < jieValue) return prevName;
  }
  return "冬至";
}

/** 阴阳遁判断（节气+三元定局） */
function getDunType(year: number, month: number, day: number): "阳遁" | "阴遁" {
  const jq = getJieQi(year, month, day);
  // 冬至到夏至之间 → 阳遁，夏至到冬至之间 → 阴遁
  const dongZhiIdx = JIE_QI_NAMES.indexOf("冬至");
  const xiaZhiIdx = JIE_QI_NAMES.indexOf("夏至");
  const curIdx = JIE_QI_NAMES.indexOf(jq);
  if (curIdx === -1) return "阳遁";
  // 在冬至(22)→小寒(23)→大寒(0)→...→夏至(11)的区间为阳遁
  if (curIdx >= dongZhiIdx || curIdx < xiaZhiIdx) return "阳遁";
  return "阴遁";
}

/** 日干支（bazi-engine 纯数学算法） */
function dayGanZhi(year: number, month: number, day: number): string {
  const rz = calcRiZhu(year, month, day);
  return rz.gan + rz.zhi;
}

/** 时干支：根据日干和小时计算五鼠遁 */
function shiGanZhi(riGan: string, hour: number): string {
  const ganIdx = TIAN_GAN.indexOf(riGan);
  const shiGanBase = [0, 2, 4, 6, 8][Math.floor((ganIdx % 10) / 2)];
  const shiZhiIdx = Math.floor((hour + 1) / 2) % 12;
  return TIAN_GAN[(shiGanBase + shiZhiIdx) % 10] + DI_ZHI[shiZhiIdx % 12];
}

/** 旬首：根据日干支确定 */
function xunShou(riGanZhi: string): string {
  const zhi = riGanZhi[1];
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const jiaIdx = zhiIdx - (zhiIdx % 2);
  return "甲" + DI_ZHI[(jiaIdx + 12) % 12];
}

/**
 * 局数确定（飞宫小奇门标准算法）：
 * - 时支定三元：子午卯酉=上元, 寅申巳亥=中元, 辰戌丑未=下元
 * - 日支旬首定局基：甲子旬1, 甲戌旬2, ..., 甲寅旬6
 * - 阳遁顺布1-9, 阴遁逆布9-1
 */
function determineJuShu(riGanZhi: string, shiZhi: string, dunType: "阳遁" | "阴遁"): number {
  const shiZhiIdx = DI_ZHI.indexOf(shiZhi);

  // 三元：子午卯酉=上元(0), 寅申巳亥=中元(1), 辰戌丑未=下元(2)
  const sanYuanMap: Record<string, number> = {
    "子":0, "午":0, "卯":0, "酉":0,
    "寅":1, "申":1, "巳":1, "亥":1,
    "辰":2, "戌":2, "丑":2, "未":2,
  };
  const yuan = sanYuanMap[shiZhi] ?? 0;

  // 旬首定局基数
  const xun = xunShou(riGanZhi);
  const xunZhi = xun[1];
  const xunZhiIdx = DI_ZHI.indexOf(xunZhi);
  const juBase = Math.floor(xunZhiIdx / 2) + 1; // 0→1, 2→2, 4→3, 6→4, 8→5, 10→6

  // 上元局 = juBase, 中元 = juBase + 3, 下元 = juBase + 6
  let ju = juBase + yuan * 3;
  if (ju > 9) ju -= 9;

  return ju;
}

/** 主计算函数 */
export function calculateFeiGongQiMen(input: Record<string, unknown>): FeiGongQiMenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const method = (input.method as string) ?? "shichen";
  const question = input.question as string ?? "";

  const d = new Date(datetime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();

  const riGz = dayGanZhi(year, month, day);
  const shiGz = shiGanZhi(riGz[0], hour);
  const xunShouStr = xunShou(riGz);
  const dunType = getDunType(year, month, day);
  const juShu = determineJuShu(riGz, shiGz[1], dunType);

  // 值符星：按局数对应（阳遁1-9对应天蓬→天英，阴遁对应天英→天蓬）
  const starIdx = dunType === "阳遁" ? (juShu - 1) : (10 - juShu - 1);
  const zhiFuStar = STARS[starIdx];
  const zhiShiMen = MEN[starIdx];

  // 时干入中宫飞布九宫
  const shiGanIdx = TIAN_GAN.indexOf(shiGz[0]);
  const gongs: FeiGongGong[] = [];
  const diGanOrder = dunType === "阳遁"
    ? DI_GAN
    : [...DI_GAN].reverse();

  for (let i = 0; i < 9; i++) {
    const pos = i + 1;
    const starOff = dunType === "阳遁" ? i : (9 - i);
    const menOff = starOff;
    const sIdx = (starOff + starIdx) % 9;
    const mIdx = (menOff + starIdx) % 9;
    const dgIdx = (i + shiGanIdx) % 9;

    const sj = STARS[sIdx];
    const mj = MEN[mIdx];
    // 吉凶判断：生门/开门/休门为吉，死门/惊门/伤门为凶
    const isMenJi = ["生门","开门","休门"].includes(mj);
    const isMenXiong = ["死门","惊门","伤门"].includes(mj);
    const jiXiong = isMenJi ? "吉" : isMenXiong ? "凶" : "平";

    gongs.push({
      pos: pos as any,
      direction: DIRECTIONS[i],
      star: sj as any,
      men: mj as any,
      tianGan: TIAN_GAN[(shiGanIdx + i) % 10],
      diGan: diGanOrder[dgIdx],
      jiXiong: jiXiong as any,
      comment: `${sj}配${mj}，${jiXiong === "吉" ? "吉利可往。" : jiXiong === "凶" ? "不利，宜避之。" : "中平。"}`,
    });
  }

  // 用神：日干宫和时干宫
  const riGanIdx = TIAN_GAN.indexOf(riGz[0]);
  const riGanGong = ((riGanIdx - shiGanIdx + 9) % 9) + 1;
  const shiGanGong = 5; // 时干入中宫

  // 日干落宫与时干落宫关系
  let relation: string;
  if (riGanGong === shiGanGong) relation = "同宫比和";
  else if ((riGanGong + 5) % 9 === shiGanGong % 9) relation = "相冲";
  else if (riGanGong < shiGanGong) relation = "日生时";
  else relation = "时生日";

  // 格局
  const geJu = [
    { name:"飞宫得位", gong: juShu, desc:"值符落本宫，主事有根基。", jiXiong:"吉" as const },
    { name:"星门相生", gong: (juShu % 9) + 1, desc:"星生门，主顺利。", jiXiong:"吉" as const },
  ];

  return {
    input: { datetime, method: method as any, number: input.number as number, question },
    basicInfo: {
      juShu,
      xunShou: xunShouStr,
      zhiShiMen: zhiShiMen as any,
      zhiFuStar: zhiFuStar as any,
      dunType,
      shiGanZhi: shiGz,
    },
    gongs,
    yongShen: {
      riGanGong,
      shiGanGong,
      relation,
    },
    geJu,
    duanYu: `飞宫小奇门${dunType}${juShu}局，值符${zhiFuStar}，值使${zhiShiMen}。时辰${shiGz}。${question ? `所问"${question}"，${riGanGong === shiGanGong ? "人时比和，吉。" : "需看具体宫位。"}` : ""}`,
  };
}
