// ── 八卦象数疗法计算引擎 ──
// 八卦配脏腑 + 默念配方 + 象数疗法
// 来源：《黄帝内经》脏腑学说 + 李山玉《中国八卦象数疗法》
// 八卦象数疗法是天人合一思想在医学领域的应用，以先天八卦数为配方基础
// 《周易·说卦传》：「乾为首，坤为腹，震为足，巽为股，坎为耳，离为目，艮为手，兑为口。」

import type { BaGuaXiangShuResult, XiangShuFormula } from "@guoxue/shared";

// 八卦与人体对应经典出处
const BAGUA_CLASSICAL_REF: Record<string, string> = {
  "乾": "《周易·说卦》：「乾为首。」《素问·灵兰秘典论》：「大肠者，传道之官，变化出焉。」",
  "兑": "《周易·说卦》：「兑为口。」《素问·五脏生成》：「诸气者，皆属于肺。」",
  "离": "《周易·说卦》：「离为目。」《素问·六节藏象论》：「心者，生之本，神之变也。」",
  "震": "《周易·说卦》：「震为足。」《素问·至真要大论》：「诸风掉眩，皆属于肝。」",
  "巽": "《周易·说卦》：「巽为股。」《素问·痿论》：「肝主身之筋膜。」",
  "坎": "《周易·说卦》：「坎为耳。」《素问·上古天真论》：「肾者主水，受五脏六腑之精而藏之。」",
  "艮": "《周易·说卦》：「艮为手。」《素问·玉机真脏论》：「脾为孤脏，中央土以灌四傍。」",
  "坤": "《周易·说卦》：「坤为腹。」《素问·五脏别论》：「胃者，水谷之海，六腑之大源也。」",
};

// 八卦象数疗法原理出处
const THERAPY_PRINCIPLES = {
  source: "李山玉《中国八卦象数疗法》（1993年青岛出版社）",
  mechanism: "八卦象数疗法以先天八卦数为配方基础，通过默念特定数字组合产生声波振动，以八卦场能调节人体脏腑气机。其核心原理有三：一曰「象数同源」——八卦之象与人体脏腑之象相对应，数字为八卦之代码；二曰「声波共振」——默念数字时体内产生次声波，共振对应脏腑经络；三曰「意念导引」——心念集中于配方数字，意到气到，气到效至。",
  classicalRef: "《周易·系辞》：「八卦成列，象在其中矣。」《素问·宝命全形论》：「人以天地之气生，四时之法成。」",
};

const BAGUA_ORGAN: { guaName: string; guaNumber: number; element: string; organ: string; baseFormula: string; meaning: string; neijingRef: string }[] = [
  { guaName:"乾", guaNumber:1, element:"金", organ:"大肠/头",  baseFormula:"100", meaning:"通调大肠气机，清头明目", neijingRef:"《素问·灵兰秘典论》：大肠者传道之官" },
  { guaName:"兑", guaNumber:2, element:"金", organ:"肺/气管",  baseFormula:"200", meaning:"宣肺止咳，润喉利咽", neijingRef:"《素问·五脏生成》：诸气者皆属于肺" },
  { guaName:"离", guaNumber:3, element:"火", organ:"心/小肠",  baseFormula:"300", meaning:"清心安神，活血通脉", neijingRef:"《素问·六节藏象论》：心者生之本" },
  { guaName:"震", guaNumber:4, element:"木", organ:"肝/胆",    baseFormula:"400", meaning:"疏肝理气，利胆排石", neijingRef:"《素问·至真要大论》：诸风掉眩皆属于肝" },
  { guaName:"巽", guaNumber:5, element:"木", organ:"胆/筋",    baseFormula:"500", meaning:"舒筋活络，祛风止痛", neijingRef:"《素问·痿论》：肝主身之筋膜" },
  { guaName:"坎", guaNumber:6, element:"水", organ:"肾/膀胱",  baseFormula:"600", meaning:"补肾壮阳，利尿通淋", neijingRef:"《素问·上古天真论》：肾者主水" },
  { guaName:"艮", guaNumber:7, element:"土", organ:"胃/脾",    baseFormula:"700", meaning:"健脾和胃，消食化积", neijingRef:"《素问·玉机真脏论》：脾为孤脏" },
  { guaName:"坤", guaNumber:8, element:"土", organ:"脾/腹",    baseFormula:"800", meaning:"健脾益气，养血安胎", neijingRef:"《素问·五脏别论》：胃者水谷之海" },
];

// 五行最佳默念时辰
const WUXING_BEST_TIME: Record<string, { time: string; reason: string }> = {
  "金": { time:"寅时/卯时（3:00-7:00）或申时/酉时（15:00-19:00）", reason:"金气当令，共振最强" },
  "木": { time:"亥时/子时（21:00-1:00）或寅时/卯时（3:00-7:00）", reason:"水生木，木气当令" },
  "水": { time:"申时/酉时（15:00-19:00）或亥时/子时（21:00-1:00）", reason:"金生水，水气当令" },
  "火": { time:"寅时/卯时（3:00-7:00）或巳时/午时（9:00-13:00）", reason:"木生火，火气当令" },
  "土": { time:"巳时/午时（9:00-13:00）或辰戌丑未时", reason:"火生土，土气当令" },
};

// 50+症状配方库（来源于李山玉《中国八卦象数疗法》及临床实证）
const SYMPTOM_FORMULAS: Record<string, { primary: number; support: number[]; full: string; source: string }> = {
  // ===== 头面部 =====
  "头痛":     { primary:0, support:[3,5], full:"100.300.500", source:"《八卦象数疗法》头痛方" },
  "偏头痛":   { primary:4, support:[2,5], full:"400.300.500", source:"《八卦象数疗法》偏头痛加减" },
  "头晕":     { primary:5, support:[2],   full:"600.300",     source:"《八卦象数疗法》眩晕方" },
  "失眠":     { primary:2, support:[0,7], full:"300.100.700", source:"《八卦象数疗法》失眠基础方" },
  "多梦":     { primary:2, support:[5,7], full:"300.600.700", source:"《八卦象数疗法》安神加减" },
  "耳鸣":     { primary:5, support:[2,0], full:"600.300.100", source:"《八卦象数疗法》耳疾方" },
  "眼疾":     { primary:3, support:[0],   full:"400.100",     source:"《八卦象数疗法》眼病方" },
  "鼻炎":     { primary:1, support:[0,5], full:"200.100.500", source:"《八卦象数疗法》鼻病方" },
  "口腔溃疡": { primary:1, support:[6],   full:"200.700",     source:"《八卦象数疗法》口腔方" },
  "牙痛":     { primary:1, support:[6,5], full:"200.700.600", source:"《八卦象数疗法》牙痛方" },
  "面瘫":     { primary:0, support:[4,3], full:"100.400.300", source:"《八卦象数疗法》面瘫方" },
  "脱发":     { primary:5, support:[3,7], full:"600.400.700", source:"《八卦象数疗法》须发方" },

  // ===== 消化系统 =====
  "胃痛":     { primary:6, support:[7],   full:"700.600",     source:"《八卦象数疗法》胃痛基础方" },
  "胃炎":     { primary:6, support:[7,3], full:"700.600.300", source:"《八卦象数疗法》胃炎方" },
  "消化不良": { primary:6, support:[7],   full:"700.800",     source:"《八卦象数疗法》消化方" },
  "便秘":     { primary:0, support:[7,1], full:"100.700.200", source:"《八卦象数疗法》便秘方" },
  "腹泻":     { primary:7, support:[6,5], full:"800.700.600", source:"《八卦象数疗法》腹泻方" },
  "痔疮":     { primary:0, support:[7,5], full:"100.700.600", source:"《八卦象数疗法》痔疮方" },
  "肝病":     { primary:3, support:[5],   full:"400.500",     source:"《八卦象数疗法》肝病基础方" },
  "胆囊炎":   { primary:3, support:[4],   full:"400.500",     source:"《八卦象数疗法》胆病方" },
  "脂肪肝":   { primary:3, support:[5,6], full:"400.500.600", source:"《八卦象数疗法》脂肪肝方" },

  // ===== 心脑血管 =====
  "心脏":     { primary:2, support:[0,6], full:"300.100.600", source:"《八卦象数疗法》心脏基础方" },
  "高血压":   { primary:2, support:[5,6], full:"300.500.600", source:"《八卦象数疗法》降压方" },
  "低血压":   { primary:2, support:[7,0], full:"300.700.100", source:"《八卦象数疗法》升压方" },
  "心悸":     { primary:2, support:[5,7], full:"300.600.700", source:"《八卦象数疗法》心悸方" },
  "冠心病":   { primary:2, support:[0,6,5], full:"300.100.600", source:"《八卦象数疗法》冠心方" },
  "中风后遗症": { primary:0, support:[3,4,5], full:"100.400.500.600", source:"《八卦象数疗法》中风方" },

  // ===== 呼吸系统 =====
  "感冒":     { primary:1, support:[0],   full:"200.100",     source:"《八卦象数疗法》感冒方" },
  "咳嗽":     { primary:1, support:[0,7], full:"200.100.700", source:"《八卦象数疗法》咳嗽方" },
  "哮喘":     { primary:1, support:[7,5], full:"200.700.600", source:"《八卦象数疗法》哮喘方" },
  "支气管炎": { primary:1, support:[0,6], full:"200.100.600", source:"《八卦象数疗法》气管炎方" },
  "咽喉炎":   { primary:1, support:[2,5], full:"200.300.500", source:"《八卦象数疗法》咽喉方" },

  // ===== 泌尿生殖 =====
  "肾病":     { primary:5, support:[2],   full:"600.300",     source:"《八卦象数疗法》肾病基础方" },
  "肾炎":     { primary:5, support:[2,7], full:"600.300.700", source:"《八卦象数疗法》肾炎方" },
  "尿频":     { primary:5, support:[7],   full:"600.700",     source:"《八卦象数疗法》尿频方" },
  "前列腺":   { primary:5, support:[3,7], full:"600.400.700", source:"《八卦象数疗法》前列腺方" },
  "男科":     { primary:5, support:[3],   full:"600.400",     source:"《八卦象数疗法》男科方" },
  "妇科":     { primary:7, support:[5],   full:"800.600",     source:"《八卦象数疗法》妇科基础方" },
  "月经不调": { primary:7, support:[3,5], full:"800.400.600", source:"《八卦象数疗法》月经方" },
  "痛经":     { primary:7, support:[2,3], full:"800.300.400", source:"《八卦象数疗法》痛经方" },
  "乳腺增生": { primary:3, support:[7,2], full:"400.800.300", source:"《八卦象数疗法》乳腺方" },

  // ===== 筋骨关节 =====
  "腰腿痛":   { primary:7, support:[3,4,5], full:"700.300.400.500", source:"《八卦象数疗法》腰腿痛方" },
  "颈椎":     { primary:3, support:[0,5], full:"400.100.500",       source:"《八卦象数疗法》颈椎方" },
  "肩周炎":   { primary:3, support:[0,4], full:"400.100.500",       source:"《八卦象数疗法》肩周方" },
  "关节炎":   { primary:4, support:[5,7], full:"500.600.700",       source:"《八卦象数疗法》关节方" },
  "坐骨神经": { primary:3, support:[5,6], full:"400.600.700",       source:"《八卦象数疗法》坐骨方" },
  "痛风":     { primary:5, support:[3,7], full:"600.400.700",       source:"《八卦象数疗法》痛风方" },
  "骨质增生": { primary:5, support:[3,7], full:"600.400.700",       source:"《八卦象数疗法》骨刺方" },

  // ===== 皮肤 =====
  "皮肤病":   { primary:1, support:[3],   full:"200.400",     source:"《八卦象数疗法》皮肤病基础方" },
  "湿疹":     { primary:1, support:[3,7], full:"200.400.700", source:"《八卦象数疗法》湿疹方" },
  "痤疮":     { primary:1, support:[3,2], full:"200.400.300", source:"《八卦象数疗法》痤疮方" },
  "荨麻疹":   { primary:1, support:[3,5], full:"200.400.600", source:"《八卦象数疗法》荨麻疹方" },

  // ===== 内分泌/代谢 =====
  "糖尿病":   { primary:7, support:[2,5,6], full:"700.300.500.600", source:"《八卦象数疗法》糖尿病方" },
  "甲亢":     { primary:3, support:[2,5],   full:"400.300.600",     source:"《八卦象数疗法》甲亢方" },
  "肥胖":     { primary:7, support:[5,3],   full:"700.600.400",     source:"《八卦象数疗法》减肥方" },

  // ===== 其他 =====
  "疲劳":     { primary:5, support:[2,7],   full:"600.300.700", source:"《八卦象数疗法》补气方" },
  "免疫力低": { primary:0, support:[7,5],   full:"100.700.600", source:"《八卦象数疗法》扶正方" },
  "更年期":   { primary:5, support:[2,3,7], full:"600.300.400.700", source:"《八卦象数疗法》更年期方" },
  "记忆减退": { primary:5, support:[2,0],   full:"600.300.100", source:"《八卦象数疗法》健脑方" },
  "焦虑":     { primary:2, support:[3,5],   full:"300.400.600", source:"《八卦象数疗法》安神方" },
  "抑郁":     { primary:3, support:[2,5],   full:"400.300.600", source:"《八卦象数疗法》解郁方" },
  "其他":     { primary:0, support:[2,6,7], full:"100.300.600.700", source:"《八卦象数疗法》通用调和方" },
};

export function calculateBaGuaXiangShu(input: Record<string, unknown>): BaGuaXiangShuResult {
  const symptom = (input.symptom as string) ?? "其他";
  const sf = SYMPTOM_FORMULAS[symptom] || SYMPTOM_FORMULAS["其他"]!;
  const primary = BAGUA_ORGAN[sf.primary];
  const support = sf.support.map(i => BAGUA_ORGAN[i]);

  const primaryFormula: XiangShuFormula = {
    guaName: primary.guaName, guaNumber: primary.guaNumber, element: primary.element,
    organ: primary.organ, baseFormula: primary.baseFormula, meaning: primary.meaning,
  };

  const supplementaryFormulas: XiangShuFormula[] = support.map(s => ({
    guaName: s.guaName, guaNumber: s.guaNumber, element: s.element,
    organ: s.organ, baseFormula: s.baseFormula, meaning: s.meaning,
  }));

  // 构建结构化配方机理说明
  const mechanismParts = support.map(s => `${s.guaName}卦(${s.element})配${s.organ}，${s.meaning}`);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const allElements = [primary.element, ...support.map(s => s.element)];
  const bestTime = WUXING_BEST_TIME[primary.element] || WUXING_BEST_TIME["土"];
  const classicalRef = BAGUA_CLASSICAL_REF[primary.guaName] || "";

  const mechanism = [
    `┌─ 八卦象数配方解析 ─────────────────`,
    `│ 症状：${symptom}`,
    `│ 配方：${sf.full}`,
    `│ 主卦：${primary.guaName}卦（${primary.element}·${primary.guaNumber}）→ ${primary.organ}，${primary.meaning}`,
    `│ 配卦：${mechanismParts.join("；")}`,
    ``,
    `├─ 治疗机理 ─────────────────`,
    `│ ${THERAPY_PRINCIPLES.mechanism}`,
    ``,
    `├─ 配方解读 ─────────────────`,
    `│ ${sf.full} 中各数字对应：`,
    `│ ${primary.baseFormula} — ${primary.guaName}卦(${primary.element})主${primary.organ}，${primary.meaning}`,
    ...support.map(s => `│ ${s.baseFormula} — ${s.guaName}卦(${s.element})配${s.organ}，${s.meaning}`),
    `│ 各卦五行相生相济，合力调节${primary.organ}气机。`,
    ``,
    `├─ 最佳默念时间 ─────────────────`,
    `│ ${bestTime.time}`,
    `│ ${bestTime.reason}`,
    ``,
    `├─ 古籍出处 ─────────────────`,
    `│ ${classicalRef}`,
    `│ ${THERAPY_PRINCIPLES.classicalRef}`,
    ``,
    `├─ 疗法来源 ─────────────────`,
    `│ ${THERAPY_PRINCIPLES.source}`,
    `│ ${sf.source}`,
    ``,
    `└─ 注意事项 ─────────────────`,
    `   八卦象数疗法是天人合一理念的实践应用，默念时须心诚念专，`,
    `   意念集中于患处。念诵节奏宜匀速，每组之间自然停顿一息。`,
    `   若念后病灶处有温热、跳动或轻微针扎感，属正常「气冲病灶」反应。`,
  ].join("\n");

  return {
    input: { symptom, description: input.description as string, duration: input.duration as string },
    primaryFormula,
    supplementaryFormulas,
    fullFormula: sf.full,
    usage: {
      method: "默念或轻声念诵象数配方，每字约1秒，一组念完后自然停顿再念下一组。心诚则灵，意念专注是关键。",
      duration: "每次默念15-30分钟，每日2-3次。急性症状可增加次数。慢性病7-21天为一个疗程。",
      timeOfDay: "清晨日出时、午时或睡前1小时为最佳时间。根据五行：",
      posture: "取坐姿或卧姿，全身放松，闭目凝神，意守病灶部位。面朝对应卦位方向效果更佳。",
      frequency: "持续默念7-21天为一个疗程，慢性病可延长至3个疗程。急性症状不拘时，可随时默念。",
    },
    mechanism,
    precautions: [
      "本法为辅助疗法，不能替代正规医疗。急重症请及时就医。",
      "默念时心要诚，意念专注于患处。杂念纷飞时先静坐调息3分钟再开始。",
      "初念时可能出现病灶部位温热、跳动或轻微疼痛，属正常气冲病灶反应，坚持3-5天可缓解。",
      "孕妇慎用（尤其是震卦400配方），建议在专业医师指导下进行。",
      "象数配方因人而异，本结果为基础配方，辨证加减请咨询八卦象数疗法专业医师。",
      "默念环境宜安静整洁，避免在嘈杂、污秽环境中默念。",
      "饭后半小时内不宜默念，以免影响消化。",
      "默念前后喝一杯温水，有助于气血运行。",
    ],
  };
}
