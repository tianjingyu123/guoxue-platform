// ── 大衍筮法计算引擎 ──
// 算法参考：《周易》《灵棋经》《焦氏易林》
// 周易·系辞传：大衍之数五十，其用四十有九。分而为二以象两，挂一以象三，揲之以四以象四时，归奇于扐以象闰。

import type { DaYanResult, YaoChange } from "@guoxue/shared";
import crypto from "crypto";

// ══ 六十四卦 ══
const GUA64: Record<number, { name: string; symbol: string; yaoNames: string[]; tuanCi: string; daXiang: string }> = {
  1: {name:"乾为天",symbol:"䷀",yaoNames:["初九","九二","九三","九四","九五","上九"],tuanCi:"大哉乾元，万物资始，乃统天。",daXiang:"天行健，君子以自强不息。"},
  2: {name:"坤为地",symbol:"䷁",yaoNames:["初六","六二","六三","六四","六五","上六"],tuanCi:"至哉坤元，万物资生，乃顺承天。",daXiang:"地势坤，君子以厚德载物。"},
  3: {name:"水雷屯",symbol:"䷂",yaoNames:["初九","六二","六三","六四","九五","上六"],tuanCi:"屯，刚柔始交而难生。",daXiang:"云雷屯，君子以经纶。"},
  4: {name:"山水蒙",symbol:"䷃",yaoNames:["初六","九二","六三","六四","六五","上九"],tuanCi:"蒙，山下有险，险而止蒙。",daXiang:"山下出泉蒙，君子以果行育德。"},
  5: {name:"水天需",symbol:"䷄",yaoNames:["初九","九二","九三","六四","九五","上六"],tuanCi:"需，须也，险在前也。",daXiang:"云上于天需，君子以饮食宴乐。"},
  6: {name:"天水讼",symbol:"䷅",yaoNames:["初六","九二","六三","九四","九五","上九"],tuanCi:"讼，上刚下险，险而健讼。",daXiang:"天与水违行讼，君子以作事谋始。"},
  7: {name:"地水师",symbol:"䷆",yaoNames:["初六","九二","六三","六四","六五","上六"],tuanCi:"师，众也，贞正也。",daXiang:"地中有水师，君子以容民畜众。"},
  8: {name:"水地比",symbol:"䷇",yaoNames:["初六","六二","六三","六四","九五","上六"],tuanCi:"比，吉也，比辅也。",daXiang:"地上有水比，先王以建万国亲诸侯。"},
  9: {name:"风天小畜",symbol:"䷈",yaoNames:["初九","九二","九三","六四","九五","上九"],tuanCi:"小畜，柔得位而上下应之。",daXiang:"风行天上小畜，君子以懿文德。"},
  10: {name:"天泽履",symbol:"䷉",yaoNames:["初九","九二","六三","九四","九五","上九"],tuanCi:"履，柔履刚也。",daXiang:"上天下泽履，君子以辨上下定民志。"},
  11: {name:"地天泰",symbol:"䷊",yaoNames:["初九","九二","九三","六四","六五","上六"],tuanCi:"泰，小往大来，吉亨。",daXiang:"天地交泰，后以财成天地之道。"},
  12: {name:"天地否",symbol:"䷋",yaoNames:["初六","六二","六三","九四","九五","上九"],tuanCi:"否之匪人，不利君子贞。",daXiang:"天地不交否，君子以俭德辟难。"},
  13: {name:"天火同人",symbol:"䷌",yaoNames:["初九","六二","九三","九四","九五","上九"],tuanCi:"同人，柔得位得中而应乎乾。",daXiang:"天与火同人，君子以类族辨物。"},
  14: {name:"火天大有",symbol:"䷍",yaoNames:["初九","九二","九三","九四","六五","上九"],tuanCi:"大有，柔得尊位，大中而上下应之。",daXiang:"火在天上大有，君子以遏恶扬善。"},
  15: {name:"地山谦",symbol:"䷎",yaoNames:["初六","六二","九三","六四","六五","上六"],tuanCi:"谦亨，天道下济而光明。",daXiang:"地中有山谦，君子以裒多益寡。"},
  16: {name:"雷地豫",symbol:"䷏",yaoNames:["初六","六二","六三","九四","六五","上六"],tuanCi:"豫，刚应而志行，顺以动。",daXiang:"雷出地奋豫，先王以作乐崇德。"},
  17: {name:"泽雷随",symbol:"䷐",yaoNames:["初九","六二","六三","九四","九五","上六"],tuanCi:"随，刚来而下柔，动而说。",daXiang:"泽中有雷随，君子以向晦入宴息。"},
  18: {name:"山风蛊",symbol:"䷑",yaoNames:["初六","九二","九三","六四","六五","上九"],tuanCi:"蛊，刚上而柔下，巽而止。",daXiang:"山下有风蛊，君子以振民育德。"},
  19: {name:"地泽临",symbol:"䷒",yaoNames:["初九","九二","六三","六四","六五","上六"],tuanCi:"临，刚浸而长，说而顺。",daXiang:"泽上有地临，君子以教思无穷。"},
  20: {name:"风地观",symbol:"䷓",yaoNames:["初六","六二","六三","六四","九五","上九"],tuanCi:"观，盥而不荐，有孚颙若。",daXiang:"风行地上观，先王以省方观民设教。"},
  21: {name:"火雷噬嗑",symbol:"䷔",yaoNames:["初九","六二","六三","九四","六五","上九"],tuanCi:"噬嗑亨，刚柔分动而明。",daXiang:"雷电噬嗑，先王以明罚敕法。"},
  22: {name:"山火贲",symbol:"䷕",yaoNames:["初九","六二","九三","六四","六五","上九"],tuanCi:"贲亨，柔来而文刚。",daXiang:"山下有火贲，君子以明庶政无敢折狱。"},
  23: {name:"山地剥",symbol:"䷖",yaoNames:["初六","六二","六三","六四","六五","上九"],tuanCi:"剥，剥也，柔变刚也。",daXiang:"山附于地剥，上以厚下安宅。"},
  24: {name:"地雷复",symbol:"䷗",yaoNames:["初九","六二","六三","六四","六五","上六"],tuanCi:"复亨，刚反动而以顺行。",daXiang:"雷在地中复，先王以至日闭关。"},
  25: {name:"天雷无妄",symbol:"䷘",yaoNames:["初九","六二","六三","九四","九五","上九"],tuanCi:"无妄，刚自外来而为主于内。",daXiang:"天下雷行物与无妄，先王以茂对时育万物。"},
  26: {name:"山天大畜",symbol:"䷙",yaoNames:["初九","九二","九三","六四","六五","上九"],tuanCi:"大畜，刚健笃实辉光日新。",daXiang:"天在山中大畜，君子以多识前言往行。"},
  27: {name:"山雷颐",symbol:"䷚",yaoNames:["初九","六二","六三","六四","六五","上九"],tuanCi:"颐贞吉，养正则吉也。",daXiang:"山下有雷颐，君子以慎言语节饮食。"},
  28: {name:"泽风大过",symbol:"䷛",yaoNames:["初六","九二","九三","九四","九五","上六"],tuanCi:"大过，大者过也，栋桡。",daXiang:"泽灭木大过，君子以独立不惧。"},
  29: {name:"坎为水",symbol:"䷜",yaoNames:["初六","九二","六三","六四","九五","上六"],tuanCi:"习坎，重险也，水流而不盈。",daXiang:"水洊至习坎，君子以常德行习教事。"},
  30: {name:"离为火",symbol:"䷝",yaoNames:["初九","六二","九三","九四","六五","上九"],tuanCi:"离，丽也，日月丽乎天。",daXiang:"明两作离，大人以继明照于四方。"},
  31: {name:"泽山咸",symbol:"䷞",yaoNames:["初六","六二","九三","九四","九五","上六"],tuanCi:"咸，感也，柔上而刚下。",daXiang:"山上有泽咸，君子以虚受人。"},
  32: {name:"雷风恒",symbol:"䷟",yaoNames:["初六","九二","九三","九四","六五","上六"],tuanCi:"恒，久也，刚上而柔下。",daXiang:"雷风恒，君子以立不易方。"},
  33: {name:"天山遁",symbol:"䷠",yaoNames:["初六","六二","九三","九四","九五","上九"],tuanCi:"遁亨，遁而亨也。",daXiang:"天下有山遁，君子以远小人。"},
  34: {name:"雷天大壮",symbol:"䷡",yaoNames:["初九","九二","九三","九四","六五","上六"],tuanCi:"大壮，大者壮也，刚以动。",daXiang:"雷在天上大壮，君子以非礼弗履。"},
  35: {name:"火地晋",symbol:"䷢",yaoNames:["初六","六二","六三","九四","六五","上九"],tuanCi:"晋，进也，明出地上。",daXiang:"明出地上晋，君子以自昭明德。"},
  36: {name:"地火明夷",symbol:"䷣",yaoNames:["初九","六二","九三","六四","六五","上六"],tuanCi:"明夷，利艰贞，晦其明也。",daXiang:"明入地中明夷，君子以莅众用晦而明。"},
  37: {name:"风火家人",symbol:"䷤",yaoNames:["初九","六二","九三","六四","九五","上九"],tuanCi:"家人，女正位乎内，男正位乎外。",daXiang:"风自火出家人，君子以言有物而行有恒。"},
  38: {name:"火泽睽",symbol:"䷥",yaoNames:["初九","九二","六三","九四","六五","上九"],tuanCi:"睽，火动而上，泽动而下。",daXiang:"上火下泽睽，君子以同而异。"},
  39: {name:"水山蹇",symbol:"䷦",yaoNames:["初六","六二","九三","六四","九五","上六"],tuanCi:"蹇，难也，险在前也。",daXiang:"山上有水蹇，君子以反身修德。"},
  40: {name:"雷水解",symbol:"䷧",yaoNames:["初六","九二","六三","九四","六五","上六"],tuanCi:"解，险以动，动而免乎险。",daXiang:"雷雨作解，君子以赦过宥罪。"},
  41: {name:"山泽损",symbol:"䷨",yaoNames:["初九","九二","六三","六四","六五","上九"],tuanCi:"损，损下益上，其道上行。",daXiang:"山下有泽损，君子以惩忿窒欲。"},
  42: {name:"风雷益",symbol:"䷩",yaoNames:["初九","六二","六三","六四","九五","上九"],tuanCi:"益，损上益下，民说无疆。",daXiang:"风雷益，君子以见善则迁有过则改。"},
  43: {name:"泽天夬",symbol:"䷪",yaoNames:["初九","九二","九三","九四","九五","上六"],tuanCi:"夬，决也，刚决柔也。",daXiang:"泽上于天夬，君子以施禄及下。"},
  44: {name:"天风姤",symbol:"䷫",yaoNames:["初六","九二","九三","九四","九五","上九"],tuanCi:"姤，遇也，柔遇刚也。",daXiang:"天下有风姤，后以施命诰四方。"},
  45: {name:"泽地萃",symbol:"䷬",yaoNames:["初六","六二","六三","九四","九五","上六"],tuanCi:"萃，聚也，顺以说。",daXiang:"泽上于地萃，君子以除戎器戒不虞。"},
  46: {name:"地风升",symbol:"䷭",yaoNames:["初六","九二","九三","六四","六五","上六"],tuanCi:"升，柔以时升，巽而顺。",daXiang:"地中生木升，君子以顺德积小以高大。"},
  47: {name:"泽水困",symbol:"䷮",yaoNames:["初六","九二","六三","九四","九五","上六"],tuanCi:"困，刚掩也，险以说。",daXiang:"泽无水困，君子以致命遂志。"},
  48: {name:"水风井",symbol:"䷯",yaoNames:["初六","九二","九三","六四","九五","上六"],tuanCi:"井，改邑不改井，无丧无得。",daXiang:"木上有水井，君子以劳民劝相。"},
  49: {name:"泽火革",symbol:"䷰",yaoNames:["初九","六二","九三","九四","九五","上六"],tuanCi:"革，水火相息，二女同居。",daXiang:"泽中有火革，君子以治历明时。"},
  50: {name:"火风鼎",symbol:"䷱",yaoNames:["初六","九二","九三","九四","六五","上九"],tuanCi:"鼎，象也，以木巽火亨饪也。",daXiang:"木上有火鼎，君子以正位凝命。"},
  51: {name:"震为雷",symbol:"䷲",yaoNames:["初九","六二","六三","九四","六五","上六"],tuanCi:"震亨，震来虩虩，笑言哑哑。",daXiang:"洊雷震，君子以恐惧修省。"},
  52: {name:"艮为山",symbol:"䷳",yaoNames:["初六","六二","九三","六四","六五","上九"],tuanCi:"艮，止也，时止则止，时行则行。",daXiang:"兼山艮，君子以思不出其位。"},
  53: {name:"风山渐",symbol:"䷴",yaoNames:["初六","六二","九三","六四","九五","上九"],tuanCi:"渐之进也，女归吉也。",daXiang:"山上有木渐，君子以居贤德善俗。"},
  54: {name:"雷泽归妹",symbol:"䷵",yaoNames:["初九","九二","六三","九四","六五","上六"],tuanCi:"归妹，天地之大义也。",daXiang:"泽上有雷归妹，君子以永终知敝。"},
  55: {name:"雷火丰",symbol:"䷶",yaoNames:["初九","六二","九三","九四","六五","上六"],tuanCi:"丰，大也，明以动。",daXiang:"雷电皆至丰，君子以折狱致刑。"},
  56: {name:"火山旅",symbol:"䷷",yaoNames:["初六","六二","九三","九四","六五","上九"],tuanCi:"旅，小亨，柔得中乎外而顺乎刚。",daXiang:"山上有火旅，君子以明慎用刑而不留狱。"},
  57: {name:"巽为风",symbol:"䷸",yaoNames:["初六","九二","九三","六四","九五","上九"],tuanCi:"重巽以申命，刚巽乎中正。",daXiang:"随风巽，君子以申命行事。"},
  58: {name:"兑为泽",symbol:"䷹",yaoNames:["初九","九二","六三","九四","九五","上六"],tuanCi:"兑，说也，刚中而柔外。",daXiang:"丽泽兑，君子以朋友讲习。"},
  59: {name:"风水涣",symbol:"䷺",yaoNames:["初六","九二","六三","六四","九五","上九"],tuanCi:"涣亨，刚来而不穷，柔得位乎外。",daXiang:"风行水上涣，先王以享于帝立庙。"},
  60: {name:"水泽节",symbol:"䷻",yaoNames:["初九","九二","六三","六四","九五","上六"],tuanCi:"节亨，刚柔分而刚得中。",daXiang:"泽上有水节，君子以制数度议德行。"},
  61: {name:"风泽中孚",symbol:"䷼",yaoNames:["初九","九二","六三","六四","九五","上九"],tuanCi:"中孚，柔在内而刚得中。",daXiang:"泽上有风中孚，君子以议狱缓死。"},
  62: {name:"雷山小过",symbol:"䷽",yaoNames:["初六","六二","九三","九四","六五","上六"],tuanCi:"小过，小者过而亨也。",daXiang:"山上有雷小过，君子以行过乎恭。"},
  63: {name:"水火既济",symbol:"䷾",yaoNames:["初九","六二","九三","六四","九五","上六"],tuanCi:"既济亨，小者亨也，利贞。",daXiang:"水在火上既济，君子以思患而豫防之。"},
  64: {name:"火水未济",symbol:"䷿",yaoNames:["初六","九二","六三","九四","六五","上九"],tuanCi:"未济亨，小狐汔济濡其尾。",daXiang:"火在水上未济，君子以慎辨物居方。"},
};

const YAO_CI: Record<number, string[]> = {
  1: ["潜龙勿用。","见龙在田，利见大人。","君子终日乾乾，夕惕若厉，无咎。","或跃在渊，无咎。","飞龙在天，利见大人。","亢龙有悔。"],
  2: ["履霜，坚冰至。","直方大，不习无不利。","含章可贞，或从王事，无成有终。","括囊，无咎无誉。","黄裳，元吉。","龙战于野，其血玄黄。"],
};

function getYaoCi(guaNum: number, yaoIdx: number): string {
  const ci = YAO_CI[guaNum];
  if (ci && ci[yaoIdx]) return ci[yaoIdx];
  return `第${yaoIdx + 1}爻，爻位${(yaoIdx+1)%3===1?"当位":(yaoIdx+1)%3===2?"中位":"极位"}。`;
}

function sim18Changes(seed?: number): { lines: number[]; changes: boolean[]; process: DaYanResult["process"] } {
  const lines: number[] = [];
  const changes: boolean[] = [];
  const process: DaYanResult["process"] = [];

  // 确定性PRNG (Mulberry32)
  let state = seed ?? (crypto.randomBytes(4).readUInt32BE(0));
  const nextInt = (max: number) => { state |= 0; state = state + 0x6D2B79F5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) % max; };

  for (let yao = 0; yao < 6; yao++) {
    for (let op = 0; op < 3; op++) {
      const left = 1 + nextInt(48);
      const right = 49 - left;
      const leftRem = (left - 1) % 4;
      const rightRem = right % 4;
      const rem = 1 + (leftRem === 0 ? 4 : leftRem) + (rightRem === 0 ? 4 : rightRem);
      const remaining = 49 - rem;
      const result = remaining / 4;
      if (op === 2) process.push({ step: yao * 3 + op + 1, leftHand: left, rightHand: right, remaining: result, result });
    }
  }

  for (let yao = 0; yao < 6; yao++) {
    const thirdResult = process[yao * 3 + 2].result;
    const value = thirdResult % 4;
    if (value === 0) { lines.push(8); changes.push(false); }
    else if (value === 1) { lines.push(7); changes.push(false); }
    else if (value === 2) { lines.push(9); changes.push(true); }
    else { lines.push(6); changes.push(true); }
  }

  return { lines: lines.reverse(), changes: changes.reverse(), process };
}

function linesToGuaNum(lines: number[]): number {
  const yaoBinary = lines.map(l => l % 2).join("");
  const upper = parseInt(yaoBinary.slice(0, 3), 2);
  const lower = parseInt(yaoBinary.slice(3), 2);
  const num = lower * 8 + upper + 1;
  return num >= 1 && num <= 64 ? num : 1;
}

export function calculateDaYan(input: Record<string, unknown>): DaYanResult {
  const seed = input.seed != null ? Number(input.seed) : undefined;
  const { lines, changes, process } = sim18Changes(seed);
  const benNum = linesToGuaNum(lines);
  const benGua = GUA64[benNum] ?? GUA64[1];

  const changedLines = lines.map((l, i) => changes[i] ? (l === 6 ? 7 : 8) : l);
  const hasChange = changes.some(c => c);
  const zhiNum = hasChange ? linesToGuaNum(changedLines) : benNum;
  const zhiGua = hasChange ? (GUA64[zhiNum] ?? null) : null;

  const changeDetails: YaoChange[] = lines.map((l, i) => ({
    index: i + 1,
    position: benGua.yaoNames[i],
    oldYao: l === 6 ? "老阴⚋" : l === 7 ? "少阳⚊" : l === 8 ? "少阴⚋" : "老阳⚊",
    newYao: changes[i] ? (l === 6 ? "少阳⚊" : "少阴⚋") : (l % 2 === 0 ? "阴" : "阳"),
    changing: changes[i],
  }));

  const yaoCi: string[] = lines
    .map((_, i) => changes[i] ? getYaoCi(benNum, i) : null)
    .filter(Boolean) as string[];

  const duanYu = `${benGua.name}(${benGua.symbol})，${benGua.tuanCi} ${zhiGua ? `之${zhiGua.name}(${zhiGua.symbol})，${zhiGua.daXiang}` : "不变之卦，以本卦卦辞断。"}`;

  // Box-drawing 结构化总结
  const changeCount = changes.filter(c => c).length;
  const changeList = changeDetails.filter(c => c.changing).map(c => `第${c.index}爻${c.oldYao}→${c.newYao}`).join("、");
  const yaoCiText = yaoCi.length > 0 ? yaoCi.join("；") :  "静卦无动爻，以本卦卦辞为断";

  const summary = [
    "┌──────────────────────────────────────┐",
    "│      大衍筮法 · 周易揲蓍起卦         │",
    "├──────────────────────────────────────┤",
    "│ 本卦：" + benGua.name + " " + benGua.symbol + " · " + benGua.tuanCi.slice(0, 18).padEnd(20) + "│",
    "│ 之卦：" + (zhiGua ? zhiGua.name + " " + zhiGua.symbol + " ".repeat(22) : "（不变）" + " ".repeat(26)) + "│",
    "│ 动爻：" + changeCount + "爻变 · " + (changeList || "无").slice(0, 28).padEnd(28) + "│",
    "│ 爻辞：" + yaoCiText.slice(0, 30).padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 断语：" + duanYu.slice(0, 30).padEnd(30) + "│",
    "├──────────────────────────────────────┤",
    "│ 出处：《周易·系辞传》                │",
    "│ 「大衍之数五十，其用四十有九」       │",
    "│ 四营十八变，十有八变而成卦           │",
    "│ 爻辞引《周易》经文，王弼注本校        │",
    "└──────────────────────────────────────┘",
  ].join("\n");

  return {
    input: { question: input.question as string ?? "所问之事", datetime: input.datetime as string },
    process: process.slice(12),
    benGua: { name: benGua.name, symbol: benGua.symbol, number: benNum, yaoNames: benGua.yaoNames, tuanCi: benGua.tuanCi, daXiang: benGua.daXiang },
    zhiGua: zhiGua ? { name: zhiGua.name, symbol: zhiGua.symbol, number: zhiNum, yaoNames: zhiGua.yaoNames, tuanCi: zhiGua.tuanCi, daXiang: zhiGua.daXiang } : null,
    changes: changeDetails,
    yaoCi,
    duanYu,
    summary,
  } as DaYanResult & { summary: string };
}
