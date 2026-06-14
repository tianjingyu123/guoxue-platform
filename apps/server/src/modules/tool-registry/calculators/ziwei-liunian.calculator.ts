// ── 紫微流年专项计算引擎 ──
// 算法参考：《紫微斗数全书》《十八飞星策天紫微斗数》
// 流年星曜、四化飞入、十二月运

import { GAN as GAN_RAW, ZHI as ZHI_RAW } from "@guoxue/bazi-engine";

const GAN: string[] = GAN_RAW as unknown as string[];
const ZHI: string[] = ZHI_RAW as unknown as string[];

// 流年天干四化
const LIUNIAN_SIHUA: Record<string, { lu: string; quan: string; ke: string; ji: string }> = {
  "甲": { lu: "廉贞", quan: "破军", ke: "武曲", ji: "太阳" },
  "乙": { lu: "天机", quan: "天梁", ke: "紫微", ji: "太阴" },
  "丙": { lu: "天同", quan: "天机", ke: "文昌", ji: "廉贞" },
  "丁": { lu: "太阴", quan: "天同", ke: "天机", ji: "巨门" },
  "戊": { lu: "贪狼", quan: "太阴", ke: "右弼", ji: "天机" },
  "己": { lu: "武曲", quan: "贪狼", ke: "天梁", ji: "文曲" },
  "庚": { lu: "太阳", quan: "武曲", ke: "太阴", ji: "天同" },
  "辛": { lu: "巨门", quan: "太阳", ke: "文曲", ji: "文昌" },
  "壬": { lu: "天梁", quan: "紫微", ke: "左辅", ji: "武曲" },
  "癸": { lu: "破军", quan: "巨门", ke: "太阴", ji: "贪狼" },
};

const GONG_WEI_NAMES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];

// ── 本地类型 ──
interface LiuNianSiHuaItem { star: string; huaType: "化禄" | "化权" | "化科" | "化忌"; gongWei: string; meaning: string; }
interface LiuYueItem { month: number; monthZhi: string; keyStar: string; level: "吉" | "平" | "凶"; event: string; advice: string; }
interface ZiWeiLiuNianResult {
  liuNianYear: number; liuNianGanZhi: string; liuNianGongWei: string;
  siHua: LiuNianSiHuaItem[]; liuYueYun: LiuYueItem[]; summary: string;
}

// 十二月建吉凶参考
const MONTH_STARS: Record<string, { star: string; level: "吉" | "平" | "凶"; event: string; advice: string }[]> = {
  "子": [
    { star: "紫微", level: "吉", event: "贵人出现，时机良好", advice: "积极把握机会" },
    { star: "天机", level: "吉", event: "计划顺利，心想事成", advice: "适合布局全年计划" },
    { star: "太阴", level: "吉", event: "家庭和睦，内心安宁", advice: "稳扎稳打，不宜冒进" },
    { star: "贪狼", level: "凶", event: "欲望膨胀，易有损失", advice: "控制消费，防范小人" },
  ],
  "丑": [
    { star: "天梁", level: "吉", event: "长辈提携，福星高照", advice: "多与长辈前辈沟通" },
    { star: "巨门", level: "凶", event: "口舌是非，注意言行", advice: "谨言慎行，避免争执" },
    { star: "太阳", level: "吉", event: "阳光普照，事业上升", advice: "展示才华，把握良机" },
  ],
  "寅": [
    { star: "文昌", level: "吉", event: "学业进步，考试顺利", advice: "适合学习培训充电" },
    { star: "武曲", level: "吉", event: "财运上升，正财稳定", advice: "稳健理财，不宜投机" },
    { star: "七杀", level: "凶", event: "竞争激烈，防意外", advice: "注意人际，避免冲突" },
  ],
  "卯": [
    { star: "文曲", level: "吉", event: "文思泉涌，创意不断", advice: "适合创作和表达" },
    { star: "天相", level: "吉", event: "辅助得力，左右逢源", advice: "合作共赢，借力发展" },
    { star: "铃星", level: "凶", event: "暗中阻碍，事倍功半", advice: "谨慎行事，防小人是非" },
  ],
  "辰": [
    { star: "左辅", level: "吉", event: "得贵人助，事半功倍", advice: "善用人脉资源" },
    { star: "右弼", level: "吉", event: "人际关系和谐", advice: "适合团队协作" },
    { star: "擎羊", level: "凶", event: "突发冲突，宜冷静", advice: "避免正面冲突" },
  ],
  "巳": [
    { star: "天魁", level: "吉", event: "天乙贵人相助", advice: "把握贵人缘" },
    { star: "天钺", level: "吉", event: "暗中得助，化险为夷", advice: "保持信心，坚持初心" },
    { star: "地空", level: "凶", event: "计划落空，期望勿高", advice: "降低预期，防备变故" },
  ],
  "午": [
    { star: "天府", level: "吉", event: "稳定发展，守成有得", advice: "守成为上，不宜激进" },
    { star: "廉贞", level: "凶", event: "情绪波动，注意纠纷", advice: "控制情绪，避免官非" },
  ],
  "未": [
    { star: "禄存", level: "吉", event: "财运亨通，收入稳定", advice: "把握财运机会" },
    { star: "天马", level: "平", event: "奔波忙碌，有得有失", advice: "劳逸结合" },
  ],
  "申": [
    { star: "太阴", level: "吉", event: "贵人暗中相助", advice: "以柔克刚，借力使力" },
    { star: "破军", level: "凶", event: "变动破耗，宜守不宜攻", advice: "减少变动，保守为上" },
  ],
  "酉": [
    { star: "太阳", level: "吉", event: "光明正大，事业有成", advice: "积极进取，展示能力" },
    { star: "火星", level: "凶", event: "突发火气，谨防意外", advice: "注意安全，避免急躁" },
  ],
  "戌": [
    { star: "天同", level: "吉", event: "顺利安逸，心想事成", advice: "放松心态，享受成果" },
    { star: "陀罗", level: "凶", event: "拖延阻碍，进度缓慢", advice: "耐心处理，勿半途而废" },
  ],
  "亥": [
    { star: "武曲", level: "吉", event: "财星照耀，收获季节", advice: "总结全年，规划来年" },
    { star: "地劫", level: "凶", event: "波折反复，注意损失", advice: "防范风险，保管财物" },
  ],
};

export function calculateZiWeiLiuNian(input: Record<string, unknown>): ZiWeiLiuNianResult {
  const mingGongZhi = (input.mingGongZhi as string) || "子";
  const mingGongGan = (input.mingGongGan as string) || "甲";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const wuXingJu = (input.wuXingJu as number) || 5;
  const gender = (input.gender as "男" | "女") || "男";
  const liuNianYear = (input.liuNianYear as number) || new Date().getFullYear();

  const isYang = GAN.indexOf(mingGongGan) % 2 === 0;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isShunXing = (isYang && gender === "男") || (!isYang && gender === "女");

  const mingGongIdx = ZHI.indexOf(mingGongZhi);
  const liuNianGan = GAN[(liuNianYear - 4) % 10];
  const liuNianZhi = ZHI[(liuNianYear - 4) % 12];
  const liuNianGanZhi = liuNianGan + liuNianZhi;

  // 流年所在的宫位
  const liuNianZhiIdx = ZHI.indexOf(liuNianZhi);
  const gongOffset = (liuNianZhiIdx - mingGongIdx + 12) % 12;
  const liuNianGongWei = GONG_WEI_NAMES[gongOffset];

  // 流年四化
  const s = LIUNIAN_SIHUA[liuNianGan] || LIUNIAN_SIHUA["甲"];
  const siHua: LiuNianSiHuaItem[] = [
    { star: s.lu, huaType: "化禄", gongWei: liuNianGongWei, meaning: "财禄增长，机会增多，心想事成" },
    { star: s.quan, huaType: "化权", gongWei: liuNianGongWei, meaning: "掌握权力，主导局面，有能力展现" },
    { star: s.ke, huaType: "化科", gongWei: liuNianGongWei, meaning: "名声提升，学业进步，得人赏识" },
    { star: s.ji, huaType: "化忌", gongWei: GONG_WEI_NAMES[(gongOffset + 3) % 12], meaning: "阻碍在此，需谨慎应对，防范风险" },
  ];

  // 十二月运
  const liuYueYun: LiuYueItem[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthZhi = ZHI[(m + 1) % 12]; // 正月建寅
    const stars = MONTH_STARS[liuNianZhi] || MONTH_STARS["子"];
    const picked = stars[m % stars.length];
    liuYueYun.push({
      month: m, monthZhi,
      keyStar: picked.star,
      level: picked.level,
      event: picked.event,
      advice: picked.advice,
    });
  }

  const goodMonths = liuYueYun.filter(m => m.level === "吉").length;
  const summary = `${liuNianYear}年(${liuNianGanZhi})流年走到${liuNianGongWei}。`
    + `流年四化：${s.lu}化禄/${s.quan}化权/${s.ke}化科/${s.ji}化忌。`
    + `全年12个月中${goodMonths}个月为吉运，宜把握${liuYueYun.filter(m => m.level === "吉").map(m => `${m.month}月`).slice(0, 3).join("、")}等月份。`;

  return { liuNianYear, liuNianGanZhi, liuNianGongWei, siHua, liuYueYun, summary };
}
