/**
 * 小六壬课书：盘面事实、图形与检索信号（2026-09-18）
 *
 * 小六壬是六宫掐指，路子比六爻大六壬都短：月上起、数到日、再数到时，
 * 落在哪一宫就按哪一宫断。**三宫各管一段**——
 * 月宫是事情的来路与背景，日宫是事情本身当下的样子，时宫是落点与结果（也是「我」所在）。
 * 所以断语的重心在时宫，而日宫决定事情本身顺不顺，两宫合看才完整。
 *
 * 数据来源是服务端存库的 `computeXiaoliuren` 结果（与前端页面同一份算法，
 * 缘由见 shared/paipan/xiaoliuren-engine.ts），不另起引擎重算。
 */

import type { ReportSignal } from "./paipan-report-knowledge.service";

export interface XiaoliurenPalace {
  name: string;
  liushen: string;
  star: string;
  starKong: boolean;
  gan: string;
  zhi: string;
  qin: string;
  markers: string[];
}

export interface XiaoliurenResultData {
  palaces?: XiaoliurenPalace[];
  monthPalace?: number;
  dayPalace?: number;
  hourPalace?: number;
  monthName?: string;
  dayName?: string;
  hourName?: string;
  dayKong?: string;
  school?: string;
  matter?: string;
  sizhu?: Record<string, { gan: string; zhi: string }>;
  lunarText?: string;
  castBy?: string;
}

export interface XiaoliurenFacts {
  matter: string;
  monthName: string;
  dayName: string;
  hourName: string;
  /** 时宫（落点）的配置——断语重心 */
  hourLiushen: string;
  hourQin: string;
  hourGanzhi: string;
  hourKong: boolean;
  /** 日宫（事情本身）的配置 */
  dayLiushen: string;
  dayQin: string;
  dayGanzhi: string;
  dayKongPalace: boolean;
  sizhu: string;
  dayKong: string;
  schoolNote: string;
  lunarText: string;
  castBy: string;
  palaces: XiaoliurenPalace[];
}

const SCHOOL_NOTE: Record<string, string> = {
  daojia: "道家法（青龙起日宫顺行）",
  jiangshi: "江氏法（日干定首神，起大安宫）",
  jiangshi2: "江氏活六神（日干定首神，起时宫）",
};

const s = (v: unknown) => String(v ?? "").trim();

export function extractXiaoliurenFacts(data: XiaoliurenResultData): XiaoliurenFacts {
  const palaces = data?.palaces ?? [];
  const at = (i?: number) => (typeof i === "number" ? palaces[i] : undefined);
  const dayP = at(data?.dayPalace);
  const hourP = at(data?.hourPalace);
  const sz = data?.sizhu ?? {};
  const pillar = (k: string) => (sz[k] ? `${sz[k].gan}${sz[k].zhi}` : "");

  return {
    matter: s(data?.matter),
    monthName: s(data?.monthName),
    dayName: s(data?.dayName),
    hourName: s(data?.hourName),
    hourLiushen: s(hourP?.liushen),
    hourQin: s(hourP?.qin),
    hourGanzhi: hourP ? `${hourP.gan}${hourP.zhi}` : "",
    hourKong: !!hourP?.starKong,
    dayLiushen: s(dayP?.liushen),
    dayQin: s(dayP?.qin),
    dayGanzhi: dayP ? `${dayP.gan}${dayP.zhi}` : "",
    dayKongPalace: !!dayP?.starKong,
    sizhu: ["nian", "yue", "ri", "shi"].map(pillar).filter(Boolean).join(" "),
    dayKong: s(data?.dayKong),
    schoolNote: SCHOOL_NOTE[s(data?.school)] ?? SCHOOL_NOTE.daojia,
    lunarText: s(data?.lunarText),
    castBy: s(data?.castBy),
    palaces,
  };
}

/**
 * 检索信号。
 *
 * 断语重心在时宫（落点兼「我」），所以 `时宫X` 权重最高；
 * 日宫说明事情本身的样子，次之；月宫是背景，再次。
 * 六神与六亲各自成一路取象。
 *
 * **tag 必须与这里产出的值一字不差**——差一个字就是死条目，
 * 而单测里 signals 是自己造的、写错也全绿（六壬「涉害课」、阳盘「坤2宫」已经各栽过一次）。
 */
export function xiaoliurenSignals(f: XiaoliurenFacts): ReportSignal[] {
  const out: ReportSignal[] = [];
  const push = (v: string | undefined, weight: number, reason: string) => {
    const t = s(v);
    if (t) out.push({ value: t, weight, reason });
  };

  /**
   * 日时组合（2026-09-19 新增）。
   *
   * 小六壬真正吃饭的断语是**日宫配时宫**那三十六句——「大安+速喜：静中逢喜，谋事可成」
   * 这类，比单看一宫具体得多。这批断语原先只存在前端 `xiaoliuren-data.ts` 的
   * `RISHI_DUAN` 表里，后端知识库一条都没有；现已迁入（决策人定的分层方案：
   * 算法与断语都收回后端，前端只管展示）。
   *
   * 键格式与前端保持一致（`日宫+时宫`，如「大安+速喜」），迁移时不必再做一次映射，
   * 也便于两边对照核查。权重高于单宫信号——组合更具体。
   */
  push(f.dayName && f.hourName ? `${f.dayName}+${f.hourName}` : undefined, 11, "日时组合");

  push(f.hourName ? `时宫${f.hourName}` : undefined, 10, "时宫（落点）");
  push(f.dayName ? `日宫${f.dayName}` : undefined, 8, "日宫（事情本身）");
  push(f.monthName ? `月宫${f.monthName}` : undefined, 4, "月宫（来路背景）");
  push(f.hourLiushen, 6, "时宫六神");
  push(f.dayQin ? `日宫${f.dayQin}` : undefined, 5, "日宫六亲");
  if (f.hourKong) push("落点旬空", 7, "时宫逢空");
  return out;
}

/** 盘面事实逐条列出，全部来自引擎，模型不得改写 */
export function xiaoliurenFactLines(f: XiaoliurenFacts): string[] {
  return [
    f.matter ? `所问：${f.matter}` : "",
    f.sizhu ? `四柱：${f.sizhu}` : "",
    f.lunarText ? `农历：${f.lunarText}　起课：${f.castBy}　${f.schoolNote}` : "",
    `三宫：月宫${f.monthName}　日宫${f.dayName}　时宫${f.hourName}`,
    f.hourGanzhi ? `时宫（落点）：${f.hourName}　${f.hourGanzhi}　${f.hourLiushen}　${f.hourQin}${f.hourKong ? "　逢旬空" : ""}` : "",
    f.dayGanzhi ? `日宫（事情）：${f.dayName}　${f.dayGanzhi}　${f.dayLiushen}　${f.dayQin}${f.dayKongPalace ? "　逢旬空" : ""}` : "",
    f.dayKong ? `日柱旬空：${f.dayKong}` : "",
  ].filter(Boolean);
}

/** 六宫图：按掐指顺序给前端渲染 */
export function buildXiaoliurenChartView(f: XiaoliurenFacts) {
  return {
    kind: "xiaoliuren" as const,
    title: "六宫掐指",
    cells: f.palaces.map((p) => ({
      name: p.name,
      ganzhi: `${p.gan}${p.zhi}`,
      liushen: p.liushen,
      star: p.star,
      qin: p.qin,
      markers: p.markers,
      // 落点宫单独标出来：用户一眼要看到结果落在哪
      highlight: p.markers.includes("时"),
    })),
    provenance: [
      f.matter ? { label: "所问何事", value: f.matter } : null,
      f.sizhu ? { label: "四柱", value: f.sizhu } : null,
      f.lunarText ? { label: "农历", value: f.lunarText } : null,
      { label: "起课方式", value: f.castBy || "时间起课" },
      { label: "流派", value: f.schoolNote },
      f.dayKong ? { label: "日柱旬空", value: f.dayKong } : null,
    ].filter(Boolean) as { label: string; value: string }[],
  };
}
