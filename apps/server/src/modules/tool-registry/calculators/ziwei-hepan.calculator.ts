// ── 紫微合盘（双人紫微斗数配对分析）──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
import { calcZiwei } from "@guoxue/ziwei-engine";
import { ZHI } from "@guoxue/bazi-engine";
import type { Gan, Zhi } from "@guoxue/bazi-engine";
import { Solar } from "lunar-javascript";

interface ZiweiHePanInput {
  self: { year: number; month: number; day: number; hour: number; gender: "男" | "女" };
  partner: { year: number; month: number; day: number; hour: number; gender: "男" | "女" };
}

interface ZiweiHePanResult {
  selfChart: { mingGongZhi: string; mingStars: string[]; fuQiStars: string[]; siHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string } };
  partnerChart: { mingGongZhi: string; mingStars: string[]; fuQiStars: string[]; siHua: { huaLu: string; huaQuan: string; huaKe: string; huaJi: string } };
  scores: {
    mingGongMatch: { score: number; detail: string };
    fuQiMatch: { score: number; detail: string };
    siHuaMatch: { score: number; detail: string };
    zhiRelation: { score: number; detail: string };
    total: number;
    max: number;
  };
  level: string;
  compatibility: { overall: string; marriage: string; career: string; daily: string };
  highlights: string[];
  summary: string;
}

const ZHI_HE_PAIRS: [Zhi, Zhi][] = [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]];
const ZHI_SAN_HE: [Zhi, Zhi, Zhi][] = [["申", "子", "辰"], ["亥", "卯", "未"], ["寅", "午", "戌"], ["巳", "酉", "丑"]];
const ZHI_CHONG_PAIRS: [Zhi, Zhi][] = [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]];

const STAR_PAIR_SCORE: Record<string, Record<string, number>> = {
  "紫微": { "紫微": 7, "天府": 9, "天相": 8, "破军": 5, "七杀": 4, "贪狼": 6, "天机": 6, "太阳": 7, "武曲": 8, "天同": 8, "廉贞": 5, "太阴": 7, "巨门": 4, "天梁": 6 },
  "天府": { "紫微": 9, "天府": 7, "天相": 9, "破军": 5, "七杀": 4, "贪狼": 6, "天机": 6, "太阳": 7, "武曲": 8, "天同": 8, "廉贞": 5, "太阴": 8, "巨门": 4, "天梁": 6 },
  "天相": { "紫微": 8, "天府": 9, "天相": 7, "破军": 4, "七杀": 3, "贪狼": 5, "天机": 5, "太阳": 6, "武曲": 7, "天同": 7, "廉贞": 5, "太阴": 7, "巨门": 4, "天梁": 6 },
  "破军": { "紫微": 5, "天府": 5, "天相": 4, "破军": 4, "七杀": 5, "贪狼": 6, "天机": 4, "太阳": 4, "武曲": 3, "天同": 4, "廉贞": 6, "太阴": 4, "巨门": 5, "天梁": 4 },
  "七杀": { "紫微": 4, "天府": 4, "天相": 3, "破军": 5, "七杀": 3, "贪狼": 5, "天机": 3, "太阳": 3, "武曲": 4, "天同": 3, "廉贞": 5, "太阴": 3, "巨门": 4, "天梁": 4 },
  "贪狼": { "紫微": 6, "天府": 6, "天相": 5, "破军": 6, "七杀": 5, "贪狼": 5, "天机": 5, "太阳": 5, "武曲": 4, "天同": 5, "廉贞": 7, "太阴": 6, "巨门": 5, "天梁": 5 },
  "天机": { "紫微": 6, "天府": 6, "天相": 5, "破军": 4, "七杀": 3, "贪狼": 5, "天机": 6, "太阳": 7, "武曲": 5, "天同": 8, "廉贞": 4, "太阴": 7, "巨门": 4, "天梁": 8 },
  "太阳": { "紫微": 7, "天府": 7, "天相": 6, "破军": 4, "七杀": 3, "贪狼": 5, "天机": 7, "太阳": 7, "武曲": 6, "天同": 7, "廉贞": 5, "太阴": 8, "巨门": 5, "天梁": 7 },
  "武曲": { "紫微": 8, "天府": 8, "天相": 7, "破军": 3, "七杀": 4, "贪狼": 4, "天机": 5, "太阳": 6, "武曲": 7, "天同": 6, "廉贞": 5, "太阴": 6, "巨门": 4, "天梁": 5 },
  "天同": { "紫微": 8, "天府": 8, "天相": 7, "破军": 4, "七杀": 3, "贪狼": 5, "天机": 8, "太阳": 7, "武曲": 6, "天同": 8, "廉贞": 5, "太阴": 8, "巨门": 5, "天梁": 8 },
  "廉贞": { "紫微": 5, "天府": 5, "天相": 5, "破军": 6, "七杀": 5, "贪狼": 7, "天机": 4, "太阳": 5, "武曲": 5, "天同": 5, "廉贞": 5, "太阴": 5, "巨门": 5, "天梁": 5 },
  "太阴": { "紫微": 7, "天府": 8, "天相": 7, "破军": 4, "七杀": 3, "贪狼": 6, "天机": 7, "太阳": 8, "武曲": 6, "天同": 8, "廉贞": 5, "太阴": 7, "巨门": 4, "天梁": 7 },
  "巨门": { "紫微": 4, "天府": 4, "天相": 4, "破军": 5, "七杀": 4, "贪狼": 5, "天机": 4, "太阳": 5, "武曲": 4, "天同": 5, "廉贞": 5, "太阴": 4, "巨门": 3, "天梁": 5 },
  "天梁": { "紫微": 6, "天府": 6, "天相": 6, "破军": 4, "七杀": 4, "贪狼": 5, "天机": 8, "太阳": 7, "武曲": 5, "天同": 8, "廉贞": 5, "太阴": 7, "巨门": 5, "天梁": 7 },
};

const MAIN_STARS = ["紫微", "天府", "天相", "破军", "七杀", "贪狼", "天机", "太阳", "武曲", "天同", "廉贞", "太阴", "巨门", "天梁"];

function getMainStar(stars: string[]): string {
  return stars.find(s => MAIN_STARS.includes(s)) || stars[0] || "无主星";
}

function hourToZhi(hour: number): Zhi {
  const idx = Math.floor(((hour + 1) % 24) / 2);
  return ZHI[idx];
}

function calculateChart(data: { year: number; month: number; day: number; hour: number; gender: "男" | "女" }) {
  const solar = Solar.fromYmd(data.year, data.month, data.day);
  const lunar = solar.getLunar();
  const lunarMonth = Math.abs(lunar.getMonth());
  const lunarDay = lunar.getDay();
  const lunarYearGanZhi = lunar.getYearInGanZhi();

  return calcZiwei({
    name: "",
    gender: data.gender,
    year: data.year, month: data.month, day: data.day, hour: data.hour,
    lunarMonth,
    lunarDay,
    lunarHour: hourToZhi(data.hour) as any,
    lunarYearGan: lunarYearGanZhi[0] as Gan,
    lunarYearZhi: lunarYearGanZhi[1] as Zhi,
  });
}

export function calculateZiweiHePan(input: unknown): ZiweiHePanResult {
  const p = input as ZiweiHePanInput;

  const selfChart = calculateChart(p.self);
  const partnerChart = calculateChart(p.partner);

  const selfMingStars = selfChart.mingGong.stars.map(s => s.name);
  const partnerMingStars = partnerChart.mingGong.stars.map(s => s.name);
  const selfMain = getMainStar(selfMingStars);
  const partnerMain = getMainStar(partnerMingStars);

  const selfFuQi = selfChart.gongWei.find(g => g.name === "夫妻")!;
  const partnerFuQi = partnerChart.gongWei.find(g => g.name === "夫妻")!;
  const selfFuQiStars = selfFuQi.stars.map(s => s.name);
  const partnerFuQiStars = partnerFuQi.stars.map(s => s.name);
  const selfFuQiMain = getMainStar(selfFuQiStars);
  const partnerFuQiMain = getMainStar(partnerFuQiStars);

  // 1. 命宫主星配对
  const mingPairScore = STAR_PAIR_SCORE[selfMain]?.[partnerMain] ?? 5;
  let mingDetail = `己命宫${selfMain}，彼命宫${partnerMain}，`;
  if (mingPairScore >= 8) mingDetail += "主星高度匹配，性格相合";
  else if (mingPairScore >= 6) mingDetail += "主星较为匹配，性格可互补";
  else if (mingPairScore >= 4) mingDetail += "主星一般，需用心经营";
  else mingDetail += "主星不合，性格差异较大";

  // 2. 夫妻宫星曜匹配
  const fuQiPairScore = STAR_PAIR_SCORE[selfFuQiMain]?.[partnerFuQiMain] ?? 5;
  let fuQiDetail = `己夫妻宫${selfFuQiMain}，彼夫妻宫${partnerFuQiMain}，`;
  if (fuQiPairScore >= 8) fuQiDetail += "夫妻宫高度契合，婚后和睦";
  else if (fuQiPairScore >= 6) fuQiDetail += "夫妻宫较和谐，婚姻可期";
  else if (fuQiPairScore >= 4) fuQiDetail += "夫妻宫一般，婚后需磨合";
  else fuQiDetail += "夫妻宫相冲，婚姻需加倍用心";

  // 3. 四化交飞
  const selfSiHua = selfChart.siHua;
  const partnerSiHua = partnerChart.siHua;
  let siHuaScore = 5;
  const siHuaDetails: string[] = [];

  const selfStarsInPartnerMing = partnerChart.mingGong.stars.map(s => s.name);
  const partnerStarsInSelfMing = selfChart.mingGong.stars.map(s => s.name);

  if (selfStarsInPartnerMing.includes(selfSiHua.huaLu)) {
    siHuaScore += 2;
    siHuaDetails.push(`己化禄星(${selfSiHua.huaLu})入彼命宫，加持对方运势`);
  }
  if (partnerStarsInSelfMing.includes(partnerSiHua.huaLu)) {
    siHuaScore += 2;
    siHuaDetails.push(`彼化禄星(${partnerSiHua.huaLu})入己命宫，助己运程`);
  }
  if (selfStarsInPartnerMing.includes(selfSiHua.huaJi)) {
    siHuaScore -= 1;
    siHuaDetails.push(`己化忌星(${selfSiHua.huaJi})入彼命宫，需注意给对方带来压力`);
  }
  if (partnerStarsInSelfMing.includes(partnerSiHua.huaJi)) {
    siHuaScore -= 1;
    siHuaDetails.push(`彼化忌星(${partnerSiHua.huaJi})入己命宫，对方或给己带来困扰`);
  }

  // 4. 命宫地支关系
  const selfMingZhi = selfChart.mingGong.zhi;
  const partnerMingZhi = partnerChart.mingGong.zhi;

  let zhiScore = 5;
  let zhiDetail = "";

  const isHe = ZHI_HE_PAIRS.some(([a, b]) =>
    (selfMingZhi === a && partnerMingZhi === b) || (selfMingZhi === b && partnerMingZhi === a));
  const isSanHe = ZHI_SAN_HE.some(t => t.includes(selfMingZhi) && t.includes(partnerMingZhi));
  const isChong = ZHI_CHONG_PAIRS.some(([a, b]) =>
    (selfMingZhi === a && partnerMingZhi === b) || (selfMingZhi === b && partnerMingZhi === a));

  if (isHe) {
    zhiScore = 9;
    zhiDetail = `己命宫${selfMingZhi}与彼命宫${partnerMingZhi}六合，天生有缘`;
  } else if (isSanHe) {
    zhiScore = 8;
    zhiDetail = `己命宫${selfMingZhi}与彼命宫${partnerMingZhi}三合，彼此欣赏`;
  } else if (isChong) {
    zhiScore = 3;
    zhiDetail = `己命宫${selfMingZhi}与彼命宫${partnerMingZhi}六冲，性格冲突明显需包容`;
  } else {
    zhiScore = 5;
    zhiDetail = `己命宫${selfMingZhi}与彼命宫${partnerMingZhi}无特殊关联`;
  }

  const scores = {
    mingGongMatch: { score: mingPairScore, detail: mingDetail },
    fuQiMatch: { score: fuQiPairScore, detail: fuQiDetail },
    siHuaMatch: { score: siHuaScore, detail: siHuaDetails.join("；") || "四化交飞无明显交集" },
    zhiRelation: { score: zhiScore, detail: zhiDetail },
    total: mingPairScore + fuQiPairScore + siHuaScore + zhiScore,
    max: 40,
  };

  let level: string;
  const total = scores.total;
  if (total >= 35) level = "天作之合";
  else if (total >= 28) level = "上等婚配";
  else if (total >= 22) level = "中等婚配";
  else if (total >= 16) level = "一般婚配";
  else level = "需谨慎考虑";

  const highlights = buildHighlights(selfMain, partnerMain, selfFuQiMain, partnerFuQiMain, isHe, isChong, siHuaDetails);
  const compatibility = buildCompatibility(total, level);
  const summary = `${p.self.gender}方命宫${selfMain}(${selfMingZhi})，${p.partner.gender}方命宫${partnerMain}(${partnerMingZhi})。综合得分${total}/${scores.max}，${level}。${compatibility.overall}`;

  return {
    selfChart: {
      mingGongZhi: selfMingZhi,
      mingStars: selfMingStars,
      fuQiStars: selfFuQiStars,
      siHua: selfSiHua,
    },
    partnerChart: {
      mingGongZhi: partnerMingZhi,
      mingStars: partnerMingStars,
      fuQiStars: partnerFuQiStars,
      siHua: partnerSiHua,
    },
    scores,
    level,
    compatibility,
    highlights,
    summary,
  };
}

function buildHighlights(selfMain: string, partnerMain: string, selfFuQi: string, partnerFuQi: string, isHe: boolean, isChong: boolean, siHuaDetails: string[]): string[] {
  const h: string[] = [];
  h.push(`命宫主星：${selfMain} × ${partnerMain}`);
  h.push(`夫妻宫主星：${selfFuQi} × ${partnerFuQi}`);
  if (isHe) h.push("命宫六合，缘份天成");
  if (isChong) h.push("命宫对冲，需注意沟通包容");
  h.push(...siHuaDetails);
  return h;
}

function buildCompatibility(total: number, _level: string) {
  let overall: string, marriage: string, career: string, daily: string;

  if (total >= 35) {
    overall = "命盘高度契合，乃天赐良缘，婚姻幸福美满";
    marriage = "夫妻间互相理解支持，婚姻质量极高，家庭和谐";
    career = "双方可共同创业或经营，事业互相促进";
    daily = "生活默契十足，相处轻松愉快，少有争执";
  } else if (total >= 28) {
    overall = "命盘匹配良好，是理想的婚姻伴侣";
    marriage = "婚姻生活幸福稳定，双方各取所需互相成就";
    career = "一人主外一人主内配合得当，事业稳步发展";
    daily = "日常相处和谐，偶有小摩擦但能快速化解";
  } else if (total >= 22) {
    overall = "命盘中度匹配，婚姻可以经营但需用心";
    marriage = "婚姻大体稳定，但需双方在关键问题上达成共识";
    career = "各自发展为主，不宜过多事业交集";
    daily = "日常生活可有小摩擦，需多沟通少冷战";
  } else if (total >= 16) {
    overall = "命盘匹配度一般，需靠后天努力维系感情";
    marriage = "婚姻需要更多包容与忍耐，但并非不可为";
    career = "建议各自独立发展事业，减少共同经营风险";
    daily = "日常需多创造共同爱好，避免各忙各的渐行渐远";
  } else {
    overall = "命盘相克较多，婚姻之路较为艰难";
    marriage = "若执意结合，需有充分心理准备和磨合意愿";
    career = "最好避免事业上的深度捆绑";
    daily = "生活习惯和价值观差异大，需双方大量迁就";
  }

  return { overall, marriage, career, daily };
}
