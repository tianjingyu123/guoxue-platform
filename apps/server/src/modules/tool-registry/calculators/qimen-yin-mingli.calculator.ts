// ── 阴盘命理奇门计算引擎 ──
// 出生时间起阴盘奇门命盘，叠加八字+大运+命宫+格局分析
// 复用 calculateQimenYin 真实排盘 + calcBazi 八字引擎

import type { QimenGong } from "@guoxue/shared";
import {
  calcBazi, calcNianZhu,
  type BaziInput, type BaziResult,
} from "@guoxue/bazi-engine";
import { calculateQimenYin } from "./qimen-yin.calculator";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GONG_NAMES = ["坎","坤","震","巽","中","乾","兑","艮","离"];

// 地支→九宫索引映射
const ZHI_TO_GONG_IDX: Record<string, number> = {
  "子":0, "丑":7, "寅":7, "卯":2, "辰":3, "巳":3,
  "午":8, "未":1, "申":1, "酉":6, "戌":5, "亥":5,
};

const GAN_WU_XING: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
};
const GONG_WU_XING: Record<number, string> = { 0:"水",1:"土",2:"木",3:"木",4:"土",5:"金",6:"金",7:"土",8:"火" };
const GONG_ZHI: Record<number, string> = { 0:"子",1:"申",2:"卯",3:"辰",4:"辰",5:"戌",6:"酉",7:"丑",8:"午" };

const MEN_FULL_WU_XING: Record<string, string> = {
  "休门":"水","死门":"土","伤门":"木","杜门":"木","中门":"土","开门":"金","惊门":"金","生门":"土","景门":"火",
};
const KE_MAP: Record<string, string> = { "木":"土","土":"水","水":"火","火":"金","金":"木" };

const CHANG_SHENG_ZHI: Record<string, string> = {
  "甲":"亥","乙":"午","丙":"寅","丁":"酉","戊":"寅","己":"酉","庚":"巳","辛":"子","壬":"申","癸":"卯",
};
const CHANG_SHENG_SEQ = ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];

function calcDiShi(gan: string, zhi: string): string {
  const csZhi = CHANG_SHENG_ZHI[gan];
  if (!csZhi) return "";
  const csIdx = DI_ZHI.indexOf(csZhi);
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const isYinGan = "乙丁己辛癸".includes(gan);
  const offset = isYinGan ? (csIdx - zhiIdx + 12) % 12 : (zhiIdx - csIdx + 12) % 12;
  return CHANG_SHENG_SEQ[offset] ?? "";
}

function calcRuMu(tianPanGan: string, gongIdx: number): boolean {
  const ganWx = GAN_WU_XING[tianPanGan];
  const gongWx = GONG_WU_XING[gongIdx];
  return KE_MAP[gongWx] === ganWx;
}

function calcJiXing(tianPanGan: string, gongIdx: number): boolean {
  if (tianPanGan === "戊" && gongIdx === 2) return true;
  if (tianPanGan === "己" && gongIdx === 7) return true;
  if (tianPanGan === "庚" && gongIdx === 8) return true;
  return false;
}

function calcMenPo(men: string, gongIdx: number): boolean {
  const fullMen = men.includes("门") ? men : men + "门";
  const menWx = MEN_FULL_WU_XING[fullMen];
  if (!menWx) return false;
  const gongWx = GONG_WU_XING[gongIdx];
  return KE_MAP[gongWx] === menWx;
}

const STAR_MEN_SHEN_GEJU = [
  { star:"天心", men:"开门", shen:"值符", name:"龙跃天门", jiXiong:"吉" as const, desc:"天心智慧+开门通达+值符护佑，主贵人有助，事业顺遂。" },
  { star:"天辅", men:"生门", shen:"六合", name:"凤鸣朝阳", jiXiong:"吉" as const, desc:"天辅文昌+生门财运+六合人缘，主学业事业双丰收。" },
  { star:"天蓬", men:"休门", shen:"太阴", name:"潜龙在渊", jiXiong:"平" as const, desc:"休养生息之象，适宜积累力量，不宜冒进求成。" },
  { star:"天英", men:"景门", shen:"九天", name:"鹏程万里", jiXiong:"吉" as const, desc:"志向远大，名声远播。宜向外发展，前程似锦。" },
  { star:"天柱", men:"惊门", shen:"白虎", name:"虎啸风生", jiXiong:"凶" as const, desc:"口舌是非、竞争压力大，宜谨言慎行，防小人暗算。" },
  { star:"天芮", men:"死门", shen:"玄武", name:"病符临宫", jiXiong:"凶" as const, desc:"须注意健康问题，谨慎投资理财，避免破财。" },
  { star:"天冲", men:"伤门", shen:"螣蛇", name:"荆棘载途", jiXiong:"凶" as const, desc:"阻碍重重，易有反复波折。适合以守为攻，等待时机。" },
  { star:"天任", men:"杜门", shen:"九地", name:"稳如泰山", jiXiong:"平" as const, desc:"稳定有余而变通不足，宜守成稳重发展。" },
];

function interpretGong(gong: QimenGong): string {
  const parts: string[] = [];
  if (gong.kongWang) parts.push("此宫逢空亡，事多虚浮不实");
  if (gong.maXing) parts.push("马星发动，主奔波变动");
  if (gong.isRuMu) parts.push("天盘干入墓，能量受困");
  if (gong.isJiXing) parts.push("击刑在宫，多有是非阻碍");
  if (gong.isMenPo) parts.push("门破，该宫所主之事难成");
  if (gong.changSheng) {
    const cs = gong.changSheng;
    if (["长生","冠带","临官","帝旺"].includes(cs)) parts.push(`地势${cs}，气运旺盛`);
    else if (["衰","病","死","墓","绝"].includes(cs)) parts.push(`地势${cs}，气运衰弱`);
    else parts.push(`地势${cs}，气运平平`);
  }
  if (parts.length === 0) parts.push("此宫平稳，暂无特殊吉凶");
  return `${gong.name}宫（${gong.star}+${gong.men}+${gong.shen}，天盘${gong.tianPan}）。${parts.join("；")}。`;
}

function pillarToGanZhi(p: { gan: string; zhi: string }): string {
  return p.gan + p.zhi;
}

function extractBaziSummary(bz: BaziResult) {
  return {
    nian: pillarToGanZhi(bz.siZhu.nian),
    yue: pillarToGanZhi(bz.siZhu.yue),
    ri: pillarToGanZhi(bz.siZhu.ri),
    shi: pillarToGanZhi(bz.siZhu.shi),
    shengXiao: bz.shengXiao,
    kongWang: bz.kongWang,
    wuXingEnergy: bz.wuXingEnergy ?? { mu:0, huo:0, tu:0, jin:0, shui:0, desc:"" },
    nianNaYin: bz.siZhu.nian.nayin ?? "",
    yueNaYin: bz.siZhu.yue.nayin ?? "",
    riNaYin: bz.siZhu.ri.nayin ?? "",
    shiNaYin: bz.siZhu.shi.nayin ?? "",
  };
}

export function calculateQimenYinMingli(input: Record<string, unknown>): Record<string, unknown> {
  // ── 1. 解析输入 ──
  const birthTime = (input.birthTime as string) ?? new Date().toISOString();
  const birthplace = (input.birthplace as string) || undefined;
  const gender = (input.gender as string) === "女" ? "女" : "男";
  const trueSolar = (input.useTrueSolar as boolean) ?? false;
  const ziShiMode = (input.ziShiMode as string) ?? "traditional";
  const daylightSaving = (input.useDaylightSaving as boolean) ?? false;

  const d = new Date(birthTime);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  let hour = d.getHours();
  const minute = d.getMinutes();

  if (daylightSaving) hour = (hour - 1 + 24) % 24;

  // 早晚子时（预留）

  // ── 2. 八字排盘 ──
  const baziInput: BaziInput = {
    name: "",
    gender: gender as "男" | "女",
    year, month, day, hour, minute,
    city: birthplace,
    useTrueSolarTime: trueSolar,
  };
  const bz = calcBazi(baziInput);

  // ── 3. 主盘排盘：出生时间阴盘奇门 ──
  const birthPlate = calculateQimenYin({
    datetime: birthTime,
    panType: "shi",
    useTrueSolar: false,
  });

  // ── 4. 增强九宫信息 ──
  const enhancedGongs: QimenGong[] = birthPlate.gongs.map((g, idx) => {
    const tianPanGan = g.tianPan;
    const gongZhi = GONG_ZHI[idx];
    const enhanced: QimenGong = {
      ...g,
      isRuMu: calcRuMu(tianPanGan, idx),
      isJiXing: calcJiXing(tianPanGan, idx),
      isMenPo: calcMenPo(g.men, idx),
      changSheng: calcDiShi(tianPanGan, gongZhi),
    };
    enhanced.interpretation = interpretGong(enhanced);

    if (bz.shenSha && bz.shenSha.length > 0) {
      const relevantSha = bz.shenSha.filter(s => {
        if (idx === 0 && s.pillar === "nian") return true;
        if (idx === 8 && s.pillar === "ri") return true;
        return false;
      });
      if (relevantSha.length > 0) {
        enhanced.shenSha = relevantSha.map(s => s.name);
      }
    }
    return enhanced;
  });

  // ── 5. 命宫→九宫映射 ──
  const mingGongPillar = bz.mingGong;
  const mingGongIdx = ZHI_TO_GONG_IDX[mingGongPillar.zhi] ?? 0;
  const mingGongGong = enhancedGongs[mingGongIdx];
  const mingGongInfo = {
    ganZhi: pillarToGanZhi(mingGongPillar),
    gan: mingGongPillar.gan,
    zhi: mingGongPillar.zhi,
    gongIndex: mingGongIdx + 1,
    gongName: GONG_NAMES[mingGongIdx],
    star: mingGongGong.star,
    men: mingGongGong.men,
    shen: mingGongGong.shen,
    ganShiShen: mingGongPillar.ganShiShen,
    zhiShiShen: mingGongPillar.zhiShiShen,
  };

  // ── 6. 身宫→九宫映射 ──
  const shenGongPillar = bz.shenGong;
  const shenGongIdx = ZHI_TO_GONG_IDX[shenGongPillar.zhi] ?? 0;
  const shenGongGong = enhancedGongs[shenGongIdx];
  const shenGongInfo = {
    ganZhi: pillarToGanZhi(shenGongPillar),
    gan: shenGongPillar.gan,
    zhi: shenGongPillar.zhi,
    gongIndex: shenGongIdx + 1,
    gongName: GONG_NAMES[shenGongIdx],
    star: shenGongGong.star,
    men: shenGongGong.men,
    shen: shenGongGong.shen,
    ganShiShen: shenGongPillar.ganShiShen,
    zhiShiShen: shenGongPillar.zhiShiShen,
  };

  // ── 7. 大运格式化 ──
  const ganZhi60Idx = (gz: string): number => {
    const g = gz[0], z = gz[1];
    for (let i = 0; i < 60; i++) {
      if (TIAN_GAN[i % 10] === g && DI_ZHI[i % 12] === z) return i;
    }
    return 0;
  };

  const daYun = bz.qiYun.daYun.map(step => ({
    name: `${step.startAge}-${step.endAge}岁`,
    startAge: step.startAge,
    endAge: step.endAge,
    juNumber: (ganZhi60Idx(step.ganZhi) % 9) + 1,
  }));

  const daYunSteps = bz.qiYun.daYun.map(step => ({
    name: `${step.startAge}-${step.endAge}岁`,
    ganZhi: step.ganZhi,
    startAge: step.startAge,
    endAge: step.endAge,
    startYear: step.startYear,
    endYear: step.endYear,
    ganShiShen: step.ganShiShen,
    zhiShiShen: step.zhiShiShen,
    liuNian: (step.liuNian ?? []).map(ln => ({
      year: ln.year,
      ganZhi: ln.ganZhi,
      age: ln.age,
    })),
  }));

  // ── 8. 当前流年分析 ──
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentAge = currentYear - year;
  const nianZhu = calcNianZhu(currentYear);
  const liuNianGanZhi = nianZhu.gan + nianZhu.zhi;
  const liuNianGongIdx = ZHI_TO_GONG_IDX[nianZhu.zhi] ?? 0;

  let currentDaYun = bz.qiYun.daYun[0];
  for (const dyn of bz.qiYun.daYun) {
    if (currentAge >= dyn.startAge && currentAge <= dyn.endAge) {
      currentDaYun = dyn;
      break;
    }
  }

  // ── 9. 格局分析 ──
  const geJuList: { name: string; active: boolean; desc: string; jiXiong: string }[] = [];

  if (bz.geJu) {
    geJuList.push({
      name: bz.geJu.name,
      active: true,
      desc: bz.geJu.desc,
      jiXiong: "平",
    });
  }

  for (const gong of enhancedGongs) {
    for (const rule of STAR_MEN_SHEN_GEJU) {
      if (gong.star === rule.star && gong.men === rule.men && gong.shen === rule.shen) {
        geJuList.push({
          name: `${rule.name}（落${gong.name}宫）`,
          active: true,
          desc: rule.desc,
          jiXiong: rule.jiXiong,
        });
      }
    }
  }

  geJuList.push({
    name: `${mingGongInfo.gongName}宫命`,
    active: true,
    desc: `命主命宫落${mingGongInfo.gongName}宫（${mingGongInfo.star}+${mingGongInfo.men}+${mingGongInfo.shen}），${mingGongInfo.ganZhi}。此宫为命主先天根基所在。`,
    jiXiong: ["坎","离","震","巽"].includes(mingGongInfo.gongName) ? "吉" : "平",
  });

  // ── 10. 断语生成 ──
  const baziSummary = extractBaziSummary(bz);
  const xiongGongs = enhancedGongs.filter(g =>
    g.isRuMu || g.isJiXing || g.isMenPo
  );

  const duanYu = [
    `命主${gender}，生于${year}年${month}月${day}日${hour}时（公历）。`,
    `八字：${baziSummary.nian} ${baziSummary.yue} ${baziSummary.ri} ${baziSummary.shi}，生肖${baziSummary.shengXiao}。`,
    `命盘：阴遁${birthPlate.juNumber}局，值符${birthPlate.zhiFu}，值使${birthPlate.zhiShiMen}。`,
    `命宫落${mingGongInfo.gongName}宫（${mingGongInfo.ganZhi}，${mingGongInfo.star}+${mingGongInfo.men}+${mingGongInfo.shen}），身宫落${shenGongInfo.gongName}宫（${shenGongInfo.ganZhi}，${shenGongGong.star}+${shenGongGong.men}+${shenGongGong.shen}）。`,
    bz.geJu ? `八字格局：${bz.geJu.name}${bz.geJu.yongShen ? `，用神${bz.geJu.yongShen}` : ""}${bz.geJu.xiShen ? `，喜${bz.geJu.xiShen}` : ""}${bz.geJu.jiShen ? `，忌${bz.geJu.jiShen}` : ""}。` : "",
    `起运：${bz.qiYun.startAge}岁（${bz.qiYun.startYear}年），共${bz.qiYun.daYun.length}步大运。当前${currentAge}岁，行${currentDaYun.ganZhi}大运（${currentDaYun.startAge}-${currentDaYun.endAge}岁）。`,
    `流年${currentYear}年（${liuNianGanZhi}），落${GONG_NAMES[liuNianGongIdx]}宫。`,
    xiongGongs.length > 0
      ? `注意宫位：${xiongGongs.map(g => `${g.name}宫（${g.isRuMu ? "入墓" : ""}${g.isJiXing ? "击刑" : ""}${g.isMenPo ? "门破" : ""}）`).join("、")}。`
      : "命盘九宫整体平和，无重大冲克。",
  ].filter(Boolean).join("");

  return {
    input: { birthTime, birthplace, gender, trueSolar, ziShiMode, daylightSaving },
    basicInfo: {
      juShu: birthPlate.juNumber,
      dunType: "阴遁",
      riGanZhi: baziSummary.ri,
      shiGanZhi: baziSummary.shi,
      gender,
      birthplace,
    },
    gongs: enhancedGongs,
    mingLi: {
      birthTime,
      gender,
      daYun,
      baziSwitch: { available: true, baziRecordId: undefined },
      bazi: baziSummary,
      mingGong: mingGongInfo,
      shenGong: shenGongInfo,
      qiYunInfo: {
        startAge: bz.qiYun.startAge,
        startYear: bz.qiYun.startYear,
        desc: bz.qiYun.desc,
      },
      liuNian: {
        year: currentYear,
        ganZhi: liuNianGanZhi,
        age: currentAge,
        luoGongIndex: liuNianGongIdx + 1,
        luoGongName: GONG_NAMES[liuNianGongIdx],
        daYunGanZhi: currentDaYun.ganZhi,
        daYunStartAge: currentDaYun.startAge,
        daYunEndAge: currentDaYun.endAge,
      },
      daYunSteps,
    },
    geJu: geJuList,
    duanYu,
  };
}
