// ── 胎命身宫推算引擎 ──
// 算法参考：《渊海子平》《三命通会·胎元命宫身宫》《星平会海》《张果星宗》
// 胎元为先天之本，命宫为立命之基，身宫为后天之行。三宫互参，乃论命之要法。
// 《三命通会》云：「胎元者，受胎之月也。命宫者，立命之宫也。身宫者，安身之所也。」

import type { TaiMingShenInput, TaiMingShenResult, PalaceInteraction } from "@guoxue/shared";
import { GAN, ZHI } from "@guoxue/bazi-engine";

const GAN_LIST = GAN as unknown as string[];
const ZHI_LIST = ZHI as unknown as string[];

function zhiIdx(z: string): number { return ZHI_LIST.indexOf(z); }

function calcTaiYuan(monthGan: string, monthZhi: string): string {
  const gIdx = GAN_LIST.indexOf(monthGan);
  const zIdx = ZHI_LIST.indexOf(monthZhi);
  return GAN_LIST[(gIdx + 1) % 10] + ZHI_LIST[(zIdx + 3) % 12];
}

function calcMingGong(yearGan: string, monthZhi: string, hourZhi: string): string {
  const mIdx = zhiIdx(monthZhi);
  const hIdx = zhiIdx(hourZhi);
  const base = (12 - (mIdx % 12)) % 12;
  const mingZhiIdx = (base - hIdx + 12) % 12;
  const mingZhi = ZHI_LIST[mingZhiIdx];
  const yIdx = GAN_LIST.indexOf(yearGan);
  const monthStartGan: Record<number, number> = {
    0: 2, 1: 4, 2: 6, 3: 8, 4: 0, 5: 2, 6: 4, 7: 6, 8: 8, 9: 0,
  };
  const virtualMonth = (mingZhiIdx + 1);
  const startGan = monthStartGan[yIdx % 10] ?? 0;
  const mingGanIdx = (startGan + virtualMonth - 1) % 10;
  return GAN_LIST[mingGanIdx] + mingZhi;
}

function calcShenGong(yearGan: string, monthZhi: string, hourZhi: string): string {
  const mIdx = zhiIdx(monthZhi);
  const hIdx = zhiIdx(hourZhi);
  const shenZhiIdx = (mIdx + hIdx) % 12;
  const shenZhi = ZHI_LIST[shenZhiIdx];
  const yIdx = GAN_LIST.indexOf(yearGan);
  const monthStartGan: Record<number, number> = {
    0: 2, 1: 4, 2: 6, 3: 8, 4: 0, 5: 2, 6: 4, 7: 6, 8: 8, 9: 0,
  };
  const virtualMonth = (shenZhiIdx + 1);
  const startGan = monthStartGan[yIdx % 10] ?? 0;
  const shenGanIdx = (startGan + virtualMonth - 1) % 10;
  return GAN_LIST[shenGanIdx] + shenZhi;
}

function analyzeZhiRelation(zhi1: string, zhi2: string, label: string): PalaceInteraction {
  const i1 = zhiIdx(zhi1);
  const i2 = zhiIdx(zhi2);
  if (i1 < 0 || i2 < 0) return { pair: label, relation: "未知", description: "数据不足无法判断。" };

  const liuHe: [number, number][] = [[0,1],[2,9],[3,8],[4,7],[5,6]];
  const sanHe: Record<number, number[]> = {
    0: [0,4,8], 4: [0,4,8], 8: [0,4,8],
    1: [1,5,9], 5: [1,5,9], 9: [1,5,9],
    2: [2,6,10], 6: [2,6,10], 10: [2,6,10],
    3: [3,7,11], 7: [3,7,11], 11: [3,7,11],
  };
  const chong = (i1 + 6) % 12 === i2;
  const xingPairs: [number, number][] = [[2,5],[5,2],[3,3],[8,8],[11,11],[1,8],[8,1],[0,7],[7,0]];
  const isXing = xingPairs.some(([a,b]) => a === i1 && b === i2) || (i1 === i2 && [2,5,3,8,11].includes(i1));
  const haiPairs: [number, number][] = [[0,7],[7,0],[1,6],[6,1],[2,5],[5,2],[3,4],[4,3],[8,11],[11,8],[9,10],[10,9]];
  const isHai = haiPairs.some(([a,b]) => a === i1 && b === i2);

  let relation: string;
  let description: string;

  if (liuHe.some(([a,b]) => (a===i1&&b===i2)||(a===i2&&b===i1))) {
    relation = "六合";
    description = `${label}六合，情深义重，配合默契，互相吸引。命主得${label.includes("命宫与身宫") ? "后天" : "先天"}之助，行事顺遂。`;
  } else if (sanHe[i1] && sanHe[i2] && sanHe[i1]?.includes(i2)) {
    relation = "三合";
    description = `${label}三合为局，志同道合，同心协力，气势宏大。`;
  } else if (chong) {
    relation = "六冲";
    description = `${label}六冲，磁场对立，变动不居，凡事须防突变。宜以柔克刚。`;
  } else if (isXing) {
    relation = "相刑";
    description = `${label}相刑，暗中摩擦，口舌是非，须防小人与合约纠纷。`;
  } else if (isHai) {
    relation = "相害";
    description = `${label}相害，暗中妨害，貌合神离，须防背地中伤。`;
  } else if (i1 === i2) {
    relation = "伏吟";
    description = `${label}伏吟（同支），同气相求但易自困。双倍力量亦双倍困扰。`;
  } else {
    relation = "和平";
    description = `${label}和平无冲合，各自为政，互不干扰。关系平淡但各自安好。`;
  }

  return { pair: label, relation, description };
}

const ZHI_MEANING: Record<string, string> = {
  "子": "子宫单座，心思细腻，独立性强，宜晚婚。子为水之正位，智慧深沉。出处：《三命通会·命宫》",
  "丑": "丑宫稳重，性格踏实，耐力十足但稍显固执。丑为金库，内藏辛金。出处：《三命通会·命宫》",
  "寅": "寅宫主动，志向远大，行动力强但易冲动。寅为火之长生，气魄非凡。出处：《三命通会·命宫》",
  "卯": "卯宫灵动，社交手腕佳，人缘好但易分心。卯为木之旺地，生机勃勃。出处：《三命通会·命宫》",
  "辰": "辰宫大气，有领导才能，胸怀宽广但偶有傲气。辰为水库，藏乙戊癸。出处：《三命通会·命宫》",
  "巳": "巳宫聪颖，思维敏捷反应快，但情绪波动较大。巳为金之长生，机变无穷。出处：《三命通会·命宫》",
  "午": "午宫光明，热情开朗乐观，但性急易燥。午为火之旺地，光明磊落。出处：《三命通会·命宫》",
  "未": "未宫敦厚，包容心强善照顾人，但略显优柔。未为木库，内藏乙丁己。出处：《三命通会·命宫》",
  "申": "申宫机敏，善于变通适应力强，但易多变不专。申为水之长生，善谋能断。出处：《三命通会·命宫》",
  "酉": "酉宫精致，审美品味佳重仪容，但略显挑剔。酉为金之旺地，精雕细琢。出处：《三命通会·命宫》",
  "戌": "戌宫忠厚，重情重义责任心强，但易忧虑过度。戌为火库，藏辛丁戊。出处：《三命通会·命宫》",
  "亥": "亥宫圆融，智慧深广直觉准，但有时优柔寡断。亥为木之长生，灵感如泉。出处：《三命通会·命宫》",
};

export function calculateTaiMingShen(input: Record<string, unknown>): TaiMingShenResult {
  const { yearPillar, monthPillar, hourPillar, gender } = input as unknown as TaiMingShenInput;

  const yG = yearPillar[0], mG = monthPillar[0], mZ = monthPillar.slice(1), hZ = hourPillar.slice(1);

  const taiYuanGZ = calcTaiYuan(mG, mZ);
  const mingGongGZ = calcMingGong(yG, mZ, hZ);
  const shenGongGZ = calcShenGong(yG, mZ, hZ);

  const mingZhi = mingGongGZ.slice(1);
  const shenZhi = shenGongGZ.slice(1);
  const taiZhi = taiYuanGZ.slice(1);

  const palaceInteractions: PalaceInteraction[] = [
    analyzeZhiRelation(mingZhi, shenZhi, "命宫与身宫"),
    analyzeZhiRelation(mingZhi, taiZhi, "命宫与胎元"),
    analyzeZhiRelation(shenZhi, taiZhi, "身宫与胎元"),
  ];

  const interactionSummary = palaceInteractions
    .map(p => `${p.pair}：${p.relation}。${p.description.slice(0, 50)}`)
    .join("");

  const giCount = palaceInteractions.filter(p => p.relation === "六合" || p.relation === "三合").length;
  const xiongCount = palaceInteractions.filter(p => p.relation === "六冲" || p.relation === "相刑" || p.relation === "相害").length;
  const overallQuality = giCount >= 2 ? "上等（三宫多合，先天禀赋佳）" :
    xiongCount >= 2 ? "下等（三宫多冲刑，需后天努力化解）" : "中等（三宫有吉有平，各安其位）";

  const analysis = [
    `胎元${taiYuanGZ}，代表先天禀赋和祖荫根基。`,
    `命宫在${mingGongGZ}（${mingZhi}宫），${ZHI_MEANING[mingZhi] || "主命主之根基。"}`,
    `身宫在${shenGongGZ}（${shenZhi}宫），${ZHI_MEANING[shenZhi] || "主后天运势与行动倾向。"}`,
    `三宫互动：${interactionSummary}`,
    `整体而言，${gender === "男" ? "男命" : "女命"}三宫配合${overallQuality}。`,
  ].join("");

  const advices: string[] = [];
  for (const p of palaceInteractions) {
    if (p.relation === "六冲" || p.relation === "相刑" || p.relation === "相害") {
      advices.push(`${p.pair}${p.relation}：可通过风水布局（在合方增强能量）或佩戴相应五行饰品化解。`);
    }
  }

  return {
    taiYuan: { ganZhi: taiYuanGZ, meaning: "先天之本，受胎时之气，关乎体质与祖缘。出处：《三命通会》：「胎元者，受胎之月，禀赋之始。」" },
    mingGong: { ganZhi: mingGongGZ, zhi: mingZhi, meaning: ZHI_MEANING[mingZhi] || "命主安身立命之所。" },
    shenGong: { ganZhi: shenGongGZ, zhi: shenZhi, meaning: ZHI_MEANING[shenZhi] || "后天运势，行为倾向。" },
    palaceInteractions,
    analysis,
  };
}
