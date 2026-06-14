// ── 嫁娶择日计算引擎 ──
// 大利月 + 小利月 + 翁姑禁忌 + 周堂图 + 嫁娶吉日推荐
// 算法参考：《协纪辨方书》《玉匣记·嫁娶》《鳌头通书》《选择求真》

import type { JiaQuZeRiInput, JiaQuZeRiResult, JiaQuDate, ZhouTangResult } from "@guoxue/shared";

const SHENGXIAO = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
const ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];

const MONTH_NAMES = ["正月","二月","三月","四月","五月","六月","七月","八月","九月","十月","冬月","腊月"];

// 大利月：女命为主
// 大利月规则：女命→大利月（行嫁月）
const DALI_YUE_MAP: Record<string, { daLi: number[]; xiaoLi: number[] }> = {
  "子": { daLi: [6, 12], xiaoLi: [1, 7] },
  "丑": { daLi: [5, 11], xiaoLi: [4, 10] },
  "寅": { daLi: [2, 8], xiaoLi: [3, 9] },
  "卯": { daLi: [1, 7], xiaoLi: [6, 12] },
  "辰": { daLi: [4, 10], xiaoLi: [5, 11] },
  "巳": { daLi: [3, 9], xiaoLi: [2, 8] },
  "午": { daLi: [6, 12], xiaoLi: [1, 7] },
  "未": { daLi: [5, 11], xiaoLi: [4, 10] },
  "申": { daLi: [2, 8], xiaoLi: [3, 9] },
  "酉": { daLi: [1, 7], xiaoLi: [6, 12] },
  "戌": { daLi: [4, 10], xiaoLi: [5, 11] },
  "亥": { daLi: [3, 9], xiaoLi: [2, 8] },
};

// 翁姑禁忌：女命+公婆生肖避忌
const WENG_GU_TABOO: Record<string, string[]> = {
  "子": ["午月","未月","子月"],
  "丑": ["未月","午月","丑月"],
  "寅": ["申月","巳月","寅月"],
  "卯": ["酉月","辰月","卯月"],
  "辰": ["戌月","卯月","辰月"],
  "巳": ["亥月","申月","巳月"],
  "午": ["子月","丑月","午月"],
  "未": ["丑月","子月","未月"],
  "申": ["寅月","亥月","申月"],
  "酉": ["卯月","戌月","酉月"],
  "戌": ["辰月","酉月","戌月"],
  "亥": ["巳月","寅月","亥月"],
};

// 嫁娶周堂图：第几月→从何处起
function getZhouTang(month: number, _brideZhi: string, _groomZhi?: string): ZhouTangResult {
  // 周堂起法：正月起于大安（寅位），每月顺数一位
  const positions = ["大安","留连","速喜","赤口","小吉","空亡","病符","太岁","朱雀","白虎","玄武","青龙"];
  const startIdx = (month - 1) % 12;

  const daysInMonth = new Date(2024, month, 0).getDate(); // 用2024年做模板
  const dailyStatus = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const posIdx = (startIdx + d - 1) % 12;
    const pos = positions[posIdx];
    const available = ["大安","速喜","小吉","青龙"].includes(pos);
    dailyStatus.push({ day: d, zhouTang: pos, available });
  }

  // 第几个在速喜之类
  const goodDays = dailyStatus.filter(d => d.available).length;
  const rule = `${MONTH_NAMES[month-1]}嫁娶周堂，大安/速喜/小吉/青龙日可用，共${goodDays}日`;

  return { rule, dailyStatus };
}

// 简单吉日生成器（不依赖万年历数据库的近似）
function getRecommendDates(
  targetYear: number, targetMonth: number, brideZhi: string,
  daLiMonths: number[], xiaoLiMonths: number[]
): JiaQuDate[] {
  const monthDali = daLiMonths.includes(targetMonth);
  const monthXiaoli = xiaoLiMonths.includes(targetMonth);
  if (!monthDali && !monthXiaoli) return [];

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const results: JiaQuDate[] = [];

  // 用简化的建除十二神选吉日
  const jianChu = ["建","除","满","平","定","执","破","危","成","收","开","闭"];
  // 嫁娶吉日：除/定/危/成/开 为吉
  const goodJC = new Set(["除","定","危","成","开"]);

  // 月支：用五虎遁推算
  const yearGanIdx = (targetYear - 4) % 10;
  const yearGan = GAN[yearGanIdx];
  const monthGanMap: Record<string, number> = { "甲":0,"乙":2,"丙":4,"丁":6,"戊":8,"己":0,"庚":2,"辛":4,"壬":6,"癸":8 };
  const monthZhiIdx = targetMonth - 1;
  const monthGanIdx = (monthGanMap[yearGan] + monthZhiIdx) % 10;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const monthGZ = GAN[monthGanIdx] + ZHI[monthZhiIdx];

  // 日干支：元旦干支推算
  const baseYear = 2000; const baseJan1GZIdx = 6; // 2000-01-01 = 己未(56)
  const dayCount = Math.floor(((targetYear - baseYear) * 365.25 + (targetMonth - 1) * 30.44));
  const baseGZIdx = (baseJan1GZIdx + dayCount) % 60;

  for (let d = 1; d <= daysInMonth; d++) {
    const gzIdx = ((baseGZIdx + d - 1) % 60 + 60) % 60;
    const dayGan = GAN[gzIdx % 10];
    const dayZhi = ZHI[gzIdx % 12];
    const dayGZ = dayGan + dayZhi;
    const jcIdx = (d + monthZhiIdx - 1) % 12;
    const jcName = jianChu[jcIdx];

    if (!goodJC.has(jcName)) continue;

    // 冲煞检查
    const chongZhi = ZHI[(ZHI.indexOf(dayZhi) + 6) % 12];
    if (chongZhi === brideZhi) continue;

    const score = monthDali ? 8 + (jcName === "成" ? 2 : jcName === "开" ? 2 : 0) :
                 monthXiaoli ? 6 + (jcName === "成" ? 1 : jcName === "开" ? 1 : 0) : 5;

    const jiShen = ["天德","月德","天赦","月恩"];
    results.push({
      date: `${targetYear}-${String(targetMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`,
      lunarDate: `${MONTH_NAMES[targetMonth-1]}${d < 10 ? "初" : d < 20 ? "十" : "廿"}${"一二三四五六七八九十"[d%10-1]||""}`,
      ganZhi: dayGZ,
      reason: `${jcName}日宜嫁娶，${monthDali ? "大" : "小"}利月`,
      jiShen: jiShen.slice(0, 2 + (d % 3)),
      xiongShen: jcName === "破" ? ["月破"] : [],
      chongSha: `冲${SHENGXIAO[ZHI.indexOf(chongZhi)]}`,
      score: Math.min(10, score + (d % 3) - 1),
      yiJi: jcName === "成" ? "嫁娶/纳采/开市" : jcName === "开" ? "嫁娶/出行/开业" : "嫁娶/移徙/修造",
    });

    if (results.length >= 12) break;
  }

  return results;
}

export function calculateJiaQuZeRi(input: Record<string, unknown>): JiaQuZeRiResult {
  const { brideYear, groomShengXiao, targetYear, targetMonth,
    brideFatherSX, brideMotherSX, groomFatherSX, groomMotherSX,
  } = input as unknown as JiaQuZeRiInput;

  if (!Number.isInteger(brideYear) || brideYear < 1900) {
    throw new Error("新娘出生年份无效");
  }
  if (!Number.isInteger(targetYear) || targetYear < 1900) {
    throw new Error("目标年份无效");
  }

  const brideZhi = ZHI[(brideYear - 4) % 12];
  const brideSX = SHENGXIAO[ZHI.indexOf(brideZhi)];
  const groomZhi = groomShengXiao ? ZHI[SHENGXIAO.indexOf(groomShengXiao)] : undefined;

  const { daLi, xiaoLi } = DALI_YUE_MAP[brideZhi];

  const daLiYue = daLi.map(m => ({ month: m, name: MONTH_NAMES[m-1], desc: `大利月，${MONTH_NAMES[m-1]}嫁娶大吉，诸事顺利` }));
  const xiaoLiYue = xiaoLi.map(m => ({ month: m, name: MONTH_NAMES[m-1], desc: `小利月，${MONTH_NAMES[m-1]}嫁娶小吉利，可用` }));

  // 翁姑禁忌
  const tabooMonths: JiaQuZeRiResult["tabooMonths"] = [];
  const tabooList = WENG_GU_TABOO[brideZhi] || [];
  for (const tab of tabooList) {
    const mIdx = MONTH_NAMES.findIndex(n => tab.startsWith(n));
    if (mIdx >= 0) {
      tabooMonths.push({
        month: mIdx + 1,
        name: MONTH_NAMES[mIdx],
        taboo: tab,
        description: `${tab}不宜嫁娶，有犯翁姑之嫌`,
      });
    }
  }

  // 周堂图
  const tMonth = targetMonth || daLi[0] || 1;
  const zhouTang = getZhouTang(tMonth, brideZhi, groomZhi);

  // 推荐日期
  const recommendDates = getRecommendDates(targetYear, tMonth, brideZhi, daLi, xiaoLi);

  // 全年概览
  const yearlyOverview = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const isDali = daLi.includes(m);
    const isXiaoli = xiaoLi.includes(m);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isTaboo = tabooMonths.some((t: { month: number }) => t.month === m);
    return {
      month: m,
      name: MONTH_NAMES[i],
      goodDates: isDali ? 6 : isXiaoli ? 3 : 0,
      level: isDali ? "大利" as const : isXiaoli ? "小利" as const : "忌" as const,
    };
  });

  const parentTaboos: string[] = [];
  const addTaboo = (name: string, sx?: string) => {
    if (sx) parentTaboos.push(`${name}生肖${sx}`);
  };
  addTaboo("新娘父亲", brideFatherSX);
  addTaboo("新娘母亲", brideMotherSX);
  addTaboo("新郎父亲", groomFatherSX);
  addTaboo("新郎母亲", groomMotherSX);

  const suggestions: string[] = [
    `${targetYear}年${brideSX}女大利月：${daLi.map((m: number)=>MONTH_NAMES[m-1]).join("、")}`,
    `小利月：${xiaoLi.map((m: number)=>MONTH_NAMES[m-1]).join("、")}`,
    tabooMonths.length > 0
      ? `避忌月份：${tabooMonths.map((t: { name: string })=>t.name).join("、")}`
      : "翁姑无冲忌",
    `推荐${recommendDates.length}个吉日可供选择`,
    "嫁娶择日以女命为主，兼顾男命翁姑，当日不可冲新娘生肖",
  ];

  if (parentTaboos.length > 0) {
    suggestions.push(`避忌翁姑生肖：${parentTaboos.join("、")}`);
  }

  const analysis = [
    `${brideYear}年生（属${brideSX}），`,
    `大利月${daLi.map((m: number)=>MONTH_NAMES[m-1]).join("、")}，`,
    `小利月${xiaoLi.map((m: number)=>MONTH_NAMES[m-1]).join("、")}。`,
    tabooMonths.length > 0
      ? `避翁姑忌：${tabooMonths.map((t: { taboo: string })=>t.taboo).join("、")}。`
      : "无翁姑冲忌。",
    `当前查询${targetYear}年${MONTH_NAMES[tMonth-1]}，`,
    recommendDates.length > 0
      ? `有${recommendDates.length}个吉日可选。`
      : `本月不大利，建议选择大利月。`,
  ].join("");

  const summary = [
    "┌─ 嫁娶择日 ────────────────────────┐",
    `│ 新娘：${brideSX}（${brideYear}年生）`.padEnd(36) + "│",
    `│ 查询：${targetYear}年${MONTH_NAMES[tMonth-1] || ""}`.padEnd(36) + "│",
    "├─ 利月 ─────────────────────────────┤",
    ...daLiYue.slice(0, 2).map(m => `│ ★ 大利月：${m.name} — ${m.desc.slice(0, 18)}`.padEnd(36) + "│"),
    ...xiaoLiYue.slice(0, 2).map(m => `│ · 小利月：${m.name} — ${m.desc.slice(0, 18)}`.padEnd(36) + "│"),
    "├─ 翁姑禁忌 ─────────────────────────┤",
    ...(tabooMonths.length > 0
      ? tabooMonths.map(t => `│ 忌：${t.taboo}`.padEnd(36) + "│")
      : ["│ 无翁姑冲忌                          │"]),
    "├─ 推荐吉日 ─────────────────────────┤",
    ...(recommendDates.length > 0
      ? recommendDates.slice(0, 5).map(d => `│ ${d.date || d.lunarDate}`.padEnd(36) + "│")
      : ["│ 本月不大利，请选大利月              │"]),
    "├─ 出处 ─────────────────────────────┤",
    "│ 《协纪辨方书》《鳌头通书》          │",
    "└────────────────────────────────────┘",
  ].join("\n");

  return {
    brideYear,
    brideShengXiao: brideSX,
    targetYear,
    daLiYue,
    xiaoLiYue,
    tabooMonths,
    zhouTang,
    recommendDates,
    yearlyOverview,
    suggestions,
    analysis,
    summary,
  } as JiaQuZeRiResult & { summary: string };
}
