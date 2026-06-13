// ── 小六壬计算引擎 ──
// 掌诀推算（道家/江氏/江氏二代三法）
// 算法参考：《小六壬掌诀》《玉匣记》《道藏·小六壬法》
// 江氏法参考：《江氏小六壬秘传》《江氏掌诀真传》
// 出处：《玉匣记》云：「掌诀之法，天地之机。六壬轮转，吉凶可推。」

import type { XiaoLiuRenResult, ZhangJuePosition, TuiSuanStep } from "@guoxue/shared";
import { Solar } from "lunar-javascript";

// 掌诀古典出处
const ZHANG_JUE_CLASSICAL_REF: Record<string, string> = {
  "大安": "《玉匣记·小六壬》：「大安者，属木青龙，主贵人、婚姻、求财。」",
  "留连": "《玉匣记·小六壬》：「留连者，属水玄武，主口舌、盗贼、暗昧。」",
  "速喜": "《玉匣记·小六壬》：「速喜者，属火朱雀，主喜事、文书、信息。」",
  "赤口": "《玉匣记·小六壬》：「赤口者，属金白虎，主官非、口舌、血光。」",
  "小吉": "《玉匣记·小六壬》：「小吉者，属木六合，主婚姻、交易、出行。」",
  "空亡": "《玉匣记·小六壬》：「空亡者，属土勾陈，主落空、失财、人亡。」",
};

// 掌诀互参：两两组合的细化断语
const ZHANG_JUE_COMBO: Record<string, Record<string, string>> = {
  "大安": {
    "大安": "双安重叠，事事皆吉。静待佳音，不必多虑。",
    "留连": "先吉后滞。好事多磨，须耐心等待，不可急躁。",
    "速喜": "吉上加喜。所求之事将快速实现，喜讯连至。",
    "赤口": "吉中藏凶。看似顺利实则暗藏口舌，谨言慎行。",
    "小吉": "双吉临门。诸事顺遂，尤其利出行和求财。",
    "空亡": "先吉后空。开始顺利但结果落空，宜降低期望。",
  },
  "留连": {
    "大安": "先难后易。初时阻滞，但终得化解，坚持可成。",
    "留连": "滞留难进。事务缠身难以脱身，宜静不宜动。",
    "速喜": "滞中见喜。困境中有转机出现，留心把握。",
    "赤口": "滞中起争。阻滞加口舌，内外交困，谨慎应对。",
    "小吉": "滞后得解。拖延之事终得解决，渐入佳境。",
    "空亡": "滞而落空。白白耗费心力，宜及时止损转向。",
  },
  "速喜": {
    "大安": "喜事安稳。快速成功且结果稳固，可喜可贺。",
    "留连": "喜后生滞。好事来得快但后续进展缓慢。",
    "速喜": "双喜临门。喜讯连连，诸事顺遂，宜扩大战果。",
    "赤口": "喜中藏争。喜事之中隐藏口舌，防范乐极生悲。",
    "小吉": "喜上加吉。万事如意，尤其利婚姻和合作。",
    "空亡": "喜后成空。一时欢喜终究落空，勿被表象迷惑。",
  },
  "赤口": {
    "大安": "凶中见吉。口舌是非最终能化解，有贵人相助。",
    "留连": "争而难解。口舌久拖不决，宜主动化解勿拖延。",
    "速喜": "争后见喜。纠纷过后有好消息，耐心度过难关。",
    "赤口": "口舌重重。是非不断官非将至，务必谨言慎行。",
    "小吉": "凶中有救。虽然口舌但最终有小利可得。",
    "空亡": "凶上加空。口舌之灾加事业落空，宜全面收缩。",
  },
  "小吉": {
    "大安": "双吉安泰。安稳吉祥，宜守成不宜冒险。",
    "留连": "吉中有滞。总体吉利但小有拖延，耐心即可。",
    "速喜": "吉喜交加。好运连连，所谋必成，势如破竹。",
    "赤口": "吉中含凶。整体吉利但防小人口舌，保持低调。",
    "小吉": "双吉汇聚。大利合作、婚嫁、出行，百事可行。",
    "空亡": "吉后渐空。好运渐退，及时收手保住成果。",
  },
  "空亡": {
    "大安": "空后见安。落空之后局势稳定，重新开始。",
    "留连": "空亡加滞。事事不顺且进展迟缓，宜全面暂停。",
    "速喜": "否极泰来。空亡之后喜事临门，绝处逢生。",
    "赤口": "空中起争。事业落空且口舌不断，慎之又慎。",
    "小吉": "空中见吉。落空之中有小收获，聊胜于无。",
    "空亡": "万事成空。诸事不宜，宜静待时机重新规划。",
  },
};

const ZHANG_JUE: { name: string; handPos: string; wuXing: string; direction: string; jiXiong: string; numbers: string; duanYu: string; color: string; xiangYi: { main:string; xunRen:string; shiWu:string; chuXing:string; hunYin:string; qiuCai:string; jianKang:string } }[] = [
  { name:"大安", handPos:"食指根部", wuXing:"木", direction:"正东", jiXiong:"大吉", numbers:"1/5/7", color:"青色",
    duanYu:"大安事事昌，求财在坤方。失物去不远，宅舍保安康。",
    xiangYi:{ main:"诸事安稳，光明正大", xunRen:"人在家中未动", shiWu:"物品在原地附近", chuXing:"出行平安顺利", hunYin:"婚姻和谐美满", qiuCai:"财运平稳有进", jianKang:"身体健康无恙" } },
  { name:"留连", handPos:"食指指尖", wuXing:"水", direction:"正南", jiXiong:"凶", numbers:"2/8/10", color:"黑色",
    duanYu:"留连事难成，求谋日不明。官事宜迟缓，去者未回程。",
    xiangYi:{ main:"事有阻碍，迟滞未明", xunRen:"人在途中未归", shiWu:"物品被移动难寻", chuXing:"出行不宜远行", hunYin:"婚事多阻碍", qiuCai:"财运低迷", jianKang:"需防小病" } },
  { name:"速喜", handPos:"中指指尖", wuXing:"火", direction:"正南", jiXiong:"中吉", numbers:"3/6/9", color:"红色",
    duanYu:"速喜喜来临，求财向南行。失物申未午，逢人路上寻。",
    xiangYi:{ main:"好事临近，喜讯将至", xunRen:"人在路途中", shiWu:"物品可找回", chuXing:"出行见喜事", hunYin:"婚事易成", qiuCai:"财运来得快", jianKang:"身体康复快" } },
  { name:"赤口", handPos:"无名指指尖", wuXing:"金", direction:"正西", jiXiong:"大凶", numbers:"4/7/10", color:"白色",
    duanYu:"赤口主口舌，官非切要防。失物急去寻，行人有惊慌。",
    xiangYi:{ main:"口舌是非，官非小灾", xunRen:"人受阻碍难归", shiWu:"物品已失难回", chuXing:"出行有口舌", hunYin:"争吵不和", qiuCai:"破财失财", jianKang:"需防急病" } },
  { name:"小吉", handPos:"无名指根部", wuXing:"木", direction:"东北", jiXiong:"大吉", numbers:"1/5/7", color:"绿色",
    duanYu:"小吉最吉昌，路上好商量。失物可寻获，行人立便至。",
    xiangYi:{ main:"万事吉利，顺心如意", xunRen:"人将归", shiWu:"失物可寻回", chuXing:"出行大吉", hunYin:"婚姻美满", qiuCai:"求财有得", jianKang:"身体健康" } },
  { name:"空亡", handPos:"中指根部", wuXing:"土", direction:"西南", jiXiong:"大凶", numbers:"3/6/9", color:"黄色",
    duanYu:"空亡事不长，阴人多乖张。求财无利益，行人有灾殃。",
    xiangYi:{ main:"万事落空，徒劳无功", xunRen:"人走失难寻", shiWu:"物品丢失不见", chuXing:"出行不顺", hunYin:"婚事难成", qiuCai:"钱财落空", jianKang:"病情加重" } },
];

// 六亲定位（仅江氏法使用）
const LIU_QIN_BY_INDEX: Record<number, { qinName: string; analysis: string }> = {
  0: { qinName:"自身", analysis:"代表问事者本人的状况与处境。" },
  1: { qinName:"兄弟", analysis:"代表兄弟姐妹、朋友同事、竞争伙伴。" },
  2: { qinName:"妻财", analysis:"代表妻子/丈夫、财运、物质利益。" },
  3: { qinName:"官鬼", analysis:"代表丈夫/官方、事业升迁、诉讼灾祸。" },
  4: { qinName:"父母", analysis:"代表父母长辈、文书学业、庇佑之力。" },
  5: { qinName:"子孙", analysis:"代表子女晚辈、下属、快乐享受、解忧之神。" },
};

// 五行旺衰月令：寅月起木旺，依次...
const MONTH_WX_WANG: Record<number, string> = {
  1:"木", 2:"木", 3:"土", 4:"火", 5:"火", 6:"土",
  7:"金", 8:"金", 9:"土", 10:"水", 11:"水", 12:"土",
};

// 五行生克关系
const WX_SHENG: Record<string, string> = { "木":"火","火":"土","土":"金","金":"水","水":"木" };
const WX_KE: Record<string, string> = { "木":"土","土":"水","水":"火","火":"金","金":"木" };

function monthNum(lunarMonth: number): number { return lunarMonth; }
function dayNum(lunarDay: number): number { return lunarDay; }
function hourNum(shiChenIdx: number): number { return shiChenIdx + 1; }

function tuiSuan(startIdx: number, count: number): number {
  return (startIdx + count - 1) % 6;
}

function tuiSuanNi(startIdx: number, count: number): number {
  return (startIdx - (count - 1) + 6 * 10) % 6;
}

function getShiChen(hour: number): { name: string; idx: number } {
  const shiChenNames = ["子时","丑时","寅时","卯时","辰时","巳时","午时","未时","申时","酉时","戌时","亥时"];
  const idx = Math.floor(hour / 2) % 12;
  return { name: shiChenNames[idx], idx };
}

// 掌诀五行深度分析
function getWuXingAnalysis(finalName: string, monthWx: string): string {
  const info = ZHANG_JUE.find(z => z.name === finalName);
  if (!info) return "";
  const jw = info.wuXing;
  const parts: string[] = [];

  // 月令旺衰
  if (MONTH_WX_WANG[1] === jw) parts.push(`${finalName}(${jw})得月令${monthWx}之助，力量加倍`);
  else if (WX_SHENG[monthWx] === jw) parts.push(`月令${monthWx}生${jw}，${finalName}处相地，力增`);
  else if (monthWx === jw) parts.push(`${finalName}(${jw})与月令同气，力稳`);
  else if (WX_KE[monthWx] === jw) parts.push(`月令${monthWx}克${jw}，${finalName}力减，宜谨慎`);
  else if (WX_SHENG[jw] === monthWx) parts.push(`${finalName}(${jw})生月令${monthWx}，泄气，力稍减`);

  return parts.join("；");
}

export function calculateXiaoLiuRen(input: Record<string, unknown>): XiaoLiuRenResult {
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const method = (input.method as string) ?? "time";
  const reportNumber = input.reportNumber as number | undefined;
  const type = (input.type as string) ?? "daojia";
  const selfNumber = input.selfNumber as number | undefined;
  const birthYear = input.birthYear as number | undefined;

  const d = new Date(datetime);
  const shiChen = getShiChen(d.getHours());

  const solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const lunar = solar.getLunar();
  const lMonth = lunar.getMonth();
  const lDay = lunar.getDay();

  const yNum = monthNum(lMonth);
  const mNum = dayNum(lDay);
  const hNum = method === "baoshu" && reportNumber ? reportNumber : hourNum(shiChen.idx);

  let selfNum = selfNumber ?? 0;
  if ((type === "jiangshi" || type === "jiangshi2") && !selfNumber) {
    if (birthYear) {
      selfNum = d.getFullYear() - birthYear + 1;
    } else {
      selfNum = (lMonth + lDay) % 6 + 1;
    }
  }

  const steps: TuiSuanStep[] = [];

  const pos1 = tuiSuan(0, yNum);
  steps.push({ step:1, label:"月上起日", from:ZHANG_JUE[0].name as any, count:yNum, to:ZHANG_JUE[pos1].name as any, desc:`从大安起正月，顺数至${lMonth}月，落${ZHANG_JUE[pos1].name}。` });

  let pos2: number;
  if (type === "jiangshi2") {
    pos2 = tuiSuanNi(pos1, mNum);
    steps.push({ step:2, label:"日上起时（逆数）", from:ZHANG_JUE[pos1].name as any, count:mNum, to:ZHANG_JUE[pos2].name as any, desc:`从${ZHANG_JUE[pos1].name}起初一，逆数至${lDay}日，落${ZHANG_JUE[pos2].name}。（江氏二代逆数法）` });
  } else {
    pos2 = tuiSuan(pos1, mNum);
    steps.push({ step:2, label:"日上起时", from:ZHANG_JUE[pos1].name as any, count:mNum, to:ZHANG_JUE[pos2].name as any, desc:`从${ZHANG_JUE[pos1].name}起初一，顺数至${lDay}日，落${ZHANG_JUE[pos2].name}。` });
  }

  const pos3 = tuiSuan(pos2, hNum);
  steps.push({ step:3, label:"时上查掌诀", from:ZHANG_JUE[pos2].name as any, count:hNum, to:ZHANG_JUE[pos3].name as any, desc:`从${ZHANG_JUE[pos2].name}起子时，顺数至${shiChen.name}，落${ZHANG_JUE[pos3].name}。` });

  let posSelf = pos3;
  if (type === "jiangshi" || type === "jiangshi2") {
    posSelf = tuiSuan(pos3, selfNum);
    steps.push({ step:4, label:"自身定位", from:ZHANG_JUE[pos3].name as any, count:selfNum, to:ZHANG_JUE[posSelf].name as any, desc:`从${ZHANG_JUE[pos3].name}起自身1，顺数至${selfNum}，自身落${ZHANG_JUE[posSelf].name}。` });
  }

  const finalPos = (type === "jiangshi" || type === "jiangshi2") ? posSelf : pos3;
  const finalPosition: ZhangJuePosition = {
    index: finalPos + 1,
    name: ZHANG_JUE[finalPos].name as any,
    handPosition: ZHANG_JUE[finalPos].handPos,
    wuXing: ZHANG_JUE[finalPos].wuXing as any,
    direction: ZHANG_JUE[finalPos].direction,
    jiXiong: ZHANG_JUE[finalPos].jiXiong as any,
    numbers: ZHANG_JUE[finalPos].numbers,
    duanYu: ZHANG_JUE[finalPos].duanYu,
    xiangYi: ZHANG_JUE[finalPos].xiangYi,
    color: ZHANG_JUE[finalPos].color,
  };

  const info = ZHANG_JUE[finalPos];
  const typeLabel = type === "daojia" ? "道家" : type === "jiangshi" ? "江氏" : "江氏二代";
  const monthWx = MONTH_WX_WANG[lMonth] || "木";

  // 掌诀互参：日上落位与时上落位的组合分析
  const riShang = ZHANG_JUE[pos2].name;
  const shiShang = ZHANG_JUE[pos3].name;
  const comboAnalysis = ZHANG_JUE_COMBO[riShang]?.[shiShang] || "三步骤合参，各安其位。";

  // 六亲定位分析
  let liuQinAnalysis = "";
  if (type === "jiangshi" || type === "jiangshi2") {
    const liuQinParts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const offsetIdx = (finalPos + i) % 6;
      const qinInfo = LIU_QIN_BY_INDEX[i];
      if (qinInfo && offsetIdx !== finalPos) {
        liuQinParts.push(`${qinInfo.qinName}落${ZHANG_JUE[offsetIdx].name}（${ZHANG_JUE[offsetIdx].jiXiong}）`);
      }
    }
    liuQinAnalysis = `\n│ 六亲：${liuQinParts.join("；")}。`;
  }

  // 五行深度分析
  const wxAnalysis = getWuXingAnalysis(info.name, monthWx);
  const classicalRef = ZHANG_JUE_CLASSICAL_REF[info.name] || "";

  // 结构化断语
  const jxLabel = info.jiXiong === "大吉" ? "★★★" : info.jiXiong === "中吉" ? "★★" : info.jiXiong === "凶" ? "⚠" : "☠";
  const duanYu = [
    `┌─ ${typeLabel}小六壬占卜 ─────────────────`,
    `│ 掌诀：${info.name} ${jxLabel}（${info.wuXing}·${info.direction}·${info.color}）`,
    `│ 断语：${info.duanYu}`,
    `│ 主事：${info.xiangYi.main}。寻人：${info.xiangYi.xunRen}。失物：${info.xiangYi.shiWu}。`,
    `│ 出行：${info.xiangYi.chuXing}。婚姻：${info.xiangYi.hunYin}。求财：${info.xiangYi.qiuCai}。健康：${info.xiangYi.jianKang}。`,
    ``,
    `├─ 推算过程 ─────────────────`,
    `│ 月上起日：大安→${lMonth}月→${ZHANG_JUE[pos1].name}（日上起时起点）`,
    `│ 日上起时：${ZHANG_JUE[pos1].name}→${lDay}日→${ZHANG_JUE[pos2].name}`,
    `│ 时上查掌：${ZHANG_JUE[pos2].name}→${shiChen.name}→${ZHANG_JUE[pos3].name}`,
    type === "jiangshi" || type === "jiangshi2" ? `│ 自身定位：${ZHANG_JUE[pos3].name}→${selfNum}→${ZHANG_JUE[posSelf].name}` : "",
    ``,
    `├─ 掌诀互参 ─────────────────`,
    `│ 日${riShang} + 时${shiShang}：${comboAnalysis}`,
    ``,
    `├─ 五行分析 ─────────────────`,
    `│ ${wxAnalysis || "五行中和，各安其位。"}`,
    ``,
    `├─ 六亲定位 ─────────────────${liuQinAnalysis || "\n│ （道家用月日时三步骤，不设六亲定位）"}`,
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ ${classicalRef}`,
    ``,
    `└─ 综合判断 ─────────────────`,
    `   ${info.jiXiong === "大吉" ? "天时地利人和，所求之事可成，宜主动出击。" :
        info.jiXiong === "中吉" ? "吉多凶少，所求之事有望。把握时机，顺势而为。" :
        info.jiXiong === "凶" ? "事有不顺，宜静不宜动。耐心等待，不可强求。" :
        "诸事不宜，宜退守静待。可另择时日再问，天无绝人之路。"}`,
  ].filter(Boolean).join("\n");

  const baseTips = info.jiXiong === "大吉" || info.jiXiong === "中吉"
    ? ["所求之事有望成功", "宜主动出击", "时机较为有利"]
    : ["宜静不宜动", "需耐心等待时机", "可另择吉日再问"];

  const typeTips = type === "jiangshi2"
    ? ["江氏二代顺逆兼用，结果兼顾动静两面"]
    : type === "jiangshi"
    ? ["江氏法兼看自身定位，六亲关系可作细化参考"]
    : [];

  return {
    input: { datetime, type: type as any, method: method as any, reportNumber },
    lunarTime: {
      year: `${lunar.getYear()}年（${lunar.getYearShengXiao()}年）`,
      month: lMonth,
      monthName: `${lunar.getMonthInGanZhi()}月（${lMonth}月）`,
      day: lDay,
      dayGanZhi: lunar.getDayInGanZhi(),
      shiChen: shiChen.name,
      shiChenIndex: shiChen.idx,
    },
    isRunYue: lunar.getMonth() < 0,
    zhangJue: ZHANG_JUE.map((zj, i) => ({
      index: i + 1,
      name: zj.name as any, handPosition: zj.handPos,
      wuXing: zj.wuXing as any, direction: zj.direction,
      jiXiong: zj.jiXiong as any, numbers: zj.numbers,
      duanYu: zj.duanYu, xiangYi: zj.xiangYi, color: zj.color,
    })),
    steps,
    finalPosition,
    duanYu,
    tips: [...baseTips, ...typeTips],
  };
}
