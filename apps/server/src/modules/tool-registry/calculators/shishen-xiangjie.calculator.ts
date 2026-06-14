// ── 十神详解计算引擎 ──
// 算法参考：《渊海子平》《三命通会》
// 分析四柱天干地支的十神分布，揭示性格/六亲/格局

import type { ShiShenXiangJieInput, ShiShenXiangJieResult } from "@guoxue/shared";
import { GAN } from "@guoxue/bazi-engine";

const GAN_LIST = GAN as unknown as string[];

// 天干五行
const GAN_WX: Record<string, string> = {
  "甲":"木","乙":"木","丙":"火","丁":"火","戊":"土",
  "己":"土","庚":"金","辛":"金","壬":"水","癸":"水",
};

// 地支藏干
const ZHI_CANG: Record<string, string[]> = {
  "子": ["癸"], "丑": ["己", "癸", "辛"], "寅": ["甲", "丙", "戊"],
  "卯": ["乙"], "辰": ["戊", "乙", "癸"], "巳": ["丙", "戊", "庚"],
  "午": ["丁", "己"], "未": ["己", "丁", "乙"], "申": ["庚", "壬", "戊"],
  "酉": ["辛"], "戌": ["戊", "辛", "丁"], "亥": ["壬", "戊"],
};

// 十神计算
function getShiShen(riGan: string, targetGan: string): string {
  const riIdx = GAN_LIST.indexOf(riGan);
  const tIdx = GAN_LIST.indexOf(targetGan);
  const diff = (tIdx - riIdx + 10) % 10;
  const riYin = riIdx % 2 === 1;
  const tYin = tIdx % 2 === 1;
  const same = riYin === tYin;
  const TABLE: Record<number, [string, string]> = {
    0: ["比肩", "比肩"], 1: ["劫财", "劫财"],
    2: ["食神", "伤官"], 3: ["伤官", "食神"],
    4: ["偏财", "正财"], 5: ["正财", "偏财"],
    6: ["七杀", "正官"], 7: ["正官", "七杀"],
    8: ["偏印", "正印"], 9: ["正印", "偏印"],
  };
  return TABLE[diff][same ? 0 : 1];
}

// 十神详解数据库
const SHI_SHEN_INFO: Record<string, { meaning: string; personality: string; kinship: string }> = {
  "比肩": {
    meaning: "与日主同五行同阴阳，代表兄弟姐妹、朋友同事、竞争合作",
    personality: "自立自强，有主见，重友情，但有时固执己见，缺乏变通",
    kinship: "兄弟姐妹、同辈朋友、合作伙伴",
  },
  "劫财": {
    meaning: "与日主同五行异阴阳，代表竞争、争夺、耗财",
    personality: "行动力强，敢于冒险，社交活跃，但易冲动破财",
    kinship: "兄弟姐妹、竞争对手、损友",
  },
  "食神": {
    meaning: "日主所生且阴阳相同，代表才华、福气、口福、子女",
    personality: "温厚善良，有艺术天赋，懂得享受生活，宽容大度",
    kinship: "子女（女命）、学生、晚辈",
  },
  "伤官": {
    meaning: "日主所生且阴阳相异，代表才华外露、创造力、叛逆",
    personality: "聪明机敏，富有创造力，不拘一格，但锋芒毕露易得罪人",
    kinship: "子女（女命）、门生、下属",
  },
  "正财": {
    meaning: "日主所克且阴阳相异，代表稳定财富、正当收入、妻子（男命）",
    personality: "勤俭节约，诚实守信，注重实际，但有时过于保守",
    kinship: "妻子（男命）、父亲的情人、固定收入",
  },
  "偏财": {
    meaning: "日主所克且阴阳相同，代表意外之财、投资、父亲、情人",
    personality: "慷慨大方，善于理财投资，不拘小节，但有时挥霍无度",
    kinship: "父亲、情人（男命）、意外收入",
  },
  "正官": {
    meaning: "克日主且阴阳相异，代表官职、法律、规则、丈夫（女命）",
    personality: "正直严谨，遵纪守法，有责任心，但有时过于保守拘谨",
    kinship: "丈夫（女命）、上级领导、法律规范",
  },
  "七杀": {
    meaning: "克日主且阴阳相同，代表权威、压力、竞争、武力、情人（女命）",
    personality: "果断刚毅，勇于挑战，有领导力，但易冲动暴躁",
    kinship: "情人/非正式丈夫（女命）、敌人、压力来源",
  },
  "正印": {
    meaning: "生日主且阴阳相异，代表学识、母亲、贵人、文书",
    personality: "仁慈善良，好学深思，有包容心，但有时过于依赖",
    kinship: "母亲、长辈、老师、贵人",
  },
  "偏印": {
    meaning: "生日主且阴阳相同，代表特殊技能、继母、偏门学问",
    personality: "思维独特，善于钻研，有特殊才能，但有时孤僻多疑",
    kinship: "继母、特别的师长、偏门技艺",
  },
};

export function calculateShiShenXiangJie(input: Record<string, unknown>): ShiShenXiangJieResult {
  const { yearPillar, monthPillar, dayPillar, hourPillar, gender } = input as unknown as ShiShenXiangJieInput;

  const riGan = dayPillar[0];
  const pillars = [
    { label: "年柱", gan: yearPillar[0], zhi: yearPillar.slice(1) },
    { label: "月柱", gan: monthPillar[0], zhi: monthPillar.slice(1) },
    { label: "日柱", gan: dayPillar[0], zhi: dayPillar.slice(1) },
    { label: "时柱", gan: hourPillar[0], zhi: hourPillar.slice(1) },
  ];

  // 分布计数
  const dist: Record<string, number> = {
    "比肩": 0, "劫财": 0, "食神": 0, "伤官": 0,
    "正财": 0, "偏财": 0, "正官": 0, "七杀": 0,
    "正印": 0, "偏印": 0,
  };

  // 四柱十神
  const pillarResults = pillars.map(p => {
    const ganSS = getShiShen(riGan, p.gan);
    dist[ganSS]++;
    const cang = (ZHI_CANG[p.zhi] || []).map(cg => {
      const ss = getShiShen(riGan, cg);
      dist[ss]++;
      return { gan: cg, shiShen: ss };
    });
    return {
      pillar: p.label,
      ganZhi: p.gan + p.zhi,
      ganShiShen: ganSS,
      zhiCangGan: cang,
    };
  });

  // 按数量排序详情
  const detailEntries = Object.entries(dist)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      name,
      count,
      meaning: SHI_SHEN_INFO[name]?.meaning || "",
      personality: SHI_SHEN_INFO[name]?.personality || "",
      kinship: SHI_SHEN_INFO[name]?.kinship || "",
    }));

  // 格局简评
  const topTwo = detailEntries.slice(0, 2).map(d => d.name);
  let pattern = "";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalCount = Object.values(dist).reduce((a, b) => a + b, 0);

  if (dist["正官"] >= 3 && dist["正印"] >= 2) pattern = "官印相生格，贵而清正";
  else if (dist["七杀"] >= 3 && dist["食神"] >= 2) pattern = "食神制杀格，杀化为权";
  else if (dist["正财"] >= 3 && dist["正官"] >= 2) pattern = "财官相生格，财能生官";
  else if (dist["食神"] >= 3 && dist["正财"] >= 2) pattern = "食神生财格，技艺致富";
  else if (dist["正印"] >= 3 && dist["比肩"] >= 2) pattern = "印比两旺格，仁厚但不免固执";
  else if (dist["伤官"] >= 3 && dist["偏印"] >= 2) pattern = "伤官佩印格，才高而能收敛";
  else if (dist["比肩"] + dist["劫财"] >= 5) pattern = "比劫林立，身强须财官为用";
  else if (dist["正官"] + dist["七杀"] >= 4) pattern = "官杀混杂，须去留分明";
  else if (dist["食神"] + dist["伤官"] >= 4) pattern = "食伤泄秀格，艺术天赋出众";
  else pattern = `以${topTwo.join("、")}为主，格局尚待大运配合`;

  // 综合断语
  const analysis = [
    `日主${riGan}，性别${gender}。`,
    `四柱十神分布：${detailEntries.map(d => `${d.name}${d.count}个`).join("、")}。`,
    `格局简评：${pattern}。`,
    `性格综合：${detailEntries[0] ? SHI_SHEN_INFO[detailEntries[0].name]?.personality : ""}`,
    detailEntries.length > 1
      ? `辅以${detailEntries[1]?.name}的${SHI_SHEN_INFO[detailEntries[1].name]?.personality.replace(/，.*/, "") || ""}，${gender === "男" ? "男性" : "女性"}性格特征鲜明。`
      : "",
    `建议：${dist["正官"] >= 2 ? "宜从事公职或管理岗位" : dist["食神"] + dist["伤官"] >= 3 ? "宜发挥艺术创意才能" : dist["正财"] + dist["偏财"] >= 3 ? "宜经商或投资理财" : dist["正印"] >= 2 ? "宜从事教育文化事业" : "宜结合大运选择发展方向"}。`,
  ].filter(Boolean).join("");

  // 结构化 box-drawing 摘要
  const lines: string[] = [
    `┌─ 十神详解 ─────────────────`,
    `│ 日主：${riGan}（${GAN_WX[riGan] || "?"}） 性别：${gender || "未指定"} 四柱：${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`,
    ``,
    `├─ 四柱十神 ─────────────────`,
  ];
  for (const p of pillarResults) {
    const cangStr = p.zhiCangGan.map(c => `${c.gan}(${c.shiShen})`).join(" ");
    lines.push(`│ ${p.pillar} ${p.ganZhi.padEnd(4, " ")} 天干${p.ganShiShen.padEnd(4, " ")} 藏干：${cangStr}`);
  }
  lines.push(`│`);
  lines.push(`├─ 十神分布 ─────────────────`);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const maxCount = Math.max(...Object.values(dist));
  for (const d of detailEntries.slice(0, 10)) {
    const bar = "█".repeat(Math.min(d.count, 10));
    lines.push(`│ ${d.name.padEnd(4, " ")} ${String(d.count).padStart(2, " ")}个 ${bar} ${d.meaning.slice(0, 30)}`);
  }
  lines.push(`│`);
  lines.push(`├─ 格局简评 ─────────────────`);
  lines.push(`│ ${pattern}`);
  lines.push(`│`);
  lines.push(`├─ 性格综合 ─────────────────`);
  if (detailEntries[0]) {
    lines.push(`│ 主导：${detailEntries[0].name} — ${SHI_SHEN_INFO[detailEntries[0].name]?.personality || ""}`);
  }
  if (detailEntries[1]) {
    lines.push(`│ 辅佐：${detailEntries[1].name} — ${SHI_SHEN_INFO[detailEntries[1].name]?.personality || ""}`);
  }
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ─────────────────`);
  lines.push(`│ 《渊海子平》—— 十神体系奠基之作`);
  lines.push(`│ 《三命通会》—— 万民英著，十神格局最为详备`);
  lines.push(`│ 《子平真诠》—— 清·沈孝瞻，十神配合之精论`);
  lines.push(`│ 十神为八字论命之语言——六亲/性格/事业/财运皆由此出。`);
  lines.push(`│`);
  lines.push(`└─ 命理提示 ─────────────────`);
  lines.push(`   十神须结合旺衰、喜忌、格局综合论断。`);
  lines.push(`   正偏之分（如正官vs七杀）为阴阳刚柔之辨，不可轻视。`);
  lines.push(`   单个十神旺未必是好事：正官太旺为克身太过，食神太旺为泄身过度。`);
  const summary = lines.join("\n");

  return {
    dayMaster: riGan,
    pillars: pillarResults,
    distribution: dist,
    pattern,
    details: detailEntries,
    analysis,
    summary,
  } as ShiShenXiangJieResult & { summary: string };
}
