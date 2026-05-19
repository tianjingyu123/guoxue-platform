// ── 五运六气计算引擎 ──
// 天干化运/地支化气/司天在泉/运气同化/气候病候
// 参考：《黄帝内经·素问》运气七篇

import type { WuYunLiuQiInput, WuYunLiuQiResult } from "@guoxue/shared";

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

// 主运五步
const ZHU_YUN = ["木运","火运","土运","金运","水运"];
// 主气六步
const ZHU_QI = ["厥阴风木","少阴君火","少阳相火","太阴湿土","阳明燥金","太阳寒水"];
const QI_STEP_NAMES = ["初之气","二之气","三之气","四之气","五之气","终之气"];
// 五步主运对应时段（近似）
const YUN_STEPS = [
  { name:"初运", timeRange:"大寒至春分后13日" },
  { name:"二运", timeRange:"春分后13日至芒种后10日" },
  { name:"三运", timeRange:"芒种后10日至处暑后7日" },
  { name:"四运", timeRange:"处暑后7日至立冬后4日" },
  { name:"五运", timeRange:"立冬后4日至大寒" },
];
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

function calcKeYun(suiYun: string, yunState: string): string[] {
  const startIdx = YUN_ORDER.indexOf(suiYun);
  const result: string[] = [];
  for (let i = 0; i < 5; i++) {
    result.push(YUN_ORDER[(startIdx + i) % 5]);
  }
  return result;
}

// 客气推算（司天为三之气，按阴阳顺逆排列）
const QI_ORDER = ["厥阴风木","少阴君火","太阴湿土","少阳相火","阳明燥金","太阳寒水"];

function calcKeQi(siTian: string): { step: string; qi: string; timeRange: string; desc: string }[] {
  const siTianIdx = QI_ORDER.indexOf(siTian);
  const result: { step: string; qi: string; timeRange: string; desc: string }[] = [];
  let qiIdx = siTianIdx;
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
function calcTongHua(yearGan: string, yearZhi: string, suiYun: string, siTian: string): TongHuaCheck {
  const ganKey = yearGan;
  const zhiKey = yearZhi;
  const results: TongHuaCheck[] = [];

  // 天符：岁运与司天五行相同
  const suiYunWuXing = suiYun[0];
  const siTianWuXing = QI_WU_XING[siTian] ?? "未知";
  const tianFu = suiYunWuXing === siTianWuXing;
  results.push({ type:"天符", desc:"岁运与司天之气五行相合，为天符之年，气候变化剧烈。", active: tianFu });

  // 岁会：岁运与年支五行相同
  const zhiWuXing = getZhiWuXing(yearZhi);
  const suiHui = suiYunWuXing === zhiWuXing;
  results.push({ type:"岁会", desc:"岁运与年支五行相合，为岁会之年，气候较为平和。", active: suiHui });

  // 太乙天符：天符+岁会同时成立
  const taiYi = tianFu && suiHui;
  results.push({ type:"太乙天符", desc:"天符与岁会同时成立，为太乙天符之年，气候变化最为剧烈，易有大疫。", active: taiYi });

  // 同天符/同岁会
  const tongTianFu = false; // 需更复杂推算
  results.push({ type:"同天符", desc:"岁运太过与在泉之气五行相合。", active: tongTianFu });
  results.push({ type:"同岁会", desc:"岁运不及与在泉之气五行相合。", active: false });

  return results.find(r => r.active) ?? results[0];
}

function getZhiWuXing(zhi: string): string {
  const map: Record<string, string> = { "子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水" };
  return map[zhi] ?? "未知";
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

// 运气关系
function calcYunQiRelation(suiYun: string, siTian: string): { relation: string; shunNi: string; desc: string } {
  const yunWuXing = suiYun[0];
  const qiWuXing = QI_WU_XING[siTian] ?? "未知";
  const shengKe: Record<string, Record<string, { rel: string; desc: string }>> = {
    "木": { "木":{rel:"运气相合",desc:"运气同气，气候平和。"}, "火":{rel:"气生运",desc:"气生运为顺，气候协调。"}, "土":{rel:"运克气",desc:"运克气为逆，气运不调。"}, "金":{rel:"气克运",desc:"气克运为逆，天时不正。"}, "水":{rel:"运生气",desc:"运生气为顺，气候较佳。"} },
    "火": { "木":{rel:"运生气",desc:"运生气为顺。"}, "火":{rel:"运气相合",desc:"同气。"}, "土":{rel:"气生运",desc:"气生运为顺。"}, "金":{rel:"运克气",desc:"运克气为逆。"}, "水":{rel:"气克运",desc:"气克运为逆。"} },
    "土": { "木":{rel:"气克运",desc:"气克运为逆。"}, "火":{rel:"运生气",desc:"运生气为顺。"}, "土":{rel:"运气相合",desc:"同气。"}, "金":{rel:"气生运",desc:"气生运为顺。"}, "水":{rel:"运克气",desc:"运克气为逆。"} },
    "金": { "木":{rel:"运克气",desc:"运克气为逆。"}, "火":{rel:"气克运",desc:"气克运为逆。"}, "土":{rel:"运生气",desc:"运生气为顺。"}, "金":{rel:"运气相合",desc:"同气。"}, "水":{rel:"气生运",desc:"气生运为顺。"} },
    "水": { "木":{rel:"气生运",desc:"气生运为顺。"}, "火":{rel:"运克气",desc:"运克气为逆。"}, "土":{rel:"气克运",desc:"气克运为逆。"}, "金":{rel:"运生气",desc:"运生气为顺。"}, "水":{rel:"运气相合",desc:"同气。"} },
  };
  const entry = shengKe[yunWuXing]?.[qiWuXing] ?? {rel:"运气相杂",desc:"运气关系复杂"};
  let shunNi = "平";
  if (entry.rel.includes("顺")) shunNi = "顺";
  else if (entry.rel.includes("逆")) shunNi = "逆";
  return { relation: entry.rel, shunNi: shunNi as any, desc: entry.desc };
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
  const keQi = calcKeQi(qiInfo.siTian);
  const tongHua = calcTongHua(tianGan, diZhi, yunInfo.yun, qiInfo.siTian);

  const duanYu = `${year}年（${nianGanZhi}），岁运${yunInfo.yun}${yunInfo.state}，司天${qiInfo.siTian}，在泉${qiInfo.zaiQuan}。${tongHua.active ? tongHua.desc : ""}`;

  return {
    input: { year },
    basicInfo: { nianGanZhi, year, tianGan, diZhi },
    daYun: {
      tianGanHuaYun: yunInfo.yun as any,
      yunState: yunInfo.state as any,
      suiYun: yunInfo.yun,
      zhuYun: ZHU_YUN.map((y) => `${y}${yunInfo.state}`),
      keYun: keYun.map((y) => `${y}${yunInfo.state}`),
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
    yunQiRelation: calcYunQiRelation(yunInfo.yun, qiInfo.siTian) as any,
    duanYu,
  };
}
