// ── 五运六气计算引擎 ──
// 天干化运/地支化气/司天在泉/运气同化/气候病候
// 参考：《黄帝内经·素问》运气七篇

import type { WuYunLiuQiResult } from "@guoxue/shared";

const TIAN_GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];

const QI_WU_XING: Record<string, string> = {
  "厥阴风木":"木","少阴君火":"火","少阳相火":"火",
  "太阴湿土":"土","阳明燥金":"金","太阳寒水":"水",
};
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 天干化五运
const GAN_YUN: Record<string, { yun: string; state: string }> = {
  "甲": { yun:"土运", state:"太过" }, "乙": { yun:"金运", state:"不及" },
  "丙": { yun:"水运", state:"太过" }, "丁": { yun:"木运", state:"不及" },
  "戊": { yun:"火运", state:"太过" }, "己": { yun:"土运", state:"不及" },
  "庚": { yun:"金运", state:"太过" }, "辛": { yun:"水运", state:"不及" },
  "壬": { yun:"木运", state:"太过" }, "癸": { yun:"火运", state:"不及" },
};

// 地支化六气（司天）
const ZHI_QI: Record<string, { siTian: string; zaiQuan: string }> = {
  "子": { siTian:"少阴君火", zaiQuan:"阳明燥金" },
  "丑": { siTian:"太阴湿土", zaiQuan:"太阳寒水" },
  "寅": { siTian:"少阳相火", zaiQuan:"厥阴风木" },
  "卯": { siTian:"阳明燥金", zaiQuan:"少阴君火" },
  "辰": { siTian:"太阳寒水", zaiQuan:"太阴湿土" },
  "巳": { siTian:"厥阴风木", zaiQuan:"少阳相火" },
  "午": { siTian:"少阴君火", zaiQuan:"阳明燥金" },
  "未": { siTian:"太阴湿土", zaiQuan:"太阳寒水" },
  "申": { siTian:"少阳相火", zaiQuan:"厥阴风木" },
  "酉": { siTian:"阳明燥金", zaiQuan:"少阴君火" },
  "戌": { siTian:"太阳寒水", zaiQuan:"太阴湿土" },
  "亥": { siTian:"厥阴风木", zaiQuan:"少阳相火" },
};

// 主气六步
const ZHU_QI = ["厥阴风木","少阴君火","少阳相火","太阴湿土","阳明燥金","太阳寒水"];
const QI_STEP_NAMES = ["初之气","二之气","三之气","四之气","五之气","终之气"];
const QI_STEPS = [
  { timeRange:"大寒至春分" },
  { timeRange:"春分至小满" },
  { timeRange:"小满至大暑" },
  { timeRange:"大暑至秋分" },
  { timeRange:"秋分至小雪" },
  { timeRange:"小雪至大寒" },
];

// 客运推算（岁运作初运，按五行相生顺排）
const YUN_ORDER = ["木运","火运","土运","金运","水运"];

/** 五音建运：主运五步固定配角徵宫商羽，太少冠于其前 */
const WU_YIN = ["角","徵","宫","商","羽"];

/** 太少交替：与岁运同奇偶步为岁运本身的太过/不及，相邻步反之 */
function alternate(state: string, sameParity: boolean): string {
  if (state === "平气") return "平气";
  if (sameParity) return state;
  return state === "太过" ? "不及" : "太过";
}

/**
 * 客运五步。
 *
 * 🔴 2026-09-19 修：原实现只排五行、**五步套同一个太过/不及**
 * （甲年排出「土太过/金太过/水太过/木太过/火太过」）。
 * 运气学的客运是**太少相生**——初运与岁运同太少，此后逐步交替，
 * 甲年应为「太宫土 / 少商金 / 太羽水 / 少角木 / 太徵火」。
 */
function calcKeYun(suiYun: string, yunState: string): string[] {
  const startIdx = YUN_ORDER.indexOf(suiYun);
  const result: string[] = [];
  for (let i = 0; i < 5; i++) {
    const yun = YUN_ORDER[(startIdx + i) % 5];
    const state = alternate(yunState, i % 2 === 0);
    result.push(`${yun}${state}`);
  }
  return result;
}

/**
 * 主运五步。五行固定木火土金水，太少由岁运回推。
 *
 * 🔴 2026-09-19 补：原实现同样五步套一个 state。
 * 正法是「以岁运之太少定其在主运所居之位，再前后相间推之」——
 * 甲年土运太过，土居主运第三步，故三运太宫，回推二运少徵、初运太角，
 * 顺推四运少商、五运太羽。
 */
function calcZhuYun(suiYun: string, yunState: string): string[] {
  const pos = YUN_ORDER.indexOf(suiYun); // 岁运在主运序中的位次
  return YUN_ORDER.map((yun, i) => {
    const state = alternate(yunState, (i - pos) % 2 === 0);
    const yin = (state === "太过" ? "太" : state === "不及" ? "少" : "") + WU_YIN[i];
    return `${yin}·${yun}${state}`;
  });
}

// 客气推算（司天为三之气，按三阴三阳次序排列）
const QI_ORDER = ["厥阴风木","少阴君火","太阴湿土","少阳相火","阳明燥金","太阳寒水"];

/**
 * 客气六步。
 *
 * 🔴 2026-09-19 修：原实现 `let qiIdx = siTianIdx` 从**初之气**就摆司天，
 * 整体错位两步。司天定在**三之气**、在泉定在**终之气**，
 * 故初之气须从司天前两位起。
 *
 * 原实现违反运气学的两条铁律（实测 1984/2020/2024/2025/2026 **五年全违**）：
 *   · 三之气 ≡ 司天
 *   · 终之气 ≡ 在泉
 * 后者是自相矛盾——同一次计算里 `zaiQuan` 报阳明燥金、终之气却排出厥阴风木。
 */
function calcKeQi(siTian: string): { step: string; qi: string; timeRange: string; desc: string }[] {
  const siTianIdx = QI_ORDER.indexOf(siTian);
  const result: { step: string; qi: string; timeRange: string; desc: string }[] = [];
  let qiIdx = (siTianIdx + 4) % 6; // 司天前两位 = 初之气
  for (let i = 0; i < 6; i++) {
    result.push({
      step: QI_STEP_NAMES[i] as any,
      qi: QI_ORDER[qiIdx] as any,
      timeRange: QI_STEPS[i].timeRange,
      desc: QI_STEP_NAMES[i] + "：" + QI_ORDER[qiIdx],
    });
    qiIdx = (qiIdx + 1) % 6;
  }
  return result;
}

// 运气同化判断
interface TongHuaCheck { type: string; desc: string; active: boolean }

/**
 * 岁会限于「年支居其五行**正位**」的八年。
 *
 * 🔴 2026-09-19 修：原实现拿 `getZhiWuXing` 对十二支一律比对，
 * 把寅（木）、巳（火）、申（金）、亥（水）也判成岁会，多出壬寅、癸巳、庚申、辛亥四年。
 * 正位只取四正（子水·午火·卯木·酉金）与四季土（辰戌丑未），
 * 寅巳申亥是五行的长生位而非正位，不入岁会。
 * 通行岁会八年：甲辰、甲戌、己丑、己未、乙酉、丁卯、戊午、丙子。
 */
const ZHI_ZHENG_WEI: Record<string, string> = {
  "子":"水","午":"火","卯":"木","酉":"金",
  "辰":"土","戌":"土","丑":"土","未":"土",
};

/**
 * 运气同化。
 *
 * 🔴 2026-09-19 重写，原实现三处问题：
 * ① **太乙天符永远报不出来**——`results` 里天符排在太乙天符之前，
 *    而 `find(r => r.active)` 取第一个命中；太乙天符必然同时是天符，
 *    于是戊午、己丑、己未、乙酉四年一律被降级报成「天符」。
 * ② 同天符 `const tongTianFu = false; // 需更复杂推算`、同岁会直接写死 false——**从未实现**。
 * ③ 岁会判定过宽（见 ZHI_ZHENG_WEI 注释）。
 *
 * 现按「太乙天符 > 天符/岁会 > 同天符/同岁会 > 无」优先级取最高者，
 * 兼具多重身份时（如甲辰既岁会又同天符）在 desc 里一并点出。
 */
function calcTongHua(_yearGan: string, yearZhi: string, suiYun: string, yunState: string, siTian: string, zaiQuan: string): TongHuaCheck {
  const suiYunWuXing = suiYun[0];
  const siTianWuXing = QI_WU_XING[siTian] ?? "未知";
  const zaiQuanWuXing = QI_WU_XING[zaiQuan] ?? "未知";

  /** 天符：岁运与司天五行相同（戊子戊午乙卯乙酉丙辰丙戌丁巳丁亥己丑己未戊寅戊申，十二年） */
  const tianFu = suiYunWuXing === siTianWuXing;
  /** 岁会：岁运与年支正位五行相同（八年） */
  const suiHui = suiYunWuXing === ZHI_ZHENG_WEI[yearZhi];
  /** 太乙天符：天符与岁会并见（戊午、己丑、己未、乙酉，四年） */
  const taiYi = tianFu && suiHui;
  /** 同天符：岁运**太过**且与在泉五行相同（甲辰甲戌庚子庚午壬寅壬申，六年） */
  const tongTianFu = yunState === "太过" && suiYunWuXing === zaiQuanWuXing;
  /** 同岁会：岁运**不及**且与在泉五行相同（癸巳癸亥辛丑辛未癸卯癸酉，六年） */
  const tongSuiHui = yunState === "不及" && suiYunWuXing === zaiQuanWuXing;

  /** 并见的其余身份，附在主判之后说明 */
  const also = (self: string) =>
    ([["天符", tianFu], ["岁会", suiHui], ["同天符", tongTianFu], ["同岁会", tongSuiHui]] as [string, boolean][])
      .filter(([n, on]) => on && n !== self)
      .map(([n]) => n);
  const suffix = (self: string) => {
    const rest = also(self);
    return rest.length ? `（兼${rest.join("、")}）` : "";
  };

  if (taiYi) {
    return { type:"太乙天符", desc:`天符与岁会并见，为太乙天符之年，气候变化最为剧烈，古称「贵人之气」，病发暴而危。`, active:true };
  }
  if (tianFu) {
    return { type:"天符", desc:`岁运与司天之气五行相合，为天符之年${suffix("天符")}，气候变化剧烈，病发速而危。`, active:true };
  }
  if (suiHui) {
    return { type:"岁会", desc:`岁运与年支正位五行相合，为岁会之年${suffix("岁会")}，气候较为平和，病发徐而持。`, active:true };
  }
  if (tongTianFu) {
    return { type:"同天符", desc:`岁运太过且与在泉之气五行相合，为同天符之年，其应同于天符。`, active:true };
  }
  if (tongSuiHui) {
    return { type:"同岁会", desc:`岁运不及且与在泉之气五行相合，为同岁会之年，其应同于岁会。`, active:true };
  }
  return { type:"无", desc:"本年运气不构成同化，岁运与司天、在泉、年支各行其令。", active:false };
}

// 气候病候
interface BingHouItem { step: string; zhuQi: string; keQi: string; qiHou: string; yiFaBing: string[]; yangSheng: string; yongYao: string }

function calcBingHou(keQiList: { step: string; qi: string }[]): BingHouItem[] {
  const infoMap: Record<string, { qiHou: string; yiFaBing: string[]; yangSheng: string; yongYao: string }> = {
    "厥阴风木": { qiHou:"风气盛行，气温不定", yiFaBing:["肝病","风疹","头痛","眩晕"], yangSheng:"疏肝理气，避免受风", yongYao:"柴胡、防风、川芎" },
    "少阴君火": { qiHou:"热气初升，火气渐旺", yiFaBing:["心病","口舌生疮","失眠","烦躁"], yangSheng:"清心安神，避免暴晒", yongYao:"黄连、莲子心、生地" },
    "少阳相火": { qiHou:"暑热蒸腾，火气旺盛", yiFaBing:["热病","中暑","目赤","耳疾"], yangSheng:"清热解暑，多饮水", yongYao:"石膏、知母、菊花" },
    "太阴湿土": { qiHou:"湿气弥漫，阴雨绵绵", yiFaBing:["脾病","湿困","水肿","腹泻"], yangSheng:"健脾祛湿，居处干燥", yongYao:"茯苓、白术、苍术" },
    "阳明燥金": { qiHou:"燥气当令，天干物燥", yiFaBing:["肺病","咳嗽","皮肤干燥","便秘"], yangSheng:"润肺生津，多食梨藕", yongYao:"沙参、麦冬、杏仁" },
    "太阳寒水": { qiHou:"寒气凛冽，冰天雪地", yiFaBing:["肾病","关节痛","寒痹","感冒"], yangSheng:"温补肾阳，防寒保暖", yongYao:"附子、肉桂、生姜" },
  };

  return keQiList.map((kq, i) => {
    const info = infoMap[kq.qi] ?? { qiHou:"气候平和", yiFaBing:[], yangSheng:"", yongYao:"" };
    return {
      step: kq.step as any,
      zhuQi: ZHU_QI[i] as any,
      keQi: kq.qi as any,
      ...info,
    };
  });
}

/** 五行相生序：木→火→土→金→水→木 */
const SHENG_NEXT: Record<string, string> = { "木":"火","火":"土","土":"金","金":"水","水":"木" };
/** 五行相克序：木克土、火克金、土克水、金克木、水克火 */
const KE_NEXT: Record<string, string> = { "木":"土","火":"金","土":"水","金":"木","水":"火" };

/**
 * 运气相临关系（《素问·六微旨大论》五类）。
 *
 * 🔴 2026-09-19 修两处：
 * ① **顺逆恒为「平」**——原实现 `if (entry.rel.includes("顺"))` 判的是 `rel` 字段，
 *    而 `rel` 的全部取值为「运气相合/气生运/运克气/气克运/运生气」，
 *    **没有任何一个含「顺」或「逆」字**，于是两个分支永不命中，shunNi 死在初值 "平"。
 *    「顺」「逆」二字只存在于 `desc` 里，判错了字段。
 * ② 原来那张 5×5 手写表 25 格全靠人工填，易错且无从校验；
 *    改由五行生克关系现算，并给出通行的五类名目：
 *    顺化（气生运·顺）、天符（运气同·平）、小逆（运生气·逆）、
 *    不和（运克气·逆）、天刑（气克运·逆）。
 */
function calcYunQiRelation(suiYun: string, siTian: string): { relation: string; shunNi: string; desc: string } {
  const yun = suiYun[0];
  const qi = QI_WU_XING[siTian] ?? "未知";

  if (yun === qi) {
    return { relation:"天符（运气同化）", shunNi:"平", desc:"岁运与司天同气，上下相得，其气专而不杂。" };
  }
  if (SHENG_NEXT[qi] === yun) {
    return { relation:"顺化（气生运）", shunNi:"顺", desc:"司天之气生助岁运，上临下承，为五类中最顺，气候协调。" };
  }
  if (SHENG_NEXT[yun] === qi) {
    return { relation:"小逆（运生运气）", shunNi:"逆", desc:"岁运反去生司天之气，下奉上为小逆，气候略失其常。" };
  }
  if (KE_NEXT[yun] === qi) {
    return { relation:"不和（运克气）", shunNi:"逆", desc:"岁运克制司天之气，以下犯上，为不和，气运不调。" };
  }
  if (KE_NEXT[qi] === yun) {
    return { relation:"天刑（气克运）", shunNi:"逆", desc:"司天之气克制岁运，上刑下，为天刑，天时不正，灾害易生。" };
  }
  return { relation:"运气相杂", shunNi:"平", desc:"运气关系未能归入五类。" };
}

/** 计算年干支 */
function yearGanZhi(year: number): string {
  const baseYear = 1984;
  const diff = year - baseYear;
  let idx = diff % 60;
  if (idx < 0) idx += 60;
  return TIAN_GAN[idx % 10] + DI_ZHI[idx % 12];
}

/** 主计算函数 */
export function calculateWuYunLiuQi(input: Record<string, unknown>): WuYunLiuQiResult {
  const year = (input.year as number) ?? new Date().getFullYear();
  const nianGanZhi = yearGanZhi(year);
  const tianGan = nianGanZhi[0];
  const diZhi = nianGanZhi[1];

  const yunInfo = GAN_YUN[tianGan];
  const qiInfo = ZHI_QI[diZhi];

  const keYun = calcKeYun(yunInfo.yun, yunInfo.state);
  const zhuYun = calcZhuYun(yunInfo.yun, yunInfo.state);
  const keQi = calcKeQi(qiInfo.siTian);
  const tongHua = calcTongHua(tianGan, diZhi, yunInfo.yun, yunInfo.state, qiInfo.siTian, qiInfo.zaiQuan);

  const relation = calcYunQiRelation(yunInfo.yun, qiInfo.siTian);
  const duanYu =
    `${year}年（${nianGanZhi}），岁运${yunInfo.yun}${yunInfo.state}，`
    + `司天${qiInfo.siTian}，在泉${qiInfo.zaiQuan}，${relation.relation}、其气${relation.shunNi}。`
    + tongHua.desc;

  return {
    input: { year },
    basicInfo: { nianGanZhi, year, tianGan, diZhi },
    daYun: {
      tianGanHuaYun: yunInfo.yun as any,
      yunState: yunInfo.state as any,
      suiYun: yunInfo.yun,
      zhuYun,
      keYun,
    },
    liuQi: {
      siTian: qiInfo.siTian as any,
      zaiQuan: qiInfo.zaiQuan as any,
      zhuQi: QI_STEP_NAMES.map((s, i) => ({ step:s as any, qi:ZHU_QI[i] as any, timeRange:QI_STEPS[i].timeRange, desc:s+"："+ZHU_QI[i] })) as any,
      keQi: keQi as any,
    },
    tongHua: tongHua as any,
    bingHou: calcBingHou(keQi.map((k) => ({ step: k.step, qi: k.qi }))) as any,
    yuFa: { hasYuFa: yunInfo.state === "不及", desc: yunInfo.state === "不及" ? "岁运不及，所不胜之气可能郁发，需防范异常气候。" : "岁运太过，气候偏胜为主。" },
    yunQiRelation: relation as any,
    duanYu,
  };
}
