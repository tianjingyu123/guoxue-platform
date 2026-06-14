// ── 五行力量分析引擎 ──
// 算法参考：《渊海子平》《滴天髓》《子平真诠》
// 四柱五行权重计算 + 身强身弱判断 + 调候通关 + 喜用推荐
// 《滴天髓》云：「能知衰旺之真机，其于三命之奥，思过半矣。」

import type { WuXingLiLiangInput, WuXingLiLiangResult } from "@guoxue/shared";

const GAN_WX: Record<string, string> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire", "戊": "earth",
  "己": "earth", "庚": "metal", "辛": "metal", "壬": "water", "癸": "water",
};

const ZHI_WX: Record<string, string> = {
  "子": "water", "丑": "earth", "寅": "wood", "卯": "wood", "辰": "earth", "巳": "fire",
  "午": "fire", "未": "earth", "申": "metal", "酉": "metal", "戌": "earth", "亥": "water",
};

// 天干权重（月令有加成）
const GAN_WEIGHT: Record<string, number> = {
  "年干": 1.2, "月干": 1.8, "日干": 2.5, "时干": 1.0,
};

// 地支权重
const ZHI_WEIGHT: Record<string, number> = {
  "年支": 1.0, "月支": 2.0, "日支": 1.5, "时支": 1.0,
};

const WX_LABELS: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

// 五行生克关系（中文key）
const WX_SHENG: Record<string, string> = { "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" };
const WX_KE: Record<string, string> = { "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" };
const WX_BEI_SHENG: Record<string, string> = { "火": "木", "土": "火", "金": "土", "水": "金", "木": "水" };
const WX_BEI_KE: Record<string, string> = { "土": "木", "水": "土", "火": "水", "金": "火", "木": "金" };

// 月令旺相休囚死（按月建五行定）
const MONTH_WX: Record<string, string> = {
  "寅": "木", "卯": "木", "辰": "土",
  "巳": "火", "午": "火", "未": "土",
  "申": "金", "酉": "金", "戌": "土",
  "亥": "水", "子": "水", "丑": "土",
};

// 旺相休囚死表：当月令为X时，各五行的状态
function getWangXiang(monthWx: string): Record<string, string> {
  const wang = monthWx;
  const xiang = WX_SHENG[wang];
  const xiu = WX_BEI_SHENG[wang];
  const qiu = WX_BEI_KE[wang];
  const si = WX_KE[wang];
  return {
    [wang]: "旺（当令最强）",
    [xiang]: "相（次旺，得旺气所生）",
    [xiu]: "休（退气，生旺者已过）",
    [qiu]: "囚（被克，有力难施）",
    [si]: "死（被旺气所克，最弱）",
  };
}

// 五行详细解读
const WX_INTERPRETATION: Record<string, {
  nature: string; traits: string[]; goodFor: string[]; tooMuch: string; toolLittle: string;
  classicalRef: string;
}> = {
  wood: {
    nature: "木主仁德，性直情和，如春木勃发，生生不息。",
    traits: ["仁慈善良", "积极向上", "有创造力", "易纠结犹豫"],
    goodFor: ["教育", "文学", "医疗", "环保", "设计"],
    tooMuch: "木过旺则固执己见、好高骛远，肝气易郁结。宜金来修剪（克木），火来泄秀（木生火）。",
    toolLittle: "木过弱则缺乏主见、做事畏缩，肝血易不足。宜水来滋养（生木），木来扶助（比和）。",
    classicalRef: "《滴天髓》：「甲木参天，脱胎要火。春不容金，秋不容土。」",
  },
  fire: {
    nature: "火主礼德，性急情热，如夏日炎炎，光明磊落。",
    traits: ["热情奔放", "行动力强", "有领导力", "易急躁冲动"],
    goodFor: ["演艺", "餐饮", "能源", "互联网", "公关"],
    tooMuch: "火过旺则急躁冒进、脾气火爆，心火易亢盛。宜水来调候（克火），土来泄秀（火生土）。",
    toolLittle: "火过弱则缺乏热情、行动迟缓，心气易不足。宜木来生火（生火），火来扶助（比和）。",
    classicalRef: "《滴天髓》：「丙火猛烈，欺霜侮雪。能煅庚金，逢辛反怯。」",
  },
  earth: {
    nature: "土主信德，性厚情诚，如大地载物，稳重包容。",
    traits: ["诚实守信", "稳重踏实", "包容力强", "易固执保守"],
    goodFor: ["建筑", "地产", "金融", "农业", "管理"],
    tooMuch: "土过旺则固执僵化、墨守成规，脾胃易壅滞。宜木来疏通（克土），金来泄秀（土生金）。",
    toolLittle: "土过弱则缺乏定力、根基不稳，脾胃易虚弱。宜火来生土（生土），土来扶助（比和）。",
    classicalRef: "《滴天髓》：「戊土固重，既中且正。静翕动辟，万物司命。」",
  },
  metal: {
    nature: "金主义德，性刚情烈，如秋风肃杀，果断果决。",
    traits: ["重义气", "果断坚毅", "执行力强", "易刚愎自用"],
    goodFor: ["法律", "金融", "机械", "军警", "外科医疗"],
    tooMuch: "金过旺则刚愎自用、冷酷无情，肺气易壅滞。宜火来锻炼（克金），水来泄秀（金生水）。",
    toolLittle: "金过弱则缺乏决断、意志薄弱，肺气易不足。宜土来生金（生金），金来扶助（比和）。",
    classicalRef: "《滴天髓》：「庚金带煞，刚健为最。得水而清，得火而锐。」",
  },
  water: {
    nature: "水主智德，性聪情善，如深渊纳川，智慧深沉。",
    traits: ["聪明智慧", "善于变通", "学习力强", "易多疑忧虑"],
    goodFor: ["科研", "教育", "咨询", "艺术", "贸易"],
    tooMuch: "水过旺则多疑善虑、反复无常，肾气易泛滥。宜土来制水（克水），木来泄秀（水生木）。",
    toolLittle: "水过弱则缺乏智慧、反应迟钝，肾气易不足。宜金来生水（生水），水来扶助（比和）。",
    classicalRef: "《滴天髓》：「壬水通河，能泄金气。刚中之德，周流不滞。」",
  },
};

// 调候分析 —— 根据出生月份判断寒暖燥湿
function analyzeTiaoHou(monthZhi: string, dayWxEng: string, scores: Record<string, { value: number }>): string {
  const season = MONTH_WX[monthZhi];
  const dayWxLabel = WX_LABELS[dayWxEng];

  // 夏季（巳午未月）需要水调候
  if (["巳", "午", "未"].includes(monthZhi)) {
    const waterScore = scores.water?.value || 0;
    if (waterScore < 1.0) {
      return `命局生于夏季${monthZhi}月，火炎土燥，八字缺水调候。${dayWxLabel}日主急需水来润局降温，否则性情急躁、做事易冲动。水为第一调候用神，其次喜金来生水。`;
    }
    if (waterScore < 2.0) {
      return `命局生于夏季${monthZhi}月，虽有水调候但力量不足。${dayWxLabel}日主仍需加强水五行的力量，宜补水、金。`;
    }
    return `命局生于夏季${monthZhi}月，幸有水调候润局，金水相生，格局清润。${dayWxLabel}日主寒暖适中，性情中和。`;
  }

  // 冬季（亥子丑月）需要火调候
  if (["亥", "子", "丑"].includes(monthZhi)) {
    const fireScore = scores.fire?.value || 0;
    if (fireScore < 1.0) {
      return `命局生于冬季${monthZhi}月，天寒地冻，八字缺火暖局。${dayWxLabel}日主急需火来调候驱寒，否则性情冷漠、行动迟缓。火为第一调候用神，其次喜木来生火。`;
    }
    if (fireScore < 2.0) {
      return `命局生于冬季${monthZhi}月，虽有火调候但力量不足。${dayWxLabel}日主仍需加强火五行的力量，宜补火、木。`;
    }
    return `命局生于冬季${monthZhi}月，幸有火调候暖局，木火相生，格局温暖。${dayWxLabel}日主寒暖适中，生机勃发。`;
  }

  // 春秋季相对平和
  return `命局生于${season}旺之月，寒暖燥湿适中，调候需求不紧迫。${dayWxLabel}日主得天时之利，五行流通自然。`;
}

// 通关分析 —— 找出化解五行冲突的媒介
function analyzeTongGuan(dayWxLabel: string, sorted: [string, { value: number }][]): string {
  const topWx = sorted[0]?.[0];
  const secondWx = sorted[1]?.[0];

  // 如果最强的两个五行相克，需要通关
  if (topWx && secondWx && WX_KE[topWx] === secondWx) {
    // top克second，通关元素 = 被克者的食伤（泄top生second的方案）
    // 如金克木，通关用水（金生水，水生木）
    const tongGuan = Object.entries(WX_SHENG).find(([, v]) =>
      WX_SHENG[v as string] === secondWx && WX_BEI_SHENG[v as string] === topWx
    )?.[0];
    if (tongGuan) {
      return `${topWx}（${sorted[0][1].value.toFixed(1)}）克${secondWx}（${sorted[1][1].value.toFixed(1)}），两强相战，需${tongGuan}通关化解。${topWx}生${tongGuan}，${tongGuan}生${secondWx}，五行流转则战局化解。${tongGuan}为关键通关用神。`;
    }
  }

  // 找最佳流通路径
  // 从日主出发，看五行能否连续相生
  const shengChain: string[] = [dayWxLabel];
  let current = dayWxLabel;
  for (let i = 0; i < 4; i++) {
    const next = WX_SHENG[current];
    if (!next) break;
    shengChain.push(next);
    current = next;
  }
  const chainStr = shengChain.join("生");

  const dayScore = sorted.find(([k]) => k === dayWxLabel)?.[1].value || 0;
  if (dayScore >= 2.5) {
    return `日主${dayWxLabel}旺，流通路线：${chainStr}。若全链流通无阻，则为「五行顺生」之上格。身旺宜顺流而下（${WX_SHENG[dayWxLabel]}泄秀为佳）。`;
  }
  return `日主${dayWxLabel}弱，流通路线：${chainStr}。身弱宜逆流而上（${WX_BEI_SHENG[dayWxLabel]}生身为佳），先固本再求流通。`;
}

export function calculateWuXingLiLiang(input: Record<string, unknown>): WuXingLiLiangResult {
  const { yearPillar, monthPillar, dayPillar, hourPillar } = input as unknown as WuXingLiLiangInput;

  const yG = yearPillar[0], yZ = yearPillar.slice(1);
  const mG = monthPillar[0], mZ = monthPillar.slice(1);
  const dG = dayPillar[0], dZ = dayPillar.slice(1);
  const hG = hourPillar[0], hZ = hourPillar.slice(1);

  const scores: Record<string, { value: number; detail: string[] }> = {
    wood: { value: 0, detail: [] },
    fire: { value: 0, detail: [] },
    earth: { value: 0, detail: [] },
    metal: { value: 0, detail: [] },
    water: { value: 0, detail: [] },
  };

  // 天干贡献
  const gans = [
    { gan: yG, pos: "年干", weight: GAN_WEIGHT["年干"] },
    { gan: mG, pos: "月干", weight: GAN_WEIGHT["月干"] },
    { gan: dG, pos: "日干", weight: GAN_WEIGHT["日干"] },
    { gan: hG, pos: "时干", weight: GAN_WEIGHT["时干"] },
  ];
  for (const { gan, pos, weight } of gans) {
    const wx = GAN_WX[gan];
    if (wx) {
      const v = parseFloat(weight.toFixed(1));
      scores[wx].value += v;
      scores[wx].detail.push(`${pos}${gan}(+${v})`);
    }
  }

  // 地支贡献
  const zhis = [
    { zhi: yZ, pos: "年支", weight: ZHI_WEIGHT["年支"] },
    { zhi: mZ, pos: "月支", weight: ZHI_WEIGHT["月支"] },
    { zhi: dZ, pos: "日支", weight: ZHI_WEIGHT["日支"] },
    { zhi: hZ, pos: "时支", weight: ZHI_WEIGHT["时支"] },
  ];
  for (const { zhi, pos, weight } of zhis) {
    const wx = ZHI_WX[zhi];
    if (wx) {
      const v = parseFloat(weight.toFixed(1));
      scores[wx].value += v;
      scores[wx].detail.push(`${pos}${zhi}(+${v})`);
    }
  }

  const total = Object.values(scores).reduce((s, v) => s + v.value, 0);

  // 日主五行
  const dayWxEng = GAN_WX[dG];
  const dayWxLabel = WX_LABELS[dayWxEng];

  // 月令旺相休囚死
  const monthWx = MONTH_WX[mZ];
  const wangXiang = getWangXiang(monthWx);

  // 身强身弱判断
  const dayScore = scores[dayWxEng].value;
  const dayPercent = Math.round((dayScore / total) * 100);
  const shengWoScore = scores[WX_BEI_SHENG[dayWxLabel]]?.value || 0;
  const shengWoRatio = (dayScore + shengWoScore) / total;
  const monthSupport = monthWx === dayWxLabel || monthWx === WX_BEI_SHENG[dayWxLabel];

  let shenPing = "";
  let shenLevel = "";
  if (dayPercent >= 35 || (shengWoRatio > 0.5 && monthSupport)) {
    shenLevel = "强";
    shenPing = `身强（日主${dayWxLabel}占比${dayPercent}%，得月令${
      monthSupport ? "帮扶" : "一般"
    }，生扶之力占比${Math.round(shengWoRatio * 100)}%），宜克泄耗不宜生扶。`;
  } else if (dayPercent <= 18 || (shengWoRatio < 0.3 && !monthSupport)) {
    shenLevel = "弱";
    shenPing = `身弱（日主${dayWxLabel}仅占${dayPercent}%，月令${
      monthSupport ? "有帮扶" : "不得力"
    }，生扶之力占比${Math.round(shengWoRatio * 100)}%），宜生扶不宜克泄耗。`;
  } else {
    shenLevel = "中";
    shenPing = `中和（日主${dayWxLabel}占比${dayPercent}%，生扶之力占比${Math.round(shengWoRatio * 100)}%），月令${
      wangXiang[dayWxEng] || "一般"
    }。根据大运流年灵活取用，运势波动较大。`;
  }

  // 喜用推荐（详细版）
  const xiYongLabel: string[] = [];
  const xiYongDetail: string[] = [];
  if (shenLevel === "强") {
    const keMap: Record<string, string> = { wood: "金", fire: "水", earth: "木", metal: "火", water: "土" };
    const xieMap: Record<string, string> = { wood: "火", fire: "土", earth: "金", metal: "水", water: "木" };
    const ke = keMap[dayWxLabel];
    const xie = xieMap[dayWxLabel];
    xiYongLabel.push(`喜${ke}（官杀克制）`, `喜${xie}（食伤泄秀）`);
    xiYongDetail.push(
      `身强喜克：${ke}为官杀，克制过旺的${dayWxLabel}，使其中和。适合从事与${ke}相关的行业，性格上需培养${WX_INTERPRETATION[Object.entries(WX_LABELS).find(([,v])=>v===ke)?.[0] || "wood"].nature}`,
      `身强喜泄：${xie}为食伤，泄${dayWxLabel}之秀气，化力量为才华。适合创意、表达类工作，将旺盛精力转化为成果。`
    );
  } else if (shenLevel === "弱") {
    const biMap: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
    const shengWoMap: Record<string, string> = { wood: "水", fire: "木", earth: "火", metal: "土", water: "金" };
    const bi = biMap[dayWxLabel];
    const sheng = shengWoMap[dayWxLabel];
    xiYongLabel.push(`喜${bi}（比劫帮扶）`, `喜${sheng}（印星生身）`);
    xiYongDetail.push(
      `身弱喜扶：${bi}为比劫，帮身助身。宜结交${bi}属性朋友，选择${bi}五行行业，增强自身根基。`,
      `身弱喜生：${sheng}为印星，生身养身。宜多学习进修（印主学业），亲近长辈贵人，${sheng}方城市发展有利。`
    );
  } else {
    xiYongLabel.push("中和之命，顺大运而取用");
    xiYongDetail.push("中和之命最为可贵，五行相对平衡。大运走何方则以该方五行为用，灵活应变。宜保持现状，不必刻意补某五行。");
  }

  // 调候分析
  const tiaoHouAnalysis = analyzeTiaoHou(mZ, dayWxEng, scores);

  // 通关分析
  const sorted = Object.entries(scores).sort((a, b) => b[1].value - a[1].value);
  const tongGuanAnalysis = analyzeTongGuan(dayWxLabel, sorted as [string, { value: number }][]);

  // 生成结果
  const wuXingResult: WuXingLiLiangResult["wuXing"] = {
    wood: { value: parseFloat(scores.wood.value.toFixed(1)), percent: Math.round((scores.wood.value / total) * 100) + "%", detail: scores.wood.detail },
    fire: { value: parseFloat(scores.fire.value.toFixed(1)), percent: Math.round((scores.fire.value / total) * 100) + "%", detail: scores.fire.detail },
    earth: { value: parseFloat(scores.earth.value.toFixed(1)), percent: Math.round((scores.earth.value / total) * 100) + "%", detail: scores.earth.detail },
    metal: { value: parseFloat(scores.metal.value.toFixed(1)), percent: Math.round((scores.metal.value / total) * 100) + "%", detail: scores.metal.detail },
    water: { value: parseFloat(scores.water.value.toFixed(1)), percent: Math.round((scores.water.value / total) * 100) + "%", detail: scores.water.detail },
  };

  const radar = ["wood", "fire", "earth", "metal", "water"].map(wx => ({
    name: WX_LABELS[wx],
    value: parseFloat(scores[wx].value.toFixed(1)),
  }));

  // 五行排序
  const wxOrder = sorted.map(([k, v]) => WX_LABELS[k] + v.value.toFixed(1)).join(" > ");

  // 月令五行状态
  const wxStatusInMonth = Object.entries(wangXiang)
    .map(([wx, status]) => `${wx}${status}`)
    .join("，");

  // 综合解读
  const dayInterp = WX_INTERPRETATION[dayWxEng];
  const analysis = [
    `══════ 五行力量综合分析 ══════`,
    ``,
    `【日主】${dayWxLabel}（${dG}），权重${dayScore.toFixed(1)}/${total.toFixed(1)}（${dayPercent}%）。`,
    `  ${dayInterp?.nature || ""}`,
    `  ${dayInterp?.classicalRef || ""}`,
    ``,
    `【身强身弱】${shenPing}`,
    ``,
    `【五行排序】${wxOrder}`,
    `  月令：${mZ}属${monthWx}，月令旺相休囚死：${wxStatusInMonth}`,
    ``,
    `【调候分析】${tiaoHouAnalysis}`,
    ``,
    `【通关分析】${tongGuanAnalysis}`,
    ``,
    `【喜用神建议】`,
    ...(xiYongDetail.length > 0
      ? xiYongDetail.map((d, i) => `  ${i + 1}. ${d}`)
      : ["  中和之命，顺其自然"]),
    ``,
    `【五行特质】`,
    `  优势特质：${dayInterp?.traits.slice(0, 3).join("、") || ""}`,
    `  注意倾向：${dayInterp?.traits[3] || ""}`,
    `  适合行业：${dayInterp?.goodFor.slice(0, 5).join("、") || ""}`,
    ``,
    `【五行平衡建议】`,
    ...(shenLevel === "强"
      ? [
          `  · 补${WX_KE[dayWxLabel] || "克"}: ${dayInterp?.tooMuch || ""}`,
          `  · 宜穿${WX_KE[dayWxLabel] || ""}色系（克制过旺），方位宜向${WX_KE[dayWxLabel] === "金" ? "西" : WX_KE[dayWxLabel] === "木" ? "东" : WX_KE[dayWxLabel] === "水" ? "北" : WX_KE[dayWxLabel] === "火" ? "南" : "中"}`,
        ]
      : shenLevel === "弱"
        ? [
          `  · 补${dayWxLabel}: ${dayInterp?.toolLittle || ""}`,
          `  · 补${WX_BEI_SHENG[dayWxLabel] || "生"}: 加强生扶之力`,
          `  · 宜穿${dayWxLabel}色系或${WX_BEI_SHENG[dayWxLabel] || ""}色系，方位宜${
              dayWxLabel === "木" ? "东" : dayWxLabel === "火" ? "南" : dayWxLabel === "土" ? "中" : dayWxLabel === "金" ? "西" : "北"
            }方`,
        ]
        : ["  · 中和之命，五行流通顺畅，无需刻意补益"]),
    ``,
    `【古籍参考】`,
    `  《滴天髓》：「能知衰旺之真机，其于三命之奥，思过半矣。」`,
    `  《渊海子平》：「五行者，往来乎天地之间而不穷者也，是故谓之行。」`,
    `  《子平真诠》：「论命惟以月令用神为主，然亦须配气候之寒暖。」`,
  ].join("\n");

  const summary = [
    "┌─ 五行力量综合分析 ─────────────────┐",
    `│ 日主：${dayWxLabel}（${dG}）权重${dayScore.toFixed(1)}/${total.toFixed(1)}`.padEnd(36) + "│",
    `│ 身强身弱：${shenPing}`.padEnd(36) + "│",
    "├─ 五行分布 ─────────────────────────┤",
    `│ 木：${wuXingResult.wood.value}（${wuXingResult.wood.percent}）`.padEnd(36) + "│",
    `│ 火：${wuXingResult.fire.value}（${wuXingResult.fire.percent}）`.padEnd(36) + "│",
    `│ 土：${wuXingResult.earth.value}（${wuXingResult.earth.percent}）`.padEnd(36) + "│",
    `│ 金：${wuXingResult.metal.value}（${wuXingResult.metal.percent}）`.padEnd(36) + "│",
    `│ 水：${wuXingResult.water.value}（${wuXingResult.water.percent}）`.padEnd(36) + "│",
    `│ 排序：${wxOrder}`.padEnd(36) + "│",
    "├─ 喜用神 ───────────────────────────┤",
    ...xiYongLabel.slice(0, 3).map(x => `│ · ${x}`.padEnd(36) + "│"),
    "├─ 出处 ─────────────────────────────┤",
    "│ 《渊海子平》《滴天髓》《子平真诠》  │",
    "└────────────────────────────────────┘",
  ].join("\n");

  return {
    wuXing: wuXingResult,
    dayMaster: dayWxLabel,
    shenQiangRuo: shenPing,
    xiYong: xiYongLabel,
    radar,
    analysis,
    summary,
  } as WuXingLiLiangResult & { summary: string };
}
