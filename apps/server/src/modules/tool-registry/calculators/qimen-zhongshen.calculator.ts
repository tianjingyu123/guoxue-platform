// ── 奇门终身局计算引擎 ──
// 算法参考：《烟波钓叟歌》《奇门遁甲秘笈大全》《遁甲演义》
// 以出生时间起奇门终身局，排盘+推大运+一生概要

import { calcRiZhu } from "@guoxue/bazi-engine";

interface QiMenGongInfo { gongWei: string; men: string; xing: string; gan: string; shen: string; baGua: string; level: "吉" | "平" | "凶"; score: number; }
interface ZhongShenDaYunItem { age: number; gongWei: string; ganZhi: string; level: string; description: string; }
interface QiMenZhongShenResult { baZi: string; paiPan: { yangDun: boolean; juShu: number; gongList: QiMenGongInfo[] }; daYunList: ZhongShenDaYunItem[]; yiShengGist: string; summary: string; }

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BA_MEN = ["休","生","伤","杜","景","死","惊","开"];
const JIU_XING = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
const BA_SHEN = ["值符","螣蛇","太阴","六合","白虎","玄武","九地","九天"];
const GONG_LIST = ["坎宫","坤宫","震宫","巽宫","中宫","乾宫","兑宫","艮宫","离宫"];
const GUA = ["坎","坤","震","巽","乾","兑","艮","离"];

// 节气定局（简化）
function getJuShu(jieQiIdx: number): { yangDun: boolean; juShu: number } {
  const yinDunAfter = 11; // 夏至后阴遁
  const yangDun = jieQiIdx < yinDunAfter;
  const juShu = (jieQiIdx % 9) + 1;
  return { yangDun, juShu };
}

// 天干配宫
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ganToGong(gan: string): number {
  const map: Record<string, number> = { "甲":0,"乙":1,"丙":2,"丁":3,"戊":4,"己":5,"庚":6,"辛":7,"壬":8,"癸":9 };
  return map[gan] || 0;
}

export function calculateQiMenZhongShen(input: Record<string, unknown>): QiMenZhongShenResult {
  const year = (input.year as number) || 1990;
  const month = (input.month as number) || 1;
  const day = (input.day as number) || 1;
  const hour = (input.hour as number) || 0;
  const gender = (input.gender as "男" | "女") || "男";

  const yearGan = GAN[(year - 4) % 10];
  const yearZhi = ZHI[(year - 4) % 12];
  // 月柱：五虎遁月干 + 节气月支
  const monthGan = GAN[(GAN.indexOf(yearGan) * 2 + month - 1) % 10];
  const monthZhi = ZHI[(month + 1) % 12];
  // 日柱：bazi-engine 纯数学天文算法
  const riZhu = calcRiZhu(year, month, day);
  const riGan = riZhu.gan;
  const riZhi = riZhu.zhi;
  // 时柱：五鼠遁 + 时辰地支
  const shiZhiIdx = Math.floor((hour + 1) / 2) % 12;
  const shiGanBase = GAN.indexOf(riGan);
  const shiGan = GAN[((shiGanBase % 5) * 2 + shiZhiIdx) % 10];
  const shiZhi = ZHI[shiZhiIdx];
  const baZi = `${yearGan}${yearZhi} ${monthGan}${monthZhi} ${riGan}${riZhi} ${shiGan}${shiZhi}`;

  const jieQiApprox = (month - 1) * 2 + (day > 15 ? 1 : 0);
  const { yangDun, juShu } = getJuShu(jieQiApprox);

  const gongList: QiMenGongInfo[] = [];
  for (let i = 0; i < 8; i++) {
    const xingIdx = (juShu + i) % 9;
    const menIdx = (juShu + i + 3) % 8;
    const shenIdx = (juShu + i + 5) % 8;
    const ganIdx = (juShu + GAN.indexOf(yearGan) + i) % 10;
    const guaIdx = (juShu + i) % 8;
    const score = (i + juShu) % 3 === 0 ? 80 : (i + juShu) % 3 === 1 ? 60 : 40;

    gongList.push({
      gongWei: GONG_LIST[i],
      men: BA_MEN[menIdx],
      xing: JIU_XING[xingIdx],
      gan: GAN[ganIdx],
      shen: BA_SHEN[shenIdx],
      baGua: GUA[guaIdx],
      level: score >= 70 ? "吉" : score >= 50 ? "平" : "凶",
      score,
    });
  }

  const daYunList: ZhongShenDaYunItem[] = [];
  for (let i = 0; i < 8; i++) {
    const age = i * 10 + 5;
    daYunList.push({
      age, gongWei: GONG_LIST[i % 8],
      ganZhi: GAN[(GAN.indexOf(yearGan) + i) % 10] + ZHI[(ZHI.indexOf(yearZhi) + i * 2) % 12],
      level: i < 3 ? "上吉" : i < 5 ? "中平" : "下平",
      description: `${age}岁起十年大运在${GONG_LIST[i % 8]}，${i < 3 ? "早年得运，基础稳固" : i < 5 ? "中年发力，事业上升" : "晚年恬淡，宜守不宜攻"}`,
    });
  }

  const yiShengGist = `${gender === "男" ? "乾造" : "坤造"}${baZi}。奇门终身局${yangDun ? "阳遁" : "阴遁"}${juShu}局。`
    + `命主一生${gongList.filter(g => g.level === "吉").length >= 3 ? "顺遂通达" : "起伏波折"}，`
    + `${gongList.filter(g => g.men === "开门" || g.men === "休门" || g.men === "生门").length >= 2 ? "吉门多入，事业有成" : "需后天修行奋斗"}`;

  const summary = `终身局已排定，吉宫${gongList.filter(g => g.level === "吉").length}个，`
    + `三吉门(开休生)入${gongList.filter(g => ["开门","休门","生门"].includes(g.men)).map(g => g.gongWei).join("、")}。`
    + `大运最佳时期在${daYunList.find(d => d.level === "上吉")?.age || 35}岁左右。`;

  return { baZi, paiPan: { yangDun, juShu, gongList }, daYunList, yiShengGist, summary };
}
