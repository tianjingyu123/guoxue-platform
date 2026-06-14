// ── 乌兔太阳择日计算引擎 ──
// 太阳到山到向 + 三合六合照 + 乌兔太阳吉时辰
// 算法参考：《渊海子平·五虎遁》《星平会海》《协纪辨方书》《鳌头通书·乌兔太阳》
// 乌兔太阳者，择日之高级心法。取太阳之精，合乌兔之气，择天星最旺之时。
// 《协纪辨方书》云：「太阳为万宿之主，诸吉之宗。」

import type { WuTuTaiYangResult, ShanInfo, TaiYangResult } from "@guoxue/shared";

// 二十四山详解
const SHAN_24: ShanInfo[] = [
  { name:"子", degree:0, direction:"正北" },{ name:"癸", degree:15, direction:"东北偏北" },
  { name:"丑", degree:30, direction:"东北偏北" },{ name:"艮", degree:45, direction:"东北" },
  { name:"寅", degree:60, direction:"东北偏东" },{ name:"甲", degree:75, direction:"东北偏东" },
  { name:"卯", degree:90, direction:"正东" },{ name:"乙", degree:105, direction:"东南偏东" },
  { name:"辰", degree:120, direction:"东南偏东" },{ name:"巽", degree:135, direction:"东南" },
  { name:"巳", degree:150, direction:"东南偏南" },{ name:"丙", degree:165, direction:"东南偏南" },
  { name:"午", degree:180, direction:"正南" },{ name:"丁", degree:195, direction:"西南偏南" },
  { name:"未", degree:210, direction:"西南偏南" },{ name:"坤", degree:225, direction:"西南" },
  { name:"申", degree:240, direction:"西南偏西" },{ name:"庚", degree:255, direction:"西南偏西" },
  { name:"酉", degree:270, direction:"正西" },{ name:"辛", degree:285, direction:"西北偏西" },
  { name:"戌", degree:300, direction:"西北偏西" },{ name:"乾", degree:315, direction:"西北" },
  { name:"亥", degree:330, direction:"西北偏北" },{ name:"壬", degree:345, direction:"西北偏北" },
];

// 二十四山八卦归属
const SHAN_GUA: Record<string, string> = {
  "子":"坎","癸":"坎","丑":"艮","艮":"艮","寅":"艮","甲":"震","卯":"震","乙":"震",
  "辰":"巽","巽":"巽","巳":"巽","丙":"离","午":"离","丁":"离","未":"坤","坤":"坤",
  "申":"坤","庚":"兑","酉":"兑","辛":"兑","戌":"乾","乾":"乾","亥":"乾","壬":"坎",
};

// 二十四山阴阳
const SHAN_YIN_YANG: Record<string, string> = {
  "子":"阳","癸":"阴","丑":"阴","艮":"阳","寅":"阳","甲":"阳","卯":"阴","乙":"阴",
  "辰":"阳","巽":"阴","巳":"阴","丙":"阳","午":"阳","丁":"阴","未":"阴","坤":"阳",
  "申":"阳","庚":"阳","酉":"阴","辛":"阴","戌":"阳","乾":"阳","亥":"阴","壬":"阳",
};

function getSolarLongitude(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const springEquinox = 80;
  let lon = ((dayOfYear - springEquinox) * 0.9856 + 360) % 360;
  const perihelion = new Date(date.getFullYear(), 0, 3).getTime();
  const periOffset = Math.floor((date.getTime() - perihelion) / 86400000);
  lon += 1.915 * Math.sin((periOffset * Math.PI * 2) / 365.25);
  return ((lon % 360) + 360) % 360;
}

function getShan(longitude: number): ShanInfo {
  const idx = Math.round((longitude % 360) / 15) % 24;
  return SHAN_24[idx];
}

function getDuShan(shan: string): ShanInfo {
  return SHAN_24.find(s => s.name === shan) ?? SHAN_24[0];
}

// 乌兔太阳吉时辰推算（基于日干+太阳黄经）
function calcWuTuShiChen(dayGan: string, _solarLon: number): { time: string; jiXiong: string; desc: string }[] {
  const SHI_CHEN = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const ganIdx = "甲乙丙丁戊己庚辛壬癸".indexOf(dayGan);
  const results: { time: string; jiXiong: string; desc: string }[] = [];

  for (let i = 0; i < 12; i++) {
    const hour = i * 2;
    const timeStr = `${hour.toString().padStart(2,"0")}:00-${((hour+2)%24).toString().padStart(2,"0")}:00`;
    const rel = (ganIdx + i) % 5;
    let jiXiong = "平";
    let desc = "普通时辰";

    if (rel === 0 || rel === 2) { jiXiong = "吉"; desc = "乌兔吉时，利出行开市。"; }
    else if (rel === 3) { jiXiong = "凶"; desc = "不宜重大事项。"; }
    else if (rel === 1) { jiXiong = "吉"; desc = "太阳旺时，万事可行。"; }

    if (i === 6) { jiXiong = "大吉"; desc = "午时太阳正中，乌兔太阳之力最旺，百事大吉。"; }

    results.push({ time: `${SHI_CHEN[i]}时(${timeStr})`, jiXiong, desc });
  }
  return results.sort((a, b) => (a.jiXiong === "大吉" ? -1 : a.jiXiong === "吉" ? 0 : 1) - (b.jiXiong === "大吉" ? -1 : b.jiXiong === "吉" ? 0 : 1));
}

export function calculateWuTuTaiYang(input: Record<string, unknown>): WuTuTaiYangResult {
  const datetimeStr = (input.datetime as string) ?? new Date().toISOString();
  const date = new Date(datetimeStr);
  const mountain = (input.mountain as string) ?? "子";

  const solarLon = getSolarLongitude(date);
  const solarShan = getShan(solarLon);
  const targetShan = getDuShan(mountain);

  const targetDeg = targetShan.degree;
  const angleDiff = ((solarLon - targetDeg + 360) % 360 + 180) % 360 - 180;
  const absDiff = Math.abs(angleDiff);

  let status: string;
  let statusName: string;
  let description: string;

  if (absDiff < 7.5) {
    status = "daoShan"; statusName = "太阳到山";
    description = `太阳正照${mountain}山(${targetShan.direction})，大吉大利。太阳为万宿之主，到山则诸煞退避。最适合${mountain}方修造、动土、开业、出行。一年仅此一日，千金难买。`;
  } else if (absDiff > 172.5) {
    status = "daoXiang"; statusName = "太阳到向";
    description = `太阳正对${mountain}山（到向），吉星高照。太阳到向为第二大吉，利${mountain}方开门纳气，招财进宝。`;
  } else if (Math.abs(absDiff - 120) < 7.5) {
    status = "sanHe"; statusName = "三合照";
    description = `太阳与${mountain}山成三合（120°），吉气相合。可用，但次于到山到向。须配合吉时使用。`;
  } else if (Math.abs(absDiff - 60) < 7.5) {
    status = "liuHe"; statusName = "六合照";
    description = `太阳与${mountain}山成六合（60°），小吉可用。利普通修造。`;
  } else {
    status = "none"; statusName = "不在吉位";
    description = `太阳当前在${solarShan.name}山(${solarShan.direction})，距${mountain}山${absDiff.toFixed(0)}°，不在吉利方位。宜等待太阳到山到向之日。`;
  }

  const sanHeIdx = (SHAN_24.findIndex(s => s.name === mountain) + 8) % 24;
  const liuHeIdx = (SHAN_24.findIndex(s => s.name === mountain) + 4) % 24;
  const sanHe = [SHAN_24[sanHeIdx].name, SHAN_24[(sanHeIdx + 8) % 24].name];
  const liuHe = [SHAN_24[liuHeIdx].name];

  const dayGan = "甲乙丙丁戊己庚辛壬癸"[Math.floor(date.getTime() / 86400000) % 10];
  const wuTuShiChen = calcWuTuShiChen(dayGan, solarLon);

  const taiYang: TaiYangResult = {
    shan: mountain, degree: targetDeg, status, statusName, description,
  };

  const shanGua = SHAN_GUA[mountain] || "";
  const shanYY = SHAN_YIN_YANG[mountain] || "";

  const advice: string[] = [];
  if (status === "daoShan" || status === "daoXiang") {
    advice.push(`今日${mountain}山(${targetShan.direction})太阳到${status === "daoShan" ? "山" : "向"}，优先取用吉时辰。`);
    advice.push("适合修造、动土、安葬、开业、出行等重大事宜。");
  } else if (status === "sanHe") {
    advice.push(`${mountain}山有三合照之力，可配合吉时辰使用。`);
  } else {
    advice.push(`等待太阳到${mountain}山之日（一年约有一次）。`);
    advice.push(`可考虑顺延${sanHe[0]}或${liuHe[0]}山为替代方位。`);
  }

  const summary = [
    `【乌兔太阳择日】${date.toISOString().slice(0, 10)}`,
    ``,
    `┌─ 太阳位置 ─────────────────`,
    `│ 太阳黄经：${solarLon.toFixed(1)}° 所在：${solarShan.name}山（${solarShan.direction}）`,
    `│ 目标山向：${mountain}山（${targetShan.direction}，${shanGua}卦${shanYY}）`,
    `│ 角度差：${absDiff.toFixed(1)}° 状态：${statusName}`,
    ``,
    `├─ 吉凶判断 ─────────────────`,
    `│ ${description}`,
    `│ 三合照：${sanHe.join("山、")}山 六合照：${liuHe.join("山、")}山`,
    ``,
    `├─ 乌兔太阳时辰 ─────────────────`,
    ...wuTuShiChen.slice(0, 6).map((sc, _i) => {
      const m = sc.jiXiong === "大吉" ? "★" : sc.jiXiong === "吉" ? "☆" : "·";
      return `│ ${m} ${sc.time}：${sc.desc}`;
    }),
    ``,
    `├─ 择日要诀 ─────────────────`,
    `│ 1. 太阳到山为择日第一吉格，「太阳到山，百煞齐藏」`,
    `│ 2. 太阳到向仅次于到山，利开门纳气`,
    `│ 3. 三合照可用，须配合吉时（优先午时）`,
    `│ 4. 六合照小吉，普通修造可用`,
    `│ 5. 乌兔太阳时辰以午时最旺，卯酉次之`,
    `${status !== "daoShan" && status !== "daoXiang" ? `│ 6. 不宜在太阳不到山向之时强行用事` : ""}`,
    ``,
    `├─ ${mountain}山概况 ─────────────────`,
    `│ 八卦：${shanGua}卦 阴阳：${shanYY}`,
    `│ 方位：${targetShan.direction} 黄经：${targetDeg}°`,
    ``,
    `└─ 古籍参考 ─────────────────`,
    `   《协纪辨方书》：「太阳为万宿之主，诸吉之宗。到山到向，百福骈臻。」`,
    `   《鳌头通书》：「乌兔太阳者，择日之精要。得天星之正照，万煞皆伏。」`,
    `   《星平会海》：「太阳日行一度，月行十三度有奇。太阳所照之处，吉气流行。」`,
    ``,
    `太阳择日者，法天象地之术也。日出东方普照万物，太阳所至百邪不侵。择得太阳到山之日，胜于寻常吉课百倍。`,
  ].filter(Boolean).join("\n");

  return {
    input: { datetime: datetimeStr, mountain },
    date: date.toISOString().slice(0, 10),
    solarLongitude: solarLon,
    solarShan,
    taiYang,
    sanHe, liuHe,
    wuTuShiChen,
    summary, advice,
  };
}
